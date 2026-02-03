import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Entity, ParentCategory, LimitConfig } from '../../types';
import { Calendar, ChevronDown, ChevronUp, Copy, Check, FileSpreadsheet, Lock, FileText, Calculator, Activity, Clock, TrendingUp, AlertTriangle, X, ChevronRight, ArrowLeft, RefreshCw, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { dataService } from '../../services/dataService';
import * as XLSX from 'xlsx';

interface Props {
    entity: Entity;
}

type LimitHandlingOption = 'ignore' | 'this_drop' | 'next_drop' | 'split_today' | 'dismissed' | undefined;

interface SessionLimitAlert {
    sessionId: string;
    sessionName: string;
    limit: number;
    lastInterval: string;
    remainingSeeds: number;
}

// Helper: Parse string ranges into array of [start, end]
const parseRanges = (str: string): [number, number][] => {
    if (!str || typeof str !== 'string') return [];
    if (str.trim().toUpperCase() === 'NO') return [];

    const ranges: [number, number][] = [];
    const parts = str.split(',');

    parts.forEach(part => {
        const p = part.trim();
        if (!p || p.toUpperCase() === 'NO') return;

        if (p.includes('-')) {
            const [start, end] = p.split('-').map(s => parseInt(s.trim()));
            if (!isNaN(start) && !isNaN(end)) {
                ranges.push([Math.min(start, end), Math.max(start, end)]);
            }
        } else {
            const val = parseInt(p);
            if (!isNaN(val)) ranges.push([val, val]);
        }
    });
    return ranges;
};

// Calculate INTERVALS IN REPO as complement of paused intervals
const calculateIntervalComplement = (totalRange: string, excludedIntervals: string[]): string => {
    const totalRanges = parseRanges(totalRange);
    if (totalRanges.length === 0) return '';

    let allExcluded: [number, number][] = [];
    excludedIntervals.forEach(interval => {
        allExcluded = allExcluded.concat(parseRanges(interval));
    });

    if (allExcluded.length === 0) {
        return totalRange;
    }

    allExcluded.sort((a, b) => a[0] - b[0]);
    const mergedExcluded: [number, number][] = [];
    let current = allExcluded[0];

    for (let i = 1; i < allExcluded.length; i++) {
        const next = allExcluded[i];
        if (next[0] <= current[1] + 1) {
            current[1] = Math.max(current[1], next[1]);
        } else {
            mergedExcluded.push(current);
            current = next;
        }
    }
    mergedExcluded.push(current);

    const complementRanges: [number, number][] = [];

    totalRanges.forEach(([start, end]) => {
        let currentStart = start;

        mergedExcluded.forEach(([exStart, exEnd]) => {
            if (exEnd < currentStart) return;
            if (exStart > end) return;

            if (currentStart < exStart) {
                complementRanges.push([currentStart, Math.min(exStart - 1, end)]);
            }

            currentStart = Math.max(currentStart, exEnd + 1);
        });

        if (currentStart <= end) {
            complementRanges.push([currentStart, end]);
        }
    });

    if (complementRanges.length === 0) return '';

    return complementRanges.map(([s, e]) => s === e ? `${s}` : `${s}-${e}`).join(',');
};

// Helper: Merge multiple interval strings into one comma-separated string
const mergeIntervals = (intervals: string[]): string => {
    const validIntervals = intervals.filter(i => i && i !== 'NO' && i.trim() !== '');
    if (validIntervals.length === 0) return 'NO';
    return validIntervals.join(',');
};

// Get total count of an interval string
const getIntervalCount = (str: string): number => {
    const ranges = parseRanges(str);
    return ranges.reduce((sum, [start, end]) => sum + (end - start + 1), 0);
};

// Get step value for a specific drop index (0-based within day)
const getStepForDrop = (dropIdx: number, config: string | number): number => {
    if (typeof config === 'number') return config;
    if (!config) return 0;

    // If it's a simple number string "10"
    if (!config.toString().includes(':') && !config.toString().includes(',')) {
        return parseInt(config.toString()) || 0;
    }

    const parts = config.toString().split(',');
    // dropIdx is 0-based. User input 1-based.
    const targetDrop = dropIdx + 1;

    for (const part of parts) {
        const [range, stepVal] = part.split(':').map(s => s.trim());
        if (!range || !stepVal) continue;
        const step = parseInt(stepVal);
        if (isNaN(step)) continue;

        if (range.includes('-')) {
            const [start, end] = range.split('-').map(s => parseInt(s));
            if (targetDrop >= start && targetDrop <= end) return step;
        } else {
            if (targetDrop === parseInt(range)) return step;
        }
    }

    return 0;
};

// Get start override for a specific drop index
const getStartOverride = (dropIdx: number, config: string | number): number | null => {
    if (typeof config === 'number') return dropIdx === 0 ? config : null;
    if (!config) return null;

    // If simple number string "100"
    if (!config.toString().includes(':') && !config.toString().includes(',')) {
        return dropIdx === 0 ? (parseInt(config.toString()) || null) : null;
    }

    const parts = config.toString().split(',');
    const targetDrop = dropIdx + 1;

    for (const part of parts) {
        const [range, valStr] = part.split(':').map(s => s.trim());
        if (!range || !valStr) continue;
        const val = parseInt(valStr);
        if (isNaN(val)) continue;

        if (range.includes('-')) {
            const [start, end] = range.split('-').map(s => parseInt(s));
            if (targetDrop >= start && targetDrop <= end) return val;
        } else {
            if (targetDrop === parseInt(range)) return val;
        }
    }

    return null;
};

// Calculate the interval range for a specific drop, wrapping around when needed
const calculateDropInterval = (
    globalDropIndex: number,
    stepConfig: string | number,
    intervalsInRepo: string,
    numDrops: number
): string => {
    const ranges = parseRanges(intervalsInRepo);
    if (ranges.length === 0) return '-';

    const allValues: number[] = [];
    ranges.forEach(([start, end]) => {
        for (let i = start; i <= end; i++) {
            allValues.push(i);
        }
    });

    if (allValues.length === 0) return '-';

    const totalInRepo = allValues.length;

    // Calculate cumulative start index
    let currentIdx = 0;
    for (let i = 0; i < globalDropIndex; i++) {
        const dailyDropIdx = i % numDrops;
        const s = getStepForDrop(dailyDropIdx, stepConfig);
        currentIdx = (currentIdx + s) % totalInRepo;
    }

    const dailyDropIdx = globalDropIndex % numDrops;
    const currentStep = getStepForDrop(dailyDropIdx, stepConfig);

    if (currentStep <= 0) return '-';

    const startIdx = currentIdx;
    let endIdx = startIdx + currentStep - 1;

    if (endIdx < totalInRepo) {
        const startVal = allValues[startIdx];
        const endVal = allValues[endIdx];
        return `${startVal}-${endVal}`;
    } else {
        const firstPartEnd = allValues[totalInRepo - 1];
        const secondPartEnd = allValues[endIdx % totalInRepo];
        const startVal = allValues[startIdx];
        return `${startVal}-${firstPartEnd}, ${allValues[0]}-${secondPartEnd}`;
    }
};

// Get array of last 50 days
const getDateRange = (): Date[] => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 50; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(date);
    }
    return dates;
};

const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

interface SessionData {
    profileName: string;
    stepPerSession: number;
    intervalsInRepo: string;
    availableRepo: string; // The normal active repo (complement of all paused)
    startValue: number;
}

interface CategoryData {
    category: ParentCategory;
    sessions: SessionData[];
    totalStep: number;
    scriptName: string;
    numDrops: number;
    drops: { time: string; value: number }[];
    startTime: string;
    isRequest: boolean;
}

// Calculate the interval range for a specific drop using a custom start offset
const calculateDropIntervalWithStart = (
    dropIndex: number,
    stepConfig: string | number,
    intervalsInRepo: string,
    startConfig: string | number,
    defaultStart: number
): string => {
    const ranges = parseRanges(intervalsInRepo);
    if (ranges.length === 0) return '-';

    // We need to simulate from the beginning (Drop 1) to find the state at dropIndex
    // But we can optimize: we only really need to track currentPosition

    let currentPosition = defaultStart;

    // Process each drop sequentially
    for (let drop = 0; drop <= dropIndex; drop++) {
        // Check for start override
        const override = getStartOverride(drop, startConfig);
        let isOverride = false;
        if (override !== null) {
            currentPosition = override;
            isOverride = true;
        }

        // Find current range for currentPosition
        let rangeIdx = ranges.findIndex(([start, end]) => currentPosition >= start && currentPosition <= end);

        // If not in any range
        if (rangeIdx === -1) {
            // If this position came from an override for THIS drop, it's invalid -> return '-'
            if (isOverride && drop === dropIndex) {
                return '-';
            }

            // Otherwise, find the next valid range
            rangeIdx = ranges.findIndex(([start]) => start > currentPosition);
            if (rangeIdx === -1) rangeIdx = 0; // Wrap to first range
            currentPosition = ranges[rangeIdx][0];
        }

        const [rangeStart, rangeEnd] = ranges[rangeIdx];
        const availableInRange = rangeEnd - currentPosition + 1;

        const currentStep = getStepForDrop(drop, stepConfig);
        if (currentStep <= 0) {
            if (drop === dropIndex) return '-';
            continue;
        }

        if (drop === dropIndex) {
            // This is the drop we want to return
            if (availableInRange >= currentStep) {
                // Enough room in current range
                const endVal = currentPosition + currentStep - 1;
                return `${currentPosition}-${endVal}`;
            } else {
                // Not enough room, jump to next range
                const nextRangeIdx = (rangeIdx + 1) % ranges.length;
                const nextStart = ranges[nextRangeIdx][0];
                const nextEnd = nextStart + currentStep - 1;
                return `${nextStart}-${nextEnd}`;
            }
        } else {
            // Calculate where this drop ends and move position for next drop
            if (availableInRange >= currentStep) {
                // Enough room in current range
                currentPosition = currentPosition + currentStep;
                // Check if we're now past the range end
                if (currentPosition > rangeEnd) {
                    // Move to next range
                    const nextRangeIdx = (rangeIdx + 1) % ranges.length;
                    currentPosition = ranges[nextRangeIdx][0];
                }
            } else {
                // Not enough room, jump to next range and use step from there
                const nextRangeIdx = (rangeIdx + 1) % ranges.length;
                currentPosition = ranges[nextRangeIdx][0] + currentStep;
                // Check if we're now past the next range end
                if (currentPosition > ranges[nextRangeIdx][1]) {
                    const nextNextRangeIdx = (nextRangeIdx + 1) % ranges.length;
                    currentPosition = ranges[nextNextRangeIdx][0];
                }
            }
        }
    }

    return '-';
};

// Get the end value of an interval string (for calculating next day START)
const getIntervalEndValue = (intervalStr: string): number => {
    if (!intervalStr || intervalStr === '-') return 0;
    const parts = intervalStr.split(',').map(p => p.trim());
    const lastPart = parts[parts.length - 1];
    if (lastPart.includes('-')) {
        const [, end] = lastPart.split('-').map(s => parseInt(s.trim()));
        return end || 0;
    }
    return parseInt(lastPart) || 0;
};

export const DayPlan: React.FC<Props> = ({ entity }) => {
    const { user } = useAuth();
    const isReadOnly = user?.role === 'USER';

    const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(['today', 'calculate-plan']));
    const [copiedTable, setCopiedTable] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedHistoryDate, setSelectedHistoryDate] = useState<string>(''); // Date filter for historical view

    // Editable overrides: key = "categoryId:sessionIndex", value = custom value
    const [customSteps, setCustomSteps] = useState<Record<string, string | number>>({});
    const [customStarts, setCustomStarts] = useState<Record<string, string | number>>({});
    const [limitHandling, setLimitHandling] = useState<Record<string, LimitHandlingOption>>({});

    // Calculate Plan State

    const [calcSteps, setCalcSteps] = useState<Record<string, string | number>>({});
    const [calcStarts, setCalcStarts] = useState<Record<string, string | number>>({});
    const [calcLimitHandling, setCalcLimitHandling] = useState<Record<string, LimitHandlingOption>>({});
    const [detectedAlerts, setDetectedAlerts] = useState<SessionLimitAlert[]>([]);
    const [showCalculatePlan, setShowCalculatePlan] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [activeView, setActiveView] = useState<'history' | 'calculator'>('history');
    const [selectedPausedIntervalType, setSelectedPausedIntervalType] = useState<'none' | 'quality' | 'search' | 'toxic' | 'other'>('none');
    const [selectedPausedCategory, setSelectedPausedCategory] = useState<'Quality' | 'PausedSearch' | 'Toxic' | 'Other' | null>(null);
    const [intervalHistory, setIntervalHistory] = useState<any[]>([]);
    const [selectedHistoryEntries, setSelectedHistoryEntries] = useState<Set<string>>(new Set());
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [showPausedIntervalsMenu, setShowPausedIntervalsMenu] = useState(false);

    // Historical plans: DateString -> CategoryId -> SessionIdx -> { step, start }
    const [historyPlans, setHistoryPlans] = useState<Record<string, Record<string, Record<number, { step: string | number; start: string | number }>>>>({});

    const [pausedIntervalChoice, setPausedIntervalChoice] = useState<'continue' | 'duplicate'>('continue');

    // Helper: Get categories that contain a session with the given profileName
    const getCategoriesForSession = (profileName: string): { id: string; name: string }[] => {
        return entity.reporting.parentCategories
            .filter(cat => cat.profiles.some(p => p.profileName === profileName && !p.isMirror))
            .map(cat => ({ id: cat.id, name: cat.name }));
    };

    // Category data calculation (must be declared before saveDayPlan)
    const categoryData = useMemo((): CategoryData[] => {
        return entity.reporting.parentCategories.map(category => {
            const config = category.planConfiguration;
            const numDrops = config.drops.length || 1;
            const totalPerDay = config.drops.reduce((sum, d) => sum + (d.value || 0), 0);

            const principalProfiles = category.profiles.filter(p => !p.isMirror);

            // Resolve effective limits for each profile in this category
            const effectiveLimits = principalProfiles.map(profile => {
                // 1. Try category-specific limit
                const specificLimit = entity.limitsConfiguration.find(l => l.profileName === profile.profileName && l.categoryId === category.id);
                if (specificLimit) return specificLimit;

                // 2. Try global limit
                const globalLimit = entity.limitsConfiguration.find(l => l.profileName === profile.profileName && !l.categoryId);
                if (globalLimit) return globalLimit;

                // 3. Default empty
                return {
                    id: `virtual-${profile.profileName}`,
                    profileName: profile.profileName,
                    categoryId: category.id,
                    limitActiveSession: '',
                    intervalsInRepo: '',
                    intervalsQuality: '',
                    intervalsPausedSearch: '',
                    intervalsToxic: '',
                    intervalsOther: '',
                    totalPaused: 0
                } as LimitConfig;
            });

            // Calculate combined intervals from historical selection if active
            const historicalIntervalsMap: Record<string, string> = {};
            if (activeView === 'calculator' && selectedPausedCategory && selectedHistoryEntries.size > 0) {
                principalProfiles.forEach(profile => {
                    const selectedForProfile = intervalHistory
                        .filter(h => selectedHistoryEntries.has(h.id) && h.profileName === profile.profileName)
                        .map(h => h.interval);

                    if (selectedForProfile.length > 0) {
                        historicalIntervalsMap[profile.profileName] = mergeIntervals(selectedForProfile);
                    } else {
                        historicalIntervalsMap[profile.profileName] = 'NO'; // Fallback if no interval selected for this profile
                    }
                });
            }

            let totalSeedsConnected = 0;
            effectiveLimits.forEach(limit => {
                let intervalsInRepo = '';

                // If calculator mode and historical entries are selected, use those
                if (activeView === 'calculator' && selectedPausedCategory && selectedHistoryEntries.size > 0) {
                    intervalsInRepo = historicalIntervalsMap[limit.profileName] || 'NO';
                } else if (activeView === 'calculator' && selectedPausedIntervalType !== 'none') {
                    // Legacy single category selection
                    if (selectedPausedIntervalType === 'quality') intervalsInRepo = limit.intervalsQuality;
                    else if (selectedPausedIntervalType === 'search') intervalsInRepo = limit.intervalsPausedSearch;
                    else if (selectedPausedIntervalType === 'toxic') intervalsInRepo = limit.intervalsToxic;
                    else if (selectedPausedIntervalType === 'other') intervalsInRepo = limit.intervalsOther;
                } else {
                    // Default behavior
                    intervalsInRepo = limit.intervalsInRepo || '';
                    if (!intervalsInRepo) {
                        intervalsInRepo = calculateIntervalComplement(
                            limit.limitActiveSession,
                            [limit.intervalsQuality, limit.intervalsPausedSearch, limit.intervalsToxic, limit.intervalsOther]
                        );
                    }
                }

                totalSeedsConnected += getIntervalCount(intervalsInRepo);
            });

            const rotation = totalPerDay > 0 ? totalSeedsConnected / totalPerDay : 1;

            const sessions: SessionData[] = effectiveLimits.map(limit => {
                let intervalsInRepo = '';

                // If calculator mode and historical entries are selected, use those
                if (activeView === 'calculator' && selectedPausedCategory && selectedHistoryEntries.size > 0) {
                    intervalsInRepo = historicalIntervalsMap[limit.profileName] || 'NO';
                } else if (activeView === 'calculator' && selectedPausedIntervalType !== 'none') {
                    if (selectedPausedIntervalType === 'quality') intervalsInRepo = limit.intervalsQuality;
                    else if (selectedPausedIntervalType === 'search') intervalsInRepo = limit.intervalsPausedSearch;
                    else if (selectedPausedIntervalType === 'toxic') intervalsInRepo = limit.intervalsToxic;
                    else if (selectedPausedIntervalType === 'other') intervalsInRepo = limit.intervalsOther;
                } else {
                    // Default behavior
                    intervalsInRepo = limit.intervalsInRepo || '';
                    if (!intervalsInRepo) {
                        intervalsInRepo = calculateIntervalComplement(
                            limit.limitActiveSession,
                            [limit.intervalsQuality, limit.intervalsPausedSearch, limit.intervalsToxic, limit.intervalsOther]
                        );
                    }
                }

                const complementaryRepo = calculateIntervalComplement(
                    limit.limitActiveSession,
                    [limit.intervalsQuality, limit.intervalsPausedSearch, limit.intervalsToxic, limit.intervalsOther]
                );

                const activeInRepoCount = getIntervalCount(intervalsInRepo);
                const stepPerSession = rotation > 0 ? Math.round(activeInRepoCount / rotation / numDrops) : 0;
                const ranges = parseRanges(intervalsInRepo);
                const startValue = ranges.length > 0 ? ranges[0][0] : 0;

                return { profileName: limit.profileName, stepPerSession, intervalsInRepo, availableRepo: complementaryRepo, startValue };
            });

            const totalStep = sessions.reduce((sum, s) => sum + s.stepPerSession, 0);
            const isRequest = config.mode === 'request' && category.name.toLowerCase().includes('offer');

            // Build drops array from reporting plan
            const startTime = config.timeConfig.startTime || '09:00';
            const [startH, startM] = startTime.split(':').map(Number);
            const drops = config.drops.map((drop, idx) => {
                let time;
                if (isRequest) {
                    time = 'REQUEST';
                } else if (drop.time) {
                    time = drop.time;
                } else {
                    const dropHour = (startH + idx) % 24;
                    time = `${dropHour.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;
                }
                return { time, value: drop.value || 0 };
            });

            return {
                category,
                sessions,
                totalStep,
                scriptName: config.scriptName || 'Script Name',
                numDrops,
                drops,
                startTime,
                isRequest
            };
        }).filter(catData => catData.category.planConfiguration.status?.toLowerCase() !== 'stopped');
    }, [entity, selectedPausedIntervalType, activeView, selectedPausedCategory, selectedHistoryEntries, intervalHistory]);

    const uniqueIntervalHistory = useMemo(() => {
        const seen = new Set<string>();
        return intervalHistory.filter(entry => {
            if (!entry) return false;
            // Catch simultaneous logs within a 2-second window
            const timeKey = Math.round(new Date(entry.createdAt).getTime() / 2000);
            const key = `${entry.profileName}-${entry.interval}-${entry.pauseType}-${entry.action}-${timeKey}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [intervalHistory]);

    const groupedIntervalHistory = useMemo(() => {
        const groups: Record<string, any[]> = {};
        uniqueIntervalHistory.forEach(entry => {
            const date = new Date(entry.createdAt).toLocaleDateString();
            if (!groups[date]) groups[date] = [];
            groups[date].push(entry);
        });
        // Sort dates descending
        return Object.entries(groups).sort((a, b) =>
            new Date(b[1][0].createdAt).getTime() - new Date(a[1][0].createdAt).getTime()
        );
    }, [uniqueIntervalHistory]);

    // Get today's date string for API calls
    const getTodayDateString = () => {
        const today = new Date();
        return today.toISOString().split('T')[0]
    };

    // Load saved day plan from database
    useEffect(() => {
        const loadDayPlan = async () => {
            try {
                setIsLoading(true);
                const dateStr = getTodayDateString();
                const savedPlans = await dataService.getDayPlan(entity.id, dateStr);

                // Convert saved plans to customSteps and customStarts
                const steps: Record<string, string | number> = {};
                const starts: Record<string, string | number> = {};

                Object.entries(savedPlans).forEach(([categoryId, sessionData]) => {
                    Object.entries(sessionData).forEach(([sessionIdx, data]) => {
                        const key = `${categoryId}:${sessionIdx}`;
                        if (data.step !== undefined) steps[key] = data.step;
                        if (data.start !== undefined) starts[key] = data.start;
                    });
                });

                setCustomSteps(steps);
                setCustomStarts(starts);
            } catch (error) {
                console.error('Failed to load day plan:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadDayPlan();
    }, [entity]);

    // Function to fetch plan for a specific date
    const fetchDayPlanForDate = async (dateStr: string) => {
        if (historyPlans[dateStr]) return; // Already loaded

        try {
            const savedPlans = await dataService.getDayPlan(entity.id, dateStr);
            setHistoryPlans(prev => ({
                ...prev,
                [dateStr]: savedPlans
            }));
        } catch (error) {
            console.error(`Failed to load day plan for ${dateStr}:`, error);
        }
    };

    // Load yesterday's plan on mount
    useEffect(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];
        fetchDayPlanForDate(dateStr);
    }, [entity.id]);

    // Save day plan to database (debounced)
    const saveDayPlan = useCallback(async () => {
        if (isReadOnly) return;

        try {
            setIsSaving(true);
            const dateStr = getTodayDateString();

            // Build plans object by category
            const plans: Record<string, Record<number, { step: string | number; start: string | number }>> = {};

            categoryData.forEach((catData, catIdx) => {
                const categoryId = catData.category.id;
                const sessionData: Record<number, { step: string | number; start: string | number }> = {};

                catData.sessions.forEach((session, sessionIdx) => {
                    const stepKey = `${categoryId}:${sessionIdx}`;
                    const step = customSteps[stepKey] ?? session.stepPerSession;
                    const start = customStarts[stepKey] ?? getDefaultStart(catData, sessionIdx);
                    sessionData[sessionIdx] = { step, start };
                });

                plans[categoryId] = sessionData;
            });

            await dataService.saveDayPlanBulk(entity.id, dateStr, plans as any);
        } catch (error) {
            console.error('Failed to save day plan:', error);
        } finally {
            setIsSaving(false);
        }
    }, [entity.id, customSteps, customStarts, categoryData, isReadOnly]);

    // Auto-save when values change (debounced)
    useEffect(() => {
        if (isReadOnly || isLoading) return;

        const timeout = setTimeout(() => {
            saveDayPlan();
        }, 1000); // 1 second debounce

        return () => clearTimeout(timeout);
    }, [customSteps, customStarts, saveDayPlan, isReadOnly, isLoading]);

    // Calculate default START values based on yesterday's last drop
    const getDefaultStart = (catData: CategoryData, sessionIdx: number, stepsSource: Record<string, string | number> = customSteps): number => {
        const session = catData.sessions[sessionIdx];
        const step = getEffectiveStep(catData.category.id, sessionIdx, session.stepPerSession, stepsSource);
        // Yesterday is dateIdx = 1 (index 1 in dates array), last drop is numDrops - 1
        const yesterdayLastDropIdx = 1 * catData.numDrops + (catData.numDrops - 1);
        const lastInterval = calculateDropInterval(yesterdayLastDropIdx, step, session.intervalsInRepo, catData.numDrops);
        const endValue = getIntervalEndValue(lastInterval);
        return endValue > 0 ? endValue + 1 : session.startValue;
    };

    // Get effective STEP (custom or default)
    const getEffectiveStep = (categoryId: string, sessionIdx: number, defaultStep: number, stepsSource: Record<string, string | number> = customSteps): string | number => {
        const key = `${categoryId}:${sessionIdx}`;
        return stepsSource[key] !== undefined ? stepsSource[key] : defaultStep;
    };

    // Get effective START (custom or calculated from yesterday)
    const getEffectiveStart = (catData: CategoryData, sessionIdx: number, startsSource: Record<string, string | number> = customStarts, stepsSource: Record<string, string | number> = customSteps, manualDefault?: number): string | number => {
        const key = `${catData.category.id}:${sessionIdx}`;
        if (startsSource[key] !== undefined) {
            return startsSource[key];
        }
        if (manualDefault !== undefined) return manualDefault;
        return getDefaultStart(catData, sessionIdx, stepsSource);
    };

    const handleStepChange = (categoryId: string, sessionIdx: number, value: string) => {
        if (isReadOnly) return;
        // Try to parse as simple number first
        const numValue = parseInt(value);
        if (!isNaN(numValue) && value.trim() === numValue.toString()) {
            setCustomSteps(prev => ({ ...prev, [`${categoryId}:${sessionIdx}`]: numValue }));
        } else {
            setCustomSteps(prev => ({ ...prev, [`${categoryId}:${sessionIdx}`]: value }));
        }
    };

    const handleStartChange = (categoryId: string, sessionIdx: number, value: string) => {
        if (isReadOnly) return;
        const numValue = parseInt(value);
        if (!isNaN(numValue) && value.trim() === numValue.toString()) {
            setCustomStarts(prev => ({ ...prev, [`${categoryId}:${sessionIdx}`]: numValue }));
        } else {
            setCustomStarts(prev => ({ ...prev, [`${categoryId}:${sessionIdx}`]: value }));
        }
    };

    // Calculate Plan Handlers
    const handleCalcStepChange = (categoryId: string, sessionIdx: number, value: string) => {
        // Try to parse as simple number first
        const numValue = parseInt(value);
        const sessionKey = `${categoryId}:${sessionIdx}`;

        if (!isNaN(numValue) && value.trim() === numValue.toString()) {
            setCalcSteps(prev => ({ ...prev, [sessionKey]: numValue }));
        } else {
            setCalcSteps(prev => ({ ...prev, [sessionKey]: value }));
        }

        // Clear any previous limit handling for this session to allow re-detection
        setCalcLimitHandling(prev => {
            const next = { ...prev };
            delete next[sessionKey];
            return next;
        });
    };

    const handleCalcStartChange = (categoryId: string, sessionIdx: number, value: string) => {
        const numValue = parseInt(value);
        const sessionKey = `${categoryId}:${sessionIdx}`;

        if (!isNaN(numValue) && value.trim() === numValue.toString()) {
            setCalcStarts(prev => ({ ...prev, [sessionKey]: numValue }));
        } else {
            setCalcStarts(prev => ({ ...prev, [sessionKey]: value }));
        }

        // Clear any previous limit handling for this session to allow re-detection
        setCalcLimitHandling(prev => {
            const next = { ...prev };
            delete next[sessionKey];
            return next;
        });
    };

    const applyCalculatePlan = () => {
        setCustomSteps(calcSteps);
        setCustomStarts(calcStarts);
        // Also copy limit handling choices to apply them to the live plan
        setLimitHandling(calcLimitHandling);
    };

    const handleIntervalTypeChange = (type: 'none' | 'quality' | 'search' | 'toxic' | 'other') => {
        setSelectedPausedIntervalType(type);
        setSelectedPausedCategory(null);
        setSelectedHistoryEntries(new Set());
        setShowPausedIntervalsMenu(false);
        // Reset simulation values when changing interval source
        setCalcSteps({});
        setCalcStarts({});
        setCalcLimitHandling({});
    };

    const handleCategorySelect = async (category: 'Quality' | 'PausedSearch' | 'Toxic' | 'Other') => {
        setIsLoadingHistory(true);
        setSelectedPausedCategory(category);
        try {
            const history = await dataService.getIntervalPauseHistory({
                entityId: entity.id,
                limit: 2000
            });
            // Filter by selected category (case-insensitive for safety)
            const filtered = history.filter(h => h.pauseType?.toLowerCase() === category.toLowerCase());
            setIntervalHistory(filtered);
        } catch (error) {
            console.error('Failed to fetch interval history:', error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleToggleEntry = (id: string) => {
        setSelectedHistoryEntries(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const clearPausedIntervals = () => {
        setSelectedPausedIntervalType('none');
        setSelectedPausedCategory(null);
        setSelectedHistoryEntries(new Set());
        setIntervalHistory([]);
        setCalcSteps({});
        setCalcStarts({});
        setCalcLimitHandling({});
    };

    const toggleDay = (dayKey: string) => {
        setExpandedDays(prev => {
            const newSet = new Set(prev);
            if (newSet.has(dayKey)) newSet.delete(dayKey);
            else newSet.add(dayKey);
            return newSet;
        });
    };

    // Export to XLSX
    const exportToXLSX = (dateKey: string, dateIdx: number) => {
        const wb = XLSX.utils.book_new();

        categoryData.forEach((catData) => {
            const sheetData: any[][] = [];

            // Category header
            sheetData.push([catData.category.name]);

            // SCRIPT NAME row
            sheetData.push(['SCRIPT NAME', '', catData.scriptName]);

            // SESSION NAME row
            sheetData.push(['SESSION NAME', '', ...catData.sessions.map(s => s.profileName)]);

            // INTERVALS IN REPO row
            sheetData.push(['INTERVALS IN REPO', '', ...catData.sessions.map(s => s.intervalsInRepo || '-')]);

            // STEP row
            const steps = catData.sessions.map((s, i) =>
                dateIdx === 0 ? getEffectiveStep(catData.category.id, i, s.stepPerSession) : s.stepPerSession
            );
            sheetData.push(['STEP', '', ...steps]);

            // START row
            const starts = catData.sessions.map((s, i) =>
                dateIdx === 0 ? getEffectiveStart(catData, i) : s.startValue
            );
            sheetData.push(['START', '', ...starts]);

            // Header row
            sheetData.push(['DROPS', 'TIME', ...catData.sessions.map(() => 'Interval')]);

            // Data rows
            catData.drops.forEach((drop, dropIdx) => {
                const intervals = catData.sessions.map((s, i) => {
                    if (dateIdx === 0) {
                        const defaultStart = getDefaultStart(catData, i);
                        return calculateDropIntervalWithStart(dropIdx, steps[i], s.intervalsInRepo, starts[i], defaultStart);
                    }
                    return calculateDropInterval(dateIdx * catData.numDrops + dropIdx, s.stepPerSession, s.intervalsInRepo, catData.numDrops);
                });
                sheetData.push([`drop ${dropIdx + 1}`, drop.time, ...intervals]);
            });

            const ws = XLSX.utils.aoa_to_sheet(sheetData);

            // Set column widths
            ws['!cols'] = [
                { wch: 18 },
                { wch: 10 },
                ...catData.sessions.map(() => ({ wch: 20 }))
            ];

            // Sanitize sheet name (max 31 chars, no special chars)
            const sheetName = catData.category.name.substring(0, 31).replace(/[\\/*?:[\]]/g, '');
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });

        // Generate filename with date
        const dateStr = dateIdx === 0 ? 'today' : new Date(dateKey).toISOString().split('T')[0];
        XLSX.writeFile(wb, `DayPlan_${entity.name}_${dateStr}.xlsx`);
    };

    const copyTableToClipboard = async (dayKey: string, dateIdx: number) => {
        // Determine if we're in calculator mode
        const isCalculateMode = dayKey === 'calculate-plan';

        let tableText = '';
        filteredCategoryData.forEach((catData, catIdx) => {
            // Header: TIME followed by profile names
            tableText += `TIME\t${catData.sessions.map(s => s.profileName).join('\t')}\n`;

            // Determine which data source to use
            let stepsSource = isCalculateMode ? calcSteps : customSteps;
            let startsSource = isCalculateMode ? calcStarts : customStarts;

            catData.drops.forEach((drop, dropIdx) => {
                const intervals = catData.sessions.map((s, i) => {
                    const effectiveStep = getEffectiveStep(catData.category.id, i, s.stepPerSession, stepsSource);
                    const effectiveStart = getEffectiveStart(catData, i, startsSource, stepsSource);

                    let interval = '-';

                    if (isCalculateMode) {
                        // In calculator mode, use the pre-calculated day plan for this session
                        const sessionPlan = calculateSessionPlan(
                            catData,
                            i,
                            stepsSource,
                            startsSource,
                            calcLimitHandling[`${catData.category.id}:${i}`] || 'ignore'
                        );
                        interval = sessionPlan.intervals[dropIdx] || '-';
                    } else {
                        // Normal mode
                        if (dateIdx === 0) {
                            const defaultStart = getDefaultStart(catData, i, stepsSource);
                            interval = calculateDropIntervalWithStart(dropIdx, effectiveStep, s.intervalsInRepo, effectiveStart, defaultStart);
                        } else {
                            interval = calculateDropInterval(dateIdx * catData.numDrops + dropIdx, effectiveStep, s.intervalsInRepo, catData.numDrops);
                        }
                    }

                    return interval;
                });
                // Row: time followed by intervals
                tableText += `${drop.time}\t${intervals.join('\t')}\n`;
            });
            tableText += '\n';
        });

        try {
            await navigator.clipboard.writeText(tableText.trim());
            setCopiedTable(dayKey);
            setTimeout(() => setCopiedTable(null), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const dates = getDateRange();
    const today = dates[0];

    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Filter categories
    const filteredCategoryData = useMemo(() => {
        if (selectedCategory === 'all') return categoryData;
        return categoryData.filter(c => c.category.id === selectedCategory);
    }, [categoryData, selectedCategory]);

    // Scroll synchronization
    const topScrollRef = React.useRef<HTMLDivElement>(null);
    const bottomScrollRef = React.useRef<HTMLDivElement>(null);
    const [contentWidth, setContentWidth] = useState(0);

    const handleScroll = (source: 'top' | 'bottom') => {
        const top = topScrollRef.current;
        const bottom = bottomScrollRef.current;
        if (!top || !bottom) return;

        if (source === 'top') {
            if (bottom.scrollLeft !== top.scrollLeft) {
                bottom.scrollLeft = top.scrollLeft;
            }
        } else {
            if (top.scrollLeft !== bottom.scrollLeft) {
                top.scrollLeft = bottom.scrollLeft;
            }
        }
    };

    const renderCategoryTable = (
        catData: CategoryData,
        dateIdx: number,
        stepsSource: Record<string, string | number>,
        startsSource: Record<string, string | number>,
        onStepChange: (categoryId: string, sessionIdx: number, value: string) => void,
        onStartChange: (categoryId: string, sessionIdx: number, value: string) => void,
        isCalculateMode: boolean,
        date: Date,
        isToday: boolean
    ) => {
        const categorySessionPlans = catData.sessions.map((s, i) => {
            const handling = isCalculateMode
                ? calcLimitHandling[`${catData.category.id}:${i}`]
                : (isToday ? limitHandling[`${catData.category.id}:${i}`] : undefined);

            if (isCalculateMode || (isToday && handling && handling !== 'dismissed') || catData.category.name.toLowerCase().includes('quality')) {
                return calculateSessionPlan(
                    catData,
                    i,
                    stepsSource,
                    startsSource,
                    handling,
                    pausedIntervalChoice
                );
            }
            return null;
        });

        return (
            <div className="overflow-x-visible">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        {/* Category Header */}
                        <tr>
                            <th
                                colSpan={2 + catData.sessions.length}
                                className={`text-white py-2 px-3 text-center font-semibold text-sm border ${catData.category.name.toLowerCase().includes('quality')
                                    ? 'bg-emerald-600 border-emerald-700'
                                    : 'bg-cyan-600 border-cyan-700'
                                    }`}
                            >
                                {catData.category.name}
                            </th>
                        </tr>
                        {/* SCRIPT NAME Row */}
                        <tr className="bg-white">
                            <th colSpan={2} className="py-1.5 px-3 border border-gray-300 text-gray-700 font-medium text-center">SCRIPT NAME</th>
                            <th
                                colSpan={catData.sessions.length}
                                className="py-1.5 px-3 border border-gray-300 text-gray-600 font-normal text-center"
                            >
                                {catData.scriptName}
                            </th>
                        </tr>
                        {/* SESSION NAME Row */}
                        <tr className="bg-white">
                            <th colSpan={2} className="py-1.5 px-3 border border-gray-300 text-gray-700 font-medium text-center">SESSION NAME</th>
                            {catData.sessions.map((s, i) => {
                                const categoriesWithSession = getCategoriesForSession(s.profileName);
                                const isMultiCategory = categoriesWithSession.length > 1;
                                return (
                                    <th key={i} className="py-1.5 px-3 border border-gray-300 text-gray-600 font-normal text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <span>{s.profileName}</span>
                                            {isMultiCategory && (
                                                <span
                                                    className="inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-700 rounded-full"
                                                    title={`In ${categoriesWithSession.length} categories: ${categoriesWithSession.map(c => c.name.replace(' REPORTING', '')).join(', ')}`}
                                                >
                                                    {categoriesWithSession.length}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                        {/* INTERVALS IN REPO Row */}
                        <tr className="bg-white">
                            <th colSpan={2} className="py-1.5 px-3 border border-gray-300 text-gray-700 font-medium text-center">INTERVALS IN REPO</th>
                            {catData.sessions.map((s, i) => (
                                <th key={i} className="py-1.5 px-3 border border-gray-300 text-gray-600 font-mono text-center text-[10px]">
                                    {s.intervalsInRepo || '-'}
                                </th>
                            ))}
                        </tr>
                        {/* STEP Row - Editable for today only */}
                        <tr className="bg-white">
                            <th colSpan={2} className="py-1.5 px-3 border border-gray-300 text-gray-700 font-medium text-center">STEP</th>
                            {catData.sessions.map((s, i) => {
                                const isEditable = isCalculateMode;
                                const effectiveStep = getEffectiveStep(catData.category.id, i, s.stepPerSession, stepsSource);
                                const displayStep = (dateIdx === 0 || isCalculateMode) ? effectiveStep : s.stepPerSession;

                                return (
                                    <th key={i} className="py-1 px-1 border border-gray-300 text-center">
                                        {isEditable ? (
                                            <input
                                                type="text"
                                                value={effectiveStep}
                                                onChange={(e) => onStepChange(catData.category.id, i, e.target.value)}
                                                className="w-full text-center text-amber-600 font-bold bg-amber-50 border border-amber-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                                            />
                                        ) : (
                                            <span className="text-amber-600 font-bold">{displayStep}</span>
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                        {/* START Row - Editable for Calculate Plan only */}
                        <tr className="bg-white">
                            <th colSpan={2} className="py-1.5 px-3 border border-gray-300 text-gray-700 font-medium text-center">START</th>
                            {catData.sessions.map((s, i) => {
                                const isEditable = isCalculateMode;
                                const effectiveStart = (dateIdx === 0 || isCalculateMode) ? getEffectiveStart(catData, i, startsSource, stepsSource, s.startValue) : s.startValue;

                                return (
                                    <th key={i} className="py-1 px-1 border border-gray-300 text-center">
                                        {isEditable ? (
                                            <input
                                                type="text"
                                                value={effectiveStart}
                                                onChange={(e) => onStartChange(catData.category.id, i, e.target.value)}
                                                className="w-full text-center text-gray-700 font-mono bg-blue-50 border border-blue-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                                            />
                                        ) : (
                                            <span className="text-gray-700 font-mono">{effectiveStart}</span>
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                        {/* Column Headers: DROPS | TIME | Interval */}
                        <tr className="bg-cyan-100">
                            <th className="py-2 px-3 border border-gray-300 text-gray-800 font-bold text-center w-32">DROPS</th>
                            <th className="py-2 px-3 border border-gray-300 text-gray-800 font-bold text-center w-24">TIME</th>
                            {catData.sessions.map((_, i) => (
                                <th key={i} className="py-2 px-3 border border-gray-300 text-gray-800 font-bold text-center">
                                    Interval
                                </th>
                            ))}
                        </tr>
                    </thead>
                    {/* Drop Rows */}
                    <tbody>
                        {catData.drops.map((drop, dropIdx) => {
                            const isQualityTable = catData.category.name.toLowerCase().includes('quality');
                            return (
                                <tr key={dropIdx} className={`transition-colors ${isQualityTable ? 'hover:bg-emerald-50/50' : 'hover:bg-blue-50/50'}`}>
                                    <td className="py-1.5 px-3 border border-gray-300 text-center text-gray-600 bg-white">
                                        DROP {dropIdx + 1}
                                    </td>
                                    <td className="py-1.5 px-3 border border-gray-300 text-center font-medium text-gray-700 bg-white">
                                        {drop.time}
                                    </td>
                                    {catData.sessions.map((s, i) => {
                                        const isEditable = isToday || isCalculateMode;
                                        const effectiveStep = getEffectiveStep(catData.category.id, i, s.stepPerSession, stepsSource);
                                        const effectiveStart = getEffectiveStart(catData, i, startsSource, stepsSource, s.startValue);

                                        const dateStr = date.toISOString().split('T')[0];
                                        const hasSavedPlan = !isToday && !isCalculateMode && !!historyPlans[dateStr];

                                        let interval = '-';
                                        let actualStep: number | null = null;
                                        let isLimitAlert = false;
                                        let isSimulationCell = false;

                                        const sessionPlan = categorySessionPlans[i];

                                        if (sessionPlan) {
                                            interval = sessionPlan.intervals[dropIdx] || '-';
                                            actualStep = sessionPlan.actualSteps[dropIdx] || null;
                                            isSimulationCell = sessionPlan.isHistory[dropIdx];
                                            if (sessionPlan.alert && dropIdx === sessionPlan.alertDropIdx) {
                                                isLimitAlert = true;
                                            }
                                        } else {
                                            interval = (isEditable || hasSavedPlan)
                                                ? calculateDropIntervalWithStart(dropIdx, effectiveStep, s.intervalsInRepo, effectiveStart, getDefaultStart(catData, i))
                                                : calculateDropInterval(dateIdx * catData.numDrops + dropIdx, effectiveStep, s.intervalsInRepo, catData.numDrops);
                                        }

                                        const normalStep = getStepForDrop(dropIdx, effectiveStep);

                                        return (
                                            <td key={i} className={`py-1.5 px-3 border border-gray-300 text-center font-mono ${isLimitAlert ? 'text-amber-600 font-bold bg-amber-50' : isSimulationCell ? 'bg-emerald-50/60 text-gray-800' : 'bg-white text-gray-800'}`}>
                                                <div className="flex flex-col items-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <span>{interval}</span>
                                                        {isCalculateMode && actualStep !== null && actualStep !== normalStep && (
                                                            <span className="text-[9px] text-indigo-500 font-bold whitespace-nowrap">
                                                                (stp: {actualStep})
                                                            </span>
                                                        )}
                                                    </div>
                                                    {isLimitAlert && (
                                                        <div className="text-[9px] text-amber-500 mt-0.5 font-bold uppercase tracking-tighter">Limit Reached</div>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    // New helper to calculate the entire day's plan for a session with limit handling
    const calculateSessionPlan = (
        catData: CategoryData,
        sessionIdx: number,
        stepsSource: Record<string, string | number>,
        startsSource: Record<string, string | number>,
        handling: LimitHandlingOption,
        piChoice: 'continue' | 'duplicate' = 'continue'
    ): { intervals: string[], actualSteps: number[], isHistory: boolean[], alert?: SessionLimitAlert, alertDropIdx?: number } => {
        const session = catData.sessions[sessionIdx];
        let rangeStr = session.intervalsInRepo;

        // If 'duplicate' mode is on and we are using paused intervals, we treat them as wrapping without alert
        const usingPaused = (activeView === 'calculator' && selectedPausedIntervalType !== 'none') || selectedHistoryEntries.size > 0;

        const ranges = parseRanges(rangeStr);
        if (ranges.length === 0) return { intervals: Array(catData.numDrops).fill('-'), actualSteps: Array(catData.numDrops).fill(0), isHistory: Array(catData.numDrops).fill(false) };

        const stepConfig = getEffectiveStep(catData.category.id, sessionIdx, session.stepPerSession, stepsSource);
        const startConfig = getEffectiveStart(catData, sessionIdx, startsSource, stepsSource, session.startValue);
        const defaultStart = getDefaultStart(catData, sessionIdx, stepsSource);

        // --- PHASE 1: DETECTION (Simulate with 'ignore' to find the wrap point) ---
        let detectPos = typeof startConfig === 'number' ? startConfig : defaultStart;
        let alert: SessionLimitAlert | undefined;
        let alertDropIdx: number | undefined;

        for (let drop = 0; drop < catData.numDrops; drop++) {
            const override = getStartOverride(drop, startConfig);
            if (override !== null) detectPos = override;

            let rIdx = ranges.findIndex(([s, e]) => detectPos >= s && detectPos <= e);
            if (rIdx === -1) {
                rIdx = ranges.findIndex(([s]) => s > detectPos);
                if (rIdx === -1) rIdx = 0;
                detectPos = ranges[rIdx][0];
            }

            const [rStart, rEnd] = ranges[rIdx];
            const isOverflow = piChoice === 'continue' && detectPos > rEnd && rIdx === ranges.length - 1;

            let detRanges = ranges;
            let detRIdx = rIdx;
            let detPos = detectPos;

            if (isOverflow) {
                const resumeRanges = parseRanges(session.availableRepo);
                const resumeIdx = resumeRanges.findIndex(([s, e]) => detPos >= s && detPos <= e);
                if (resumeIdx !== -1) {
                    detRanges = resumeRanges;
                    detRIdx = resumeIdx;
                } else {
                    const nextRIdx = resumeRanges.findIndex(([s]) => s > detPos);
                    if (nextRIdx !== -1) {
                        detRanges = resumeRanges;
                        detRIdx = nextRIdx;
                        detPos = detRanges[detRIdx][0];
                    }
                }
            }

            const [curRStart, curREnd] = detRanges[detRIdx];
            const avail = (piChoice === 'continue' && detRanges === ranges && detRIdx === ranges.length - 1 && detPos > curREnd)
                ? Infinity
                : (curREnd - detPos + 1);

            const step = getStepForDrop(drop, stepConfig);

            if (step > 0 && avail < step) {
                // If using paused intervals and choice is 'duplicate', don't alert, just wrap
                if (usingPaused && piChoice === 'duplicate') {
                    // Continue simulation
                } else {
                    // This drop WRAPS in 'ignore' mode
                    alert = {
                        sessionId: `${catData.category.id}:${sessionIdx}`,
                        sessionName: session.profileName,
                        limit: curREnd,
                        lastInterval: `${detPos}-${curREnd}`,
                        remainingSeeds: avail
                    };
                    alertDropIdx = drop;
                    break;
                }
            }

            if (step > 0) {
                detectPos = detPos + step;
                if (detectPos > curREnd) {
                    const isLast = detRIdx === detRanges.length - 1;
                    if (isLast) {
                        if (piChoice === 'continue' && detRanges === ranges) {
                            const resRanges = parseRanges(session.availableRepo);
                            if (resRanges.length > 0) {
                                detectPos = resRanges[0][0];
                            }
                        } else {
                            detectPos = detRanges[0][0];
                        }
                    } else {
                        detectPos = detRanges[detRIdx + 1][0];
                    }
                }
            }
        }

        // --- PHASE 2: CALCULATION (Apply handling options) ---
        let currentPosition = typeof startConfig === 'number' ? startConfig : defaultStart;
        const intervals: string[] = [];
        const actualSteps: number[] = [];
        const isHistory: boolean[] = [];
        let carryOverStep: number | null = null;
        let plannedDropIdx = 0;
        const isQualityContext = catData.category.name.toLowerCase().includes('quality') ||
            (activeView === 'calculator' && (selectedPausedCategory === 'Quality' || selectedPausedIntervalType === 'quality'));

        // Effective handling: if not specified and piChoice is 'duplicate', we default to 'ignore' (wrap)
        // If 'continue', we default to undefined (which triggers spill-over in the else block)
        const effectiveHandling = handling || (piChoice === 'duplicate' ? 'ignore' : undefined);

        // Pre-calculate split for 'split_today'
        let extraPerDrop = 0;
        let splitRemainder = 0;
        if (effectiveHandling === 'split_today' && alert && alertDropIdx > 0) {
            extraPerDrop = Math.floor(alert.remainingSeeds / alertDropIdx);
            splitRemainder = alert.remainingSeeds % alertDropIdx;
        }

        for (let drop = 0; drop < catData.numDrops; drop++) {
            // Only apply overrides if we're not in the middle of a carry-over
            if (carryOverStep === null) {
                const override = getStartOverride(plannedDropIdx, startConfig);
                if (override !== null) currentPosition = override;
            }

            let rangeIdx = ranges.findIndex(([start, end]) => currentPosition >= start && currentPosition <= end);
            if (rangeIdx === -1) {
                // If not found, try to find the next valid start
                rangeIdx = ranges.findIndex(([start]) => start > currentPosition);
                if (rangeIdx === -1) {
                    // We are past all ranges
                    if (piChoice === 'continue') {
                        // In continue mode, we stay past all ranges and just use the currentPosition
                        rangeIdx = ranges.length - 1;
                    } else {
                        // Wrap to first
                        rangeIdx = 0;
                        currentPosition = ranges[rangeIdx][0];
                    }
                } else {
                    currentPosition = ranges[rangeIdx][0];
                }
            }

            const [rangeStart, rangeEnd] = ranges[rangeIdx];
            const isOverflow = piChoice === 'continue' && currentPosition > rangeEnd && rangeIdx === ranges.length - 1;

            let currentRanges = ranges;
            let currentRIdx = rangeIdx;

            if (isOverflow) {
                // If we are past the current simulation set, try to find the next valid seed in the normal available repo
                const resumeRanges = parseRanges(session.availableRepo);
                const resumeRIdx = resumeRanges.findIndex(([s, e]) => currentPosition >= s && currentPosition <= e);

                if (resumeRIdx !== -1) {
                    currentRanges = resumeRanges;
                    currentRIdx = resumeRIdx;
                } else {
                    // Look for the absolute next valid seed in the available repo that is > currentPosition
                    const nextAvailableRIdx = resumeRanges.findIndex(([s]) => s > currentPosition);
                    if (nextAvailableRIdx !== -1) {
                        currentRanges = resumeRanges;
                        currentRIdx = nextAvailableRIdx;
                        currentPosition = currentRanges[currentRIdx][0];
                    }
                }
            }

            const [effStart, effEnd] = currentRanges[currentRIdx];
            const availableInRange = (piChoice === 'continue' && currentRanges === ranges && currentRIdx === ranges.length - 1 && currentPosition > effEnd)
                ? Infinity
                : (effEnd - currentPosition + 1);

            let currentStep: number;
            if (carryOverStep !== null) {
                // Use the remainder from the previous drop
                currentStep = carryOverStep;
                carryOverStep = null;
            } else {
                // Get fresh step from config
                currentStep = getStepForDrop(plannedDropIdx, stepConfig);

                // Option: Split Today (Distribute across PRECEDING drops)
                if (effectiveHandling === 'split_today' && alert && plannedDropIdx < alertDropIdx) {
                    currentStep += extraPerDrop;
                    if (plannedDropIdx < splitRemainder) currentStep += 1;
                }

                plannedDropIdx++;
            }

            // Options: Use This Drop / Use Next Drop (Original behaviors)
            if (carryOverStep === null) { // Only apply if not already splitting
                if (effectiveHandling === 'this_drop' && alert && plannedDropIdx === alertDropIdx) {
                    intervals.push(`${currentPosition}-${effEnd}`);
                    actualSteps.push(availableInRange);
                    isHistory.push(currentRanges === ranges && isQualityContext);

                    const isLast = currentRIdx === currentRanges.length - 1;
                    if (isLast) {
                        if (piChoice === 'continue' && currentRanges === ranges) {
                            const resRanges = parseRanges(session.availableRepo);
                            if (resRanges.length > 0) {
                                currentPosition = resRanges[0][0];
                            }
                        } else {
                            currentPosition = currentRanges[0][0];
                        }
                    } else {
                        currentPosition = currentRanges[currentRIdx + 1][0];
                    }
                    continue;
                }

                if (effectiveHandling === 'next_drop' && alert && plannedDropIdx === alertDropIdx + 1) {
                    intervals.push(`${currentPosition}-${effEnd}`);
                    actualSteps.push(availableInRange);
                    isHistory.push(currentRanges === ranges && isQualityContext);

                    const isLast = currentRIdx === currentRanges.length - 1;
                    if (isLast) {
                        if (piChoice === 'continue' && currentRanges === ranges) {
                            const resRanges = parseRanges(session.availableRepo);
                            if (resRanges.length > 0) {
                                currentPosition = resRanges[0][0];
                            }
                        } else {
                            currentPosition = currentRanges[0][0];
                        }
                    } else {
                        currentPosition = currentRanges[currentRIdx + 1][0];
                    }
                    continue;
                }
            }

            // Normal calculation (with SPILL OVER wrap)
            if (currentStep <= 0) {
                intervals.push('-');
                actualSteps.push(0);
            } else if (availableInRange >= currentStep) {
                const endVal = currentPosition + currentStep - 1;
                intervals.push(`${currentPosition}-${endVal}`);
                actualSteps.push(currentStep);
                isHistory.push(currentRanges === ranges && isQualityContext);
                currentPosition = endVal + 1;

                // Navigation to next range
                const [curRStart, curREnd] = currentRanges[currentRIdx];
                if (currentPosition > curREnd) {
                    const isLast = currentRIdx === currentRanges.length - 1;
                    if (isLast) {
                        if (piChoice === 'continue') {
                            if (currentRanges === ranges) {
                                // Transition from simulation set to normal repo
                                const resumeRanges = parseRanges(session.availableRepo);
                                if (resumeRanges.length > 0) {
                                    currentRanges = resumeRanges;
                                    currentRIdx = 0;
                                    currentPosition = currentRanges[0][0];
                                }
                            }
                        } else {
                            currentRIdx = 0;
                            currentPosition = currentRanges[0][0];
                        }
                    } else {
                        currentRIdx++;
                        currentPosition = currentRanges[currentRIdx][0];
                    }
                }
            } else {
                // Wrap condition: availableInRange < currentStep
                if (effectiveHandling === 'ignore') {
                    // Skip leftovers and wrap immediately
                    const isLast = currentRIdx === currentRanges.length - 1;
                    if (isLast) {
                        if (piChoice === 'continue' && currentRanges === ranges) {
                            const resumeRanges = parseRanges(session.availableRepo);
                            if (resumeRanges.length > 0) {
                                currentPosition = resumeRanges[0][0];
                            }
                        } else {
                            currentPosition = currentRanges[0][0];
                        }
                    } else {
                        currentPosition = currentRanges[currentRIdx + 1][0];
                    }

                    // Calculate from the new start position
                    const endVal = currentPosition + currentStep - 1;
                    intervals.push(`${currentPosition}-${endVal}`);
                    actualSteps.push(currentStep);
                    isHistory.push(currentRanges === ranges && isQualityContext);
                    currentPosition = endVal + 1;
                } else {
                    // DEFAULT: Spill over to the next drop
                    intervals.push(`${currentPosition}-${effEnd}`);
                    actualSteps.push(availableInRange);
                    isHistory.push(currentRanges === ranges && isQualityContext);

                    // Carry over the remainder to the next iteration (next row)
                    carryOverStep = currentStep - availableInRange;

                    const isLast = currentRIdx === currentRanges.length - 1;
                    if (isLast) {
                        if (piChoice === 'continue' && currentRanges === ranges) {
                            const resumeRanges = parseRanges(session.availableRepo);
                            if (resumeRanges.length > 0) {
                                currentPosition = resumeRanges[0][0];
                            }
                        } else {
                            currentPosition = currentRanges[0][0];
                        }
                    } else {
                        currentPosition = currentRanges[currentRIdx + 1][0];
                    }
                }
            }
        }

        return { intervals, actualSteps, isHistory, alert, alertDropIdx };
    };

    const renderDaySection = (
        date: Date,
        dateIdx: number,
        isToday: boolean = false,
        titleOverride?: string,
        isCalculateMode: boolean = false
    ) => {
        const dayKey = titleOverride ? 'calculate-plan' : (isToday ? 'today' : date.toISOString().split('T')[0]);
        const isExpanded = expandedDays.has(dayKey);

        // Determine which data source to use
        let stepsSource = isCalculateMode ? calcSteps : customSteps;
        let startsSource = isCalculateMode ? calcStarts : customStarts;

        // If it's a historical date (not today and not calculator), use historyPlans if available
        if (!isToday && !isCalculateMode) {
            const dateStr = date.toISOString().split('T')[0];
            const savedPlan = historyPlans[dateStr];
            if (savedPlan) {
                // Transform savedPlan into the flat Record format used by the table
                const histSteps: Record<string, string | number> = {};
                const histStarts: Record<string, string | number> = {};

                Object.entries(savedPlan).forEach(([catId, sessions]) => {
                    Object.entries(sessions).forEach(([idx, data]) => {
                        const key = `${catId}:${idx}`;
                        histSteps[key] = data.step;
                        histStarts[key] = data.start;
                    });
                });

                stepsSource = histSteps;
                startsSource = histStarts;
            }
        }

        const onStepChange = isCalculateMode ? handleCalcStepChange : handleStepChange;
        const onStartChange = isCalculateMode ? handleCalcStartChange : handleStartChange;

        return (
            <div key={dayKey} className="border border-gray-200 rounded-lg overflow-hidden mb-3">
                {/* Day Header */}
                <button
                    onClick={() => toggleDay(dayKey)}
                    className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${isCalculateMode
                        ? 'bg-teal-600 text-white hover:bg-teal-700'
                        : isToday
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-gray-50 text-gray-800 hover:bg-gray-100'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Calendar size={16} />
                        <span className="font-semibold">
                            {titleOverride || (isToday ? 'TASK TODAY' : formatDate(date))}
                        </span>
                        {isToday && !titleOverride && <span className="text-indigo-200 text-sm ml-2">{formatDate(date)}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        {isExpanded && (
                            <>
                                {/* Apply Calculate Plan Button */}
                                {isCalculateMode && (
                                    <div className="flex items-center gap-2 mr-2">
                                        {/* Work with Paused Intervals Button & Dropdown */}
                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowPausedIntervalsMenu(!showPausedIntervalsMenu);
                                                }}
                                                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold shadow-sm transition-all border ${selectedHistoryEntries.size > 0 || selectedPausedIntervalType !== 'none'
                                                    ? 'bg-amber-100 text-amber-700 border-amber-300'
                                                    : 'bg-white text-teal-700 border-white hover:bg-teal-50'
                                                    }`}
                                            >
                                                <Activity size={12} />
                                                {selectedHistoryEntries.size > 0
                                                    ? `Using: ${selectedPausedCategory} (${selectedHistoryEntries.size})`
                                                    : selectedPausedIntervalType === 'none'
                                                        ? 'Work with Paused Intervals'
                                                        : `Using: ${selectedPausedIntervalType.charAt(0).toUpperCase() + selectedPausedIntervalType.slice(1)}`}
                                                <ChevronDown size={12} className={`transition-transform duration-200 ${showPausedIntervalsMenu ? 'rotate-180' : ''}`} />
                                            </button>

                                            <AnimatePresence>
                                                {showPausedIntervalsMenu && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 p-0 z-50 ring-1 ring-black/5 overflow-hidden"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {!selectedPausedCategory ? (
                                                            <div className="py-1">
                                                                <div className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">
                                                                    Select Category
                                                                </div>
                                                                <button
                                                                    onClick={() => handleIntervalTypeChange('none')}
                                                                    className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-gray-50 ${selectedPausedIntervalType === 'none' && !selectedPausedCategory ? 'text-teal-600 font-bold bg-teal-50/50' : 'text-gray-600'
                                                                        }`}
                                                                >
                                                                    <span>Use Active Intervals</span>
                                                                    {selectedPausedIntervalType === 'none' && !selectedPausedCategory && <Check size={14} />}
                                                                </button>
                                                                {[
                                                                    { id: 'Quality', label: 'Intervals Quality' },
                                                                    { id: 'PausedSearch', label: 'Intervals Paused Search' },
                                                                    { id: 'Toxic', label: 'Interval Toxic' },
                                                                    { id: 'Other', label: 'Other Intervals' }
                                                                ].map((opt) => (
                                                                    <button
                                                                        key={opt.id}
                                                                        onClick={() => handleCategorySelect(opt.id as any)}
                                                                        className="w-full flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-gray-50 text-gray-600"
                                                                    >
                                                                        <span>{opt.label}</span>
                                                                        <ChevronRight size={14} className="text-gray-300" />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col h-[400px]">
                                                                <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                                                    <button
                                                                        onClick={() => setSelectedPausedCategory(null)}
                                                                        className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase flex items-center gap-1"
                                                                    >
                                                                        <ArrowLeft size={10} /> Back
                                                                    </button>
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-md p-0.5 shadow-sm relative z-[60]">
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => { e.stopPropagation(); setPausedIntervalChoice('continue'); }}
                                                                                className={`px-2 py-0.5 text-[8px] font-black rounded transition-all duration-200 ${pausedIntervalChoice === 'continue' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                                                                                title="Continue from last interval"
                                                                            >
                                                                                CONTINUE
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => { e.stopPropagation(); setPausedIntervalChoice('duplicate'); }}
                                                                                className={`px-2 py-0.5 text-[8px] font-black rounded transition-all duration-200 ${pausedIntervalChoice === 'duplicate' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                                                                                title="Duplicate intervals"
                                                                            >
                                                                                DUPLICATE
                                                                            </button>
                                                                        </div>
                                                                        <div className="text-[10px] font-black text-gray-800 uppercase tracking-wider">
                                                                            {selectedPausedCategory} History
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-gray-200">
                                                                    {isLoadingHistory ? (
                                                                        <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                                                                            <RefreshCw size={20} className="animate-spin" />
                                                                            <span className="text-[10px] uppercase font-bold tracking-widest">Loading...</span>
                                                                        </div>
                                                                    ) : intervalHistory.length === 0 ? (
                                                                        <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center px-4">
                                                                            <Activity size={24} className="mb-2 opacity-20" />
                                                                            <span className="text-[10px] uppercase font-bold tracking-widest leading-relaxed">No history found for this category</span>
                                                                        </div>
                                                                    ) : (
                                                                        groupedIntervalHistory.map(([date, entries]) => (
                                                                            <div key={date} className="space-y-1 mb-4">
                                                                                <div className="px-2 py-1 flex items-center gap-2">
                                                                                    <div className="h-px flex-1 bg-gray-100"></div>
                                                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{date}</span>
                                                                                    <div className="h-px flex-1 bg-gray-100"></div>
                                                                                </div>
                                                                                {entries.map((entry) => (
                                                                                    <button
                                                                                        key={entry.id}
                                                                                        onClick={() => handleToggleEntry(entry.id)}
                                                                                        className={`w-full flex items-start gap-2 p-2 rounded-lg transition-all text-left border ${selectedHistoryEntries.has(entry.id)
                                                                                            ? 'bg-teal-50 border-teal-200 ring-1 ring-teal-500/10'
                                                                                            : 'bg-white border-transparent hover:border-gray-200'
                                                                                            }`}
                                                                                    >
                                                                                        <div className={`mt-0.5 w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors ${selectedHistoryEntries.has(entry.id) ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white border-gray-300'
                                                                                            }`}>
                                                                                            {selectedHistoryEntries.has(entry.id) && <Check size={10} strokeWidth={4} />}
                                                                                        </div>
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <div className="flex items-center justify-between mb-0.5">
                                                                                                <span className="text-[10px] font-black text-gray-800 truncate">{entry.profileName}</span>
                                                                                                <span className="text-[8px] font-bold text-gray-400 uppercase">{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                                            </div>
                                                                                            <div className="text-[11px] font-bold text-teal-600 break-all leading-tight">
                                                                                                {entry.interval}
                                                                                            </div>
                                                                                            <div className="flex items-center justify-between mt-1">
                                                                                                <div className="flex items-center gap-1 opacity-60">
                                                                                                    <User size={8} />
                                                                                                    <span className="text-[8px] font-bold text-gray-500">{entry.username}</span>
                                                                                                </div>
                                                                                                {entry.batchId && (
                                                                                                    <span className="text-[7px] font-medium text-gray-300 uppercase">Batch: {entry.batchId.substring(0, 4)}</span>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>

                                                                <div className="p-2 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => setSelectedHistoryEntries(new Set())}
                                                                        className="flex-1 py-1.5 text-[10px] font-bold text-gray-500 hover:text-gray-700 uppercase"
                                                                    >
                                                                        Clear
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setShowPausedIntervalsMenu(false)}
                                                                        disabled={selectedHistoryEntries.size === 0}
                                                                        className={`flex-[2] py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-lg ${selectedHistoryEntries.size > 0
                                                                            ? 'bg-teal-600 text-white shadow-teal-500/20 hover:bg-teal-700'
                                                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                                            }`}
                                                                    >
                                                                        Generate Plan
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                applyCalculatePlan();
                                            }}
                                            className="flex items-center gap-1 px-3 py-1 bg-white text-teal-700 text-xs font-bold rounded shadow-sm hover:bg-teal-50 transition-colors"
                                        >
                                            Apply Plan
                                        </button>
                                    </div>
                                )}

                                {/* Export to XLSX button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); exportToXLSX(dayKey, dateIdx); }}
                                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${isCalculateMode
                                        ? 'bg-green-500 text-white hover:bg-green-400'
                                        : isToday
                                            ? 'bg-green-500 hover:bg-green-400 text-white'
                                            : 'bg-green-100 hover:bg-green-200 text-green-700'
                                        }`}
                                >
                                    <FileSpreadsheet size={12} />
                                    Export XLSX
                                </button>
                                {/* Copy button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); copyTableToClipboard(dayKey, dateIdx); }}
                                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${isCalculateMode
                                        ? 'bg-teal-800 text-teal-50 hover:bg-teal-900'
                                        : isToday
                                            ? 'bg-indigo-500 hover:bg-indigo-400 text-white'
                                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                        }`}
                                >
                                    {copiedTable === dayKey ? <Check size={12} /> : <Copy size={12} />}
                                    {copiedTable === dayKey ? 'Copied' : 'Copy'}
                                </button>
                                {/* Saving indicator */}
                                {isSaving && isToday && !isCalculateMode && (
                                    <span className="text-xs text-indigo-200 animate-pulse">Saving...</span>
                                )}
                                {/* Read-only badge */}
                                {isReadOnly && isToday && (
                                    <span className="flex items-center gap-1 text-xs text-yellow-200">
                                        <Lock size={10} /> Read Only
                                    </span>
                                )}
                            </>
                        )}
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                </button>

                {/* Day Content */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden"
                        >
                            <div className="p-4 bg-white">
                                {/* Horizontal scroll container for multiple categories */}
                                <div className="relative">
                                    {/* Scroll hint - only show if multiple categories */}
                                    {filteredCategoryData.length > 2 && (
                                        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
                                    )}

                                    {/* Top Scrollbar */}
                                    <div
                                        ref={topScrollRef}
                                        onScroll={() => handleScroll('top')}
                                        className="overflow-x-auto pb-1 mb-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                                    >
                                        <div style={{ width: contentWidth, height: '1px' }}></div>
                                    </div>

                                    {/* Content Table */}
                                    <div
                                        ref={bottomScrollRef}
                                        onScroll={() => handleScroll('bottom')}
                                        className="overflow-x-auto pb-2 scrollbar-hidden" // Hide bottom scrollbar
                                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Hide scrollbar for Firefox/IE
                                    >
                                        <div className="flex gap-6" style={{ minWidth: 'max-content' }}>
                                            {filteredCategoryData.map(catData => (
                                                <div
                                                    key={catData.category.id}
                                                    className="flex-shrink-0"
                                                    style={{ minWidth: `${Math.max(350, catData.sessions.length * 120 + 150)}px` }}
                                                >
                                                    {renderCategoryTable(
                                                        catData,
                                                        dateIdx,
                                                        stepsSource,
                                                        startsSource,
                                                        onStepChange,
                                                        onStartChange,
                                                        isCalculateMode,
                                                        date,
                                                        isToday
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };


    const toggleCalculatePlan = () => {
        if (!showCalculatePlan) {
            // Opening: sync with current custom values
            setCalcSteps(customSteps);
            setCalcStarts(customStarts);
        }
        setShowCalculatePlan(!showCalculatePlan);
    };



    return (
        <div className="space-y-6">
            {/* Ultra-Compact Day Plan Header */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/30 overflow-hidden">
                {/* Compact Purple Header */}
                <div className="bg-[#6366f1] px-5 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-lg">
                                <Calendar className="text-white" size={16} />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-white tracking-tight">Day Plan</h2>
                                <p className="text-indigo-100 text-[10px] font-medium">Daily task intervals for {entity.name}</p>
                            </div>
                        </div>

                        {/* Compact Filter Pill */}
                        <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-wider">Filter</span>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="text-[11px] font-bold bg-transparent text-slate-700 border-none focus:ring-0 cursor-pointer pr-6"
                            >
                                <option value="all">All Categories</option>
                                {entity.reporting.parentCategories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Minimal Stats Cards */}
                <div className="p-4 bg-gradient-to-b from-slate-50/50 to-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {filteredCategoryData.map((catData) => (
                            <div
                                key={catData.category.id}
                                className="group bg-white rounded-xl p-3 border border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-md transition-all duration-200 relative"
                            >
                                {/* Subtle Left Accent */}
                                <div className="absolute top-3 bottom-3 left-0 w-0.5 bg-indigo-400 rounded-r-full" />

                                <div className="pl-2.5">
                                    {/* Category Name */}
                                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 truncate">
                                        {catData.category.name.replace(' REPORTING', '')}
                                    </div>

                                    {/* Main Session Count */}
                                    <div className="flex items-baseline gap-1.5 mb-2">
                                        <span className="text-2xl font-black text-slate-900">{catData.sessions.length}</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Sessions</span>
                                    </div>

                                    {/* Compact Info Row */}
                                    <div className="flex items-center gap-2 text-[9px] font-medium text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <div className="w-1 h-1 bg-indigo-400 rounded-full" />
                                            <span>{catData.numDrops} Drops</span>
                                        </div>
                                        <div className="w-px h-2.5 bg-slate-200" />
                                        <div className="flex items-center gap-1">
                                            <div className="w-1 h-1 bg-emerald-400 rounded-full" />
                                            <span>Step: <span className="text-slate-700 font-bold">{catData.totalStep}</span></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center justify-center -my-2 z-10 relative">
                <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-sm">
                    <button
                        onClick={() => setActiveView('history')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${activeView === 'history'
                            ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <FileText size={14} />
                        Plan History
                    </button>
                    <button
                        onClick={() => setActiveView('calculator')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${activeView === 'calculator'
                            ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Calculator size={14} />
                        Plan Calculator
                    </button>
                </div>
            </div>

            {/* Tables */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
                {activeView === 'calculator' ? (
                    /* Plan Calculator Section (Simulation Mode) */
                    <div className="bg-amber-50/20 rounded-xl p-5 border-2 border-dashed border-amber-200 relative overflow-hidden">
                        {/* Watermark/Badge */}
                        <div className="absolute top-0 right-0 bg-amber-100 text-amber-700 text-[10px] font-black px-3 py-1 rounded-bl-lg uppercase tracking-widest shadow-sm">
                            Simulation Mode
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-amber-100 rounded-lg">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-600">
                                    <rect x="4" y="2" width="16" height="20" rx="2" />
                                    <line x1="8" y1="6" x2="16" y2="6" />
                                    <line x1="8" y1="10" x2="16" y2="10" />
                                    <line x1="8" y1="14" x2="16" y2="14" />
                                    <line x1="8" y1="18" x2="16" y2="18" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-amber-800 uppercase tracking-tight">Plan Calculator</h3>
                                <p className="text-[11px] text-amber-600 font-medium">Test configurations without affecting the live plan</p>
                            </div>
                        </div>

                        <div className="bg-white/60 border border-amber-100 rounded-lg p-3 mb-5 text-[11px] text-amber-800 shadow-sm">
                            <div className="flex items-start gap-2">
                                <div className="mt-0.5 text-amber-500 font-bold">💡</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <span className="font-bold underline decoration-amber-200">Variable Step:</span>
                                        <span className="font-mono bg-amber-100/50 px-1 rounded ml-1">1-3:10, 4:20</span>
                                        <p className="text-amber-600/80 mt-0.5 italic">Drops 1-3 use step 10, Drop 4 uses 20.</p>
                                    </div>
                                    <div>
                                        <span className="font-bold underline decoration-amber-200">Variable Start:</span>
                                        <span className="font-mono bg-amber-100/50 px-1 rounded ml-1">1:100, 5:500</span>
                                        <p className="text-amber-600/80 mt-0.5 italic">Drop 1 starts at 100, Drop 5 jumps to 500.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Session Limit Alerts */}
                        {(() => {
                            const alerts: SessionLimitAlert[] = [];
                            filteredCategoryData.forEach(catData => {
                                catData.sessions.forEach((_, i) => {
                                    const sessionId = `${catData.category.id}:${i}`;
                                    // If dismissed, don't even add to the alerts list
                                    if (calcLimitHandling[sessionId] === 'dismissed') return;

                                    const plan = calculateSessionPlan(
                                        catData,
                                        i,
                                        calcSteps,
                                        calcStarts,
                                        calcLimitHandling[sessionId],
                                        pausedIntervalChoice
                                    );
                                    if (plan.alert) {
                                        alerts.push(plan.alert);
                                    }
                                });
                            });

                            if (alerts.length === 0) return null;

                            return (
                                <div className="mb-6 space-y-3">
                                    <div className="flex items-center gap-2 text-amber-700 font-black text-xs uppercase tracking-wider mb-2">
                                        <AlertTriangle size={14} />
                                        Session Limit Alerts ({alerts.length})
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {alerts.map(alert => {
                                            const isResolved = !!calcLimitHandling[alert.sessionId];
                                            const usingPaused = (activeView === 'calculator' && selectedPausedIntervalType !== 'none') || selectedHistoryEntries.size > 0;
                                            const selectedOpt = [
                                                { id: 'ignore', label: usingPaused ? 'Duplicate Mode' : 'Ignore Seeds' },
                                                { id: 'this_drop', label: 'Use This Drop' },
                                                { id: 'next_drop', label: 'Use Next Drop' },
                                                { id: 'split_today', label: 'Split Today' }
                                            ].find(o => o.id === calcLimitHandling[alert.sessionId]);

                                            if (isResolved) {
                                                return (
                                                    <div key={alert.sessionId} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 flex items-center justify-between shadow-sm">
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-green-100 text-green-700 p-1 rounded-full">
                                                                <Check size={12} />
                                                            </div>
                                                            <div>
                                                                <span className="text-xs font-black text-slate-700">{alert.sessionName}</span>
                                                                <span className="text-[10px] text-slate-400 ml-2 font-bold uppercase tracking-tighter">
                                                                    Handled: <span className="text-indigo-600">{selectedOpt?.label}</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => setCalcLimitHandling(prev => {
                                                                    const next = { ...prev };
                                                                    delete next[alert.sessionId];
                                                                    return next;
                                                                })}
                                                                className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest"
                                                            >
                                                                Change
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={alert.sessionId} className="bg-white border-2 border-amber-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                                                    {/* Dismiss Button */}
                                                    <button
                                                        onClick={() => setCalcLimitHandling(prev => ({ ...prev, [alert.sessionId]: 'dismissed' }))}
                                                        className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                        title="Dismiss Alert"
                                                    >
                                                        <X size={16} />
                                                    </button>

                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Limit Reached</div>
                                                            <div className="text-sm font-black text-slate-800">{alert.sessionName}</div>
                                                        </div>
                                                        <div className="bg-amber-100 text-amber-700 px-2 py-1 rounded-lg text-[10px] font-bold">
                                                            {alert.remainingSeeds} seeds unused
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 mb-4 text-[11px]">
                                                        <div className="bg-slate-50 p-2 rounded-xl">
                                                            <div className="text-slate-400 font-bold uppercase text-[9px] mb-1">Limit</div>
                                                            <div className="font-mono font-bold text-slate-700">{alert.limit}</div>
                                                        </div>
                                                        <div className="bg-slate-50 p-2 rounded-xl">
                                                            <div className="text-slate-400 font-bold uppercase text-[9px] mb-1">Last Interval</div>
                                                            <div className="font-mono font-bold text-slate-700">{alert.lastInterval}</div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Handling Option</div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {(() => {
                                                                const usingPaused = (activeView === 'calculator' && selectedPausedIntervalType !== 'none') || selectedHistoryEntries.size > 0;
                                                                return [
                                                                    { id: 'ignore', label: usingPaused ? 'Duplicate Mode' : 'Ignore Seeds', desc: usingPaused ? 'Wrap to start' : 'Leave them unused' },
                                                                    { id: 'this_drop', label: 'Use This Drop', desc: 'Add to current drop' },
                                                                    { id: 'next_drop', label: 'Use Next Drop', desc: 'Carry over to next' },
                                                                    { id: 'split_today', label: 'Split Today', desc: 'Distribute across day' }
                                                                ].map(opt => (
                                                                    <button
                                                                        key={opt.id}
                                                                        onClick={() => setCalcLimitHandling(prev => ({ ...prev, [alert.sessionId]: opt.id as any }))}
                                                                        className={`text-left p-2 rounded-xl border transition-all ${calcLimitHandling[alert.sessionId] === opt.id
                                                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                                                            : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'
                                                                            }`}
                                                                    >
                                                                        <div className="text-[10px] font-black leading-tight">{opt.label}</div>
                                                                        <div className={`text-[8px] opacity-70 leading-tight ${calcLimitHandling[alert.sessionId] === opt.id ? 'text-indigo-100' : 'text-slate-400'
                                                                            }`}>{opt.desc}</div>
                                                                    </button>
                                                                ));
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="opacity-90">
                            {renderDaySection(today, 0, true, 'Calculate Plan', true)}
                        </div>
                    </div>
                ) : (
                    /* Plan History Section (Live + History) */
                    <>
                        {/* Today */}
                        <div className="bg-indigo-50/30 rounded-xl p-5 border border-indigo-100 mb-8 relative overflow-hidden">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="flex items-center gap-1.5 bg-indigo-600 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest shadow-sm">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                                    Live / Active Plan
                                </div>
                                <span className="text-[11px] text-indigo-400 font-bold uppercase tracking-tighter">Current Configuration</span>
                            </div>
                            {renderDaySection(today, 0, true)}
                        </div>

                        {/* History - Date Filter */}
                        <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-indigo-600 transition-colors mb-2"
                            >
                                {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                {showHistory ? 'HIDE HISTORICAL DATA' : 'SHOW HISTORICAL DATA'}
                            </button>

                            <AnimatePresence>
                                {showHistory && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="pt-4 border-t border-gray-200/50 mt-2">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                                <div>
                                                    <h4 className="text-sm font-bold text-gray-800">Historical Data</h4>
                                                    <p className="text-xs text-gray-500">View and export plans from previous days</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-gray-400 font-medium">Select Date:</span>
                                                    <input
                                                        type="date"
                                                        value={selectedHistoryDate}
                                                        onChange={(e) => {
                                                            const dateStr = e.target.value;
                                                            setSelectedHistoryDate(dateStr);
                                                            if (dateStr) {
                                                                fetchDayPlanForDate(dateStr);
                                                                setExpandedDays(prev => new Set([...prev, dateStr]));
                                                            }
                                                        }}
                                                        max={new Date(today.getTime() - 86400000).toISOString().split('T')[0]}
                                                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                                    />
                                                    {selectedHistoryDate && (
                                                        <button
                                                            onClick={() => setSelectedHistoryDate('')}
                                                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                                        >
                                                            Clear
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Recent History Quick Access */}
                                            <div className="mb-6">
                                                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2">Recent Days</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {Array.from({ length: 10 }).map((_, i) => {
                                                        const d = new Date(today);
                                                        d.setDate(today.getDate() - (i + 1));
                                                        const dateStr = d.toISOString().split('T')[0];
                                                        const isActive = selectedHistoryDate === dateStr;
                                                        return (
                                                            <button
                                                                key={dateStr}
                                                                onClick={() => {
                                                                    setSelectedHistoryDate(dateStr);
                                                                    fetchDayPlanForDate(dateStr);
                                                                    setExpandedDays(prev => new Set([...prev, dateStr]));
                                                                }}
                                                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${isActive
                                                                    ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-200'
                                                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                                                                    }`}
                                                            >
                                                                <div className="opacity-70 text-[10px] mb-0.5">
                                                                    {d.toLocaleDateString('en-US', { weekday: 'short' })}
                                                                </div>
                                                                <div>{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {selectedHistoryDate && (() => {
                                                const selectedDate = new Date(selectedHistoryDate);
                                                const daysDiff = Math.floor((today.getTime() - selectedDate.getTime()) / 86400000);
                                                return renderDaySection(selectedDate, daysDiff, false);
                                            })()}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

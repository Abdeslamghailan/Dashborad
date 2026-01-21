import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Entity, ParentCategory, LimitConfig } from '../../types';
import { Calendar, ChevronDown, ChevronUp, Copy, Check, FileSpreadsheet, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { dataService } from '../../services/dataService';
import * as XLSX from 'xlsx';

interface Props {
    entity: Entity;
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

    // Calculate Plan State

    const [calcSteps, setCalcSteps] = useState<Record<string, string | number>>({});
    const [calcStarts, setCalcStarts] = useState<Record<string, string | number>>({});
    const [showCalculatePlan, setShowCalculatePlan] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Historical plans: DateString -> CategoryId -> SessionIdx -> { step, start }
    const [historyPlans, setHistoryPlans] = useState<Record<string, Record<string, Record<number, { step: string | number; start: string | number }>>>>({});

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

            let totalSeedsConnected = 0;
            effectiveLimits.forEach(limit => {
                let intervalsInRepo = limit.intervalsInRepo || '';
                if (!intervalsInRepo) {
                    intervalsInRepo = calculateIntervalComplement(
                        limit.limitActiveSession,
                        [limit.intervalsQuality, limit.intervalsPausedSearch, limit.intervalsToxic, limit.intervalsOther]
                    );
                }
                totalSeedsConnected += getIntervalCount(intervalsInRepo);
            });

            const rotation = totalPerDay > 0 ? totalSeedsConnected / totalPerDay : 1;

            const sessions: SessionData[] = effectiveLimits.map(limit => {
                let intervalsInRepo = limit.intervalsInRepo || '';
                if (!intervalsInRepo) {
                    intervalsInRepo = calculateIntervalComplement(
                        limit.limitActiveSession,
                        [limit.intervalsQuality, limit.intervalsPausedSearch, limit.intervalsToxic, limit.intervalsOther]
                    );
                }

                const activeInRepoCount = getIntervalCount(intervalsInRepo);
                const stepPerSession = rotation > 0 ? Math.round(activeInRepoCount / rotation / numDrops) : 0;
                const ranges = parseRanges(intervalsInRepo);
                const startValue = ranges.length > 0 ? ranges[0][0] : 0;

                return { profileName: limit.profileName, stepPerSession, intervalsInRepo, startValue };
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
    }, [entity]);

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
    const getEffectiveStart = (catData: CategoryData, sessionIdx: number, startsSource: Record<string, string | number> = customStarts, stepsSource: Record<string, string | number> = customSteps): string | number => {
        const key = `${catData.category.id}:${sessionIdx}`;
        if (startsSource[key] !== undefined) {
            return startsSource[key];
        }
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
        if (!isNaN(numValue) && value.trim() === numValue.toString()) {
            setCalcSteps(prev => ({ ...prev, [`${categoryId}:${sessionIdx}`]: numValue }));
        } else {
            setCalcSteps(prev => ({ ...prev, [`${categoryId}:${sessionIdx}`]: value }));
        }
    };

    const handleCalcStartChange = (categoryId: string, sessionIdx: number, value: string) => {
        const numValue = parseInt(value);
        if (!isNaN(numValue) && value.trim() === numValue.toString()) {
            setCalcStarts(prev => ({ ...prev, [`${categoryId}:${sessionIdx}`]: numValue }));
        } else {
            setCalcStarts(prev => ({ ...prev, [`${categoryId}:${sessionIdx}`]: value }));
        }
    };

    const applyCalculatePlan = () => {
        setCustomSteps(calcSteps);
        setCustomStarts(calcStarts);
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

    const copyTableToClipboard = async (dateKey: string, dateIdx: number) => {
        let tableText = '';
        categoryData.forEach((catData, catIdx) => {
            // Header: TIME followed by profile names
            tableText += `TIME\t${catData.sessions.map(s => s.profileName).join('\t')}\n`;

            // Use effective values for today
            const steps = catData.sessions.map((s, i) =>
                dateIdx === 0 ? getEffectiveStep(catData.category.id, i, s.stepPerSession) : s.stepPerSession
            );
            const starts = catData.sessions.map((s, i) =>
                dateIdx === 0 ? getEffectiveStart(catData, i) : s.startValue
            );

            catData.drops.forEach((drop, dropIdx) => {
                const intervals = catData.sessions.map((s, i) => {
                    if (dateIdx === 0) {
                        const defaultStart = getDefaultStart(catData, i);
                        return calculateDropIntervalWithStart(dropIdx, steps[i], s.intervalsInRepo, starts[i], defaultStart);
                    }
                    return calculateDropInterval(dateIdx * catData.numDrops + dropIdx, s.stepPerSession, s.intervalsInRepo, catData.numDrops);
                });
                // Row: time followed by intervals
                tableText += `${drop.time}\t${intervals.join('\t')}\n`;
            });
            tableText += '\n';
        });

        try {
            await navigator.clipboard.writeText(tableText.trim());
            setCopiedTable(dateKey);
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
        return (
            <div className="overflow-x-visible">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        {/* Category Header */}
                        <tr>
                            <th
                                colSpan={2 + catData.sessions.length}
                                className="bg-cyan-600 text-white py-2 px-3 text-center font-semibold text-sm border border-cyan-700"
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
                                const effectiveStart = (dateIdx === 0 || isCalculateMode) ? getEffectiveStart(catData, i, startsSource, stepsSource) : s.startValue;

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
                            return (
                                <tr key={dropIdx} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="py-1.5 px-3 border border-gray-300 text-center text-gray-600 bg-white">
                                        DROP {dropIdx + 1}
                                    </td>
                                    <td className="py-1.5 px-3 border border-gray-300 text-center font-medium text-gray-700 bg-white">
                                        {drop.time}
                                    </td>
                                    {catData.sessions.map((s, i) => {
                                        const isEditable = isToday || isCalculateMode;
                                        const effectiveStep = getEffectiveStep(catData.category.id, i, s.stepPerSession, stepsSource);
                                        const effectiveStart = getEffectiveStart(catData, i, startsSource, stepsSource);

                                        const dateStr = date.toISOString().split('T')[0];
                                        const hasSavedPlan = !isToday && !isCalculateMode && !!historyPlans[dateStr];

                                        const interval = (isEditable || hasSavedPlan)
                                            ? calculateDropIntervalWithStart(dropIdx, effectiveStep, s.intervalsInRepo, effectiveStart, getDefaultStart(catData, i))
                                            : calculateDropInterval(dateIdx * catData.numDrops + dropIdx, effectiveStep, s.intervalsInRepo, catData.numDrops);
                                        return (
                                            <td key={i} className="py-1.5 px-3 border border-gray-300 text-center font-mono text-gray-800 bg-white">
                                                {interval}
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
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            applyCalculatePlan();
                                        }}
                                        className="flex items-center gap-1 px-3 py-1 bg-white text-teal-700 text-xs font-bold rounded shadow-sm hover:bg-teal-50 transition-colors mr-2"
                                    >
                                        Apply Plan
                                    </button>
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
            {/* Header Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <Calendar className="text-indigo-600" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Day Plan</h2>
                            <p className="text-sm text-gray-500">Daily task intervals for {entity.name}</p>
                        </div>
                    </div>
                    {/* Category Filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-500 font-medium">Filter Category:</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        >
                            <option value="all">All Categories</option>
                            {entity.reporting.parentCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {filteredCategoryData.map(catData => (
                        <div key={catData.category.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="text-xs text-gray-500 mb-1">{catData.category.name.replace(' REPORTING', '')}</div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-lg font-bold text-gray-800">{catData.sessions.length}</span>
                                <span className="text-xs text-gray-400">sessions</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {catData.numDrops} drops · Step: <span className="font-mono text-indigo-600">{catData.totalStep}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tables */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
                {/* Calculate Plan Section - Always Visible with distinct style */}
                <div className="bg-amber-50/20 rounded-xl p-5 border-2 border-dashed border-amber-200 mb-8 relative overflow-hidden">
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

                    <div className="opacity-90">
                        {renderDaySection(today, 0, true, 'Calculate Plan', true)}
                    </div>
                </div>

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
            </div>
        </div>
    );
};


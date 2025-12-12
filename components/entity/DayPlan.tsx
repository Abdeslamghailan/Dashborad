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

// Calculate the interval range for a specific drop, wrapping around when needed
const calculateDropInterval = (
    dropIndex: number,
    stepPerSession: number,
    intervalsInRepo: string
): string => {
    const ranges = parseRanges(intervalsInRepo);
    if (ranges.length === 0 || stepPerSession <= 0) return '-';

    const allValues: number[] = [];
    ranges.forEach(([start, end]) => {
        for (let i = start; i <= end; i++) {
            allValues.push(i);
        }
    });

    if (allValues.length === 0) return '-';

    const totalInRepo = allValues.length;
    const startIdx = (dropIndex * stepPerSession) % totalInRepo;
    let endIdx = startIdx + stepPerSession - 1;

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

// Get array of last 90 days (3 months)
const getDateRange = (): Date[] => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 90; i++) {
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
// Logic: If not enough profiles in current interval to complete step, jump to next interval
const calculateDropIntervalWithStart = (
    dropIndex: number,
    stepPerSession: number,
    intervalsInRepo: string,
    customStart: number
): string => {
    const ranges = parseRanges(intervalsInRepo);
    if (ranges.length === 0 || stepPerSession <= 0) return '-';

    // Check if customStart is within any valid interval
    const isStartValid = ranges.some(([start, end]) => customStart >= start && customStart <= end);
    if (!isStartValid) {
        return 'Interdit — start profile not in intervals repository.';
    }

    // Find which range contains the customStart
    let currentRangeIdx = ranges.findIndex(([start, end]) => customStart >= start && customStart <= end);
    let currentPosition = customStart;

    // Process each drop sequentially
    for (let drop = 0; drop <= dropIndex; drop++) {
        // Find current range
        let rangeIdx = ranges.findIndex(([start, end]) => currentPosition >= start && currentPosition <= end);

        // If not in any range, find the next valid range
        if (rangeIdx === -1) {
            rangeIdx = ranges.findIndex(([start]) => start > currentPosition);
            if (rangeIdx === -1) rangeIdx = 0; // Wrap to first range
            currentPosition = ranges[rangeIdx][0];
        }

        const [rangeStart, rangeEnd] = ranges[rangeIdx];
        const availableInRange = rangeEnd - currentPosition + 1;

        if (drop === dropIndex) {
            // This is the drop we want to return
            if (availableInRange >= stepPerSession) {
                // Enough room in current range
                const endVal = currentPosition + stepPerSession - 1;
                return `${currentPosition}-${endVal}`;
            } else {
                // Not enough room, jump to next range
                const nextRangeIdx = (rangeIdx + 1) % ranges.length;
                const nextStart = ranges[nextRangeIdx][0];
                const nextEnd = nextStart + stepPerSession - 1;
                return `${nextStart}-${nextEnd}`;
            }
        } else {
            // Calculate where this drop ends and move position for next drop
            if (availableInRange >= stepPerSession) {
                // Enough room in current range
                currentPosition = currentPosition + stepPerSession;
                // Check if we're now past the range end
                if (currentPosition > rangeEnd) {
                    // Move to next range
                    const nextRangeIdx = (rangeIdx + 1) % ranges.length;
                    currentPosition = ranges[nextRangeIdx][0];
                }
            } else {
                // Not enough room, jump to next range and use step from there
                const nextRangeIdx = (rangeIdx + 1) % ranges.length;
                currentPosition = ranges[nextRangeIdx][0] + stepPerSession;
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

    const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(['today']));
    const [copiedTable, setCopiedTable] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedHistoryDate, setSelectedHistoryDate] = useState<string>(''); // Date filter for historical view

    // Editable overrides: key = "categoryId:sessionIndex", value = custom value
    const [customSteps, setCustomSteps] = useState<Record<string, number>>({});
    const [customStarts, setCustomStarts] = useState<Record<string, number>>({});

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
                const dropHour = (startH + idx) % 24;
                const time = isRequest ? 'REQUEST' : `${dropHour.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;
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
        });
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
                const steps: Record<string, number> = {};
                const starts: Record<string, number> = {};

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
    }, [entity.id]);

    // Save day plan to database (debounced)
    const saveDayPlan = useCallback(async () => {
        if (isReadOnly) return;

        try {
            setIsSaving(true);
            const dateStr = getTodayDateString();

            // Build plans object by category
            const plans: Record<string, Record<number, { step: number; start: number }>> = {};

            categoryData.forEach((catData, catIdx) => {
                const categoryId = catData.category.id;
                const sessionData: Record<number, { step: number; start: number }> = {};

                catData.sessions.forEach((session, sessionIdx) => {
                    const stepKey = `${categoryId}:${sessionIdx}`;
                    const step = customSteps[stepKey] ?? session.stepPerSession;
                    const start = customStarts[stepKey] ?? getDefaultStart(catData, sessionIdx);
                    sessionData[sessionIdx] = { step, start };
                });

                plans[categoryId] = sessionData;
            });

            await dataService.saveDayPlanBulk(entity.id, dateStr, plans);
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
            if (Object.keys(customSteps).length > 0 || Object.keys(customStarts).length > 0) {
                saveDayPlan();
            }
        }, 1000); // 1 second debounce

        return () => clearTimeout(timeout);
    }, [customSteps, customStarts, saveDayPlan, isReadOnly, isLoading]);

    // Calculate default START values based on yesterday's last drop
    const getDefaultStart = (catData: CategoryData, sessionIdx: number): number => {
        const session = catData.sessions[sessionIdx];
        const step = getEffectiveStep(catData.category.id, sessionIdx, session.stepPerSession);
        // Yesterday is dateIdx = 1 (index 1 in dates array), last drop is numDrops - 1
        const yesterdayLastDropIdx = 1 * catData.numDrops + (catData.numDrops - 1);
        const lastInterval = calculateDropInterval(yesterdayLastDropIdx, step, session.intervalsInRepo);
        const endValue = getIntervalEndValue(lastInterval);
        return endValue > 0 ? endValue + 1 : session.startValue;
    };

    // Get effective STEP (custom or default)
    const getEffectiveStep = (categoryId: string, sessionIdx: number, defaultStep: number): number => {
        const key = `${categoryId}:${sessionIdx}`;
        return customSteps[key] !== undefined ? customSteps[key] : defaultStep;
    };

    // Get effective START (custom or calculated from yesterday)
    const getEffectiveStart = (catData: CategoryData, sessionIdx: number): number => {
        const key = `${catData.category.id}:${sessionIdx}`;
        if (customStarts[key] !== undefined) {
            return customStarts[key];
        }
        return getDefaultStart(catData, sessionIdx);
    };

    const handleStepChange = (categoryId: string, sessionIdx: number, value: string) => {
        if (isReadOnly) return;
        const numValue = parseInt(value) || 0;
        setCustomSteps(prev => ({ ...prev, [`${categoryId}:${sessionIdx}`]: numValue }));
    };

    const handleStartChange = (categoryId: string, sessionIdx: number, value: string) => {
        if (isReadOnly) return;
        const numValue = parseInt(value) || 0;
        setCustomStarts(prev => ({ ...prev, [`${categoryId}:${sessionIdx}`]: numValue }));
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
            sheetData.push(['TIME', 'DROPS', ...catData.sessions.map(() => 'Interval')]);

            // Data rows
            catData.drops.forEach((drop, dropIdx) => {
                const intervals = catData.sessions.map((s, i) => {
                    if (dateIdx === 0) {
                        return calculateDropIntervalWithStart(dropIdx, steps[i], s.intervalsInRepo, starts[i]);
                    }
                    return calculateDropInterval(dateIdx * catData.numDrops + dropIdx, s.stepPerSession, s.intervalsInRepo);
                });
                sheetData.push([drop.time, `drop ${dropIdx + 1}`, ...intervals]);
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
            tableText += `${catData.category.name}\n`;
            tableText += `SCRIPT NAME\t\t${catData.scriptName}\n`;
            tableText += `SESSION NAME\t\t${catData.sessions.map(s => s.profileName).join('\t')}\n`;
            tableText += `INTERVALS IN REPO\t\t${catData.sessions.map(s => s.intervalsInRepo || '-').join('\t')}\n`;

            // Use effective values for today
            const steps = catData.sessions.map((s, i) =>
                dateIdx === 0 ? getEffectiveStep(catData.category.id, i, s.stepPerSession) : s.stepPerSession
            );
            const starts = catData.sessions.map((s, i) =>
                dateIdx === 0 ? getEffectiveStart(catData, i) : s.startValue
            );

            tableText += `STEP\t\t${steps.join('\t')}\n`;
            tableText += `START\t\t${starts.join('\t')}\n`;
            tableText += `TIME\tDROPS\t${catData.sessions.map(() => 'Interval').join('\t')}\n`;

            catData.drops.forEach((drop, dropIdx) => {
                const intervals = catData.sessions.map((s, i) => {
                    if (dateIdx === 0) {
                        return calculateDropIntervalWithStart(dropIdx, steps[i], s.intervalsInRepo, starts[i]);
                    }
                    return calculateDropInterval(dateIdx * catData.numDrops + dropIdx, s.stepPerSession, s.intervalsInRepo);
                });
                tableText += `${drop.time}\tdrop ${dropIdx + 1}\t${intervals.join('\t')}\n`;
            });
            tableText += '\n';
        });

        try {
            await navigator.clipboard.writeText(tableText);
            setCopiedTable(dateKey);
            setTimeout(() => setCopiedTable(null), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const dates = getDateRange();
    const today = dates[0];

    const renderCategoryTable = (catData: CategoryData, dateIdx: number) => (
        <div key={catData.category.id} className="mb-4 last:mb-0">
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
                            const effectiveStep = getEffectiveStep(catData.category.id, i, s.stepPerSession);
                            const isToday = dateIdx === 0;
                            return (
                                <th key={i} className="py-1 px-1 border border-gray-300 text-center">
                                    {isToday ? (
                                        <input
                                            type="number"
                                            value={effectiveStep}
                                            onChange={(e) => handleStepChange(catData.category.id, i, e.target.value)}
                                            className="w-full text-center text-amber-600 font-bold bg-amber-50 border border-amber-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                                        />
                                    ) : (
                                        <span className="text-amber-600 font-bold">{s.stepPerSession}</span>
                                    )}
                                </th>
                            );
                        })}
                    </tr>
                    {/* START Row - Editable for today only */}
                    <tr className="bg-white">
                        <th colSpan={2} className="py-1.5 px-3 border border-gray-300 text-gray-700 font-medium text-center">START</th>
                        {catData.sessions.map((s, i) => {
                            const effectiveStart = dateIdx === 0 ? getEffectiveStart(catData, i) : s.startValue;
                            const isToday = dateIdx === 0;
                            return (
                                <th key={i} className="py-1 px-1 border border-gray-300 text-center">
                                    {isToday ? (
                                        <input
                                            type="number"
                                            value={effectiveStart}
                                            onChange={(e) => handleStartChange(catData.category.id, i, e.target.value)}
                                            className="w-full text-center text-gray-700 font-mono bg-blue-50 border border-blue-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        />
                                    ) : (
                                        <span className="text-gray-700 font-mono">{s.startValue}</span>
                                    )}
                                </th>
                            );
                        })}
                    </tr>
                    {/* Column Headers: TIME | DROPS | Interval */}
                    <tr className="bg-cyan-100">
                        <th className="py-2 px-3 border border-gray-300 text-gray-800 font-bold text-center w-24">TIME</th>
                        <th className="py-2 px-3 border border-gray-300 text-gray-800 font-bold text-center w-32">DROPS</th>
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
                                <td className="py-1.5 px-3 border border-gray-300 text-center font-medium text-gray-700 bg-white">
                                    {drop.time}
                                </td>
                                <td className="py-1.5 px-3 border border-gray-300 text-center text-gray-600 bg-white">
                                    drop {dropIdx + 1}
                                </td>
                                {catData.sessions.map((s, i) => {
                                    const effectiveStep = dateIdx === 0
                                        ? getEffectiveStep(catData.category.id, i, s.stepPerSession)
                                        : s.stepPerSession;
                                    const effectiveStart = dateIdx === 0
                                        ? getEffectiveStart(catData, i)
                                        : s.startValue;
                                    const interval = dateIdx === 0
                                        ? calculateDropIntervalWithStart(dropIdx, effectiveStep, s.intervalsInRepo, effectiveStart)
                                        : calculateDropInterval(dateIdx * catData.numDrops + dropIdx, s.stepPerSession, s.intervalsInRepo);
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

    const renderDaySection = (date: Date, dateIdx: number, isToday: boolean = false) => {
        const dayKey = isToday ? 'today' : date.toISOString();
        const isExpanded = expandedDays.has(dayKey);

        return (
            <div key={dayKey} className="border border-gray-200 rounded-lg overflow-hidden mb-3">
                {/* Day Header */}
                <button
                    onClick={() => toggleDay(dayKey)}
                    className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${isToday
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-50 text-gray-800 hover:bg-gray-100'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Calendar size={16} />
                        <span className="font-semibold">
                            {isToday ? 'TASK TODAY' : formatDate(date)}
                        </span>
                        {isToday && <span className="text-indigo-200 text-sm ml-2">{formatDate(date)}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        {isExpanded && (
                            <>
                                {/* Export to XLSX button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); exportToXLSX(dayKey, dateIdx); }}
                                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${isToday ? 'bg-green-500 hover:bg-green-400 text-white' : 'bg-green-100 hover:bg-green-200 text-green-700'
                                        }`}
                                >
                                    <FileSpreadsheet size={12} />
                                    Export XLSX
                                </button>
                                {/* Copy button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); copyTableToClipboard(dayKey, dateIdx); }}
                                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${isToday ? 'bg-indigo-500 hover:bg-indigo-400' : 'bg-gray-200 hover:bg-gray-300'
                                        }`}
                                >
                                    {copiedTable === dayKey ? <Check size={12} /> : <Copy size={12} />}
                                    {copiedTable === dayKey ? 'Copied' : 'Copy'}
                                </button>
                                {/* Saving indicator */}
                                {isSaving && isToday && (
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
                                    {categoryData.length > 2 && (
                                        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
                                    )}
                                    <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                        <div className="flex gap-6" style={{ minWidth: 'max-content' }}>
                                            {categoryData.map(catData => (
                                                <div
                                                    key={catData.category.id}
                                                    className="flex-shrink-0"
                                                    style={{ minWidth: `${Math.max(350, catData.sessions.length * 120 + 150)}px` }}
                                                >
                                                    {renderCategoryTable(catData, dateIdx)}
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
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {categoryData.map(catData => (
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
                {/* Today */}
                {renderDaySection(today, 0, true)}

                {/* Yesterday - collapsed by default */}
                <div className="mt-4">
                    {renderDaySection(new Date(today.getTime() - 86400000), 1, false)}
                </div>

                {/* History - Date Filter */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-4 mb-3">
                        <h4 className="text-sm font-medium text-gray-500">View Historical Data</h4>
                        <input
                            type="date"
                            value={selectedHistoryDate}
                            onChange={(e) => {
                                setSelectedHistoryDate(e.target.value);
                                if (e.target.value) {
                                    setExpandedDays(prev => new Set([...prev, e.target.value]));
                                }
                            }}
                            max={new Date(today.getTime() - 86400000).toISOString().split('T')[0]}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        {selectedHistoryDate && (
                            <button
                                onClick={() => setSelectedHistoryDate('')}
                                className="text-xs text-gray-500 hover:text-gray-700"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    {selectedHistoryDate && (() => {
                        const selectedDate = new Date(selectedHistoryDate);
                        // Calculate dateIdx based on difference from today
                        const daysDiff = Math.floor((today.getTime() - selectedDate.getTime()) / 86400000);
                        return renderDaySection(selectedDate, daysDiff, false);
                    })()}
                </div>
            </div>
        </div>
    );
};

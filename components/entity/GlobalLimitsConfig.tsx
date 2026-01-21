import React, { useState, useEffect } from 'react';
import { Entity, LimitConfig } from '../../types';
import { RefreshCw } from 'lucide-react';
import { service } from '../../services';
import { Button } from '../ui/Button';

interface Props {
    entity: Entity;
    onUpdate: () => void;
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

// Helper: Calculate count of unique integers in the union of all intervals
const calculateUnionTotal = (inputs: string[]): number => {
    let allRanges: [number, number][] = [];
    inputs.forEach(input => {
        allRanges = allRanges.concat(parseRanges(input));
    });

    if (allRanges.length === 0) return 0;

    allRanges.sort((a, b) => a[0] - b[0]);

    const merged: [number, number][] = [];
    let current = allRanges[0];

    for (let i = 1; i < allRanges.length; i++) {
        const next = allRanges[i];

        if (next[0] <= current[1]) {
            current[1] = Math.max(current[1], next[1]);
        } else {
            merged.push(current);
            current = next;
        }
    }
    merged.push(current);

    return merged.reduce((sum, r) => sum + (r[1] - r[0] + 1), 0);
};

import { useAuth } from '../../contexts/AuthContext';

export const GlobalLimitsConfig: React.FC<Props> = ({ entity, onUpdate }) => {
    const { user } = useAuth();
    const canEdit = user?.role === 'ADMIN' || user?.role === 'MAILER';
    const [allLimits, setAllLimits] = useState<LimitConfig[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const processed = entity.limitsConfiguration.map(l => ({
            ...l,
            totalPaused: calculateUnionTotal([
                l.intervalsQuality, l.intervalsPausedSearch, l.intervalsToxic, l.intervalsOther
            ])
        }));
        setAllLimits(processed);
    }, [entity]);

    const handleChange = (id: string, field: keyof LimitConfig, value: string | number) => {
        setAllLimits(prev => prev.map(l => {
            if (l.id !== id) return l;

            const updatedLimit = { ...l, [field]: value };

            if (['intervalsQuality', 'intervalsPausedSearch', 'intervalsToxic', 'intervalsOther'].includes(field as string)) {
                updatedLimit.totalPaused = calculateUnionTotal([
                    updatedLimit.intervalsQuality,
                    updatedLimit.intervalsPausedSearch,
                    updatedLimit.intervalsToxic,
                    updatedLimit.intervalsOther
                ]);
            }

            return updatedLimit;
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        const updatedEntity = { ...entity, limitsConfiguration: allLimits };
        await service.saveEntity(updatedEntity);
        window.dispatchEvent(new Event('entity-updated'));
        setSaving(false);
        onUpdate();
    };

    const calculateSimpleSum = (str: string): number => {
        const ranges = parseRanges(str);
        return ranges.reduce((acc, r) => acc + (r[1] - r[0] + 1), 0);
    };

    const getCategoryName = (categoryId?: string) => {
        if (!categoryId) return 'Global / All';
        const cat = entity.reporting.parentCategories.find(c => c.id === categoryId);
        return cat ? cat.name : 'Unknown';
    };

    // Calculate Totals for ALL sessions
    const totalActive = allLimits.reduce((sum, l) => sum + calculateSimpleSum(l.limitActiveSession), 0);
    const totalQuality = allLimits.reduce((sum, l) => sum + calculateSimpleSum(l.intervalsQuality), 0);
    const totalSearch = allLimits.reduce((sum, l) => sum + calculateSimpleSum(l.intervalsPausedSearch), 0);
    const totalToxic = allLimits.reduce((sum, l) => sum + calculateSimpleSum(l.intervalsToxic), 0);
    const totalOther = allLimits.reduce((sum, l) => sum + calculateSimpleSum(l.intervalsOther), 0);
    const totalPausedSum = allLimits.reduce((sum, l) => sum + (l.totalPaused || 0), 0);

    if (allLimits.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="text-gray-500 text-sm">No limits configuration found</div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Limit & Paused Intervals - All Categories</h3>
                    <p className="text-sm text-gray-500 mt-1">Total Paused is automatically calculated based on unique intervals.</p>
                </div>
                {canEdit && (
                    <Button
                        onClick={handleSave}
                        isLoading={saving}
                        leftIcon={!saving && <RefreshCw size={18} />}
                    >
                        Save Changes
                    </Button>
                )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-blue-100">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                        <tr className="bg-blue-50 text-blue-900 border-b border-blue-100">
                            <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider">Session Name</th>
                            <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider">Category</th>
                            <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider">Limit Active In Session</th>
                            <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider">Intervals Quality</th>
                            <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider">Intervals Paused For Search</th>
                            <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider">Interval Toxic</th>
                            <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider">Other Interval</th>
                            <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-right">Total Paused</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-blue-50">
                        {allLimits.map((limit) => (
                            <tr key={limit.id} className="hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                    {limit.profileName}
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-500">
                                    {getCategoryName(limit.categoryId)}
                                </td>
                                <td className="py-3 px-4">
                                    <input
                                        type="text"
                                        value={limit.limitActiveSession}
                                        onChange={(e) => handleChange(limit.id, 'limitActiveSession', e.target.value)}
                                        readOnly={!canEdit}
                                        className={`w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                        placeholder="e.g. 1-Total"
                                    />
                                </td>
                                <td className="py-3 px-4">
                                    <input
                                        type="text"
                                        value={limit.intervalsQuality}
                                        onChange={(e) => handleChange(limit.id, 'intervalsQuality', e.target.value)}
                                        readOnly={!canEdit}
                                        className={`w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                        placeholder="e.g. 1-500"
                                    />
                                </td>
                                <td className="py-3 px-4">
                                    <input
                                        type="text"
                                        value={limit.intervalsPausedSearch}
                                        onChange={(e) => handleChange(limit.id, 'intervalsPausedSearch', e.target.value)}
                                        readOnly={!canEdit}
                                        className={`w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                        placeholder="e.g. 1-500"
                                    />
                                </td>
                                <td className="py-3 px-4">
                                    <input
                                        type="text"
                                        value={limit.intervalsToxic}
                                        onChange={(e) => handleChange(limit.id, 'intervalsToxic', e.target.value)}
                                        readOnly={!canEdit}
                                        className={`w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                        placeholder="NO"
                                    />
                                </td>
                                <td className="py-3 px-4">
                                    <input
                                        type="text"
                                        value={limit.intervalsOther}
                                        onChange={(e) => handleChange(limit.id, 'intervalsOther', e.target.value)}
                                        readOnly={!canEdit}
                                        className={`w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                        placeholder="NO"
                                    />
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <span className="text-sm font-bold text-gray-800 bg-gray-100 px-3 py-1 rounded">
                                        {limit.totalPaused}
                                    </span>
                                </td>
                            </tr>
                        ))}

                        {/* Total Row */}
                        <tr className="bg-blue-50 font-bold text-gray-800">
                            <td className="py-4 px-4 text-xs uppercase tracking-wider text-gray-600">Total</td>
                            <td className="py-4 px-4 text-sm">{totalActive}</td>
                            <td className="py-4 px-4 text-sm">{totalQuality}</td>
                            <td className="py-4 px-4 text-sm">{totalSearch}</td>
                            <td className="py-4 px-4 text-sm">{totalToxic}</td>
                            <td className="py-4 px-4 text-sm">{totalOther}</td>
                            <td className="py-4 px-4 text-sm text-right">{totalPausedSum}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

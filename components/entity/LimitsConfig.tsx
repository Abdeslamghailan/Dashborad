import React, { useState, useEffect } from 'react';
import { Entity, LimitConfig, ParentCategory } from '../../types';
import { RefreshCw, Maximize2, X, Play, Pause } from 'lucide-react';
import { service } from '../../services';
import { Button } from '../ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  entity: Entity;
  category: ParentCategory;
  onUpdate: () => void;
  onSave?: (limits: LimitConfig[]) => Promise<void>;
}

// Helper: Parse string ranges into array of [start, end]
// Handles "1-500", "1-500, 600-700", "500", "NO"
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
        // Ensure start <= end
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
// Merges overlapping intervals to avoid double counting
const calculateUnionTotal = (inputs: string[]): number => {
  let allRanges: [number, number][] = [];
  inputs.forEach(input => {
    allRanges = allRanges.concat(parseRanges(input));
  });

  if (allRanges.length === 0) return 0;

  // Sort by start time
  allRanges.sort((a, b) => a[0] - b[0]);

  const merged: [number, number][] = [];
  let current = allRanges[0];

  for (let i = 1; i < allRanges.length; i++) {
    const next = allRanges[i];

    // Check overlap: if next start <= current end
    if (next[0] <= current[1]) {
      // Merge by extending the end of current if needed
      current[1] = Math.max(current[1], next[1]);
    } else {
      // No overlap, push current and move to next
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);

  // Sum lengths: (end - start + 1)
  return merged.reduce((sum, r) => sum + (r[1] - r[0] + 1), 0);
};

// Helper: Calculate the complement of intervals within a given range
// Returns the intervals that are NOT covered by the excluded intervals
const calculateIntervalComplement = (totalRange: string, excludedIntervals: string[]): string => {
  const totalRanges = parseRanges(totalRange);
  if (totalRanges.length === 0) return '';

  // Get all excluded ranges and merge them
  let allExcluded: [number, number][] = [];
  excludedIntervals.forEach(interval => {
    allExcluded = allExcluded.concat(parseRanges(interval));
  });

  if (allExcluded.length === 0) {
    // No exclusions, return the total range as-is
    return totalRange;
  }

  // Sort and merge excluded intervals
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

  // Calculate complement for each total range
  const complementRanges: [number, number][] = [];

  totalRanges.forEach(([start, end]) => {
    let currentStart = start;

    mergedExcluded.forEach(([exStart, exEnd]) => {
      // If excluded range is completely before current position, skip
      if (exEnd < currentStart) return;

      // If excluded range starts after our range ends, we're done
      if (exStart > end) return;

      // If there's a gap before the excluded range, add it
      if (currentStart < exStart) {
        complementRanges.push([currentStart, Math.min(exStart - 1, end)]);
      }

      // Move current start past the excluded range
      currentStart = Math.max(currentStart, exEnd + 1);
    });

    // Add any remaining range after all exclusions
    if (currentStart <= end) {
      complementRanges.push([currentStart, end]);
    }
  });

  // Format as string
  if (complementRanges.length === 0) return '';

  return complementRanges.map(([s, e]) => s === e ? `${s}` : `${s}-${e}`).join(',');
};

export const LimitsConfig: React.FC<Props> = ({ entity, category, onUpdate, onSave }) => {
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MAILER';
  const [allLimits, setAllLimits] = useState<LimitConfig[]>([]);
  const [saving, setSaving] = useState(false);

  // State for expanded edit modal
  const [expandedCell, setExpandedCell] = useState<{ id: string, field: keyof LimitConfig, title: string, value: string, readOnly?: boolean } | null>(null);
  const [pauseMenuOpen, setPauseMenuOpen] = useState<string | null>(null);

  // Close pause menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pauseMenuOpen) {
        setPauseMenuOpen(null);
      }
    };

    if (pauseMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [pauseMenuOpen]);

  useEffect(() => {
    // On load, apply the correct calculation to ensure consistency
    // This fixes cases where stored data might be stale
    const processed = entity.limitsConfiguration.map(l => {
      // Calculate INTERVALS IN REPO as the complement of paused intervals
      const intervalsInRepo = calculateIntervalComplement(
        l.limitActiveSession,
        [l.intervalsQuality, l.intervalsPausedSearch, l.intervalsToxic, l.intervalsOther]
      );

      return {
        ...l,
        intervalsInRepo,
        totalPaused: calculateUnionTotal([
          l.intervalsQuality, l.intervalsPausedSearch, l.intervalsToxic, l.intervalsOther
        ])
      };
    });
    setAllLimits(processed);
  }, [entity]);

  // Filter limits that belong to this category (by matching profile names)
  // Logic: Prefer category-specific limit > global limit > default/temp
  const categoryProfileNames = category.profiles
    .filter(p => !p.isMirror && !p.profileName.includes('_M1_') && !p.profileName.includes('_M2_'))
    .map(p => p.profileName);

  const categoryLimits = categoryProfileNames.map(profileName => {
    // 1. Try to find exact match for this category
    const exactMatch = allLimits.find(l => l.profileName === profileName && l.categoryId === category.id);
    if (exactMatch) return exactMatch;

    // 2. Try to find global match (legacy)
    const globalMatch = allLimits.find(l => l.profileName === profileName && !l.categoryId);
    if (globalMatch) return globalMatch;

    // 3. Return default/temp limit
    return {
      id: `temp-${profileName}`,
      profileName,
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

  const handleChange = (id: string, field: keyof LimitConfig, value: string | number) => {
    setAllLimits(prev => {
      // Check if we are editing a temp limit
      if (id.startsWith('temp-')) {
        const profileName = id.replace('temp-', '');
        const newLimit: LimitConfig = {
          id: crypto.randomUUID(),
          profileName,
          categoryId: category.id,
          limitActiveSession: '',
          intervalsInRepo: '',
          intervalsQuality: '',
          intervalsPausedSearch: '',
          intervalsToxic: '',
          intervalsOther: '',
          totalPaused: 0,
          [field]: value
        };

        // Recalculate computed fields for the new limit
        if (['limitActiveSession', 'intervalsQuality', 'intervalsPausedSearch', 'intervalsToxic', 'intervalsOther'].includes(field as string)) {
          newLimit.totalPaused = calculateUnionTotal([
            newLimit.intervalsQuality,
            newLimit.intervalsPausedSearch,
            newLimit.intervalsToxic,
            newLimit.intervalsOther
          ]);
          newLimit.intervalsInRepo = calculateIntervalComplement(
            newLimit.limitActiveSession,
            [newLimit.intervalsQuality, newLimit.intervalsPausedSearch, newLimit.intervalsToxic, newLimit.intervalsOther]
          );
        }
        return [...prev, newLimit];
      }

      // Check if we are editing a global limit (need to fork)
      const limitToUpdate = prev.find(l => l.id === id);
      if (limitToUpdate && !limitToUpdate.categoryId) {
        // Fork: Create new limit for this category based on the global one
        const newLimit: LimitConfig = {
          ...limitToUpdate,
          id: crypto.randomUUID(),
          categoryId: category.id,
          [field]: value
        };

        // Recalculate computed fields
        if (['limitActiveSession', 'intervalsQuality', 'intervalsPausedSearch', 'intervalsToxic', 'intervalsOther'].includes(field as string)) {
          newLimit.totalPaused = calculateUnionTotal([
            newLimit.intervalsQuality,
            newLimit.intervalsPausedSearch,
            newLimit.intervalsToxic,
            newLimit.intervalsOther
          ]);
          newLimit.intervalsInRepo = calculateIntervalComplement(
            newLimit.limitActiveSession,
            [newLimit.intervalsQuality, newLimit.intervalsPausedSearch, newLimit.intervalsToxic, newLimit.intervalsOther]
          );
        }

        // Add the new limit (keep the global one for other categories)
        return [...prev, newLimit];
      }

      // Normal update for existing category-specific limit
      return prev.map(l => {
        if (l.id !== id) return l;

        const updatedLimit = { ...l, [field]: value };

        // If any interval field or limitActiveSession changes, recalculate Total Paused and INTERVALS IN REPO
        if (['limitActiveSession', 'intervalsQuality', 'intervalsPausedSearch', 'intervalsToxic', 'intervalsOther'].includes(field as string)) {
          updatedLimit.totalPaused = calculateUnionTotal([
            updatedLimit.intervalsQuality,
            updatedLimit.intervalsPausedSearch,
            updatedLimit.intervalsToxic,
            updatedLimit.intervalsOther
          ]);

          // Calculate INTERVALS IN REPO as complement of paused intervals
          updatedLimit.intervalsInRepo = calculateIntervalComplement(
            updatedLimit.limitActiveSession,
            [updatedLimit.intervalsQuality, updatedLimit.intervalsPausedSearch, updatedLimit.intervalsToxic, updatedLimit.intervalsOther]
          );
        }

        return updatedLimit;
      });
    });
  };

  const handlePauseWithReason = (limit: LimitConfig, reason: 'quality' | 'search' | 'toxic' | 'other') => {
    const profile = category.profiles.find(p => p.profileName === limit.profileName);
    const sessionCount = profile?.sessionCount || 100;

    // Set the appropriate interval field based on reason
    const fieldMap = {
      quality: 'intervalsQuality',
      search: 'intervalsPausedSearch',
      toxic: 'intervalsToxic',
      other: 'intervalsOther'
    };

    const field = fieldMap[reason] as keyof LimitConfig;

    // Set the interval field to the full session range to pause all sessions for this reason
    handleChange(limit.id, field, `1-${sessionCount}`);

    // Also set limitActiveSession to NO to indicate paused status
    handleChange(limit.id, 'limitActiveSession', 'NO');

    setPauseMenuOpen(null);
  };

  const handleUnpause = (limit: LimitConfig) => {
    const profile = category.profiles.find(p => p.profileName === limit.profileName);
    const sessionCount = profile?.sessionCount || 100;

    // Clear all pause reasons
    handleChange(limit.id, 'intervalsQuality', 'NO');
    handleChange(limit.id, 'intervalsPausedSearch', 'NO');
    handleChange(limit.id, 'intervalsToxic', 'NO');
    handleChange(limit.id, 'intervalsOther', 'NO');

    // Restore limitActiveSession to full range
    handleChange(limit.id, 'limitActiveSession', `1-${sessionCount}`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log('💾 Saving limits configuration:', allLimits);
      if (onSave) {
        await onSave(allLimits);
        console.log('✅ Limits saved successfully via onSave');
      } else {
        // Fallback for legacy usage
        const updatedEntity = { ...entity, limitsConfiguration: allLimits };
        await service.saveEntity(updatedEntity);
        console.log('✅ Limits saved successfully via saveEntity');
        window.dispatchEvent(new Event('entity-updated'));
        onUpdate();
      }
    } catch (error) {
      console.error('❌ Error saving limits:', error);
    } finally {
      setSaving(false);
    }
  };

  const openExpandedView = (id: string, field: keyof LimitConfig, title: string, value: string, readOnly: boolean = false) => {
    setExpandedCell({ id, field, title, value, readOnly: readOnly || !canEdit });
  };

  const handleExpandedSave = () => {
    if (!expandedCell) return;
    // Convert newlines to commas for storage
    const cleanValue = expandedCell.value.split('\n').map(v => v.trim()).filter(v => v).join(',');
    handleChange(expandedCell.id, expandedCell.field, cleanValue);
    setExpandedCell(null);
  };

  // Helper for Footer Sums (Simple sum of counts for individual columns)
  const calculateSimpleSum = (str: string): number => {
    const ranges = parseRanges(str);
    return ranges.reduce((acc, r) => acc + (r[1] - r[0] + 1), 0);
  };

  // Calculate Totals for Footer (Only for this category)
  const totalActive = categoryLimits.reduce((sum, l) => sum + calculateSimpleSum(l.limitActiveSession), 0);
  const totalInRepo = categoryLimits.reduce((sum, l) => sum + calculateSimpleSum(l.intervalsInRepo || ''), 0);
  const totalQuality = categoryLimits.reduce((sum, l) => sum + calculateSimpleSum(l.intervalsQuality), 0);
  const totalSearch = categoryLimits.reduce((sum, l) => sum + calculateSimpleSum(l.intervalsPausedSearch), 0);
  const totalToxic = categoryLimits.reduce((sum, l) => sum + calculateSimpleSum(l.intervalsToxic), 0);
  const totalOther = categoryLimits.reduce((sum, l) => sum + calculateSimpleSum(l.intervalsOther), 0);
  const totalPausedSum = categoryLimits.reduce((sum, l) => sum + (l.totalPaused || 0), 0);

  if (categoryLimits.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="text-gray-500 text-sm">No limits configuration found for {category.name}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
            {category.name} - Limit & Paused Intervals
          </h3>
          <p className="text-sm text-gray-500 mt-1 ml-3">
            Manage active sessions and paused intervals. Total Paused is auto-calculated.
          </p>
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

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1200px] border border-gray-300">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-gray-700">
              <th className="py-4 px-4 font-bold w-32 text-center bg-purple-100 text-purple-800 border border-gray-300">Status</th>
              <th className="py-4 px-6 font-bold w-48 sticky left-[128px] bg-gray-100 z-10 border border-gray-300 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                Session Name
              </th>
              <th className="py-4 px-4 font-bold w-40 text-center bg-green-100 text-green-800 border border-gray-300">Limit Active<br />In Session</th>
              <th className="py-4 px-4 font-bold w-40 text-center bg-blue-100 text-blue-800 border border-gray-300">Intervals<br />In Repo</th>
              <th className="py-4 px-4 font-bold w-40 text-center bg-orange-100 text-orange-800 border border-gray-300">Intervals<br />Quality</th>
              <th className="py-4 px-4 font-bold w-40 text-center bg-orange-100 text-orange-800 border border-gray-300">Intervals<br />Search</th>
              <th className="py-4 px-4 font-bold w-32 text-center bg-red-100 text-red-800 border border-gray-300">Interval<br />Toxic</th>
              <th className="py-4 px-4 font-bold w-32 text-center bg-orange-100 text-orange-800 border border-gray-300">Other<br />Interval</th>
              <th className="py-4 px-6 font-bold w-32 text-center bg-gray-100 text-gray-700 border border-gray-300">Total<br />Paused</th>
            </tr>
          </thead>
          <tbody>
            {categoryLimits.map((limit) => {
              const isPaused = !limit.limitActiveSession || limit.limitActiveSession === 'NO' || limit.limitActiveSession === '0';

              return (
                <tr key={limit.profileName} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4 border border-gray-300">
                    <div className="relative">
                      {isPaused ? (
                        <button
                          onClick={() => canEdit && handleUnpause(limit)}
                          disabled={!canEdit}
                          className={`w-full px-3 py-2 rounded-lg font-semibold text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2 bg-red-100 text-red-700 hover:bg-red-200 border border-red-300 ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          title="Click to activate session"
                        >
                          <Pause size={14} />
                          <span>Paused</span>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canEdit) {
                                setPauseMenuOpen(pauseMenuOpen === limit.id ? null : limit.id);
                              }
                            }}
                            disabled={!canEdit}
                            className={`w-full px-3 py-2 rounded-lg font-semibold text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2 bg-green-100 text-green-700 hover:bg-green-200 border border-green-300 ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            title="Click to pause session"
                          >
                            <Play size={14} />
                            <span>Active</span>
                          </button>

                          {pauseMenuOpen === limit.id && canEdit && (
                            <div
                              className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-20 min-w-[160px] overflow-hidden"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase">
                                Pause Reason
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePauseWithReason(limit, 'quality');
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50 transition-colors flex items-center gap-2 text-gray-700"
                              >
                                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                Quality
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePauseWithReason(limit, 'search');
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50 transition-colors flex items-center gap-2 text-gray-700"
                              >
                                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                Search
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePauseWithReason(limit, 'toxic');
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 transition-colors flex items-center gap-2 text-gray-700"
                              >
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                Toxic
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePauseWithReason(limit, 'other');
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50 transition-colors flex items-center gap-2 text-gray-700"
                              >
                                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                Other
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-6 text-sm font-medium text-gray-700 sticky left-[128px] bg-white group-hover:bg-gray-50/50 transition-colors z-10 border border-gray-300 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                    {limit.profileName}
                  </td>
                  <td className="py-3 px-3 border border-gray-300">
                    <input
                      type="text"
                      value={limit.limitActiveSession || `1-${(category.profiles.find(p => p.profileName === limit.profileName)?.sessionCount || 0)}`}
                      onChange={(e) => handleChange(limit.id, 'limitActiveSession', e.target.value)}
                      readOnly={!canEdit}
                      className={`w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-center text-gray-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder-gray-300 hover:border-gray-300 ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      placeholder="e.g. 1-Total"
                    />
                  </td>
                  <td className="py-3 px-3 border border-gray-300">
                    <div className="relative group/input">
                      <input
                        type="text"
                        value={limit.intervalsInRepo || ''}
                        readOnly
                        disabled
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center text-gray-600 font-medium cursor-default pr-8"
                        placeholder="Auto"
                      />
                      <button
                        onClick={() => openExpandedView(limit.id, 'intervalsInRepo', `Intervals In Repo - ${limit.profileName}`, limit.intervalsInRepo || '', true)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded opacity-0 group-hover/input:opacity-100 transition-all"
                        title="View Details"
                      >
                        <Maximize2 size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-3 border border-gray-300">
                    <div className="relative group/input">
                      <input
                        type="text"
                        value={limit.intervalsQuality}
                        onChange={(e) => handleChange(limit.id, 'intervalsQuality', e.target.value)}
                        readOnly={!canEdit}
                        className={`w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-center text-gray-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder-gray-300 hover:border-gray-300 pr-8 ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                        placeholder="e.g. 1-500"
                      />
                      <button
                        onClick={() => openExpandedView(limit.id, 'intervalsQuality', `Intervals Quality - ${limit.profileName}`, limit.intervalsQuality)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover/input:opacity-100 transition-all"
                        title="Expand View"
                      >
                        <Maximize2 size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-3 border border-gray-300">
                    <div className="relative group/input">
                      <input
                        type="text"
                        value={limit.intervalsPausedSearch}
                        onChange={(e) => handleChange(limit.id, 'intervalsPausedSearch', e.target.value)}
                        readOnly={!canEdit}
                        className={`w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-center text-gray-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder-gray-300 hover:border-gray-300 pr-8 ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                        placeholder="e.g. 1-500"
                      />
                      <button
                        onClick={() => openExpandedView(limit.id, 'intervalsPausedSearch', `Intervals Search - ${limit.profileName}`, limit.intervalsPausedSearch)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover/input:opacity-100 transition-all"
                        title="Expand View"
                      >
                        <Maximize2 size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-3 border border-gray-300">
                    <div className="relative group/input">
                      <input
                        type="text"
                        value={limit.intervalsToxic}
                        onChange={(e) => handleChange(limit.id, 'intervalsToxic', e.target.value)}
                        readOnly={!canEdit}
                        className={`w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-center text-gray-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder-gray-300 hover:border-gray-300 pr-8 ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                        placeholder="NO"
                      />
                      <button
                        onClick={() => openExpandedView(limit.id, 'intervalsToxic', `Intervals Toxic - ${limit.profileName}`, limit.intervalsToxic)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover/input:opacity-100 transition-all"
                        title="Expand View"
                      >
                        <Maximize2 size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-3 border border-gray-300">
                    <div className="relative group/input">
                      <input
                        type="text"
                        value={limit.intervalsOther}
                        onChange={(e) => handleChange(limit.id, 'intervalsOther', e.target.value)}
                        readOnly={!canEdit}
                        className={`w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-center text-gray-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder-gray-300 hover:border-gray-300 pr-8 ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                        placeholder="NO"
                      />
                      <button
                        onClick={() => openExpandedView(limit.id, 'intervalsOther', `Other Intervals - ${limit.profileName}`, limit.intervalsOther)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover/input:opacity-100 transition-all"
                        title="Expand View"
                      >
                        <Maximize2 size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-6 text-center border border-gray-300">
                    <span className="inline-block min-w-[3rem] text-center text-sm font-bold text-gray-700 bg-gray-100 border border-gray-200 px-2 py-1 rounded-lg">
                      {limit.totalPaused}
                    </span>
                  </td>
                </tr>
              );
            })}

            {/* Total Row */}
            <tr className="bg-gray-100 font-bold sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <td className="py-4 px-4 text-xs uppercase tracking-wider text-gray-600 bg-gray-100 border border-gray-300"></td>
              <td className="py-4 px-6 text-xs uppercase tracking-wider text-gray-600 sticky left-[128px] bg-gray-100 border border-gray-300 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                Total
              </td>
              <td className="py-4 px-4 text-center text-sm text-gray-800 bg-gray-100 border border-gray-300">{totalActive}</td>
              <td className="py-4 px-4 text-center text-sm text-gray-800 bg-gray-100 border border-gray-300">{totalInRepo}</td>
              <td className="py-4 px-4 text-center text-sm text-gray-800 bg-gray-100 border border-gray-300">{totalQuality}</td>
              <td className="py-4 px-4 text-center text-sm text-gray-800 bg-gray-100 border border-gray-300">{totalSearch}</td>
              <td className="py-4 px-4 text-center text-sm text-gray-800 bg-gray-100 border border-gray-300">{totalToxic}</td>
              <td className="py-4 px-4 text-center text-sm text-gray-800 bg-gray-100 border border-gray-300">{totalOther}</td>
              <td className="py-4 px-6 text-center text-sm text-gray-900 bg-gray-100 border border-gray-300">{totalPausedSum}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Expanded Edit Modal */}
      <AnimatePresence>
        {expandedCell && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="font-bold text-gray-800">{expandedCell.title}</h3>
                <button
                  onClick={() => setExpandedCell(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-xs text-gray-500 mb-2">
                  {expandedCell.readOnly
                    ? 'These intervals are automatically calculated and cannot be edited manually.'
                    : 'Enter intervals separated by commas or new lines (e.g., 1-500, 600-700).'}
                </p>
                <textarea
                  value={expandedCell.value.split(',').join('\n')}
                  onChange={(e) => !expandedCell.readOnly && setExpandedCell({ ...expandedCell, value: e.target.value.split('\n').join(',') })}
                  readOnly={expandedCell.readOnly}
                  className={`w-full h-64 border border-gray-200 rounded-lg p-4 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none ${expandedCell.readOnly ? 'bg-gray-100 text-gray-600 cursor-default' : 'bg-gray-50'}`}
                  placeholder={expandedCell.readOnly ? "No intervals" : "1-500\n600-700\n..."}
                  autoFocus={!expandedCell.readOnly}
                />
                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    variant="ghost"
                    onClick={() => setExpandedCell(null)}
                  >
                    {expandedCell.readOnly ? 'Close' : 'Cancel'}
                  </Button>
                  {!expandedCell.readOnly && (
                    <Button
                      onClick={handleExpandedSave}
                    >
                      Save Changes
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div >
  );
};
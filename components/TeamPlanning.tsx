import React, { useState } from 'react';

// Hooks
import { usePlanningData } from '../hooks/usePlanningData';
import { usePlanningActions } from '../hooks/usePlanningActions';
import { usePlanningFilters } from '../hooks/usePlanningFilters';

// Components
import { PlanningHeader } from './planning/PlanningHeader';
import { QuickAssign } from './planning/QuickAssign';
import { PlanningTable } from './planning/PlanningTable';
import { BulkUpdateModal } from './planning/PlanningModals';
import { PlanningSettings } from './planning/PlanningSettings';

// Utils
import { exportPlanningToXLSX } from '../utils/planningExport';
import { formatDateRange } from '../utils/planning'; // Assuming this exists or will be created

export const TeamPlanning: React.FC = () => {
    const {
        teams,
        schedules,
        setSchedules,
        presets,
        loading,
        showHistory,
        setShowHistory,
        isAdmin,
        fetchHistory,
        initializeWeeks // This should be returned from the hook as well
    } = usePlanningData();

    const {
        selectedCells,
        setSelectedCells,
        selectedPreset,
        setSelectedPreset,
        copiedCell,
        isAiGenerating,
        handleCellMouseDown,
        applyPresetToSelectedCells
    } = usePlanningActions(schedules, setSchedules);

    const {
        filters,
        setFilters,
        getFilteredTeams,
        getAllTaskCodes
    } = usePlanningFilters(teams, schedules);

    const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
    const [showManageModal, setShowManageModal] = useState(false);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 font-semibold">Loading planning data...</p>
                </div>
            </div>
        );
    }

    const currentWeek = schedules.find(s => s.isCurrent);
    const nextWeek = schedules.find(s => s.isNext);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <PlanningHeader
                isAdmin={isAdmin}
                onInitialize={() => { }} // Hook implementation needed
                onHistoryToggle={() => {
                    setShowHistory(!showHistory);
                    if (!showHistory) fetchHistory();
                }}
                showHistory={showHistory}
                onManageToggle={() => setShowManageModal(true)}
                selectedCellsCount={selectedCells.size}
                onBulkUpdateToggle={() => setShowBulkUpdateModal(true)}
            />

            {!showHistory && isAdmin && (
                <QuickAssign
                    presets={presets}
                    selectedPreset={selectedPreset}
                    onPresetSelect={setSelectedPreset}
                    onDragStart={() => { }} // Implement drag logic
                    onCustomizeClick={() => { }}
                    selectedCellsCount={selectedCells.size}
                    onApplyToSelected={applyPresetToSelectedCells}
                    copiedCellCode={copiedCell?.taskCode}
                    onPasteToSelected={() => { }} // Implement paste logic
                    isAdmin={isAdmin}
                />
            )}

            {!showHistory && (
                <div className="space-y-8">
                    {[currentWeek, nextWeek].map((schedule, idx) => {
                        if (!schedule) return null;
                        const weekKey = idx === 0 ? 'currentWeek' : 'nextWeek';
                        const filteredTeams = getFilteredTeams(
                            schedule,
                            filters[weekKey].search,
                            filters[weekKey].team,
                            filters[weekKey].status,
                            filters[weekKey].task
                        );

                        return (
                            <div key={schedule.id} className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-gray-800">
                                        {idx === 0 ? 'Current Week' : 'Next Week'} ({schedule.weekStart})
                                    </h2>
                                    <button
                                        onClick={() => exportPlanningToXLSX(schedule, filteredTeams, weekKey)}
                                        className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 font-bold"
                                    >
                                        Export XLSX
                                    </button>
                                </div>
                                <PlanningTable
                                    schedule={schedule}
                                    teams={filteredTeams}
                                    isAdmin={isAdmin}
                                    selectedCells={selectedCells}
                                    onCellMouseDown={(mId, dIdx, e) => handleCellMouseDown(schedule.id, mId, dIdx, e)}
                                    onCellMouseEnter={() => { }}
                                    onCellClick={() => { }}
                                    onCellDoubleClick={() => { }}
                                    onDrop={() => { }}
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            <BulkUpdateModal
                isOpen={showBulkUpdateModal}
                onClose={() => setShowBulkUpdateModal(false)}
                selectedCount={selectedCells.size}
                presets={presets}
                onApply={(preset) => {
                    applyPresetToSelectedCells(preset);
                    setShowBulkUpdateModal(false);
                }}
            />

            <PlanningSettings
                isOpen={showManageModal}
                onClose={() => setShowManageModal(false)}
                teams={teams}
                onSaveTeam={() => { }}
                onDeleteTeam={() => { }}
                onSaveMailer={() => { }}
                onDeleteMailer={() => { }}
            />
        </div>
    );
};

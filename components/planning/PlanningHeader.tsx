import React from 'react';

interface PlanningHeaderProps {
    isAdmin: boolean;
    onInitialize: () => void;
    onHistoryToggle: () => void;
    showHistory: boolean;
    onManageToggle: () => void;
    selectedCellsCount: number;
    onBulkUpdateToggle: () => void;
}

export const PlanningHeader: React.FC<PlanningHeaderProps> = ({
    isAdmin,
    onInitialize,
    onHistoryToggle,
    showHistory,
    onManageToggle,
    selectedCellsCount,
    onBulkUpdateToggle
}) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-8 mb-8 transition-all hover:shadow-md">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
                        📅 Team Planning
                    </h1>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>
                            {isAdmin ? 'Admin Access' : 'Viewer Access'}
                        </span>
                        <p className="text-sm text-gray-500">Manage schedules and assignments efficiently.</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    {isAdmin && (
                        <>
                            <button
                                onClick={onInitialize}
                                className="flex items-center gap-2 px-3 h-9 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 rounded-lg font-medium transition-all duration-200 shadow-sm active:scale-95 text-xs"
                            >
                                <span>🔄</span> Initialize
                            </button>

                            <button
                                onClick={onHistoryToggle}
                                className="flex items-center gap-2 px-3 h-9 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 rounded-lg font-medium transition-all duration-200 shadow-sm active:scale-95 text-xs"
                            >
                                <span>{showHistory ? '📊' : '📜'}</span> {showHistory ? 'Current View' : 'History'}
                            </button>

                            <button
                                onClick={onManageToggle}
                                className="flex items-center gap-2 px-3 h-9 bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 rounded-lg font-medium transition-all duration-200 shadow-sm active:scale-95 text-xs"
                            >
                                <span>⚙️</span> Manage
                            </button>

                            {selectedCellsCount > 0 && (
                                <button
                                    onClick={onBulkUpdateToggle}
                                    className="flex items-center gap-2 px-3 h-9 bg-white border border-gray-200 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 rounded-lg font-medium transition-all duration-200 shadow-sm active:scale-95 animate-pulse text-xs"
                                >
                                    <span>✏️</span> Update ({selectedCellsCount})
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

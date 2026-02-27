import React from 'react';
import { EntityPreset } from '../../hooks/usePlanningData';

interface QuickAssignProps {
    presets: EntityPreset[];
    selectedPreset: EntityPreset | null;
    onPresetSelect: (preset: EntityPreset | null) => void;
    onDragStart: (preset: EntityPreset, e: React.DragEvent) => void;
    onCustomizeClick: () => void;
    selectedCellsCount: number;
    onApplyToSelected: () => void;
    copiedCellCode?: string;
    onPasteToSelected: () => void;
    isAdmin: boolean;
}

export const QuickAssign: React.FC<QuickAssignProps> = ({
    presets,
    selectedPreset,
    onPresetSelect,
    onDragStart,
    onCustomizeClick,
    selectedCellsCount,
    onApplyToSelected,
    copiedCellCode,
    onPasteToSelected,
    isAdmin
}) => {
    if (!isAdmin) return null;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-8 py-8 mb-8">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span>🎯</span> Quick Assign
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Click a preset to enable click-to-fill mode, or drag to cells.</p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedPreset && (
                        <button
                            onClick={() => onPresetSelect(null)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-md text-xs font-medium transition-all border border-red-200 shadow-sm"
                        >
                            <span>✕</span> Deselect
                        </button>
                    )}
                    <button
                        onClick={onCustomizeClick}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-600 rounded-md text-xs font-medium transition-all border border-gray-200 shadow-sm hover:border-gray-300"
                    >
                        <span>⚙️</span> Customize
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap gap-3">
                {presets.map((preset) => (
                    <div
                        key={preset.label}
                        draggable={true}
                        onDragStart={(e) => onDragStart(preset, e)}
                        onClick={() => onPresetSelect(selectedPreset?.label === preset.label ? null : preset)}
                        className={`group relative px-4 py-2 rounded-lg font-semibold shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 select-none ${selectedPreset?.label === preset.label ? 'ring-2 ring-indigo-500 ring-offset-2 border-2 border-indigo-400' : 'border border-black/5'
                            }`}
                        style={{ backgroundColor: preset.color, color: '#1f2937' }}
                        title={selectedPreset?.label === preset.label ? 'Click to deselect' : 'Click to select for quick assign'}
                    >
                        {selectedPreset?.label === preset.label && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow">
                                ✓
                            </span>
                        )}
                        <span className="w-1.5 h-1.5 rounded-full bg-black/20"></span>
                        <span className="text-sm">{preset.label}</span>
                    </div>
                ))}
            </div>

            {selectedPreset && (
                <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                    <p className="text-sm text-indigo-700 font-medium flex items-center gap-2">
                        <span className="text-lg">🎯</span>
                        <span>Quick Assign Active: Select cells and press <strong>Enter</strong> to apply <strong>{selectedPreset.label}</strong></span>
                    </p>
                    {selectedCellsCount > 0 && (
                        <button
                            onClick={onApplyToSelected}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-md shadow-sm transition-all flex items-center gap-2"
                        >
                            <span>📥</span> Apply to {selectedCellsCount} cell{selectedCellsCount > 1 ? 's' : ''} (Enter)
                        </button>
                    )}
                </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200 font-mono">Ctrl + Click</span>
                    <span className="text-xs text-gray-500">to toggle individual cells</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200 font-mono">Shift + Click</span>
                    <span className="text-xs text-gray-500">to select a range of cells</span>
                </div>
                {copiedCellCode && (
                    <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md">
                        <span className="text-xs text-blue-700 font-medium">📋 Copied: {copiedCellCode}</span>
                        {selectedCellsCount > 0 && (
                            <button
                                onClick={onPasteToSelected}
                                className="ml-2 px-2 py-0.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded transition-colors"
                            >
                                📥 Paste to {selectedCellsCount} cell{selectedCellsCount > 1 ? 's' : ''}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

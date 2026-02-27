import React, { useState } from 'react';
import { Team, Mailer, EntityPreset, PlanningAssignment } from '../../hooks/usePlanningData';

interface BulkUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedCount: number;
    presets: EntityPreset[];
    onApply: (preset: EntityPreset) => void;
}

export const BulkUpdateModal: React.FC<BulkUpdateModalProps> = ({ isOpen, onClose, selectedCount, presets, onApply }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <span>✏️</span> Bulk Update ({selectedCount} cells)
                    </h3>
                    <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">✕</button>
                </div>
                <div className="p-6">
                    <p className="text-gray-600 mb-4">Select a preset to apply to all selected cells:</p>
                    <div className="grid grid-cols-2 gap-3">
                        {presets.map(p => (
                            <button
                                key={p.label}
                                onClick={() => onApply(p)}
                                className="px-4 py-3 rounded-xl font-bold shadow-sm hover:shadow-md transition-all text-sm flex items-center gap-2 border border-black/5"
                                style={{ backgroundColor: p.color }}
                            >
                                <span className="w-2 h-2 rounded-full bg-black/20"></span>
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

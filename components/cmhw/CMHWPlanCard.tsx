
import React, { useState } from 'react';
import { Save, Trash2, Clock, FileText } from 'lucide-react';

interface Plan {
    id: number;
    name: string;
    timing_rows: string[];
}

interface CMHWPlanCardProps {
    plan: Plan;
    onSave: (id: number, name: string, rows: string[]) => void;
    onDelete: (id: number) => void;
}

export const CMHWPlanCard: React.FC<CMHWPlanCardProps> = ({ plan, onSave, onDelete }) => {
    const [name, setName] = useState(plan.name);
    const [rows, setRows] = useState((plan.timing_rows || []).join('\n'));

    const handleSave = () => {
        const timing_rows = rows.trim() ? rows.split('\n').map(s => s.trim()).filter(Boolean) : [];
        onSave(plan.id, name.trim(), timing_rows);
    };

    return (
        <div className="bg-white border-2 border-slate-100 rounded-2xl shadow-lg hover:border-indigo-200 transition-all p-6 mb-4 group">
            <div className="flex flex-col gap-5">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <FileText size={12} /> Plan Name
                    </label>
                    <input
                        className="w-full p-3 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-slate-700 focus:bg-white focus:border-indigo-500 transition-all outline-none"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Plan-reporting-CMH2"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Clock size={12} /> Timing Rows <span className="text-slate-300 font-bold ml-1">(One per line, comma-separated)</span>
                    </label>
                    <textarea
                        className="w-full h-40 p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-mono text-sm text-slate-600 focus:bg-white focus:border-indigo-500 transition-all outline-none resize-none leading-relaxed"
                        value={rows}
                        onChange={(e) => setRows(e.target.value)}
                        placeholder="0,15,30,45"
                        style={{ scrollbarWidth: 'thin' }}
                    />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                        onClick={() => onDelete(plan.id)}
                        className="flex items-center gap-2 px-4 py-2 text-red-500 text-xs font-bold hover:bg-red-50 rounded-lg transition-all"
                    >
                        <Trash2 size={16} /> Delete
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-all shadow-lg hover:shadow-indigo-500/20 active:translate-y-0.5"
                    >
                        <Save size={16} /> Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

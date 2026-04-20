
import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';

interface Field {
    id: string;
    label: string;
    placeholder?: string;
}

interface CMHWModalProps {
    title: string;
    fields: Field[];
    onConfirm: (vals: Record<string, string>) => Promise<void>;
    onClose: () => void;
}

export const CMHWModal: React.FC<CMHWModalProps> = ({ title, fields, onConfirm, onClose }) => {
    const [values, setValues] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm(values);
            onClose();
        } catch (err) {
            console.error(err);
            alert('Action failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{title}</h3>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {fields.map(field => (
                        <div key={field.id} className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                                {field.label}
                            </label>
                            <input
                                autoFocus
                                className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-700 focus:bg-white focus:border-indigo-500 transition-all outline-none"
                                placeholder={field.placeholder}
                                value={values[field.id] || ''}
                                onChange={e => setValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                            />
                        </div>
                    ))}

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-6 py-4 text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={loading}
                            className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg hover:shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>Confirm <CheckCircle2 size={16} /></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

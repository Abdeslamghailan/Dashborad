import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Box, Monitor, Bot, Smartphone, Globe, Cpu, Zap, Terminal, MousePointer2, Laptop, Tablet, AppWindow, Activity, LayoutGrid, RefreshCw, Palette, Hash, Edit3 } from 'lucide-react';
import { ReportingMethod } from '../types';
import { Button } from '../../ui/Button';

interface MethodFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (method: Partial<ReportingMethod>) => void;
    editingMethod: ReportingMethod | null;
}

const IconSelection = [
    'Monitor', 'Bot', 'Smartphone', 'Globe', 'Cpu', 'Zap', 'Terminal',
    'MousePointer2', 'Laptop', 'Tablet', 'AppWindow', 'Box', 'Activity',
    'LayoutGrid', 'RefreshCw'
];

const IconMap: Record<string, any> = {
    Monitor, Bot, Smartphone, Globe, Cpu, Zap, Terminal,
    MousePointer2, Laptop, Tablet, AppWindow, Box, Activity,
    LayoutGrid, RefreshCw
};

const PresetGradients = [
    { name: 'Sky Blue', value: 'from-[#6FC5E8] to-blue-600' },
    { name: 'Emerald', value: 'from-emerald-400 to-teal-600' },
    { name: 'Royal Purple', value: 'from-violet-500 to-purple-700' },
    { name: 'Sunset', value: 'from-orange-400 to-rose-600' },
    { name: 'Night', value: 'from-slate-700 to-slate-900' },
    { name: 'Indigo', value: 'from-indigo-500 to-blue-800' }
];

export const MethodFormModal: React.FC<MethodFormModalProps> = ({
    isOpen,
    onClose,
    onSave,
    editingMethod
}) => {
    const [form, setForm] = useState<Partial<ReportingMethod>>({
        id: '',
        name: '',
        description: '',
        icon: 'Monitor',
        color: '#6FC5E8',
        gradient: 'from-[#6FC5E8] to-blue-600',
        order: 0,
        isActive: true
    });

    useEffect(() => {
        if (editingMethod) {
            setForm({ ...editingMethod });
        } else {
            setForm({
                id: '',
                name: '',
                description: '',
                icon: 'Monitor',
                color: '#6FC5E8',
                gradient: 'from-[#6FC5E8] to-blue-600',
                order: 0,
                isActive: true
            });
        }
    }, [editingMethod, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(form);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        <form onSubmit={handleSubmit} className="flex flex-col h-full">
                            <div className="bg-gradient-to-r from-gray-900 to-slate-800 p-8 text-white">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-4 rounded-2xl bg-gradient-to-br ${form.gradient} text-white shadow-xl`}>
                                            <Edit3 size={32} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-wider">
                                                {editingMethod ? 'Refine Method' : 'New Method Definition'}
                                            </h3>
                                            <p className="text-gray-400 font-medium tracking-wide">
                                                Global configuration for reporting channels
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="p-2 hover:bg-white/10 rounded-xl transition-all"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                                <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Identify Key (Unique)</label>
                                            <input
                                                type="text"
                                                required
                                                disabled={!!editingMethod}
                                                value={form.id}
                                                onChange={(e) => setForm({ ...form, id: e.target.value.toLowerCase().replace(/\s/g, '') })}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none transition-all font-bold disabled:opacity-50"
                                                placeholder="e.g. mobile_app"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Method Title</label>
                                            <input
                                                type="text"
                                                required
                                                value={form.name}
                                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none transition-all font-bold"
                                                placeholder="e.g. Mobile Application"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Public Description</label>
                                            <textarea
                                                value={form.description || ''}
                                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none transition-all font-bold min-h-[120px]"
                                                placeholder="How should this method be described to users?"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <Palette size={14} /> Brand Gradient & Aesthetics
                                            </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {PresetGradients.map(grad => (
                                                    <div
                                                        key={grad.value}
                                                        onClick={() => setForm({ ...form, gradient: grad.value })}
                                                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${form.gradient === grad.value ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-200'}`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${grad.value} shadow-md`} />
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-600">{grad.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                    <Hash size={14} /> Priority
                                                </label>
                                                <input
                                                    type="number"
                                                    value={form.order}
                                                    onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-gray-900 outline-none transition-all font-bold"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">System Status</label>
                                                <div
                                                    onClick={() => setForm({ ...form, isActive: !form.isActive })}
                                                    className={`w-full py-3 px-4 rounded-2xl border-2 transition-all cursor-pointer font-black uppercase text-xs tracking-widest text-center ${form.isActive ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-400'}`}
                                                >
                                                    {form.isActive ? 'Active & Running' : 'Disabled / Hidden'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Visual Recognition Icon</label>
                                    <div className="grid grid-cols-5 md:grid-cols-8 gap-3">
                                        {IconSelection.map(iconName => {
                                            const Icon = IconMap[iconName];
                                            return (
                                                <div
                                                    key={iconName}
                                                    onClick={() => setForm({ ...form, icon: iconName })}
                                                    className={`aspect-square rounded-2xl border-2 flex items-center justify-center cursor-pointer transition-all ${form.icon === iconName ? 'border-gray-900 bg-gray-900 text-white shadow-xl scale-110' : 'border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-gray-50'}`}
                                                >
                                                    <Icon size={24} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            </div>

                            <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end gap-4 mt-auto">
                                <Button type="button" variant="outline" onClick={onClose} className="px-8 py-3 rounded-2xl h-auto font-black uppercase tracking-widest">
                                    Cancel
                                </Button>
                                <Button type="submit" className="px-12 py-3 rounded-2xl h-auto bg-gray-900 hover:bg-black text-white font-black uppercase tracking-widest shadow-xl">
                                    {editingMethod ? 'Save Changes' : 'Initialize Method'}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Database, Globe, User as UserIcon, Mail, FileText, Check } from 'lucide-react';
import { Entity, MethodType } from '../../../types';
import { ReportingMethod } from '../types';
import { Button } from '../../ui/Button';

interface EntityFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (entity: Entity) => void;
    editingEntity: Entity | null;
    methods: ReportingMethod[];
}

export const EntityFormModal: React.FC<EntityFormModalProps> = ({
    isOpen,
    onClose,
    onSave,
    editingEntity,
    methods
}) => {
    const [form, setForm] = useState<Partial<Entity>>({
        id: '',
        name: '',
        status: 'active',
        contactPerson: '',
        email: '',
        notes: '',
        enabledMethods: ['desktop']
    });

    useEffect(() => {
        if (editingEntity) {
            setForm({ ...editingEntity });
        } else {
            setForm({
                id: '',
                name: '',
                status: 'active',
                contactPerson: '',
                email: '',
                notes: '',
                enabledMethods: ['desktop']
            });
        }
    }, [editingEntity, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(form as Entity);
    };

    const toggleMethod = (methodId: string) => {
        const currentMethods = form.enabledMethods || [];
        if (currentMethods.includes(methodId as MethodType)) {
            setForm({ ...form, enabledMethods: currentMethods.filter(m => m !== methodId) });
        } else {
            setForm({ ...form, enabledMethods: [...currentMethods, methodId as MethodType] });
        }
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
                        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
                    >
                        <form onSubmit={handleSubmit}>
                            <div className="bg-gradient-to-r from-[#6FC5E8] to-blue-500 p-8 text-white">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                            <Database size={32} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-wider">
                                                {editingEntity ? 'Edit Entity' : 'New Entity'}
                                            </h3>
                                            <p className="text-blue-50/80 font-medium tracking-wide">
                                                Configure structural reporting parameters
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="p-2 hover:bg-white/20 rounded-xl transition-all"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-8 space-y-6 max-h-[600px] overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <Globe size={12} /> Entity ID (Lowercase, no spaces)
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            disabled={!!editingEntity}
                                            value={form.id}
                                            onChange={(e) => setForm({ ...form, id: e.target.value.toLowerCase().replace(/\s/g, '') })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#6FC5E8] outline-none transition-all font-bold disabled:opacity-50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            Display Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#6FC5E8] outline-none transition-all font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <UserIcon size={12} /> Contact Person
                                        </label>
                                        <input
                                            type="text"
                                            value={form.contactPerson}
                                            onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#6FC5E8] outline-none transition-all font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <Mail size={12} /> Contact Email
                                        </label>
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#6FC5E8] outline-none transition-all font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        Enabled Reporting Methods
                                    </label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {methods.map(method => (
                                            <div
                                                key={method.id}
                                                onClick={() => toggleMethod(method.id)}
                                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${form.enabledMethods?.includes(method.id as MethodType)
                                                    ? 'border-[#6FC5E8] bg-sky-50'
                                                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <span className={`text-[10px] font-black uppercase tracking-wider ${form.enabledMethods?.includes(method.id as MethodType) ? 'text-blue-700' : 'text-gray-400'}`}>
                                                    {method.name}
                                                </span>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${form.enabledMethods?.includes(method.id as MethodType) ? 'bg-[#6FC5E8] border-[#6FC5E8] text-white' : 'border-gray-200'}`}>
                                                    {form.enabledMethods?.includes(method.id as MethodType) && <Check size={12} strokeWidth={4} />}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <FileText size={12} /> Internal Notes
                                    </label>
                                    <textarea
                                        value={form.notes}
                                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#6FC5E8] outline-none transition-all font-bold min-h-[100px]"
                                        placeholder="Add any specific requirements or notes for this entity..."
                                    />
                                </div>
                            </div>

                            <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
                                <Button type="button" variant="outline" onClick={onClose} className="px-8">
                                    Cancel
                                </Button>
                                <Button type="submit" className="px-10 bg-[#6FC5E8] hover:bg-[#5FB8E5] text-white">
                                    {editingEntity ? 'Update Entity' : 'Create Entity'}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

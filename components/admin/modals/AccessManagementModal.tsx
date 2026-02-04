import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Lock, Search, Check, Info } from 'lucide-react';
import { User } from '../types';
import { Entity } from '../../../types';

interface AccessManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    entities: Entity[];
    onToggleAccess: (userId: number, entityId: string, hasAccess: boolean) => void;
}

export const AccessManagementModal: React.FC<AccessManagementModalProps> = ({
    isOpen,
    onClose,
    user,
    entities,
    onToggleAccess
}) => {
    const [search, setSearch] = useState('');

    const filteredEntities = entities.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.id.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <AnimatePresence>
            {isOpen && user && (
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
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#6FC5E8] to-blue-500 p-8 text-white">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                        <Shield size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black uppercase tracking-wider">Access Control</h3>
                                        <p className="text-blue-50/80 font-medium">Managing entity permissions for <span className="text-white font-bold">@{user.username}</span></p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/20 rounded-xl transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-100" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search specific entities..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl placeholder:text-blue-100/60 outline-none focus:bg-white/20 transition-all font-bold"
                                />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-8">
                            <div className="flex items-center gap-2 mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100 text-blue-700 text-sm">
                                <Info size={18} className="flex-shrink-0" />
                                <p className="font-medium">Selected entities are accessible to this user. Changes take effect immediately.</p>
                            </div>

                            <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                {filteredEntities.map(entity => {
                                    const hasAccess = user.accessibleEntities.some(ae => ae.entity.id === entity.id);
                                    return (
                                        <motion.div
                                            key={entity.id}
                                            onClick={() => onToggleAccess(user.id, entity.id, hasAccess)}
                                            className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${hasAccess
                                                ? 'border-[#6FC5E8] bg-sky-50 shadow-sm'
                                                : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-xl transition-colors ${hasAccess ? 'bg-[#6FC5E8] text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                    <Lock size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-black text-gray-900">{entity.name}</div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{entity.id}</div>
                                                </div>
                                            </div>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${hasAccess ? 'bg-[#6FC5E8] text-white' : 'bg-gray-100 text-gray-300'}`}>
                                                {hasAccess && <Check size={18} strokeWidth={3} />}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={onClose}
                                className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg"
                            >
                                Done
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

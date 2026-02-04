import React from 'react';
import { motion } from 'framer-motion';
import { Database, Plus, Edit, Trash2, User as UserIcon, Box } from 'lucide-react';
import { Entity, MethodType } from '../../types';
import { ReportingMethod } from './types';
import { Button } from '../ui/Button';

interface EntitiesTabProps {
    entities: Entity[];
    methods: ReportingMethod[];
    onAdd: () => void;
    onEdit: (entity: Entity) => void;
    onDelete: (id: string) => void;
}

export const EntitiesTab: React.FC<EntitiesTabProps> = ({ entities, methods, onAdd, onEdit, onDelete }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6"
    >
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Entity Management</h2>
                <p className="text-gray-500">Configure and manage system entities and their reporting structures</p>
            </div>
            <Button onClick={onAdd} leftIcon={<Plus size={20} />}>
                Add New Entity
            </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {entities.map((entity, idx) => (
                <motion.div
                    key={entity.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="group bg-white border border-gray-200/50 rounded-2xl p-6 hover:shadow-xl transition-all relative overflow-hidden flex flex-col h-full"
                >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-bold text-gray-900 text-xl truncate pr-2">{entity.name}</h3>
                                <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${entity.status === 'active'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-700'
                                    }`}>
                                    {entity.status || 'active'}
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold font-mono tracking-widest uppercase mb-3">{entity.id}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => onEdit(entity)}
                                className="p-2 text-gray-500 hover:text-[#6FC5E8] hover:bg-sky-50 rounded-xl transition-all"
                            >
                                <Edit size={16} />
                            </button>
                            <button
                                onClick={() => onDelete(entity.id)}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 shadow-inner">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Categories</div>
                            <div className="text-3xl font-black text-gray-900">
                                {entity.reporting?.parentCategories?.length || 0}
                            </div>
                        </div>
                        <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 shadow-inner">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Sessions</div>
                            <div className="text-3xl font-black text-gray-900">
                                {entity.reporting?.parentCategories?.reduce((total, cat) =>
                                    total + (cat.profiles?.length || 0), 0) || 0}
                            </div>
                        </div>
                    </div>

                    {/* Methods */}
                    <div className="mb-6 flex-1">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Enabled Methods</div>
                        <div className="flex flex-wrap gap-2">
                            {(entity.enabledMethods || ['desktop']).map((methodId: string) => {
                                const methodConfig = methods.find(m => m.id === methodId);
                                if (!methodConfig) return null;
                                return (
                                    <span
                                        key={methodId}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-white shadow-sm bg-gradient-to-r ${methodConfig.gradient}`}
                                    >
                                        {methodConfig.name}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer / Contact */}
                    <div className="space-y-2 pt-4 border-t border-gray-50">
                        {entity.contactPerson ? (
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                                <UserIcon size={14} className="text-[#6FC5E8]" />
                                <span className="truncate">{entity.contactPerson}</span>
                            </div>
                        ) : (
                            <div className="text-[10px] text-gray-400 font-bold uppercase italic italic">No contact specified</div>
                        )}
                        {entity.email && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 font-mono italic">
                                <span>@</span>
                                <span className="truncate uppercase">{entity.email}</span>
                            </div>
                        )}
                    </div>

                    {/* Hover Accent */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#6FC5E8]/10 to-transparent -mr-12 -mt-12 rounded-full blur-xl group-hover:bg-[#6FC5E8]/20 transition-all duration-500" />
                </motion.div>
            ))}
        </div>

        {entities.length === 0 && (
            <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm">
                <Database className="mx-auto text-gray-200 mb-6" size={80} />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No entities registered</h3>
                <p className="text-gray-500 font-medium mb-8">Start by creating your first entity to manage reporting and system access.</p>
                <Button onClick={onAdd} leftIcon={<Plus size={20} />}>
                    Register First Entity
                </Button>
            </div>
        )}
    </motion.div>
);

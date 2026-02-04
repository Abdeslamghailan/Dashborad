import React from 'react';
import { motion } from 'framer-motion';
import { Box, Plus, Edit, Trash2, Database, Monitor, Bot, Smartphone, Globe, Cpu, Zap, Terminal, MousePointer2, Laptop, Tablet, AppWindow, Activity, LayoutGrid, RefreshCw } from 'lucide-react';
import { ReportingMethod } from './types';
import { Button } from '../ui/Button';

interface MethodsTabProps {
    methods: ReportingMethod[];
    onAdd: () => void;
    onEdit: (method: ReportingMethod) => void;
    onDelete: (id: string) => void;
    onSeed: () => void;
}

const IconMap: Record<string, any> = {
    Monitor, Bot, Smartphone, Globe, Cpu, Zap, Terminal,
    MousePointer2, Laptop, Tablet, AppWindow, Box, Activity,
    LayoutGrid, RefreshCw
};

export const MethodsTab: React.FC<MethodsTabProps> = ({ methods, onAdd, onEdit, onDelete, onSeed }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6"
    >
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Reporting Methods</h2>
                <p className="text-gray-500">Global configuration for available data capture and reporting methods</p>
            </div>
            <div className="flex items-center gap-3">
                {methods.length === 0 && (
                    <Button onClick={onSeed} variant="outline" className="gap-2">
                        <Database size={18} />
                        Seed Default Methods
                    </Button>
                )}
                <Button onClick={onAdd} className="gap-2 bg-[#6FC5E8] hover:bg-[#5FB8E5] text-white">
                    <Plus size={18} />
                    New Method
                </Button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {methods.map((method) => {
                const Icon = IconMap[method.icon] || Box;
                return (
                    <motion.div
                        key={method.id}
                        layoutId={method.id}
                        className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
                    >
                        <div className="flex items-start justify-between mb-6">
                            <div className={`p-4 rounded-2xl bg-gradient-to-br ${method.gradient} text-white shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                                <Icon size={28} />
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                <button
                                    onClick={() => onEdit(method)}
                                    className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors shadow-sm"
                                >
                                    <Edit size={20} />
                                </button>
                                <button
                                    onClick={() => onDelete(method.id)}
                                    className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors shadow-sm"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl font-black text-gray-900">{method.name}</h3>
                                {!method.isActive && (
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-400 text-[10px] font-black rounded-lg uppercase border border-gray-200">Disabled</span>
                                )}
                            </div>
                            <p className="text-sm font-medium text-gray-500 line-clamp-2 leading-relaxed">{method.description || 'No specialized description provided for this method.'}</p>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full border border-white shadow-sm ring-1 ring-gray-100" style={{ backgroundColor: method.color }}></div>
                                <span className="text-[10px] font-black font-mono text-gray-400 uppercase tracking-widest">{method.id}</span>
                            </div>
                            <div className="text-[10px] font-black text-gray-400 uppercase bg-gray-50 px-3 py-1 rounded-full border border-gray-100">Priority: {method.order}</div>
                        </div>

                        {/* Decorative background element */}
                        <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-5 bg-gradient-to-br ${method.gradient}`} />
                    </motion.div>
                );
            })}
        </div>

        {methods.length === 0 && (
            <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-300 shadow-inner">
                <Box className="mx-auto text-gray-200 mb-6 animate-pulse" size={80} />
                <h3 className="text-2xl font-black text-gray-900 mb-3 uppercase tracking-wider">Empty Registry</h3>
                <p className="text-gray-500 font-medium mb-10 max-w-md mx-auto">Initialize your reporting system by adding capture methods or seeding the defaults.</p>
                <Button onClick={onAdd} className="bg-[#6FC5E8] hover:bg-[#5FB8E5] text-white px-8 py-6 rounded-2xl shadow-lg">
                    Define First Method
                </Button>
            </div>
        )}
    </motion.div>
);

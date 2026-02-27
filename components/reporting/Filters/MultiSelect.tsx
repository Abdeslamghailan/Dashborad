import React, { useState, useEffect } from 'react';
import { ChevronDown, Search, Sparkles, Check, LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
    label: string;
    value: string;
}

interface MultiSelectProps {
    label: string;
    options: (string | Option)[];
    selected: string[];
    onChange: (selected: string[]) => void;
    icon: LucideIcon;
    align?: 'left' | 'right';
    disableQuickSelect?: boolean;
    isExternalOpen?: boolean;
    onExternalClose?: () => void;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
    label,
    options,
    selected,
    onChange,
    icon: Icon,
    disableQuickSelect = false,
    isExternalOpen = false,
    onExternalClose = () => { }
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    // Handle external trigger (for Advanced Hour View)
    useEffect(() => {
        if (isExternalOpen) setIsOpen(true);
    }, [isExternalOpen]);

    const handleClose = () => {
        setIsOpen(false);
        setSearch('');
        onExternalClose?.();
    };

    // Normalize options to ensure they are objects { label, value }
    const normalizedOptions: Option[] = options.map((opt) =>
        typeof opt === 'string' ? { label: opt, value: opt } : opt
    );

    const filteredOptions = normalizedOptions.filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase())
    );

    const toggleOption = (optionValue: string) => {
        if (selected.includes(optionValue)) {
            onChange(selected.filter((item) => item !== optionValue));
        } else {
            onChange([...selected, optionValue]);
        }
    };

    const selectAll = () => onChange(normalizedOptions.map((o) => o.value));
    const clearAll = () => onChange([]);

    // Smart quick-select presets
    const getQuickSelects = () => {
        if (disableQuickSelect) return [];
        if (label === 'Hours') {
            return [
                { label: 'Morning', values: ['08', '09', '10', '11'] },
                { label: 'Afternoon', values: ['12', '13', '14', '15', '16'] },
                { label: 'Evening', values: ['17', '18', '19', '20', '21'] }
            ];
        }
        return [];
    };

    const getDisplayLabel = () => {
        if (selected.length === 0) return `Select ${label}`;
        if (selected.length === options.length && options.length > 0) return `All ${label}`;

        if (selected.length <= 2) {
            return selected.map((val) => {
                const opt = normalizedOptions.find((o) => o.value === val);
                return label === 'Hours' ? `${val}:00` : (opt ? opt.label : val);
            }).join(', ');
        }

        return `${selected.length} selected`;
    };

    const quickSelects = getQuickSelects();

    return (
        <div className="relative">
            {!isExternalOpen && (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center gap-2 px-3 py-2 bg-white border-2 rounded-lg text-sm font-medium transition-all duration-200 w-full justify-between ${selected.length > 0
                        ? 'border-blue-500 text-blue-600'
                        : 'border-slate-200 text-slate-600 hover:border-blue-300'
                        }`}
                >
                    <div className="flex items-center gap-1.5 overflow-hidden w-full">
                        <Icon size={14} className={selected.length > 0 ? 'text-blue-500' : 'text-slate-400'} />
                        <span className="truncate block w-full text-left text-xs">
                            {getDisplayLabel()}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-0.5">
                        {selected.length > 0 && selected.length < options.length && (
                            <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[9px] font-bold bg-blue-500 text-white rounded-full">
                                {selected.length}
                            </span>
                        )}
                        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : 'text-slate-400'
                            }`} />
                    </div>
                </button>
            )}

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-[1001] bg-black/5 backdrop-blur-[2px]" onClick={handleClose} />
                        <motion.div
                            initial={{ opacity: 0, y: -15, scale: 0.92 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -15, scale: 0.92 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className={`${isExternalOpen ? 'absolute right-0 top-full mt-2' : 'fixed left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2'} w-72 max-h-[70vh] bg-white border-2 border-slate-200/60 rounded-2xl shadow-2xl z-[1002] overflow-hidden flex flex-col`}
                        >
                            {/* Header with gradient */}
                            <div className="bg-gradient-to-br from-[#3b82f6] to-[#4f46e5] p-3 text-white">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                                            <Icon size={16} className="text-white" />
                                        </div>
                                        <h3 className="font-black text-xs uppercase tracking-tight">Select {label}</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={selectAll}
                                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-sm transition-all"
                                        >
                                            All
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={clearAll}
                                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-sm transition-all"
                                        >
                                            Clear
                                        </motion.button>
                                    </div>
                                </div>

                                {/* Search bar */}
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                                    <input
                                        type="text"
                                        placeholder={`Search ${label.toLowerCase()}...`}
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-[11px] text-white placeholder-white/40 focus:bg-white/20 focus:border-white/40 outline-none transition-all"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Quick Select Chips */}
                            {quickSelects.length > 0 && !search && (
                                <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200/40">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles size={10} className="text-[#4f46e5]" />
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Quick Select</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {quickSelects.map((preset) => (
                                            <motion.button
                                                key={preset.label}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => onChange(preset.values)}
                                                className="px-3 py-1.5 bg-[#4f46e5] text-white rounded-lg text-[10px] font-black shadow-md hover:shadow-indigo-500/30 transition-all border border-indigo-400/10"
                                            >
                                                {preset.label}
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Options list */}
                            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar min-h-[250px]">
                                {filteredOptions.length > 0 ? (
                                    <div className="space-y-1">
                                        {filteredOptions.map((option: any) => {
                                            const isSelected = selected.includes(option.value);
                                            return (
                                                <motion.button
                                                    key={option.value}
                                                    whileHover={{ x: 5 }}
                                                    onClick={() => toggleOption(option.value)}
                                                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm transition-all group ${isSelected
                                                        ? 'bg-blue-50/50 text-blue-600'
                                                        : 'hover:bg-slate-50 text-slate-600'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                                                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-500 shadow-lg shadow-blue-500/20'
                                                            : 'border-slate-200 group-hover:border-blue-400 group-hover:bg-blue-50'
                                                            }`}>
                                                            {isSelected && (
                                                                <motion.div
                                                                    initial={{ scale: 0, rotate: -45 }}
                                                                    animate={{ scale: 1, rotate: 0 }}
                                                                >
                                                                    <Check size={14} className="text-white stroke-[3]" />
                                                                </motion.div>
                                                            )}
                                                        </div>
                                                        <span className={`font-black text-[13px] tracking-tight ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                                                            {label === 'Hours' ? `${option.label}:00` : option.label}
                                                        </span>
                                                    </div>
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-16 text-center">
                                        <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-inner">
                                            <Search size={32} className="text-slate-200" />
                                        </div>
                                        <p className="text-sm text-slate-400 font-black uppercase tracking-widest">No results found</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200/40 flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {selected.length} of {options.length} selected
                                </span>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleClose}
                                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 transition-all border border-white/20"
                                >
                                    Done
                                </motion.button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

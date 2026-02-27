import React, { useState } from 'react';
import { ChevronRight, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

interface QuickHourFilterProps {
    selectedHours: string[];
    onChange: (hours: string[]) => void;
    onOpenAdvanced: () => void;
}

export const QuickHourFilter: React.FC<QuickHourFilterProps> = ({
    selectedHours,
    onChange,
    onOpenAdvanced
}) => {
    const now = new Date();
    const currentHourNum = now.getHours();
    const [baseHour, setBaseHour] = useState(currentHourNum);

    const baseHourStr = baseHour.toString().padStart(2, '0');

    const toggleHour = (hour: string) => {
        if (selectedHours.includes(hour)) {
            onChange(selectedHours.filter(h => h !== hour));
        } else {
            onChange([...selectedHours, hour]);
        }
    };

    return (
        <div className="flex items-center gap-1.5 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setBaseHour(h => (h - 1 + 24) % 24)}
                className="p-2 hover:bg-slate-50 text-slate-400 hover:text-blue-500 rounded-xl transition-all"
                title="Navigate backward"
            >
                <ChevronRight size={16} className="rotate-180" />
            </motion.button>

            <div className="flex items-center gap-1.5">
                {[baseHourStr].map(h => {
                    const isSelected = selectedHours.includes(h);
                    return (
                        <motion.button
                            key={h}
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => toggleHour(h)}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all border whitespace-nowrap ${isSelected
                                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 border-blue-500 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/10'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50/30'
                                }`}
                        >
                            {h}:00
                        </motion.button>
                    );
                })}
            </div>

            {baseHour !== currentHourNum && (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setBaseHour(h => (h + 1) % 24)}
                    className="p-2 hover:bg-slate-50 text-slate-400 hover:text-blue-500 rounded-xl transition-all"
                    title="Navigate forward"
                >
                    <ChevronRight size={16} />
                </motion.button>
            )}

            <div className="w-px h-6 bg-slate-200/60 mx-1" />

            <motion.button
                whileHover={{ scale: 1.1, rotate: 10 }}
                whileTap={{ scale: 0.9 }}
                onClick={onOpenAdvanced}
                className="p-2.5 bg-gradient-to-br from-slate-50 to-slate-100 text-blue-600 rounded-xl hover:shadow-inner transition-all border border-slate-200/50"
                title="Full Selection View"
            >
                <Filter size={16} className="stroke-[2.5]" />
            </motion.button>
        </div>
    );
};

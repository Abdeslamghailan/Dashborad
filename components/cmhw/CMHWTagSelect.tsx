
import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Check } from 'lucide-react';

const ALL_ENTITIES = [
    'CMH1', 'CMH2', 'CMH3', 'CMH4', 'CMH5', 'CMH6', 'CMH7',
    'CMH8', 'CMH9', 'CMH10', 'CMH11', 'CMH12', 'CMH13',
    'CMH14', 'CMH15', 'CMH16'
];

interface CMHWTagSelectProps {
    value: string[];
    onChange: (value: string[]) => void;
    excludeName?: string;
}

export const CMHWTagSelect: React.FC<CMHWTagSelectProps> = ({ value = [], onChange, excludeName = '' }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Show all entities except the primary one
    const entities = ALL_ENTITIES.filter(name => name !== excludeName);

    const toggleEntity = (name: string) => {
        if (value.includes(name)) {
            onChange(value.filter(v => v !== name));
        } else {
            onChange([...value, name]);
        }
    };

    return (
        <div ref={ref} className="relative w-full">
            {/* Input area */}
            <div
                onClick={() => setOpen(!open)}
                className={`flex flex-wrap items-center gap-1.5 px-3 py-2 min-h-[42px] cursor-pointer transition-all ${open ? 'bg-white ring-2 ring-teal-400/30' : ''}`}
            >
                {value.length === 0 && (
                    <span className="text-slate-300 text-xs font-medium italic">
                        Click to choose entities…
                    </span>
                )}

                {value.map((name) => (
                    <span
                        key={name}
                        className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-600 border border-teal-100 rounded-full pl-3 pr-1.5 py-0.5 text-[11px] font-bold tracking-wide shadow-sm"
                    >
                        {name}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleEntity(name); }}
                            className="bg-teal-200/50 hover:bg-teal-200 text-teal-700 w-4 h-4 rounded-full flex items-center justify-center transition-all"
                        >
                            <X size={8} strokeWidth={3} />
                        </button>
                    </span>
                ))}

                <div className="ml-auto pl-2 text-slate-300">
                    <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {/* Dropdown */}
            {open && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] max-h-60 overflow-y-auto py-2 animate-in slide-in-from-top-1 duration-150"
                    style={{ scrollbarWidth: 'thin' }}>
                    <div className="grid grid-cols-3 gap-1 px-2 pb-1">
                        {entities.map((name) => {
                            const isSelected = value.includes(name);
                            return (
                                <button
                                    key={name}
                                    type="button"
                                    onClick={() => toggleEntity(name)}
                                    className={`flex items-center justify-between px-3 py-2 text-[11px] font-bold rounded-lg transition-all uppercase tracking-wide ${
                                        isSelected 
                                        ? 'bg-teal-500 text-white shadow-md shadow-teal-100' 
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                    }`}
                                >
                                    {name}
                                    {isSelected && <Check size={10} strokeWidth={4} />}
                                </button>
                            );
                        })}
                    </div>
                    {entities.length === 0 && (
                        <div className="p-4 text-center">
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No entities available</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

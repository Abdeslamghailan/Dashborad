import React, { useState, useEffect } from 'react';
import { ChevronDown, Calendar, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DatePickerProps {
    date: string;
    onChange: (date: string) => void;
}

export const DatePicker: React.FC<DatePickerProps> = ({ date, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    // Parse initial date or default to today
    const selectedDate = date ? new Date(date) : new Date();
    // View state for navigation
    const [viewDate, setViewDate] = useState(new Date(selectedDate));

    useEffect(() => {
        if (isOpen && date) {
            setViewDate(new Date(date));
        }
    }, [isOpen, date]);

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

    const handleDateClick = (d: number) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
        // Format YYYY-MM-DD
        const dateStr = `${newDate.getFullYear()}-${(newDate.getMonth() + 1).toString().padStart(2, '0')}-${newDate.getDate().toString().padStart(2, '0')}`;
        onChange(dateStr);
        setIsOpen(false);
    };

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();
    const days = daysInMonth(currentYear, currentMonth);
    const startDay = firstDayOfMonth(currentYear, currentMonth);

    // Generate grid
    const blanks = Array.from({ length: startDay }, (_, i) => i);
    const dateButtons = Array.from({ length: days }, (_, i) => i + 1);

    const isToday = (d: number) => {
        const today = new Date();
        return d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
    };

    const isSelected = (d: number) => {
        if (!date) return false;
        const sel = new Date(date);
        return d === sel.getDate() && currentMonth === sel.getMonth() && currentYear === sel.getFullYear();
    };

    const formatDateDisplay = (dateStr: string) => {
        if (!dateStr) return 'Select Date';
        const d = new Date(dateStr);
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
        if (dateStr === todayStr) return 'Today';
        return dateStr.split('-').reverse().join('/');
    };

    return (
        <div className="relative z-50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative flex items-center gap-2 px-3 py-2 bg-white border-2 rounded-lg text-sm font-medium transition-all duration-200 min-w-[140px] justify-between ${date
                    ? 'border-blue-500 text-blue-600'
                    : 'border-slate-200 text-slate-600 hover:border-blue-300'
                    }`}
            >
                <div className="flex items-center gap-2">
                    <Calendar size={14} className={date ? 'text-blue-500' : 'text-slate-400'} />
                    <span className="text-xs">{formatDateDisplay(date)}</span>
                </div>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : 'text-slate-400'}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-[1001] bg-transparent" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute top-full mt-2 left-0 bg-white rounded-xl shadow-xl border border-slate-200 p-4 w-64 z-[1002]"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-600"><ChevronRight size={16} className="rotate-180" /></button>
                                <span className="font-bold text-sm text-slate-800">{monthNames[currentMonth]} {currentYear}</span>
                                <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-600"><ChevronRight size={16} /></button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {weekDays.map(d => <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase">{d}</div>)}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {blanks.map(b => <div key={`blank-${b}`} />)}
                                {dateButtons.map(d => (
                                    <button
                                        key={d}
                                        onClick={() => handleDateClick(d)}
                                        className={`h-8 w-8 text-xs rounded-lg flex items-center justify-center transition-colors
                                            ${isSelected(d) ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-200' :
                                                isToday(d) ? 'bg-slate-100 text-blue-600 font-bold border border-blue-200' :
                                                    'text-slate-700 hover:bg-slate-50'
                                            }
                                        `}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

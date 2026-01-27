import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    AreaChart, Area, XAxis, YAxis, CartesianGrid, LineChart, Line, BarChart, Bar, LabelList
} from 'recharts';
import {
    Activity, Users, Globe, Mail, ShieldAlert, Box,
    Filter, Check, ChevronDown, X, RefreshCw, Copy,
    RotateCcw, Network, Calendar, Download, ChevronRight,
    BarChart3, Inbox, Ban, Clock, Search, TrendingUp, TrendingDown, AlertTriangle,
    Zap, Eye, List, ArrowRight, FileText, FileSpreadsheet, Sparkles, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Styles ---
const dashboardStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  :root {
    --primary: #3b82f6;
    --primary-dark: #2563eb;
    --success: #10b981;
    --danger: #ef4444;
    --warning: #f59e0b;
    --slate-50: #f8fafc;
    --slate-100: #f1f5f9;
    --slate-200: #e2e8f0;
    --slate-300: #cbd5e1;
    --slate-400: #94a3b8;
    --slate-500: #64748b;
    --slate-600: #475569;
    --slate-700: #334155;
    --slate-800: #1e293b;
    --slate-900: #0f172a;
  }

  body {
    font-family: 'Inter', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  
  .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

  .glass-card {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  @keyframes pulse-subtle {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }

  .animate-pulse-subtle {
    animation: pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

// API Endpoint
const DATA_API_URL = '/api/dashboard/all-data';

// Color Palettes
const SPAM_COLORS = ['#b91c1c', '#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca'];
const INBOX_COLORS = ['#065f46', '#047857', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];

// --- Utility Functions ---
const formatNumber = (num: number) => num?.toLocaleString() ?? '0';
const formatPercentage = (value: number, total: number) =>
    total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';

// --- Sub Components ---

// AI Insights Component
const ExecutiveInsights = ({ insights }: { insights: any[] }) => (
    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles size={120} />
        </div>
        <div className="flex items-center gap-2 mb-4">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <Zap size={20} className="text-yellow-300" />
            </div>
            <h2 className="text-lg font-bold">Executive AI Insights</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.map((insight, idx) => (
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:bg-white/20 transition-colors"
                >
                    <div className="flex items-start gap-3">
                        <div className="mt-1">{insight.icon}</div>
                        <div>
                            <p className="text-sm font-medium leading-relaxed">{insight.text}</p>
                            {insight.trend && (
                                <span className={`text-[10px] font-bold uppercase mt-2 inline-block px-2 py-0.5 rounded ${insight.trendType === 'positive' ? 'bg-green-500/30 text-green-200' : 'bg-red-500/30 text-red-200'
                                    }`}>
                                    {insight.trend}
                                </span>
                            )}
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    </div>
);

// Trend Analysis Component
const TrendAnalysis = ({ data }: { data: any[] }) => (
    <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
                <div className="bg-blue-100 p-2 rounded-lg">
                    <TrendingUp size={20} className="text-blue-600" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">Spam vs Inbox Trend</h3>
                    <p className="text-xs text-gray-500">Activity distribution over the last 24 hours</p>
                </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Inbox</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Spam</span>
                </div>
            </div>
        </div>
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorInbox" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorSpam" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                        dataKey="hour"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area type="monotone" dataKey="inbox" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorInbox)" />
                    <Area type="monotone" dataKey="spam" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorSpam)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    </div>
);

// Sidebar Stat Card
const SidebarStat = ({ title, value, borderColor }: { title: string; value: string | number; borderColor: string }) => (
    <div className={`bg-white p-4 rounded-lg mb-3 border-l-4 ${borderColor} shadow-sm`}>
        <div className="text-gray-500 text-xs mb-1">{title}</div>
        <div className="text-gray-800 font-bold text-xl">{value}</div>
    </div>
);

// Metric Card
const MetricCard = ({ value, label, type }: { value: number; label: string; type: 'spam' | 'inbox' }) => (
    <div className={`p-4 rounded-lg border shadow-sm text-center ${type === 'spam' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
        }`}>
        <div className={`font-bold text-2xl ${type === 'spam' ? 'text-red-600' : 'text-green-600'}`}>
            {formatNumber(value)}
        </div>
        <div className={`text-xs uppercase mt-1 ${type === 'spam' ? 'text-red-800' : 'text-green-800'}`}>
            {label}
        </div>
    </div>
);

// Multi-Select Filter - Modern & Smart
const MultiSelect = ({ label, options, selected, onChange, icon: Icon, align = 'left' }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    const filteredOptions = options.filter((opt: string) =>
        opt.toLowerCase().includes(search.toLowerCase())
    );

    const toggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter((item: string) => item !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    const selectAll = () => onChange(options);
    const clearAll = () => onChange([]);

    // Smart quick-select presets
    const getQuickSelects = () => {
        if (label === 'Hours') {
            return [
                { label: 'Morning', values: ['08', '09', '10', '11'] },
                { label: 'Afternoon', values: ['12', '13', '14', '15', '16'] },
                { label: 'Evening', values: ['17', '18', '19', '20', '21'] }
            ];
        }
        if (label === 'Entities') {
            return [
                { label: 'CMH 1-5', values: ['CMH1', 'CMH2', 'CMH3', 'CMH4', 'CMH5'] },
                { label: 'CMH 6-10', values: ['CMH6', 'CMH7', 'CMH8', 'CMH9', 'CMH10'] },
                { label: 'CMH 11-16', values: ['CMH11', 'CMH12', 'CMH13', 'CMH14', 'CMH15', 'CMH16'] }
            ];
        }
        return [];
    };

    const getDisplayLabel = () => {
        if (selected.length === 0) return `Select ${label}`;
        if (selected.length === options.length && options.length > 0) return `All ${label}`;

        if (selected.length <= 2) {
            return selected.map((val: string) => label === 'Hours' ? `${val}:00` : val).join(', ');
        }

        return `${selected.length} selected`;
    };

    const quickSelects = getQuickSelects();

    return (
        <div className="relative z-50">
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

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-[1001] bg-black/5 backdrop-blur-[2px]" onClick={() => { setIsOpen(false); setSearch(''); }} />
                        <motion.div
                            initial={{ opacity: 0, y: -15, scale: 0.92 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -15, scale: 0.92 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-2 w-80 bg-white border-2 border-slate-200/60 rounded-2xl shadow-2xl z-[1002] overflow-hidden`}
                        >
                            {/* Header with gradient */}
                            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-white">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Icon size={18} className="text-white/90" />
                                        <h3 className="font-bold text-sm">Select {label}</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={selectAll}
                                            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[10px] font-bold backdrop-blur-sm transition-all"
                                        >
                                            All
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={clearAll}
                                            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[10px] font-bold backdrop-blur-sm transition-all"
                                        >
                                            Clear
                                        </motion.button>
                                    </div>
                                </div>

                                {/* Search bar */}
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
                                    <input
                                        type="text"
                                        placeholder={`Search ${label.toLowerCase()}...`}
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-xs text-white placeholder-white/60 focus:bg-white/30 focus:border-white/50 outline-none transition-all"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Quick Select Chips */}
                            {quickSelects.length > 0 && (
                                <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200/60">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <Sparkles size={12} className="text-indigo-500" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Quick Select</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {quickSelects.map((preset) => (
                                            <motion.button
                                                key={preset.label}
                                                whileHover={{ scale: 1.05, y: -2 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => onChange(preset.values)}
                                                className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-lg text-[11px] font-bold shadow-sm hover:shadow-md transition-all"
                                            >
                                                {preset.label}
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Options list */}
                            <div className="max-h-[50vh] overflow-y-auto p-2 no-scrollbar">
                                {filteredOptions.length > 0 ? (
                                    <div className="space-y-1">
                                        {filteredOptions.map((option: string) => {
                                            const isSelected = selected.includes(option);
                                            return (
                                                <motion.button
                                                    key={option}
                                                    whileHover={{ x: 4 }}
                                                    onClick={() => toggleOption(option)}
                                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all group ${isSelected
                                                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm'
                                                        : 'hover:bg-slate-50 text-slate-700'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected
                                                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-500 shadow-sm'
                                                            : 'border-slate-300 group-hover:border-blue-400 group-hover:bg-blue-50'
                                                            }`}>
                                                            {isSelected && (
                                                                <motion.div
                                                                    initial={{ scale: 0, rotate: -180 }}
                                                                    animate={{ scale: 1, rotate: 0 }}
                                                                    transition={{ type: 'spring', damping: 15 }}
                                                                >
                                                                    <Check size={12} className="text-white stroke-[3]" />
                                                                </motion.div>
                                                            )}
                                                        </div>
                                                        <span className={`font-semibold text-xs ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                                                            {label === 'Hours' ? `${option}:00` : option}
                                                        </span>
                                                    </div>
                                                    {isSelected && (
                                                        <motion.div
                                                            initial={{ scale: 0, rotate: -90 }}
                                                            animate={{ scale: 1, rotate: 0 }}
                                                            className="w-2 h-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm"
                                                        />
                                                    )}
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-12 text-center">
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="bg-gradient-to-br from-slate-100 to-slate-200 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner"
                                        >
                                            <Search size={24} className="text-slate-400" />
                                        </motion.div>
                                        <p className="text-sm text-slate-500 font-semibold">No results found</p>
                                        <p className="text-xs text-slate-400 mt-1">Try a different search term</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-200/60 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-500">
                                    {selected.length} of {options.length} selected
                                </span>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => { setIsOpen(false); setSearch(''); }}
                                    className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-[10px] font-bold shadow-sm hover:shadow-md transition-all"
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


// Export Buttons Component
const ExportButtons = ({ data, filename }: { data: any, filename: string }) => {
    const exportToCSV = () => {
        if (!data || !data.combined_actions) return;
        const headers = ['Timestamp', 'Entity', 'Profile', 'Session', 'Category', 'Action Type', 'Form Name'];
        const rows = data.combined_actions.map((a: any) => [
            a.timestamp,
            a.entity,
            a.profile,
            a.session,
            a.category,
            a.action_type,
            a.form_name
        ]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex gap-2">
            <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
                <FileText size={16} className="text-rose-500" />
                PDF Report
            </button>
            <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
                <FileSpreadsheet size={16} className="text-emerald-500" />
                Export CSV
            </button>
        </div>
    );
};

// Doughnut Chart Card with Table
const ChartTableCard = ({
    title,
    icon,
    data,
    colors,
    type,
    tableHeaders = ['Name', 'Count', 'Percentage']
}: {
    title: string;
    icon: string;
    data: any[];
    colors: string[];
    type: 'spam' | 'inbox';
    tableHeaders?: string[];
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [copied, setCopied] = useState(false);

    const headerBg = type === 'spam' ? 'bg-red-500' : 'bg-green-500';
    const headerLight = type === 'spam' ? 'bg-red-100' : 'bg-green-100';
    const textColor = type === 'spam' ? 'text-red-700' : 'text-green-700';

    const filteredData = useMemo(() => {
        if (!searchTerm) return data;
        return data.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [data, searchTerm]);

    const totalCount = data.reduce((sum, item) => sum + item.count, 0);
    const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const displayedTotal = paginatedData.reduce((sum, item) => sum + item.count, 0);

    // Chart data (top 5 + others)
    const chartData = useMemo(() => {
        const sorted = [...data].sort((a, b) => b.count - a.count);
        const top5 = sorted.slice(0, 5);
        const others = sorted.slice(5);
        const othersCount = others.reduce((sum, item) => sum + item.count, 0);

        const result = top5.map((item, i) => ({
            name: item.name,
            value: item.count,
            color: colors[i % colors.length]
        }));

        if (othersCount > 0) {
            result.push({ name: `Other (${others.length})`, value: othersCount, color: colors[5] || '#94a3b8' });
        }
        return result;
    }, [data, colors]);

    const copyData = () => {
        const text = filteredData.map(item => item.name).join('\n');
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="rounded-xl border overflow-hidden shadow-lg bg-white">
            <div className={`${headerBg} px-4 py-3 text-sm font-semibold text-white uppercase`}>
                {icon} {title}
            </div>

            <div className="p-4">
                {/* Chart */}
                <div className="h-48 w-full mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => [formatNumber(value), 'Count']} />
                            <Legend layout="vertical" align="right" verticalAlign="middle" formatter={(value) => <span className="text-xs">{value}</span>} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-2 mb-3 border-b pb-3">
                    <div className="flex-1 min-w-[150px]">
                        <input
                            type="text"
                            placeholder={`Search ${title.toLowerCase()}...`}
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className={`w-full px-3 py-2 border rounded text-xs ${type === 'spam' ? 'border-red-200 focus:border-red-400' : 'border-green-200 focus:border-green-400'}`}
                        />
                    </div>
                    <button
                        onClick={copyData}
                        className={`${headerBg} text-white px-3 py-2 rounded text-xs flex items-center gap-1`}
                    >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <span className="text-xs text-gray-500">Rows per page:</span>
                    <select
                        value={rowsPerPage}
                        onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                        className="border rounded px-2 py-1 text-xs"
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                    </select>
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-2 py-1 border rounded text-xs disabled:opacity-50">
                        ← Prev
                    </button>
                    <span className="text-xs">Page: {currentPage}/{totalPages || 1}</span>
                    <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-2 py-1 border rounded text-xs disabled:opacity-50">
                        Next →
                    </button>
                </div>

                {/* Table */}
                <table className="w-full text-xs border-collapse border border-gray-200">
                    <thead>
                        <tr className={headerLight}>
                            {tableHeaders.map((h, i) => (
                                <th key={i} className={`p-2 border border-gray-200 ${textColor} ${i > 0 ? 'text-center' : 'text-left'}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="p-2 border border-gray-200">
                                    <div className="flex items-center gap-2">
                                        {item.name}
                                    </div>
                                </td>
                                <td className="p-2 text-center border border-gray-200">{formatNumber(item.count)}</td>
                                <td className="p-2 text-center border border-gray-200">{formatPercentage(item.count, totalCount)}%</td>
                            </tr>
                        ))}
                        <tr className={`font-bold ${headerLight}`}>
                            <td className="p-2 border border-gray-200">Total (Displayed)</td>
                            <td className="p-2 text-center border border-gray-200">{formatNumber(displayedTotal)}</td>
                            <td className="p-2 text-center border border-gray-200">{formatPercentage(displayedTotal, totalCount)}%</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Spam Relationships Component
const SpamRelationships = ({ data }: { data: any[] }) => {
    const [fromNameFilter, setFromNameFilter] = useState('all');
    const [countFilter, setCountFilter] = useState(0);
    const [sortBy, setSortBy] = useState('name-asc');
    const [copied, setCopied] = useState(false);
    const [ipCopied, setIpCopied] = useState(false);

    const fromNames = useMemo(() => [...new Set(data.map(item => item.fromName))].sort(), [data]);

    const filteredData = useMemo(() => {
        let result = [...data];
        if (fromNameFilter !== 'all') result = result.filter(item => item.fromName === fromNameFilter);
        if (countFilter > 0) result = result.filter(item => item.count >= countFilter);

        switch (sortBy) {
            case 'name-asc': result.sort((a, b) => a.fromName.localeCompare(b.fromName)); break;
            case 'name-desc': result.sort((a, b) => b.fromName.localeCompare(a.fromName)); break;
            case 'count-desc': result.sort((a, b) => b.count - a.count); break;
            case 'count-asc': result.sort((a, b) => a.count - b.count); break;
        }
        return result;
    }, [data, fromNameFilter, countFilter, sortBy]);

    const totalCount = filteredData.reduce((sum, item) => sum + item.count, 0);
    const uniqueDomains = new Set(filteredData.map(item => item.domain)).size;

    // Group by fromName
    const groupedData = useMemo(() => {
        const groups: Record<string, any[]> = {};
        filteredData.forEach(item => {
            if (!groups[item.fromName]) groups[item.fromName] = [];
            groups[item.fromName].push(item);
        });
        return groups;
    }, [filteredData]);

    const resetFilters = () => { setFromNameFilter('all'); setCountFilter(0); setSortBy('name-asc'); };

    const copyAll = () => {
        const csv = ['From Name,Domain,IP Address,Count,Percentage']
            .concat(filteredData.map(item => `"${item.fromName}","${item.domain}","${item.ip || 'N/A'}","${item.count}","${item.percentage}"`))
            .join('\n');
        navigator.clipboard.writeText(csv);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const copyIPs = () => {
        const ips = [...new Set(filteredData.map(item => item.ip).filter(ip => ip && ip !== 'N/A'))];
        navigator.clipboard.writeText(ips.join('\n'));
        setIpCopied(true);
        setTimeout(() => setIpCopied(false), 2000);
    };

    return (
        <div className="bg-red-50/10 rounded-2xl shadow-sm border border-red-100 overflow-hidden mb-6">
            {/* Header */}
            <div className="px-5 py-3.5 bg-[#ef4444] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-white p-1.5 rounded-lg shadow-lg shadow-red-900/20">
                        <ShieldAlert className="text-[#ef4444]" size={20} />
                    </div>
                    <div>
                        <h3 className="font-black text-white text-lg tracking-tight">Spam Relationships</h3>
                        <p className="text-white/70 text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">Analyze connections between senders, domains, and IPs</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-white text-[#ef4444] text-[9px] font-black px-3 py-1 rounded-full shadow-sm uppercase tracking-widest">
                        {uniqueDomains} Domains
                    </div>
                    <div className="bg-[#991b1b] text-white text-[9px] font-black px-3 py-1 rounded-full shadow-inner uppercase tracking-widest">
                        {formatNumber(totalCount)} Total Count
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 border-b border-slate-100">
                <div className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1 w-full">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5 block">From Name</label>
                        <div className="relative">
                            <select
                                value={fromNameFilter}
                                onChange={(e) => setFromNameFilter(e.target.value)}
                                className="w-full pl-3 pr-8 py-2 bg-[#f8fafc] border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all appearance-none shadow-sm"
                            >
                                <option value="all">All From Names</option>
                                {fromNames.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                    <div className="w-full md:w-36">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5 block">Min Count</label>
                        <div className="relative">
                            <select
                                value={countFilter}
                                onChange={(e) => setCountFilter(Number(e.target.value))}
                                className="w-full pl-3 pr-8 py-2 bg-[#f8fafc] border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all appearance-none shadow-sm"
                            >
                                <option value={0}>All Counts</option>
                                <option value={100}>100+</option>
                                <option value={50}>50+</option>
                                <option value={20}>20+</option>
                                <option value={10}>10+</option>
                                <option value={5}>5+</option>
                            </select>
                            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                    <div className="w-full md:w-44">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5 block">Sort By</label>
                        <div className="relative">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full pl-3 pr-8 py-2 bg-[#f8fafc] border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all appearance-none shadow-sm"
                            >
                                <option value="name-asc">From Name (A-Z)</option>
                                <option value="name-desc">From Name (Z-A)</option>
                                <option value="count-desc">Highest Count First</option>
                                <option value="count-asc">Lowest Count First</option>
                            </select>
                            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button
                            onClick={resetFilters}
                            className="p-2 bg-[#f8fafc] border border-slate-200 text-slate-400 rounded-lg hover:bg-slate-50 hover:text-slate-600 transition-colors shadow-sm"
                            title="Reset Filters"
                        >
                            <RotateCcw size={16} />
                        </button>
                        <button
                            onClick={copyAll}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all shadow-lg ${copied ? 'bg-green-500 text-white shadow-green-500/30' : 'bg-[#ef4444] text-white hover:bg-red-500 shadow-red-600/20'
                                }`}
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            {copied ? 'Copied' : 'Copy All'}
                        </button>
                        <button
                            onClick={copyIPs}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all shadow-lg ${ipCopied ? 'bg-green-500 text-white shadow-green-500/30' : 'bg-[#0f172a] text-white hover:bg-slate-800 shadow-slate-900/20'
                                }`}
                        >
                            {ipCopied ? <Check size={14} /> : <Zap size={14} />}
                            {ipCopied ? 'Copied' : 'Copy IPs'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[700px] custom-scrollbar bg-slate-50/30 p-3">
                <div className="space-y-4">
                    {Object.entries(groupedData).map(([fromName, items]: [string, any[]]) => (
                        <div key={fromName} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                            {/* Group Header */}
                            <div className="bg-[#fff1f2] px-4 py-2 flex items-center justify-between border-b border-red-50">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white p-1.5 rounded-full shadow-sm border border-red-100">
                                        <Users size={14} className="text-[#ef4444]" />
                                    </div>
                                    <span className="font-black text-[#ef4444] uppercase tracking-tight text-xs">{fromName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="bg-white text-[#ef4444] text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest border border-red-100 shadow-sm">
                                        {items.length} Domains
                                    </span>
                                    <span className="bg-white text-[#ef4444] text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest border border-red-100 shadow-sm">
                                        {formatNumber(items.reduce((s: number, i: any) => s + i.count, 0))} Total
                                    </span>
                                </div>
                            </div>

                            {/* Column Headers */}
                            <div className="grid grid-cols-12 gap-4 px-20 py-2 bg-white border-b border-slate-50">
                                <div className="col-span-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Domain</div>
                                <div className="col-span-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">IP</div>
                                <div className="col-span-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Count</div>
                                <div className="col-span-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Share</div>
                            </div>

                            {/* Data Rows */}
                            <div className="divide-y divide-slate-50">
                                {items.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-4 px-6 py-2.5 items-center group hover:bg-slate-50 transition-colors">
                                        <div className="col-span-5 flex items-center gap-2.5">
                                            <div className="w-1 h-1 rounded-full bg-slate-200 group-hover:bg-[#ef4444] transition-colors"></div>
                                            <span className="font-black text-slate-700 group-hover:text-[#ef4444] transition-colors text-xs">{item.domain}</span>
                                        </div>
                                        <div className="col-span-2">
                                            {item.ip && item.ip !== 'N/A' ? (
                                                <span className="font-mono text-[9px] font-black text-slate-400 italic">{item.ip}</span>
                                            ) : (
                                                <span className="text-slate-200 text-[9px] font-black italic uppercase tracking-widest">N/A</span>
                                            )}
                                        </div>
                                        <div className="col-span-2 text-center">
                                            <span className="font-black text-slate-700 text-[12px]">{formatNumber(item.count)}</span>
                                        </div>
                                        <div className="col-span-3">
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-[10px] text-[#ef4444] font-black">{item.percentage}%</span>
                                                <div className="w-full max-w-[100px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-[#ef4444] rounded-full shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                                                        style={{ width: `${Math.min(Number(item.percentage), 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="bg-red-50/50 px-6 py-3 border-t border-red-100 flex justify-between items-center text-xs text-red-600/60 font-medium">
                <span>Showing {filteredData.length} entries</span>
                <div className="flex items-center gap-2">
                    <span>Export Data:</span>
                    <button onClick={copyAll} className="hover:text-red-900 transition-colors">CSV</button>
                    <span className="text-slate-300">|</span>
                    <button onClick={copyIPs} className="hover:text-red-900 transition-colors">IP List</button>
                </div>
            </div>
        </div >
    );
};

// Inbox Relationships Component
const InboxRelationships = ({ data }: { data: any[] }) => {
    const [copied, setCopied] = useState(false);
    const totalCount = data.reduce((sum, item) => sum + item.count, 0);
    const uniqueDomains = new Set(data.map(item => item.domain)).size;

    const groupedData = useMemo(() => {
        const groups: Record<string, any[]> = {};
        data.forEach(item => {
            if (!groups[item.fromName]) groups[item.fromName] = [];
            groups[item.fromName].push(item);
        });
        return groups;
    }, [data]);

    const copyAll = () => {
        const text = data.map(item => `${item.fromName} → ${item.domain}: ${item.count}`).join('\n');
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-emerald-50/10 rounded-2xl shadow-sm border border-emerald-100 overflow-hidden mb-6">
            {/* Header */}
            <div className="px-5 py-3.5 bg-[#10b981] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-white p-1.5 rounded-lg shadow-lg shadow-emerald-900/20">
                        <Inbox className="text-[#10b981]" size={20} />
                    </div>
                    <div>
                        <h3 className="font-black text-white text-lg tracking-tight">Inbox Relationships</h3>
                        <p className="text-white/70 text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">Analyze connections for legitimate senders</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-white text-[#10b981] text-[9px] font-black px-3 py-1 rounded-full shadow-sm uppercase tracking-widest">
                        {uniqueDomains} Domains
                    </div>
                    <div className="bg-[#065f46] text-white text-[9px] font-black px-3 py-1 rounded-full shadow-inner uppercase tracking-widest">
                        {formatNumber(totalCount)} Total Count
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[700px] custom-scrollbar bg-slate-50/30 p-3">
                <div className="space-y-4">
                    {Object.entries(groupedData).map(([fromName, items]: [string, any[]]) => (
                        <div key={fromName} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                            {/* Group Header */}
                            <div className="bg-[#ecfdf5] px-4 py-2 flex items-center justify-between border-b border-emerald-50">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white p-1.5 rounded-full shadow-sm border border-emerald-100">
                                        <Users size={14} className="text-[#10b981]" />
                                    </div>
                                    <span className="font-black text-[#10b981] uppercase tracking-tight text-xs">{fromName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="bg-white text-[#10b981] text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest border border-emerald-100 shadow-sm">
                                        {items.length} Domains
                                    </span>
                                    <span className="bg-white text-[#10b981] text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest border border-emerald-100 shadow-sm">
                                        {formatNumber(items.reduce((s: number, i: any) => s + i.count, 0))} Total
                                    </span>
                                </div>
                            </div>

                            {/* Column Headers */}
                            <div className="grid grid-cols-12 gap-4 px-6 py-2 bg-white border-b border-slate-50">
                                <div className="col-span-7 text-[9px] font-black text-slate-400 uppercase tracking-widest">Domain</div>
                                <div className="col-span-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Count</div>
                                <div className="col-span-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Share</div>
                            </div>

                            {/* Data Rows */}
                            <div className="divide-y divide-slate-50">
                                {items.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-4 px-6 py-2.5 items-center group hover:bg-slate-50 transition-colors">
                                        <div className="col-span-7 flex items-center gap-2.5">
                                            <div className="w-1 h-1 rounded-full bg-slate-200 group-hover:bg-[#10b981] transition-colors"></div>
                                            <span className="font-black text-slate-700 group-hover:text-[#10b981] transition-colors text-xs">{item.domain}</span>
                                        </div>
                                        <div className="col-span-2 text-center">
                                            <span className="font-black text-slate-700 text-[12px]">{formatNumber(item.count)}</span>
                                        </div>
                                        <div className="col-span-3">
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-[10px] text-[#10b981] font-black">{item.percentage}%</span>
                                                <div className="w-full max-w-[100px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-[#10b981] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                                                        style={{ width: `${Math.min(Number(item.percentage), 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="bg-emerald-50/50 px-6 py-3 border-t border-emerald-100 flex justify-between items-center text-xs text-emerald-600/60 font-medium">
                <span>Showing {data.length} entries</span>
                <button
                    onClick={copyAll}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${copied ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'hover:bg-emerald-100 text-emerald-700'
                        }`}
                >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy All'}
                </button>
            </div>
        </div>
    );
};

// From Name Distribution Table
const FromNameDistribution = ({ spamData, inboxData }: { spamData: any[]; inboxData: any[] }) => {
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const distribution = useMemo(() => {
        const map: Record<string, { spam: number; inbox: number }> = {};
        spamData.forEach(item => {
            if (!map[item.fromName]) map[item.fromName] = { spam: 0, inbox: 0 };
            map[item.fromName].spam += item.count;
        });
        inboxData.forEach(item => {
            if (!map[item.fromName]) map[item.fromName] = { spam: 0, inbox: 0 };
            map[item.fromName].inbox += item.count;
        });
        return Object.entries(map).map(([name, counts]) => ({
            fromName: name,
            total: counts.spam + counts.inbox,
            spamCount: counts.spam,
            inboxCount: counts.inbox,
            spamPct: Number(((counts.spam / (counts.spam + counts.inbox)) * 100).toFixed(1)),
            inboxPct: Number(((counts.inbox / (counts.spam + counts.inbox)) * 100).toFixed(1)),
        })).sort((a, b) => b.total - a.total);
    }, [spamData, inboxData]);

    const totals = useMemo(() => ({
        total: distribution.reduce((s, i) => s + i.total, 0),
        spam: distribution.reduce((s, i) => s + i.spamCount, 0),
        inbox: distribution.reduce((s, i) => s + i.inboxCount, 0),
    }), [distribution]);

    return (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 font-semibold text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BarChart3 size={16} />
                    From Name Distribution: Spam vs Inbox Analysis
                </div>
                <div className="flex bg-white/20 p-1 rounded-lg backdrop-blur-sm">
                    <button
                        onClick={() => setView('chart')}
                        className={`px-3 py-1 rounded-md text-xs transition-all ${view === 'chart' ? 'bg-white text-blue-600 shadow-sm' : 'text-white hover:bg-white/10'}`}
                    >
                        Chart
                    </button>
                    <button
                        onClick={() => setView('table')}
                        className={`px-3 py-1 rounded-md text-xs transition-all ${view === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-white hover:bg-white/10'}`}
                    >
                        Table
                    </button>
                </div>
            </div>

            <div className="p-5">
                <AnimatePresence mode="wait">
                    {view === 'chart' ? (
                        <motion.div
                            key="chart"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <div className="mb-8 h-80 w-full bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={distribution.slice(0, 10)}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="fromName"
                                            type="category"
                                            width={100}
                                            tick={{ fontSize: 12, fontWeight: 500, fill: '#64748b' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#f1f5f9' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value: number, name: string, props: any) => {
                                                const total = props.payload.total;
                                                const pct = ((value / total) * 100).toFixed(1);
                                                return [`${value} (${pct}%)`, name];
                                            }}
                                        />
                                        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                                        <Bar dataKey="inboxCount" name="Inbox" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={20}>
                                            <LabelList
                                                dataKey="inboxPct"
                                                position="inside"
                                                formatter={(val: number) => val > 10 ? `${val}%` : ''}
                                                style={{ fill: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                                            />
                                        </Bar>
                                        <Bar dataKey="spamCount" name="Spam" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20}>
                                            <LabelList
                                                dataKey="spamPct"
                                                position="inside"
                                                formatter={(val: number) => val > 10 ? `${val}%` : ''}
                                                style={{ fill: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                                            />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="table"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse border border-gray-200">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="text-left p-3 border border-gray-200">From Name</th>
                                            <th className="text-center p-3 border border-gray-200">Total</th>
                                            <th className="text-center p-3 border border-gray-200 text-red-600">Spam Count</th>
                                            <th className="text-center p-3 border border-gray-200 text-green-600">Inbox Count</th>
                                            <th className="text-center p-3 border border-gray-200">Spam %</th>
                                            <th className="text-center p-3 border border-gray-200">Inbox %</th>
                                            <th className="text-left p-3 w-40 border border-gray-200">Distribution</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {distribution.slice(0, 15).map((row, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="p-3 font-medium border border-gray-200"><Users size={14} className="inline mr-2 text-gray-400" />{row.fromName}</td>
                                                <td className="p-3 text-center border border-gray-200">{formatNumber(row.total)}</td>
                                                <td className="p-3 text-center text-red-600 font-medium border border-gray-200">{formatNumber(row.spamCount)}</td>
                                                <td className="p-3 text-center text-green-600 font-medium border border-gray-200">{formatNumber(row.inboxCount)}</td>
                                                <td className="p-3 text-center border border-gray-200"><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">{row.spamPct}%</span></td>
                                                <td className="p-3 text-center border border-gray-200"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">{row.inboxPct}%</span></td>
                                                <td className="p-3 border border-gray-200">
                                                    <div className="flex h-5 rounded-full overflow-hidden bg-gray-100 text-[9px] font-bold text-white text-center leading-5">
                                                        <div className="bg-red-500 h-full transition-all" style={{ width: `${row.spamPct}%` }}>
                                                            {row.spamPct > 15 && `${row.spamPct}%`}
                                                        </div>
                                                        <div className="bg-green-500 h-full transition-all" style={{ width: `${row.inboxPct}%` }}>
                                                            {row.inboxPct > 15 && `${row.inboxPct}%`}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="bg-gray-100 font-bold">
                                            <td className="p-3 border border-gray-200">Overall Totals</td>
                                            <td className="p-3 text-center border border-gray-200">{formatNumber(totals.total)}</td>
                                            <td className="p-3 text-center text-red-600 border border-gray-200">{formatNumber(totals.spam)}</td>
                                            <td className="p-3 text-center text-green-600 border border-gray-200">{formatNumber(totals.inbox)}</td>
                                            <td className="p-3 text-center border border-gray-200"><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">{totals.total > 0 ? ((totals.spam / totals.total) * 100).toFixed(1) : 0}%</span></td>
                                            <td className="p-3 text-center border border-gray-200"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">{totals.total > 0 ? ((totals.inbox / totals.total) * 100).toFixed(1) : 0}%</span></td>
                                            <td className="p-3 border border-gray-200">
                                                <div className="flex h-5 rounded-full overflow-hidden bg-gray-200 text-[9px] font-bold text-white text-center leading-5">
                                                    {(() => {
                                                        const sPct = totals.total > 0 ? Number(((totals.spam / totals.total) * 100).toFixed(1)) : 0;
                                                        const iPct = totals.total > 0 ? Number(((totals.inbox / totals.total) * 100).toFixed(1)) : 0;
                                                        return (
                                                            <>
                                                                <div className="bg-red-500 h-full" style={{ width: `${sPct}%` }}>{sPct > 15 && `${sPct}%`}</div>
                                                                <div className="bg-green-500 h-full" style={{ width: `${iPct}%` }}>{iPct > 15 && `${iPct}%`}</div>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <p className="text-center text-xs text-gray-500 mt-4">Showing top {Math.min(15, distribution.length)} from names out of {distribution.length} total</p>
            </div>
        </div>
    );
};

// Session Performance Component
const SessionPerformance = ({ sessions, stats }: { sessions: any[], stats: any }) => {
    const [selectedEntity, setSelectedEntity] = useState<string>('all');

    // Get unique entities from sessions
    const entities = useMemo(() => {
        const uniqueEntities = Array.from(new Set(sessions.map(s => s.entity))).sort();
        return ['all', ...uniqueEntities];
    }, [sessions]);

    // Filter sessions based on selected entity
    const filteredSessions = useMemo(() => {
        if (selectedEntity === 'all') return sessions;
        return sessions.filter(s => s.entity === selectedEntity);
    }, [sessions, selectedEntity]);

    // Calculate filtered stats
    const filteredStats = useMemo(() => {
        if (selectedEntity === 'all') return stats;

        const entitySessions = sessions.filter(s => s.entity === selectedEntity);
        const spamCounts = entitySessions.map(s => s.spam);

        return {
            totalProfiles: new Set(entitySessions.flatMap(s => s.profilesCount)).size,
            minSpam: spamCounts.length > 0 ? Math.min(...spamCounts) : 0,
            maxSpam: spamCounts.length > 0 ? Math.max(...spamCounts) : 0,
            avgSpam: spamCounts.length > 0 ? (spamCounts.reduce((a, b) => a + b, 0) / spamCounts.length).toFixed(2) : '0',
        };
    }, [sessions, selectedEntity, stats]);

    return (
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-blue-200/50 overflow-hidden mb-8 shadow-sm">
            {/* Clean Modern Header with Filter */}
            <div className="px-6 py-4 border-b border-blue-200/50 bg-white/60 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-lg shadow-sm">
                            <Activity size={18} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-base">Session Performance</h3>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Real-time Overview</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Entity Filter */}
                        <div className="relative">
                            <select
                                value={selectedEntity}
                                onChange={(e) => setSelectedEntity(e.target.value)}
                                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer outline-none hover:border-blue-400 transition-colors appearance-none pr-8 shadow-sm"
                            >
                                <option value="all">All Entities</option>
                                {entities.filter(e => e !== 'all').map(entity => (
                                    <option key={entity} value={entity}>{entity}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>

                        {/* Live Badge */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500 rounded-lg shadow-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            <span className="text-xs font-semibold text-white">Live</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {/* Modern Stats Grid with Enhanced Design */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    {/* Profiles Card */}
                    <div className="group bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-blue-200/60 hover:border-blue-400 hover:bg-white hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md group-hover:shadow-lg transition-shadow">
                                <Users size={16} className="text-white" />
                            </div>
                            <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                TOTAL
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900 mb-1">{filteredStats.totalProfiles}</div>
                        <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Profiles</div>
                    </div>

                    {/* Min Spam Card */}
                    <div className="group bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-emerald-200/60 hover:border-emerald-400 hover:bg-white hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-md group-hover:shadow-lg transition-shadow">
                                <TrendingDown size={16} className="text-white" />
                            </div>
                            <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                MIN
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900 mb-1">{filteredStats.minSpam}</div>
                        <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Min Spam</div>
                    </div>

                    {/* Max Spam Card */}
                    <div className="group bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-rose-200/60 hover:border-rose-400 hover:bg-white hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg shadow-md group-hover:shadow-lg transition-shadow">
                                <TrendingUp size={16} className="text-white" />
                            </div>
                            <div className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
                                MAX
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900 mb-1">{filteredStats.maxSpam}</div>
                        <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Max Spam</div>
                    </div>

                    {/* Avg Spam Card */}
                    <div className="group bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-amber-200/60 hover:border-amber-400 hover:bg-white hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-md group-hover:shadow-lg transition-shadow">
                                <BarChart3 size={16} className="text-white" />
                            </div>
                            <div className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                                AVG
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900 mb-1">{filteredStats.avgSpam}</div>
                        <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Avg Spam</div>
                    </div>

                    {/* Sessions Card */}
                    <div className="group bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-purple-200/60 hover:border-purple-400 hover:bg-white hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md group-hover:shadow-lg transition-shadow">
                                <Layers size={16} className="text-white" />
                            </div>
                            <div className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                                LIVE
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900 mb-1">{filteredSessions.length}</div>
                        <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Sessions</div>
                    </div>
                </div>

                {/* Clean Sessions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {filteredSessions.map((session, idx) => (
                        <div
                            key={idx}
                            className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-slate-200/50 hover:border-blue-400 hover:bg-white hover:shadow-md transition-all"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-2.5">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="font-semibold text-xs text-slate-700 truncate">{session.id}</span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{session.profilesCount} PR</span>
                            </div>

                            {/* Stats */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-[9px] font-semibold">
                                    <span className="text-emerald-600">INBOX: {session.inbox}</span>
                                    <span className="text-rose-600">SPAM: {session.spam}</span>
                                </div>

                                {/* Clean Progress Bar */}
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                    <div
                                        className="h-full bg-emerald-500"
                                        style={{ width: `${(session.inbox / (session.total || 1)) * 100}%` }}
                                    />
                                    <div
                                        className="h-full bg-rose-500"
                                        style={{ width: `${(session.spam / (session.total || 1)) * 100}%` }}
                                    />
                                </div>

                                {/* Footer */}
                                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                    <span className="text-[9px] text-slate-500 font-medium">{session.entity}</span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${session.spamPct > 15 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {session.spamPct.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* No Results Message */}
                {filteredSessions.length === 0 && (
                    <div className="text-center py-12">
                        <div className="bg-white/70 backdrop-blur-sm w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-200">
                            <Search size={24} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-semibold text-slate-600">No sessions found</p>
                        <p className="text-xs text-slate-500 mt-1">Try selecting a different entity</p>
                    </div>
                )}
            </div>
        </div>
    );
};



// Raw Data Viewer Component
const RawDataViewer = ({ data }: { data: any }) => {
    const [activeTab, setActiveTab] = useState('spam_actions');
    const [search, setSearch] = useState('');
    const [copiedId, setCopiedId] = useState<string | number | null>(null);
    const [isCopyingAll, setIsCopyingAll] = useState(false);

    const tabs = [
        { id: 'spam_actions', label: 'Spam Actions', icon: <Zap size={14} /> },
        { id: 'inbox_actions', label: 'Inbox Actions', icon: <Inbox size={14} /> },
        { id: 'spam_domains', label: 'Spam Domains', icon: <Globe size={14} /> },
        { id: 'inbox_domains', label: 'Inbox Domains', icon: <Mail size={14} /> },
    ];

    const currentData = data?.[activeTab] || [];
    const filteredData = currentData.filter((item: any) =>
        item.raw?.toLowerCase().includes(search.toLowerCase())
    );

    const handleCopy = (text: string, id: string | number) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleCopyAll = () => {
        const allText = filteredData.map((item: any) => item.raw).join('\n');
        navigator.clipboard.writeText(allText);
        setIsCopyingAll(true);
        setTimeout(() => setIsCopyingAll(false), 2000);
    };

    return (
        <div id="raw-data" className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-6 scroll-mt-32">
            <div className="p-4 border-b bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-lg shadow-sm">
                        <List size={18} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">Raw Data Records</h3>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Direct API Response Logs</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search raw logs..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full md:w-64 shadow-sm"
                        />
                    </div>
                    <button
                        onClick={handleCopyAll}
                        disabled={filteredData.length === 0}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isCopyingAll
                            ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm disabled:opacity-50'
                            }`}
                    >
                        {isCopyingAll ? <Check size={14} /> : <Copy size={14} />}
                        {isCopyingAll ? 'Copied All!' : 'Copy All'}
                    </button>
                </div>
            </div>
            <div className="flex border-b overflow-x-auto no-scrollbar bg-white">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-4 text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === tab.id
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                        <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>
                            {data?.[tab.id]?.length || 0}
                        </span>
                    </button>
                ))}
            </div>
            <div className="max-h-[600px] overflow-y-auto p-0 custom-scrollbar bg-slate-50/30">
                <table className="w-full text-xs text-left border-collapse">
                    <thead className="sticky top-0 bg-white shadow-sm z-10">
                        <tr>
                            <th className="p-4 border-b font-black text-slate-400 uppercase tracking-wider w-16">#</th>
                            <th className="p-4 border-b font-black text-slate-400 uppercase tracking-wider">Raw Record Content (from file)</th>
                            <th className="p-4 border-b font-black text-slate-400 uppercase tracking-wider w-20 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-blue-50/30 transition-colors border-b border-slate-100 last:border-0 group">
                                <td className="p-4 text-slate-400 font-mono group-hover:text-blue-400 transition-colors">{idx + 1}</td>
                                <td className="p-4 text-slate-700 font-mono break-all whitespace-pre-wrap leading-relaxed">{item.raw}</td>
                                <td className="p-4 text-center">
                                    <button
                                        onClick={() => handleCopy(item.raw, idx)}
                                        className={`p-2 rounded-lg transition-all ${copiedId === idx
                                            ? 'bg-green-100 text-green-600'
                                            : 'bg-slate-100 text-slate-400 hover:bg-blue-100 hover:text-blue-600 opacity-0 group-hover:opacity-100'
                                            }`}
                                        title="Copy record"
                                    >
                                        {copiedId === idx ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredData.length === 0 && (
                            <tr>
                                <td colSpan={3} className="p-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-4 bg-slate-100 rounded-full">
                                            <Search size={24} className="text-slate-300" />
                                        </div>
                                        <p className="text-sm text-slate-400 font-medium">No records found for this category</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


// --- Main Dashboard Component ---

export const DashboardReporting: React.FC = () => {
    const [rawData, setRawData] = useState<any>(null);
    const [apiResponse, setApiResponse] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefetching, setIsRefetching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedEntities, setSelectedEntities] = useState<string[]>([]); // Empty = show all entities
    const [selectedHours, setSelectedHours] = useState<string[]>([new Date().getHours().toString().padStart(2, '0')]);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [showDetailedLogs, setShowDetailedLogs] = useState(false);

    // Fetch data with optional filters
    const fetchData = async (showRefetchingState = false) => {
        try {
            if (showRefetchingState) {
                setIsRefetching(true);
            } else {
                setIsLoading(true);
            }

            // Build query parameters for filtering
            const params = new URLSearchParams();

            // Add entity filter ONLY if specific entities are selected
            // Empty array = show all entities (no filter)
            if (selectedEntities.length > 0) {
                params.append('entities', selectedEntities.join(','));
            }

            // Add date filter - ALWAYS send a date to prevent fetching entire database
            // Default to today if no date is selected
            const filterDate = selectedDate || new Date().toISOString().split('T')[0];
            params.append('date', filterDate);

            // Add hours filter - only if not all hours selected
            if (selectedHours.length > 0 && selectedHours.length < 24) {
                params.append('hours', selectedHours.join(','));
            }

            // Add safety limit to prevent timeout on very large datasets
            // Increased to 10000 to show more records as requested
            params.append('limit', '10000');

            const queryString = params.toString();
            const url = queryString ? `${DATA_API_URL}?${queryString}` : DATA_API_URL;

            console.log('🔍 Fetching filtered data:', {
                entities: selectedEntities,
                date: selectedDate,
                hours: selectedHours.length < 24 ? selectedHours : 'all',
                url
            });

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch dashboard data');
            const result = await response.json();

            if (!result.data) throw new Error('Invalid data format received');

            setApiResponse(result.data);

            // Log filter info if filters were applied
            if (result.filters_applied) {
                console.log('✅ Filters applied:', result.filters_applied);
                console.log('📦 Records returned:', result.record_counts);
            }

            const normalizeTimestamp = (ts: string) => {
                if (!ts) return '';
                const parts = ts.split(' ');
                if (parts.length !== 2) return ts;
                const dateParts = parts[0].split('-');
                const timeParts = parts[1].split(/[-:]/);
                if (dateParts.length !== 3 || timeParts.length < 2) return ts;
                return `${dateParts[2]}-${dateParts[1]}-${dateParts[0]} ${timeParts[0]}:${timeParts[1]}`;
            };

            const transformItems = (items: any[], category?: string) => {
                return (items || []).map(item => {
                    const p = item.parsed || {};
                    return {
                        ...p,
                        timestamp: normalizeTimestamp(p.timestamp),
                        entity: p.session ? p.session.split('_')[0] : 'Unknown',
                        category: category || p.category
                    };
                });
            };

            const inboxActions = transformItems(result.data.inbox_actions, 'inbox');

            const spamActions: any[] = [];
            (result.data.spam_actions || []).forEach((item: any) => {
                const p = item.parsed || {};
                const count = p.count || 0;
                const ts = normalizeTimestamp(p.timestamp);
                const entity = p.session ? p.session.split('_')[0] : 'Unknown';

                if (count === 0) return;

                for (let i = 0; i < count; i++) {
                    spamActions.push({
                        ...p,
                        count: 1,
                        timestamp: ts,
                        entity: entity,
                        category: 'spam',
                        action_type: 'SPAM_ACTION'
                    });
                }
            });

            const transformedData = {
                combined_actions: [...inboxActions, ...spamActions],
                inbox_domains: transformItems(result.data.inbox_domains, 'inbox'),
                spam_domains: transformItems(result.data.spam_domains, 'spam'),
                inbox_relationships: transformItems(result.data.inbox_relationships, 'inbox')
            };

            console.log('📊 Data transformed. Spam domains:', transformedData.spam_domains.length, 'Inbox domains:', transformedData.inbox_domains.length);
            setRawData(transformedData);
            setError(null);
        } catch (err: any) {
            console.error('Data Fetch Error:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
            setIsRefetching(false);
        }
    };

    // Initial data fetch
    useEffect(() => {
        fetchData();
    }, []);

    // Refetch when filters change (with debouncing)
    useEffect(() => {
        // Skip if initial load hasn't completed
        if (isLoading) return;

        // Debounce filter changes to avoid excessive API calls
        const timeoutId = setTimeout(() => {
            console.log('🔄 Filters changed, refetching data...');
            fetchData(true);
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [selectedEntities, selectedDate, selectedHours]);


    const resolvedDomainsRef = useRef<Set<string>>(new Set());
    const [dnsStatus, setDnsStatus] = useState<'idle' | 'resolving' | 'completed' | 'error'>('idle');

    // DNS Resolution Effect
    useEffect(() => {
        const resolveDomainIPs = async () => {
            if (!rawData) return;

            try {
                setDnsStatus('resolving');
                const allDomains = [
                    ...rawData.spam_domains.map((d: any) => d.domain)
                ].filter((d: string) => d && d !== 'Unknown').map(d => d.trim());

                const uniqueDomains = [...new Set(allDomains)];
                const domainsToResolve = uniqueDomains.filter(d => !resolvedDomainsRef.current.has(d));

                if (domainsToResolve.length === 0) {
                    setDnsStatus('completed');
                    return;
                }

                console.log('📡 Resolving IPs for:', domainsToResolve.length, 'new spam domains using Google DNS');

                // Mark as resolved immediately to prevent duplicate calls
                domainsToResolve.forEach(d => resolvedDomainsRef.current.add(d));

                const ipMap: Record<string, string> = {};

                // Resolve in batches to avoid overwhelming the browser/API
                const batchSize = 5;
                for (let i = 0; i < domainsToResolve.length; i += batchSize) {
                    const batch = domainsToResolve.slice(i, i + batchSize);
                    await Promise.all(batch.map(async (domain) => {
                        try {
                            const res = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
                            if (!res.ok) return;
                            const json = await res.json();
                            if (json.Answer && json.Answer.length > 0) {
                                // Find the first A record (type 1)
                                const aRecord = json.Answer.find((ans: any) => ans.type === 1);
                                if (aRecord) {
                                    ipMap[domain] = aRecord.data;
                                }
                            }
                        } catch (e) {
                            console.error(`Failed to resolve ${domain}:`, e);
                        }
                    }));
                }

                console.log('✅ Google DNS Resolution successful for', Object.keys(ipMap).length, 'spam domains');

                // Update rawData with resolved IPs
                setRawData((prev: any) => {
                    if (!prev) return prev;

                    const updateWithIPs = (items: any[]) => (items || []).map((d: any) => ({
                        ...d,
                        ip: ipMap[d.domain?.trim()] || d.ip || 'N/A'
                    }));

                    return {
                        ...prev,
                        spam_domains: updateWithIPs(prev.spam_domains)
                    };
                });
                setDnsStatus('completed');

            } catch (error) {
                console.error('❌ DNS Resolution Error:', error);
                setDnsStatus('error');
            }
        };

        if (rawData && dnsStatus === 'idle') {
            resolveDomainIPs();
        }
    }, [rawData?.spam_domains?.length, rawData?.inbox_domains?.length]);

    const filterOptions = useMemo(() => {
        // 1. Generate last 7 days (Today, Yesterday, etc.)
        const dates: string[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dates.push(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`);
        }

        // 2. Generate entities CMH1 to CMH16
        const entities: string[] = [];
        for (let i = 1; i <= 16; i++) {
            entities.push(`CMH${i}`);
        }

        // 3. Generate all 24 hours
        const hours: string[] = [];
        for (let i = 0; i < 24; i++) {
            hours.push(i.toString().padStart(2, '0'));
        }

        return { entities, hours, dates };
    }, []);

    // Set initial date if not set
    useEffect(() => {
        if (filterOptions.dates.length > 0 && !selectedDate) {
            // Always default to the first date in the list (which we've ensured is Today)
            setSelectedDate(filterOptions.dates[0]);
        }
    }, [filterOptions.dates, selectedDate]);

    const processedData = useMemo(() => {
        if (!rawData || !rawData.combined_actions) return null;

        // Determine the target date
        const targetDate = selectedDate || (filterOptions.dates.length > 0 ? filterOptions.dates[0] : new Date().toISOString().split('T')[0]);

        // Helper to filter any data array by selected entities and date
        const filterByEntityAndDate = (arr: any[]) => {
            let filtered = arr || [];
            if (selectedEntities.length > 0) {
                filtered = filtered.filter((item: any) => {
                    if (item.entity) return selectedEntities.includes(item.entity);
                    if (item.session) {
                        const entityFromSession = item.session.split('_')[0];
                        return selectedEntities.includes(entityFromSession);
                    }
                    return true;
                });
            }

            filtered = filtered.filter((item: any) => {
                if (!item.timestamp) return true;
                const itemDate = item.timestamp.split(' ')[0];
                return itemDate === targetDate;
            });
            return filtered;
        };

        const dailyActions = filterByEntityAndDate(rawData.combined_actions || []);

        // Now apply hour filter for specific metrics/tables
        const filterByHour = (arr: any[]) => {
            if (selectedHours.length === 0) return arr;
            return arr.filter((item: any) => {
                if (!item.timestamp) return true;
                const date = new Date(item.timestamp.replace(' ', 'T'));
                const hour = date.getHours().toString().padStart(2, '0');
                return selectedHours.includes(hour);
            });
        };

        const actions = filterByHour(dailyActions);
        const spamActions = actions.filter((a: any) => a.category === 'spam');
        const inboxActions = actions.filter((a: any) => a.category === 'inbox');

        // Filter pre-aggregated data
        const dailyInboxDomains = filterByEntityAndDate(rawData.inbox_domains || []);
        const dailySpamDomains = filterByEntityAndDate(rawData.spam_domains || []);
        const dailyInboxRelationships = filterByEntityAndDate(rawData.inbox_relationships || []);

        const inboxDomains = filterByHour(dailyInboxDomains);
        const spamDomains = filterByHour(dailySpamDomains);
        const inboxRelationships = filterByHour(dailyInboxRelationships);

        const aggregateFromNames = (arr: any[], senderField: string) => {
            const map: Record<string, number> = {};
            arr.forEach(item => {
                const key = item[senderField] || 'Unknown';
                map[key] = (map[key] || 0) + 1;
            });
            const total = arr.length;
            return Object.entries(map).map(([name, count]) => ({ name, count, percentage: formatPercentage(count, total) })).sort((a, b) => b.count - a.count);
        };

        const aggregateDomains = (arr: any[]) => {
            const map: Record<string, number> = {};
            arr.forEach(item => {
                const key = item.domain || 'Unknown';
                map[key] = (map[key] || 0) + 1;
            });

            const total = arr.length;
            return Object.entries(map).map(([name, count]) => ({
                name,
                count,
                percentage: formatPercentage(count, total)
            })).sort((a, b) => b.count - a.count);
        };

        const aggregateActionTypes = (arr: any[]) => {
            const map: Record<string, number> = {};
            arr.forEach(item => {
                // Count action_type (e.g., ACTION_STAR, ACTION_IMPORTANT, ACTION_CLICK, ACTION_OPEN)
                const actionType = item.action_type || 'Unknown';
                map[actionType] = (map[actionType] || 0) + 1;

                // Also count archive_action if it exists (e.g., ACTION_ARCHIVE)
                if (item.archive_action && item.archive_action !== actionType) {
                    map[item.archive_action] = (map[item.archive_action] || 0) + 1;
                }
            });
            const total = arr.length;
            return Object.entries(map).map(([name, count]) => ({ name, count, percentage: formatPercentage(count, total) })).sort((a, b) => b.count - a.count);
        };

        const buildSpamRelationships = () => {
            const map: Record<string, Record<string, { count: number; ip: string }>> = {};
            spamDomains.forEach((item: any) => {
                const fromName = item.sender || 'Unknown';
                const domain = item.domain || 'Unknown';
                const ip = item.ip || 'N/A';
                if (!map[fromName]) map[fromName] = {};
                if (!map[fromName][domain]) map[fromName][domain] = { count: 0, ip };
                map[fromName][domain].count++;
                if (ip && ip !== 'N/A') map[fromName][domain].ip = ip;
            });
            const result: any[] = [];
            const grandTotal = spamDomains.length;
            Object.entries(map).forEach(([fromName, domains]) => {
                Object.entries(domains).forEach(([domain, data]) => {
                    result.push({ fromName, domain, ip: data.ip, count: data.count, percentage: formatPercentage(data.count, grandTotal) });
                });
            });
            return result.sort((a, b) => b.count - a.count);
        };

        const buildInboxRelationships = () => {
            if (inboxRelationships.length > 0) {
                const grandTotal = inboxRelationships.reduce((sum: number, item: any) => sum + (item.count || 1), 0);
                return inboxRelationships.map((item: any) => ({
                    fromName: item.from_name || 'Unknown',
                    domain: item.domain || 'Unknown',
                    count: item.count || 1,
                    percentage: formatPercentage(item.count || 1, grandTotal)
                })).sort((a: any, b: any) => b.count - a.count);
            }
            const map: Record<string, Record<string, number>> = {};
            inboxDomains.forEach((item: any) => {
                const fromName = item.sender || 'Unknown';
                const domain = item.domain || 'Unknown';
                if (!map[fromName]) map[fromName] = {};
                map[fromName][domain] = (map[fromName][domain] || 0) + 1;
            });
            const result: any[] = [];
            const grandTotal = inboxDomains.length;
            Object.entries(map).forEach(([fromName, domains]) => {
                Object.entries(domains).forEach(([domain, count]) => {
                    result.push({ fromName, domain, count, percentage: formatPercentage(count, grandTotal) });
                });
            });
            return result.sort((a, b) => b.count - a.count);
        };

        // Trend Data Aggregation (Uses dailyActions, NOT hour-filtered actions)
        const trendMap: Record<string, { hour: string; spam: number; inbox: number }> = {};
        for (let i = 0; i < 24; i++) {
            const h = i.toString().padStart(2, '0');
            trendMap[h] = { hour: `${h}:00`, spam: 0, inbox: 0 };
        }
        dailyActions.forEach((a: any) => {
            const h = new Date(a.timestamp.replace(' ', 'T')).getHours().toString().padStart(2, '0');
            if (trendMap[h]) {
                if (a.category === 'spam') trendMap[h].spam += (a.count || 1);
                else trendMap[h].inbox += (a.count || 1);
            }
        });
        const trendData = Object.values(trendMap);

        // AI Insights Logic
        const insights = [];
        const inboxRate = (inboxActions.length / (actions.length || 1)) * 100;
        const topEntity = [...new Set(actions.map((a: any) => a.entity))].map(e => ({
            name: e,
            rate: (actions.filter((a: any) => a.entity === e && a.category === 'inbox').length / (actions.filter((a: any) => a.entity === e).length || 1)) * 100
        })).sort((a, b) => b.rate - a.rate)[0];

        if (topEntity) {
            insights.push({
                icon: <TrendingUp size={16} className="text-green-400" />,
                text: `Entity ${topEntity.name} is performing best with a ${topEntity.rate.toFixed(1)}% Inbox rate.`,
                trend: "Optimal Performance",
                trendType: "positive"
            });
        }

        const peakSpamHour = [...trendData].sort((a, b) => b.spam - a.spam)[0];
        if (peakSpamHour && peakSpamHour.spam > 0) {
            insights.push({
                icon: <Clock size={16} className="text-orange-400" />,
                text: `Peak spam activity detected at ${peakSpamHour.hour} with ${peakSpamHour.spam} actions.`,
                trend: "High Activity",
                trendType: "negative"
            });
        }

        const uniqueDomains = new Set(spamDomains.map((d: any) => d.domain)).size;
        insights.push({
            icon: <Globe size={16} className="text-blue-400" />,
            text: `Currently monitoring ${uniqueDomains} unique spam domains across all active entities.`,
            trend: "Broad Coverage",
            trendType: "positive"
        });

        // Smart Alerts
        const alerts = [];

        const spamSpikes = [...new Set(actions.map((a: any) => a.entity))].filter(e => {
            const entityActions = actions.filter((a: any) => a.entity === e);
            const spamCount = entityActions.filter((a: any) => a.category === 'spam').length;
            return (spamCount / (entityActions.length || 1)) > 0.15;
        });

        spamSpikes.forEach(e => {
            alerts.push({
                type: 'danger',
                title: 'Spam Spike Detected',
                message: `Entity ${e} has exceeded the 15% spam threshold.`
            });
        });
        // Excessive Spam Forms Alert
        const entitiesInData = [...new Set(actions.map((a: any) => a.entity))];
        entitiesInData.forEach(e => {
            const entitySpamForms = new Set(spamDomains.filter((d: any) => d.entity === e || (d.session && d.session.split('_')[0] === e)).map((d: any) => d.sender)).size;
            const entityInboxForms = new Set(inboxDomains.filter((d: any) => d.entity === e || (d.session && d.session.split('_')[0] === e)).map((d: any) => d.sender)).size;
            const totalForms = entitySpamForms + entityInboxForms;

            if (totalForms > 0 && (entitySpamForms / totalForms) > 0.5) {
                alerts.push({
                    type: 'danger',
                    title: 'Excessive Spam Forms',
                    message: `Too much spam in entity ${e}: ${entitySpamForms} spam forms out of ${totalForms} total (${((entitySpamForms / totalForms) * 100).toFixed(1)}%).`
                });
            }
        });

        const spamByProfile: Record<string, number> = {};
        spamActions.forEach((a: any) => { spamByProfile[a.profile] = (spamByProfile[a.profile] || 0) + 1; });
        const spamCounts = Object.values(spamByProfile);

        const sessionsMap: Record<string, any[]> = {};
        actions.forEach(a => {
            if (!sessionsMap[a.session]) sessionsMap[a.session] = [];
            sessionsMap[a.session].push(a);
        });

        return {
            stats: {
                totalProfiles: new Set(actions.map((a: any) => a.profile)).size,
                activeSessions: new Set(actions.map((a: any) => a.session)).size,
                spamActions: spamActions.length,
                inboxActions: inboxActions.length,
                spamForms: new Set(spamDomains.map((a: any) => a.sender)).size,
                inboxForms: new Set(inboxDomains.map((a: any) => a.sender)).size,
                spamDomains: new Set(spamDomains.map((a: any) => a.domain)).size,
                inboxDomains: new Set(inboxDomains.map((a: any) => a.domain)).size,
            },
            spamStats: {
                min: spamCounts.length > 0 ? Math.min(...spamCounts) : 0,
                max: spamCounts.length > 0 ? Math.max(...spamCounts) : 0,
                avg: spamCounts.length > 0 ? (spamCounts.reduce((a, b) => a + b, 0) / spamCounts.length).toFixed(2) : '0',
            },
            // Use 'sender' field from spam_domains and inbox_domains for from names
            spamForms: aggregateFromNames(spamDomains, 'sender'),
            inboxForms: aggregateFromNames(inboxDomains, 'sender'),
            spamDomainsData: aggregateDomains(spamDomains),
            inboxDomainsData: aggregateDomains(inboxDomains),
            inboxActionTypes: aggregateActionTypes(inboxActions),
            spamRelationships: buildSpamRelationships(),
            inboxRelationships: buildInboxRelationships(),
            displayEntity: selectedEntities.length === 0 ? 'ALL' : (selectedEntities.length === 1 ? selectedEntities[0] : `Multiple (${selectedEntities.length})`),
            displayHour: selectedHours.length === 0 ? 'ALL' : (selectedHours.length === 1 ? `${selectedHours[0]}:00` : `Multiple (${selectedHours.length})`),
            displayDate: targetDate.split('-').reverse().join('/'),
            trendData,
            insights,
            alerts,
            detailedLogs: {
                spam: (() => {
                    let log = "**************** DETAILED SPAM ACTIONS REPORT ****************\n\n";
                    log += "> SPAM DOMAIN IN FROM-EMAIL:\n";
                    const spamDomainsMap: Record<string, number> = {};
                    spamDomains.forEach((d: any) => { spamDomainsMap[d.domain] = (spamDomainsMap[d.domain] || 0) + 1; });
                    const sortedSpamDomains = Object.entries(spamDomainsMap).sort((a, b) => b[1] - a[1]);
                    const totalSpamDomains = spamDomains.length || 1;
                    sortedSpamDomains.forEach(([domain, count]) => {
                        log += `${domain} (${count},   ${((count / totalSpamDomains) * 100).toFixed(2)}%)\n`;
                    });
                    log += "\n> SPAM FROM NAME:\n";
                    const spamFromNamesMap: Record<string, number> = {};
                    spamDomains.forEach((d: any) => { spamFromNamesMap[d.sender] = (spamFromNamesMap[d.sender] || 0) + 1; });
                    const sortedSpamFromNames = Object.entries(spamFromNamesMap).sort((a, b) => b[1] - a[1]);
                    sortedSpamFromNames.forEach(([name, count]) => {
                        log += `${name} (${count},   ${((count / totalSpamDomains) * 100).toFixed(2)}%)\n`;
                    });
                    log += "\n\n**************** PROFILES IN SESSIONS ****************\n\n";
                    const totalProfiles = new Set(actions.map((a: any) => a.profile)).size;
                    log += `TOTAL NBR PROFILES: ${totalProfiles}  |  TOTAL Spam Actions: ${spamActions.length}\n\n`;
                    Object.entries(sessionsMap).forEach(([sessionId, sessionActions]) => {
                        const sessionProfiles = new Set(sessionActions.map(a => a.profile));
                        const sessionSpamActions = sessionActions.filter(a => a.category === 'spam');
                        log += `> ${sessionId}  |  Nbr Profiles: ${sessionProfiles.size}  |  Nbr Spam Actions: ${sessionSpamActions.length}\n`;
                        const profileSpamMap: Record<string, number> = {};
                        sessionActions.forEach(a => {
                            if (a.category === 'spam') {
                                profileSpamMap[a.profile] = (profileSpamMap[a.profile] || 0) + 1;
                            } else if (!profileSpamMap[a.profile]) {
                                profileSpamMap[a.profile] = 0;
                            }
                        });
                        Object.entries(profileSpamMap).sort().forEach(([profile, count]) => {
                            log += `Pr: ${profile} - Spam Action(s): ${count}\n`;
                        });
                        log += "\n";
                    });
                    return log;
                })(),
                inbox: (() => {
                    let log = "**************** DETAILED INBOX ACTIONS REPORT ****************\n\n";
                    const actionCounts: Record<string, number> = {};
                    inboxActions.forEach((a: any) => { actionCounts[a.action_type] = (actionCounts[a.action_type] || 0) + 1; });
                    const totalInbox = inboxActions.length || 1;
                    log += "OVERALL STATISTICS:\n";
                    Object.entries(actionCounts).forEach(([type, count]) => {
                        log += `Total ${type} Actions: ${count} (${((count / totalInbox) * 100).toFixed(1)}%)\n`;
                    });
                    log += `Total All Actions: ${actions.length}\n`;
                    log += `Total Profiles: ${new Set(actions.map((a: any) => a.profile)).size}\n\n`;
                    log += "> INBOX DOMAINS:\n";
                    const inboxDomainsMap: Record<string, number> = {};
                    inboxDomains.forEach((d: any) => { inboxDomainsMap[d.domain] = (inboxDomainsMap[d.domain] || 0) + 1; });
                    const sortedInboxDomains = Object.entries(inboxDomainsMap).sort((a, b) => b[1] - a[1]);
                    sortedInboxDomains.forEach(([domain, count]) => {
                        log += `${domain} (${count},   ${((count / totalInbox) * 100).toFixed(2)}%)\n`;
                    });
                    log += "\n> INBOX FROM NAMES:\n";
                    const inboxFromNamesMap: Record<string, number> = {};
                    inboxDomains.forEach((d: any) => { inboxFromNamesMap[d.sender] = (inboxFromNamesMap[d.sender] || 0) + 1; });
                    const sortedInboxFromNames = Object.entries(inboxFromNamesMap).sort((a, b) => b[1] - a[1]);
                    sortedInboxFromNames.forEach(([name, count]) => {
                        log += `${name} (${count},   ${((count / totalInbox) * 100).toFixed(2)}%)\n`;
                    });
                    log += "\n\n**************** INBOX ACTIONS BY SESSION ****************\n\n";
                    Object.entries(sessionsMap).forEach(([sessionId, sessionActions]) => {
                        log += `> ${sessionId}\n`;
                        const profileActionsMap: Record<string, Record<string, number>> = {};
                        sessionActions.forEach(a => {
                            if (a.category === 'inbox') {
                                if (!profileActionsMap[a.profile]) profileActionsMap[a.profile] = {};
                                profileActionsMap[a.profile][a.action_type] = (profileActionsMap[a.profile][a.action_type] || 0) + 1;
                            }
                        });
                        Object.entries(profileActionsMap).sort().forEach(([profile, types]) => {
                            const typesStr = Object.entries(types).map(([type, count]) => `${type}:${count}`).join(' | ');
                            log += `PR:${profile} - ${typesStr}\n`;
                        });
                        log += "\n";
                    });
                    return log;
                })()
            },
            sessionStats: {
                sessions: Object.entries(sessionsMap).map(([id, sActions]) => {
                    const spam = sActions.filter(a => a.category === 'spam').length;
                    const inbox = sActions.filter(a => a.category === 'inbox').length;
                    const total = sActions.length;
                    const profilesCount = new Set(sActions.map(a => a.profile)).size;
                    return {
                        id,
                        spam,
                        inbox,
                        total,
                        profilesCount,
                        spamPct: (spam / (total || 1)) * 100,
                        entity: sActions[0]?.entity || 'Unknown'
                    };
                }).sort((a, b) => b.total - a.total),
                stats: {
                    totalProfiles: new Set(actions.map((a: any) => a.profile)).size,
                    minSpam: spamCounts.length > 0 ? Math.min(...spamCounts) : 0,
                    maxSpam: spamCounts.length > 0 ? Math.max(...spamCounts) : 0,
                    avgSpam: spamCounts.length > 0 ? (spamCounts.reduce((a, b) => a + b, 0) / spamCounts.length).toFixed(2) : '0',
                }
            }
        };
    }, [rawData, selectedEntities, selectedHours, selectedDate, filterOptions.dates]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                    <p className="text-gray-500 font-medium">Loading real-time analytics...</p>
                </div>
            </div>
        );
    }

    if (error || !processedData) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 text-center max-w-md">
                    <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-rose-900 mb-2">Connection Error</h3>
                    <p className="text-rose-700 mb-4">{error || 'Failed to process data'}</p>
                    <button onClick={() => window.location.reload()} className="px-4 py-2 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }


    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8">
            <style>{dashboardStyles}</style>

            {/* Sticky Navigation & Filter Toolbar */}
            <nav className="sticky top-0 z-[1000] bg-white/80 backdrop-blur-md border-b border-slate-200/60 transition-all duration-300">
                <div className="max-w-[1800px] mx-auto px-4 h-14 flex items-center justify-between gap-4 flex-nowrap">
                    {/* Left: Navigation Links */}
                    <div className="flex items-center gap-1 flex-nowrap flex-shrink-0">
                        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 rounded-lg text-slate-500 mr-1">
                            <Activity size={14} className="text-blue-500" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Navigate</span>
                        </div>
                        {[
                            { id: 'overview', label: 'Overview', icon: <PieChart size={14} />, color: 'blue' },
                            { id: 'forms', label: 'Forms', icon: <FileText size={14} />, color: 'purple' },
                            { id: 'actions', label: 'Actions', icon: <Zap size={14} />, color: 'amber' },
                            { id: 'domains', label: 'Domains', icon: <Globe size={14} />, color: 'emerald' },
                            { id: 'relationships', label: 'Relationships', icon: <Network size={14} />, color: 'rose' },
                            { id: 'distribution', label: 'Distribution', icon: <TrendingUp size={14} />, color: 'cyan' },
                            { id: 'raw-data', label: 'Raw Data', icon: <List size={14} />, color: 'slate' },
                        ].map((section) => (
                            <button
                                key={section.id}
                                onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                className={`px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:text-${section.color}-600 hover:bg-${section.color}-50/50 rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap group`}
                            >
                                <span className={`text-${section.color}-500 group-hover:text-${section.color}-600 transition-colors`}>{section.icon}</span>
                                {section.label}
                            </button>
                        ))}
                    </div>

                    {/* Right: Filters & Reset */}
                    <div className="flex items-center gap-2 flex-nowrap flex-shrink-0">
                        {/* Updating Indicator (Fixed Width to prevent jump) */}
                        <div className="w-16 flex justify-end">
                            <AnimatePresence>
                                {isRefetching && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 5 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 5 }}
                                        className="flex items-center gap-1.5 text-blue-600"
                                    >
                                        <RefreshCw size={12} className="animate-spin" />
                                        <span className="text-[9px] font-black uppercase tracking-tighter">Updating</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="h-8 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent mx-1" />

                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200/60 shadow-sm">
                            <Filter size={14} className="text-indigo-500" />
                            <span className="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">Filters</span>
                        </div>

                        {/* Date Picker (Fixed Width) - Modern Design */}
                        <div className="relative group w-[120px] flex-shrink-0">
                            <button
                                className={`relative flex items-center gap-1.5 px-2 py-1.5 bg-white border-2 rounded-lg text-xs font-medium transition-all duration-200 w-full justify-between ${selectedDate
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-slate-200 text-slate-600 hover:border-blue-300'
                                    }`}
                            >
                                <div className="flex items-center gap-1.5 overflow-hidden w-full relative z-10">
                                    <Calendar size={14} className={selectedDate ? 'text-blue-500' : 'text-slate-400'} />
                                    <div className="relative flex items-center overflow-hidden w-full">
                                        <span className="truncate block w-full text-left text-xs">
                                            {(() => {
                                                const now = new Date();
                                                const today = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
                                                const yesterday = new Date(now);
                                                yesterday.setDate(now.getDate() - 1);
                                                const yesterdayStr = `${yesterday.getFullYear()}-${(yesterday.getMonth() + 1).toString().padStart(2, '0')}-${yesterday.getDate().toString().padStart(2, '0')}`;

                                                if (selectedDate === today) return 'Today';
                                                if (selectedDate === yesterdayStr) return 'Yesterday';
                                                return selectedDate || 'Select Date';
                                            })()}
                                        </span>
                                        <select
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                        >
                                            {filterOptions.dates.map(date => (
                                                <option key={date} value={date}>{date}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <ChevronDown size={14} className={`flex-shrink-0 transition-all ${selectedDate ? 'text-blue-500' : 'text-slate-400'}`} />
                            </button>
                        </div>

                        <div className="w-[120px] flex-shrink-0">
                            <MultiSelect label="Entities" options={filterOptions.entities} selected={selectedEntities} onChange={setSelectedEntities} icon={Box} />
                        </div>
                        <div className="w-[120px] flex-shrink-0">
                            <MultiSelect label="Hours" options={filterOptions.hours} selected={selectedHours} onChange={setSelectedHours} icon={Clock} align="right" />
                        </div>

                        {/* Reset Button Container (Fixed Width to prevent jump) */}
                        <div className="w-20 flex justify-end">
                            <AnimatePresence>
                                {(selectedEntities.length > 0 || selectedHours.length !== 1 || selectedHours[0] !== new Date().getHours().toString().padStart(2, '0') || (selectedDate && selectedDate !== (() => {
                                    const now = new Date();
                                    const today = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
                                    return filterOptions.dates.includes(today) ? today : filterOptions.dates[0];
                                })())) && (
                                        <button
                                            onClick={() => {
                                                const now = new Date();
                                                const currentHour = now.getHours().toString().padStart(2, '0');
                                                const today = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
                                                setSelectedEntities([]);
                                                setSelectedHours([currentHour]);
                                                setSelectedDate(filterOptions.dates.includes(today) ? today : (filterOptions.dates[0] || ''));
                                            }}
                                            className="flex items-center gap-1.5 px-2 py-1.5 bg-rose-500 text-white rounded-lg text-[9px] font-bold uppercase tracking-wide hover:bg-rose-600 transition-all duration-200 shadow-sm whitespace-nowrap"
                                        >
                                            <RotateCcw size={12} className="stroke-[3]" />
                                            <span>Reset</span>
                                        </button>
                                    )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Alerts Section */}
            {processedData.alerts.length > 0 && (
                <div className="mb-6 space-y-3">
                    {processedData.alerts.map((alert, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex items-center gap-3 p-4 rounded-xl border ${alert.type === 'danger' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-amber-50 border-amber-100 text-amber-800'
                                }`}
                        >
                            <AlertTriangle size={20} className={alert.type === 'danger' ? 'text-red-500' : 'text-amber-500'} />
                            <div>
                                <span className="font-bold">{alert.title}:</span> {alert.message}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* AI Insights */}
            <ExecutiveInsights insights={processedData.insights} />

            {/* Header */}
            <div id="overview" className="bg-white rounded-xl shadow-sm border p-4 mb-5 scroll-mt-32">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Desktop Report Details</h1>
                        <p className="text-gray-500 text-sm">SPAM & INBOX</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-6 text-center">
                            <div><div className="text-gray-500 text-xs uppercase font-semibold">Entity</div><div className="text-blue-600 font-bold">{processedData.displayEntity}</div></div>
                            <div className="h-8 w-px bg-gray-300"></div>
                            <div><div className="text-gray-500 text-xs uppercase font-semibold">Hour</div><div className="text-gray-900 font-bold">{processedData.displayHour}</div></div>
                            <div className="h-8 w-px bg-gray-300"></div>
                            <div><div className="text-gray-500 text-xs uppercase font-semibold">Date</div><div className="text-gray-900 font-bold">{processedData.displayDate}</div></div>
                        </div>
                        <div className="h-8 w-px bg-gray-300 hidden lg:block"></div>
                        <ExportButtons data={rawData} filename={`Dashboard_Report_${processedData.displayEntity}`} />
                    </div>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
                <MetricCard value={processedData.stats.spamActions} label="Spam Actions" type="spam" />
                <MetricCard value={processedData.stats.spamForms} label="Spam Froms" type="spam" />
                <MetricCard value={processedData.stats.spamDomains} label="Spam Domains" type="spam" />
                <MetricCard value={processedData.stats.inboxActions} label="Inbox Actions" type="inbox" />
                <MetricCard value={processedData.stats.inboxForms} label="Inbox Froms" type="inbox" />
                <MetricCard value={processedData.stats.inboxDomains} label="Inbox Domains" type="inbox" />
            </div>

            {/* Trend Analysis */}
            <TrendAnalysis data={processedData.trendData} />

            {/* Desktop Reporting Dashboard */}
            <div className="bg-white rounded-xl border shadow-sm mb-5">
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-3 font-semibold text-sm rounded-t-xl">
                    Desktop Reporting Dashboard
                </div>
                <div className="p-5">
                    {/* Spam & Inbox Forms */}
                    <div id="forms" className="scroll-mt-20">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="text-xl">📝</span> Forms Distribution
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
                            <ChartTableCard title="Top Spam Forms Distribution" icon="🚫" data={processedData.spamForms} colors={SPAM_COLORS} type="spam" tableHeaders={['From Name', 'Count', 'Percentage']} />
                            <ChartTableCard title="Top Inbox Forms Distribution" icon="👤" data={processedData.inboxForms} colors={INBOX_COLORS} type="inbox" tableHeaders={['From Name', 'Count', 'Percentage']} />
                        </div>
                    </div>

                    <hr className="my-6" />

                    {/* Inbox Actions */}
                    <div id="actions" className="mb-8 scroll-mt-20">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="text-xl">📬</span> Actions Distribution
                        </h3>
                        <ChartTableCard title="Inbox Actions Distribution" icon="📬" data={processedData.inboxActionTypes} colors={INBOX_COLORS} type="inbox" tableHeaders={['Action Type', 'Count', 'Percentage']} />
                    </div>

                    <hr className="my-6" />

                    {/* Domains */}
                    <div id="domains" className="scroll-mt-20">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="text-xl">🌐</span> Domains Analysis
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <ChartTableCard title="Spam Domains Analysis" icon="🌐" data={processedData.spamDomainsData} colors={SPAM_COLORS} type="spam" tableHeaders={['Domain', 'Count', 'Percentage']} />
                            <ChartTableCard title="Inbox Domains Analysis" icon="📧" data={processedData.inboxDomainsData} colors={INBOX_COLORS} type="inbox" tableHeaders={['Domain', 'Count', 'Percentage']} />
                        </div>
                    </div>
                </div>
            </div>

            {/* From Name → Domain Relationships */}
            <div id="relationships" className="mb-8 scroll-mt-20">
                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🔗</span> From Name → Domain Relationships
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full border">
                            <div className={`w-2 h-2 rounded-full ${dnsStatus === 'resolving' ? 'bg-blue-500 animate-pulse' :
                                dnsStatus === 'completed' ? 'bg-green-500' :
                                    dnsStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                                }`} />
                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                                DNS: {dnsStatus}
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                resolvedDomainsRef.current.clear();
                                setDnsStatus('idle');
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                            title="Refresh IP Addresses"
                        >
                            <RotateCcw size={16} className={dnsStatus === 'resolving' ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SpamRelationships data={processedData.spamRelationships} />
                    <InboxRelationships data={processedData.inboxRelationships} />
                </div>
            </div>

            {/* From Name Distribution */}
            <div id="distribution" className="mb-8 scroll-mt-20">
                <FromNameDistribution spamData={processedData.spamRelationships} inboxData={processedData.inboxRelationships} />
            </div>


            {/* Session Performance Section */}
            <div id="session-performance" className="scroll-mt-20">
                <SessionPerformance sessions={processedData.sessionStats.sessions} stats={processedData.sessionStats.stats} />
            </div>

            {/* Full Detailed Logs Section */}
            <div className="mt-8 mb-12">
                <button
                    onClick={() => setShowDetailedLogs(!showDetailedLogs)}
                    className="w-full flex items-center justify-between p-4 bg-white border rounded-xl shadow-sm hover:bg-gray-50 transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-100 p-2 rounded-lg text-slate-600 group-hover:bg-slate-200 transition-colors">
                            <FileText size={20} />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-gray-900 text-lg">Full Detailed Logs</h3>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Raw System Reports & Action Breakdown</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black px-2 py-1 bg-slate-100 text-slate-600 rounded uppercase border border-slate-200">
                            {showDetailedLogs ? 'Click to Hide' : 'Click to Expand'}
                        </span>
                        <ChevronDown size={20} className={`text-gray-400 transition-transform duration-300 ${showDetailedLogs ? 'rotate-180' : ''}`} />
                    </div>
                </button>

                <AnimatePresence>
                    {showDetailedLogs && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                                {/* Spam Detailed Report */}
                                <div className="bg-white border-2 border-red-100 rounded-2xl shadow-xl overflow-hidden">
                                    <div className="bg-red-500 px-6 py-4 flex items-center justify-between">
                                        <h4 className="text-white font-black text-lg uppercase tracking-tighter">Spam Detailed Report</h4>
                                        <Ban size={20} className="text-white/50" />
                                    </div>
                                    <div className="p-6 bg-slate-900 font-mono text-[11px] leading-relaxed text-red-400 h-[600px] overflow-y-auto custom-scrollbar">
                                        <pre className="whitespace-pre-wrap">{processedData.detailedLogs.spam}</pre>
                                    </div>
                                </div>

                                {/* Inbox Detailed Report */}
                                <div className="bg-white border-2 border-green-100 rounded-2xl shadow-xl overflow-hidden">
                                    <div className="bg-green-500 px-6 py-4 flex items-center justify-between">
                                        <h4 className="text-white font-black text-lg uppercase tracking-tighter">Inbox Detailed Report</h4>
                                        <Inbox size={20} className="text-white/50" />
                                    </div>
                                    <div className="p-6 bg-slate-900 font-mono text-[11px] leading-relaxed text-green-400 h-[600px] overflow-y-auto custom-scrollbar">
                                        <pre className="whitespace-pre-wrap">{processedData.detailedLogs.inbox}</pre>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Raw Data Viewer Section */}
            <div className="mt-12">
                <RawDataViewer data={apiResponse} />
            </div>
        </div>
    );
};

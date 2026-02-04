import React, { useState, useMemo, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    ShieldAlert, Activity, RefreshCw, FileText, Download, Trash2, Copy, Check,
    ChevronLeft, ChevronRight, LayoutDashboard, PieChart as PieIcon, List,
    ClipboardList, Send, Trash, Globe, Settings, Save, AlertCircle, Zap,
    Target, BarChart3, Layers, Search, Filter, AlignLeft, Eraser, Type, LayoutGrid
} from 'lucide-react';
import { Button } from './ui/Button';
import { service } from '../services';
import { Entity } from '../types';
import { useAuth } from '../contexts/AuthContext';

// --- Types ---
type SubTab = 'analyzer' | 'recheck';

interface BlockedEmail {
    session: string;
    id: string;
    status: string;
    email: string;
    date: string;
}



// --- Excel-style Components ---

const ExcelCard = ({ children, className = "" }: { children: React.ReactNode, className?: string, key?: string | number }) => (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-6 ${className}`}>
        {children}
    </div>
);

const ExcelSectionTitle = ({ children, icon: Icon }: { children: React.ReactNode, icon?: any }) => (
    <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon size={18} className="text-[#5c7cfa]" />}
        <h3 className="text-lg font-bold text-gray-700">{children}</h3>
    </div>
);

// --- Main Component ---

export const ReporterHelper: React.FC = () => {
    const { isAdmin } = useAuth();
    const [activeSubTab, setActiveSubTab] = useState<SubTab>('analyzer');
    const [entities, setEntities] = useState<Entity[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadEntities = async () => {
            try {
                const data = await service.getEntities();
                setEntities(data);
            } catch (err) {
                console.error('Failed to load entities:', err);
            }
        };
        loadEntities();
    }, []);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    // --- Feature 1: Analyzer State ---
    const [analyzerInput, setAnalyzerInput] = useState('');
    const [analyzerResults, setAnalyzerResults] = useState<BlockedEmail[]>([]);

    const handleAnalyze = () => {
        const lines = analyzerInput.split('\n').filter(l => l.trim());
        const parsed: BlockedEmail[] = lines.map(line => {
            const parts = line.split(',').map(p => p.trim().replace(/"/g, ''));
            return {
                session: parts[0] || 'Unknown',
                id: parts[1] || '0',
                status: parts[2] || 'Unknown',
                email: parts[3] || 'Unknown',
                date: parts[5] || 'Unknown'
            };
        });
        setAnalyzerResults(parsed);
    };

    const analyzerStats = useMemo(() => {
        const groups: Record<string, BlockedEmail[]> = {};
        analyzerResults.forEach(item => {
            if (!groups[item.status]) groups[item.status] = [];
            groups[item.status].push(item);
        });

        const total = analyzerResults.length;
        const chartData = Object.entries(groups).map(([name, items]) => ({
            name,
            value: items.length,
            percentage: total > 0 ? ((items.length / total) * 100).toFixed(1) : '0'
        }));

        return { groups, chartData, total };
    }, [analyzerResults]);



    // --- Feature 3: Recheck State ---
    const [recheckInput, setRecheckInput] = useState('');
    const [recheckGroups, setRecheckGroups] = useState<Record<string, string[][]>>({});

    const handleProcessRecheck = () => {
        const lines = recheckInput.split('\n').filter(l => l.trim());
        const bySession: Record<string, string[]> = {};

        lines.forEach(line => {
            const parts = line.split(',').map(p => p.trim().replace(/"/g, ''));
            const session = parts[0];
            const id = parts[1];
            if (session && id) {
                if (!bySession[session]) bySession[session] = [];
                bySession[session].push(id);
            }
        });

        const grouped: Record<string, string[][]> = {};
        Object.entries(bySession).forEach(([session, ids]) => {
            const chunks: string[][] = [];
            for (let i = 0; i < ids.length; i += 8) {
                chunks.push(ids.slice(i, i + 8));
            }
            grouped[session] = chunks;
        });

        setRecheckGroups(grouped);
    };

    const COLORS = ['#5c7cfa', '#f03e3e', '#37b24d', '#fcc419', '#7048e8'];

    return (
        <div className="min-h-screen py-4 sm:py-6 px-2 sm:px-4 font-sans bg-[#f8fafc] animate-in fade-in duration-500">
            <div className="max-w-[1400px] mx-auto space-y-4 sm:space-y-6">

                {/* Header Section */}
                <div className="text-center space-y-2">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">
                        Reporter Helper <span className="text-[#5c7cfa]">CMHW</span>
                    </h1>
                    <p className="text-gray-500 text-xs sm:text-sm font-medium">
                        Smart analytics and data processing for your reports.
                    </p>
                </div>

                {/* Tab Switcher Toolbar */}
                <div className="flex justify-center px-2">
                    <div className="bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-1 w-full sm:w-auto">
                        <button
                            onClick={() => setActiveSubTab('analyzer')}
                            className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeSubTab === 'analyzer' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <ShieldAlert size={18} />
                            Blocked Analyzer
                        </button>

                        <button
                            onClick={() => setActiveSubTab('recheck')}
                            className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeSubTab === 'recheck' ? 'bg-[#5c7cfa] text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <RefreshCw size={18} />
                            Recheck Blocked
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="space-y-6">
                    {activeSubTab === 'analyzer' && (
                        <div className="space-y-6">
                            <ExcelCard>
                                <ExcelSectionTitle icon={AlignLeft}>Data Input</ExcelSectionTitle>
                                <textarea
                                    value={analyzerInput}
                                    onChange={(e) => setAnalyzerInput(e.target.value)}
                                    placeholder='"CMH1_P_IP_5,2704,Disconnected,email@gmail.com,email@gmail.com ,27-01-2026 11-5"'
                                    className="w-full h-32 sm:h-48 p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-600 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 resize-none bg-white placeholder-gray-300 leading-relaxed mb-4"
                                />
                                <div className="flex justify-center">
                                    <Button
                                        onClick={handleAnalyze}
                                        className="bg-indigo-600 hover:bg-indigo-700 px-6 sm:px-8 py-2.5 h-auto text-xs sm:text-sm font-bold w-full sm:w-auto"
                                        leftIcon={<Zap size={18} />}
                                    >
                                        Analyze Blocked Emails
                                    </Button>
                                </div>
                            </ExcelCard>

                            {analyzerResults.length > 0 && (
                                <>
                                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 sm:gap-6">
                                        <ExcelCard>
                                            <ExcelSectionTitle icon={PieIcon}>Distribution</ExcelSectionTitle>
                                            <div className="h-[350px] flex items-center">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={analyzerStats.chartData}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={60}
                                                            outerRadius={100}
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                        >
                                                            {analyzerStats.chartData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            formatter={(value: number, name: string, props: any) => [`${value} (${props.payload.percentage}%)`, name]}
                                                        />
                                                        <Legend verticalAlign="middle" align="right" layout="vertical" />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                                <div className="text-center px-8 border-l border-gray-100">
                                                    <div className="text-3xl font-black text-[#5c7cfa]">{analyzerStats.total}</div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Blocked</div>
                                                </div>
                                            </div>
                                        </ExcelCard>

                                        <ExcelCard>
                                            <div className="flex justify-between items-center mb-4">
                                                <ExcelSectionTitle icon={List}>Blocked Feed</ExcelSectionTitle>
                                                <div className="flex gap-2">
                                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full">
                                                        {analyzerResults.length}
                                                    </span>
                                                    <button
                                                        onClick={() => copyToClipboard(analyzerResults.map(r => `${r.email} ${r.status}`).join('\n'))}
                                                        className="text-[#5c7cfa] hover:text-indigo-700 transition-colors"
                                                        title="Copy All"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="h-[300px] overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                                                {analyzerResults.map((item, i) => (
                                                    <div key={i} className="group flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-200 transition-all">
                                                        <div className="flex flex-col truncate max-w-[200px]">
                                                            <span className="text-xs font-bold text-gray-600 truncate">{item.email}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${item.status === 'Disconnected' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                                                                {item.status}
                                                            </span>
                                                            <button
                                                                onClick={() => copyToClipboard(`${item.email} ${item.status}`)}
                                                                className="opacity-0 group-hover:opacity-100 p-1 text-[#5c7cfa] hover:bg-white rounded-md transition-all shadow-sm"
                                                                title="Copy email status"
                                                            >
                                                                <Copy size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </ExcelCard>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                        {Object.entries(analyzerStats.groups).map(([status, items]) => (
                                            <ExcelCard key={status} className="border-t-4 border-t-[#5c7cfa]">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="font-bold text-gray-700 uppercase text-sm">{status}</h4>
                                                    <span className="bg-indigo-50 text-[#5c7cfa] px-2 py-0.5 rounded-lg text-xs font-bold">{(items as BlockedEmail[]).length}</span>
                                                </div>
                                                <div className="h-48 overflow-y-auto bg-gray-50 rounded-xl p-3 font-mono text-[10px] text-gray-500 space-y-1 mb-4 border border-gray-100">
                                                    {(items as BlockedEmail[]).map((it, idx) => <div key={idx}>{it.email}</div>)}
                                                </div>
                                                <button
                                                    onClick={() => copyToClipboard((items as BlockedEmail[]).map(it => `${it.email} ${it.status}`).join('\n'))}
                                                    className="w-full py-2 bg-gray-900 text-white rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-2 hover:bg-gray-800 transition-all"
                                                >
                                                    <Copy size={12} /> Copy List
                                                </button>
                                            </ExcelCard>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}



                    {activeSubTab === 'recheck' && (
                        <div className="space-y-6">
                            <ExcelCard>
                                <ExcelSectionTitle icon={RefreshCw}>Recheck Processor</ExcelSectionTitle>
                                <textarea
                                    value={recheckInput}
                                    onChange={(e) => setRecheckInput(e.target.value)}
                                    placeholder='"CMH1_P_IP_5,2978,Disconnected,email@gmail.com..."'
                                    className="w-full h-48 p-4 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 resize-none bg-white placeholder-gray-300 leading-relaxed mb-4"
                                />
                                <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
                                    <Button
                                        onClick={handleProcessRecheck}
                                        className="bg-indigo-600 hover:bg-indigo-700 px-8 py-2.5 h-auto text-sm font-bold"
                                        leftIcon={<Zap size={18} />}
                                    >
                                        Process Batches
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            const profiles = recheckInput.split('\n').filter(l => l.trim()).map(l => l.split(',')[1]?.trim().replace(/"/g, '')).filter(Boolean).join('\n');
                                            copyToClipboard(profiles);
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-700 px-8 py-2.5 h-auto text-sm font-bold"
                                        leftIcon={<Copy size={18} />}
                                    >
                                        Copy Profiles Only
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setRecheckInput('')}
                                        className="border-gray-200 text-gray-500 hover:bg-gray-50 px-8 py-2.5 h-auto text-sm font-bold"
                                    >
                                        Reset
                                    </Button>
                                </div>
                            </ExcelCard>

                            {Object.keys(recheckGroups).length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                    {Object.entries(recheckGroups).map(([session, chunks]) => (
                                        <ExcelCard key={session} className="border-t-4 border-t-red-500">
                                            <div className="flex justify-between items-center mb-6">
                                                <h4 className="font-bold text-gray-700 uppercase text-sm">{session}</h4>
                                                <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                                                    {(chunks as string[][]).flat().length} PROFILES
                                                </span>
                                            </div>

                                            <div className="space-y-4">
                                                {(chunks as string[][]).map((chunk, idx) => (
                                                    <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                                        <div className="text-[10px] font-bold text-indigo-600 uppercase mb-3">Batch {idx + 1}</div>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {chunk.map(id => (
                                                                <div key={id} className="bg-white border border-gray-200 p-1.5 rounded-lg text-center font-mono text-[10px] font-bold text-gray-600 shadow-sm">
                                                                    {id}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-6 space-y-2">
                                                <button
                                                    onClick={() => copyToClipboard((chunks as string[][]).flat().join('\n'))}
                                                    className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-sm"
                                                >
                                                    <Copy size={14} /> Copy All Session IDs
                                                </button>
                                            </div>
                                        </ExcelCard>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

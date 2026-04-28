import React, { useState, useMemo, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    ShieldAlert, Activity, RefreshCw, FileText, Download, Trash2, Copy, Check,
    ChevronLeft, ChevronRight, LayoutDashboard, PieChart as PieIcon, List,
    ClipboardList, Send, Trash, Globe, Settings, Save, AlertCircle, Zap,
    Target, BarChart3, Layers, Search, Filter, AlignLeft, Eraser, Type, LayoutGrid, Upload
} from 'lucide-react';
import { Button } from './ui/Button';
import { service } from '../services';
import { Entity } from '../types';
import { useAuth } from '../contexts/AuthContext';

// --- Types ---
type SubTab = 'analyzer' | 'recheck' | 'move' | 'proxyMove' | 'prepareUpload';

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

    // --- Feature 4: Move Analyse State ---
    const [moveInput, setMoveInput] = useState('');
    const [moveProxiesInput, setMoveProxiesInput] = useState('');
    const [moveResults, setMoveResults] = useState<{ id: string, email: string, proxy: string, status: string }[]>([]);

    const handleMoveAnalyze = () => {
        const dataLines = moveInput.split('\n').filter(l => l.trim());
        const proxyLines = moveProxiesInput.split('\n').filter(l => l.trim());

        const proxyMap: Record<string, string> = {};
        proxyLines.forEach(line => {
            const parts = line.split(/[\s\t,]+/).map(p => p.trim());
            if (parts.length >= 2) {
                proxyMap[parts[0]] = parts[1];
            }
        });

        const parsed = dataLines.map(line => {
            const parts = line.split(',').map(p => p.trim().replace(/"/g, ''));
            const id = parts[1] || '0';
            const email = parts[3] || 'Unknown';
            const status = parts[2] || 'Unknown';
            const proxy = proxyMap[id] || 'No Proxy';
            return { id, email, proxy, status };
        });

        setMoveResults(parsed);
    };

    const handleMoveGlobalCopy = () => {
        const spam = moveResults.filter(it => it.status.toLowerCase() === 'has_spam_messages');
        const disconnected = moveResults.filter(it => it.status.toLowerCase() === 'disconnected');
        
        const all = [...spam, ...disconnected];
        if (all.length === 0) return;
        
        const text = all.map(it => `${it.id}\t${it.email}\t${it.proxy}`).join('\n');
        copyToClipboard(text);
    };

    const moveStats = useMemo(() => {
        const groups: Record<string, typeof moveResults> = {};
        moveResults.forEach(item => {
            if (!groups[item.status]) groups[item.status] = [];
            groups[item.status].push(item);
        });
        return groups;
    }, [moveResults]);

    // --- Feature 5: Analyse Proxy Move State ---
    const [proxyMoveZone1, setProxyMoveZone1] = useState('');
    const [proxyMoveZone2, setProxyMoveZone2] = useState('');
    const [proxyMoveResults, setProxyMoveResults] = useState<string[]>([]);

    const handleProxyMovePurge = () => {
        const zone1Lines = proxyMoveZone1.split('\n').map(l => l.trim()).filter(Boolean);
        const zone2Lines = proxyMoveZone2.split('\n').map(l => l.trim()).filter(Boolean);

        // Build a Set of /24 prefixes from Zone 1
        const zone1Classes = new Set(zone1Lines.map(ip => {
            const parts = ip.split('.');
            return parts.length >= 3 ? parts.slice(0, 3).join('.') : ip;
        }));

        // Filter Zone 2 lines whose IP prefix is in zone1Classes
        const matched = zone2Lines.filter(line => {
            const parts = line.split(/[,\s\t]+/);
            const ip = parts.length > 1 ? parts[1] : parts[0];
            if (!ip) return false;
            const prefix = ip.split('.').slice(0, 3).join('.');
            return !zone1Classes.has(prefix);
        });

        setProxyMoveResults(matched);
    };

    const clearProxyMove = () => {
        setProxyMoveZone1('');
        setProxyMoveZone2('');
        setProxyMoveResults([]);
    };

    // --- Feature 6: Prepare Upload State (Admin only) ---
    const [prepareMode, setPrepareMode] = useState<'replace' | 'interval'>('replace');
    const [prepareProfilesInput, setPrepareProfilesInput] = useState('');
    const [prepareIPsInput, setPrepareIPsInput] = useState('');
    const [prepareResults, setPrepareResults] = useState<string[]>([]);

    const handlePrepareUpload = () => {
        const profileLines = prepareProfilesInput.split('\n').map(l => l.trim()).filter(Boolean);
        const ipLines = prepareIPsInput.split('\n').map(l => l.trim()).filter(Boolean);

        const results = profileLines.map((line, idx) => {
            const newIP = ipLines[idx];
            if (!newIP) return line; // keep original if no replacement IP
            // Split on '#', replace last part (proxy) with newIP:92
            const parts = line.split('#');
            if (parts.length < 3) return line;
            parts[parts.length - 1] = `${newIP}:92`;
            return parts.join('#');
        });

        setPrepareResults(results);
    };

    const clearPrepareUpload = () => {
        setPrepareProfilesInput('');
        setPrepareIPsInput('');
        setPrepareResults([]);
    };

    // --- Feature 7: Upload by Interval ---
    const [intervalFrom, setIntervalFrom] = useState<number | ''>('');
    const [intervalTo, setIntervalTo] = useState<number | ''>('');
    const [intervalDataInput, setIntervalDataInput] = useState('');
    const [intervalResults, setIntervalResults] = useState<string[]>([]);

    const handleIntervalUpload = () => {
        const from = Number(intervalFrom);
        const to = Number(intervalTo);
        if (!from || !to || from > to) return;

        const lines = intervalDataInput.split('\n').map(l => l.trim()).filter(Boolean);
        const results: string[] = [];
        let id = from;

        for (let i = 0; i < lines.length && id <= to; i++, id++) {
            // Support tab, comma, or space as separator
            const parts = lines[i].split(/\t|,|\s{2,}/).map(p => p.trim());
            const email = parts[0] || '';
            const ip = parts[1] || '';
            results.push(`${id}#${email}#${ip}:92`);
        }

        setIntervalResults(results);
    };

    const clearIntervalUpload = () => {
        setIntervalFrom('');
        setIntervalTo('');
        setIntervalDataInput('');
        setIntervalResults([]);
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

                        <button
                            onClick={() => setActiveSubTab('proxyMove')}
                            className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeSubTab === 'proxyMove' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <Search size={18} />
                            Analyse Proxy Move
                        </button>

                        <button
                            onClick={() => setActiveSubTab('move')}
                            className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeSubTab === 'move' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <Target size={18} />
                            Move Analyse
                        </button>

                        {isAdmin && (
                            <button
                                onClick={() => setActiveSubTab('prepareUpload')}
                                className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeSubTab === 'prepareUpload' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <Upload size={18} />
                                Prepare Upload
                            </button>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                <div className="space-y-6">

                    {/* ── TAB 1: Blocked Analyzer ── */}
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

                    {/* ── TAB 2: Recheck Blocked ── */}
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

                    {/* ── TAB 3: Move Analyse ── */}
                    {activeSubTab === 'move' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
                                <ExcelCard>
                                    <ExcelSectionTitle icon={AlignLeft}>Data Input</ExcelSectionTitle>
                                    <textarea
                                        value={moveInput}
                                        onChange={(e) => setMoveInput(e.target.value)}
                                        placeholder='"CMH1_P_IP_5,2704,Disconnected,email@gmail.com,email@gmail.com ,27-01-2026 11-5"'
                                        className="w-full h-48 p-4 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 resize-none bg-white placeholder-gray-300 leading-relaxed mb-4"
                                    />
                                    <div className="flex justify-center">
                                        <Button
                                            onClick={handleMoveAnalyze}
                                            className="bg-indigo-600 hover:bg-indigo-700 px-8 py-2.5 h-auto text-sm font-bold w-full sm:w-auto"
                                            leftIcon={<Zap size={18} />}
                                        >
                                            Analyze for Move
                                        </Button>
                                    </div>
                                </ExcelCard>

                                <ExcelCard className="border-red-100 bg-red-50/30">
                                    <div className="flex justify-between items-center mb-4">
                                        <ExcelSectionTitle icon={Globe}>Profiles Proxies</ExcelSectionTitle>
                                        <button
                                            onClick={() => setMoveProxiesInput('')}
                                            className="text-red-400 hover:text-red-600 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <textarea
                                        value={moveProxiesInput}
                                        onChange={(e) => setMoveProxiesInput(e.target.value)}
                                        placeholder="Paste IDs and Proxies here... (e.g. 2704 1.1.1.1)"
                                        className="w-full h-48 p-4 text-xs font-mono text-red-600 border border-red-100 rounded-xl focus:outline-none focus:border-red-300 resize-none bg-white placeholder-red-200 leading-relaxed"
                                    />
                                </ExcelCard>
                            </div>

                            {moveResults.length > 0 && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        {Object.entries(moveStats).map(([status, items]) => (
                                            <div key={status} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                                <div className="text-[10px] font-black uppercase text-gray-400 mb-1">{status}</div>
                                                <div className="text-2xl font-black text-indigo-600">{items.length}</div>
                                            </div>
                                        ))}
                                        <div className="flex flex-col gap-2">
                                            <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg ring-4 ring-indigo-50">
                                                <div className="text-[10px] font-black uppercase text-white/70 mb-1">Total Processed</div>
                                                <div className="text-2xl font-black text-white">{moveResults.length}</div>
                                            </div>
                                            <button
                                                onClick={handleMoveGlobalCopy}
                                                className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-sm transition-all transform active:scale-95 border border-indigo-400"
                                            >
                                                <Copy size={14} /> Global Copy (Conn + Disc)
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {Object.entries(moveStats).map(([status, items]) => (
                                            <ExcelCard key={status} className={`border-t-4 ${status === 'Disconnected' ? 'border-t-red-500' : status === 'Connected' ? 'border-t-emerald-500' : 'border-t-indigo-500'}`}>
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="font-bold text-gray-700 uppercase text-sm flex items-center gap-2">
                                                        <Activity size={16} className={status === 'Disconnected' ? 'text-red-500' : 'text-emerald-500'} />
                                                        {status} Profiles
                                                    </h4>
                                                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${status === 'Disconnected' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                        {items.length}
                                                    </span>
                                                </div>

                                                <div className="h-64 overflow-y-auto bg-gray-50 rounded-xl p-3 font-mono text-[10px] text-gray-500 space-y-1 mb-4 border border-gray-100">
                                                    {items.map((it, idx) => (
                                                        <div key={idx} className="flex gap-4 items-center p-1.5 hover:bg-white rounded transition-colors group">
                                                            <span className="text-indigo-600 font-bold w-8">{it.id}</span>
                                                            <span className="flex-1 text-gray-700">{it.email}</span>
                                                            <span className="text-gray-400">{it.proxy}</span>
                                                            <button
                                                                onClick={() => copyToClipboard(`${it.id}\t${it.email}\t${it.proxy}`)}
                                                                className="opacity-0 group-hover:opacity-100 text-[#5c7cfa]"
                                                            >
                                                                <Copy size={10} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>

                                                <button
                                                    onClick={() => copyToClipboard(items.map(it => `${it.id}\t${it.email}\t${it.proxy}`).join('\n'))}
                                                    className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-sm"
                                                >
                                                    <Copy size={14} /> Copy {status} List
                                                </button>
                                            </ExcelCard>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TAB 4: Analyse Proxy Move ── */}
                    {activeSubTab === 'proxyMove' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Zone 1 */}
                                <ExcelCard>
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-red-50 rounded-lg">
                                                <ShieldAlert size={18} className="text-red-500" />
                                            </div>
                                            <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider">Zone 1: IPS of Classes/24</h3>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                                            {proxyMoveZone1.split('\n').filter(Boolean).length} Count
                                        </span>
                                    </div>
                                    <textarea
                                        value={proxyMoveZone1}
                                        onChange={(e) => setProxyMoveZone1(e.target.value)}
                                        placeholder={"170.62.105.59\n94.176.215.135\n94.176.215.25"}
                                        className="w-full h-[350px] p-4 text-xs font-mono text-gray-500 border border-gray-100 rounded-2xl focus:outline-none focus:border-indigo-500 resize-none bg-[#fafbfc] placeholder-gray-300 leading-relaxed"
                                    />
                                </ExcelCard>

                                {/* Zone 2 */}
                                <ExcelCard>
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-indigo-50 rounded-lg">
                                                <FileText size={18} className="text-indigo-500" />
                                            </div>
                                            <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider">Log Proxies</h3>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                                            {proxyMoveZone2.split('\n').filter(Boolean).length} Lines
                                        </span>
                                    </div>
                                    <textarea
                                        value={proxyMoveZone2}
                                        onChange={(e) => setProxyMoveZone2(e.target.value)}
                                        placeholder={"1,170.130.16.205\n2,148.135.117.212\n3,170.62.105.59"}
                                        className="w-full h-[350px] p-4 text-xs font-mono text-gray-500 border border-gray-100 rounded-2xl focus:outline-none focus:border-indigo-500 resize-none bg-[#fafbfc] placeholder-gray-300 leading-relaxed"
                                    />
                                </ExcelCard>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                                <Button
                                    onClick={handleProxyMovePurge}
                                    className="bg-indigo-600 hover:bg-indigo-700 px-12 py-3 h-auto text-sm font-black rounded-2xl shadow-xl shadow-indigo-100 transform active:scale-95 transition-all"
                                    leftIcon={<Zap size={18} />}
                                >
                                    Purge Lines
                                </Button>
                                <Button
                                    onClick={clearProxyMove}
                                    variant="outline"
                                    className="border-gray-200 text-gray-500 hover:bg-gray-50 px-8 py-3 h-auto text-sm font-bold rounded-2xl"
                                    leftIcon={<RefreshCw size={18} />}
                                >
                                    Clear All
                                </Button>
                            </div>

                            {/* Results */}
                            {proxyMoveResults.length > 0 && (
                                <ExcelCard className="border-t-4 border-t-indigo-500">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                        <div>
                                            <h3 className="text-lg font-black text-gray-800">Proxies NOT in Classes /24</h3>
                                            <p className="text-xs text-gray-500 font-medium italic">Found {proxyMoveResults.length} non-matching lines</p>
                                        </div>
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <button
                                                onClick={() => copyToClipboard(proxyMoveResults.join('\n'))}
                                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all shadow-sm"
                                            >
                                                <Copy size={14} /> Copy All
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const profiles = proxyMoveResults.map(r => r.split(/[,\s\t]+/)[0]).join('\n');
                                                    copyToClipboard(profiles);
                                                }}
                                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 transition-all shadow-sm"
                                            >
                                                <Target size={14} /> Copy Profiles
                                            </button>
                                        </div>
                                    </div>

                                    <div className="h-[400px] overflow-y-auto bg-gray-50 rounded-2xl p-4 font-mono text-xs text-gray-600 space-y-1 border border-gray-100">
                                        {proxyMoveResults.map((line, idx) => (
                                            <div key={idx} className="flex gap-4 items-center px-3 py-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-100 group">
                                                <span className="text-gray-300 font-bold w-6 text-right">{idx + 1}</span>
                                                <span className="flex-1 text-gray-700">{line}</span>
                                                <button
                                                    onClick={() => copyToClipboard(line)}
                                                    className="opacity-0 group-hover:opacity-100 text-indigo-500 hover:text-indigo-700 transition-all"
                                                >
                                                    <Copy size={13} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </ExcelCard>
                            )}
                        </div>
                    )}

                    {/* ── TAB 5: Prepare Upload (Admin only) ── */}
                    {activeSubTab === 'prepareUpload' && isAdmin && (
                        <div className="space-y-6">
                            {/* Sub-Switch for Prepare Upload */}
                            <div className="flex justify-center mb-6">
                                <div className="bg-white p-1 rounded-xl border border-gray-100 shadow-sm flex gap-1">
                                    <button
                                        onClick={() => setPrepareMode('replace')}
                                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${prepareMode === 'replace' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                                    >
                                        Replace Proxies
                                    </button>
                                    <button
                                        onClick={() => setPrepareMode('interval')}
                                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${prepareMode === 'interval' ? 'bg-violet-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                                    >
                                        Upload by Interval
                                    </button>
                                </div>
                            </div>

                            {prepareMode === 'replace' ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Zone 1: Profiles */}
                                        <ExcelCard>
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 bg-indigo-50 rounded-lg">
                                                        <ClipboardList size={18} className="text-indigo-500" />
                                                    </div>
                                                    <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider">Zone 1: Profiles Data</h3>
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                                                    {prepareProfilesInput.split('\n').filter(Boolean).length} Lines
                                                </span>
                                            </div>
                                            <textarea
                                                value={prepareProfilesInput}
                                                onChange={(e) => setPrepareProfilesInput(e.target.value)}
                                                placeholder={`1#email1@gmail.com#170.62.105.59:92\n2#email2@gmail.com#94.176.215.135:92\n3#email3@gmail.com#94.176.215.25:92`}
                                                className="w-full h-[350px] p-4 text-xs font-mono text-gray-600 border border-gray-100 rounded-2xl focus:outline-none focus:border-indigo-500 resize-none bg-[#fafbfc] placeholder-gray-300 leading-relaxed"
                                            />
                                        </ExcelCard>

                                        {/* Zone 2: New IPs */}
                                        <ExcelCard>
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 bg-emerald-50 rounded-lg">
                                                        <Globe size={18} className="text-emerald-500" />
                                                    </div>
                                                    <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider">Zone 2: New IPs</h3>
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                                                    {prepareIPsInput.split('\n').filter(Boolean).length} IPs
                                                </span>
                                            </div>
                                            <textarea
                                                value={prepareIPsInput}
                                                onChange={(e) => setPrepareIPsInput(e.target.value)}
                                                placeholder={`195.178.137.95\n64.44.195.217\n194.180.37.219`}
                                                className="w-full h-[350px] p-4 text-xs font-mono text-gray-600 border border-gray-100 rounded-2xl focus:outline-none focus:border-emerald-500 resize-none bg-[#fafbfc] placeholder-gray-300 leading-relaxed"
                                            />
                                        </ExcelCard>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                                        <Button
                                            onClick={handlePrepareUpload}
                                            className="bg-emerald-600 hover:bg-emerald-700 px-12 py-3 h-auto text-sm font-black rounded-2xl shadow-xl shadow-emerald-100 transform active:scale-95 transition-all"
                                            leftIcon={<Zap size={18} />}
                                        >
                                            Replace Proxies
                                        </Button>
                                        <Button
                                            onClick={clearPrepareUpload}
                                            variant="outline"
                                            className="border-gray-200 text-gray-500 hover:bg-gray-50 px-8 py-3 h-auto text-sm font-bold rounded-2xl"
                                            leftIcon={<RefreshCw size={18} />}
                                        >
                                            Clear All
                                        </Button>
                                    </div>

                                    {/* Results */}
                                    {prepareResults.length > 0 && (
                                        <ExcelCard className="border-t-4 border-t-emerald-500">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                                <div>
                                                    <h3 className="text-lg font-black text-gray-800">Ready to Upload</h3>
                                                    <p className="text-xs text-gray-500 font-medium italic">{prepareResults.length} profiles with replaced proxies</p>
                                                </div>
                                                <button
                                                    onClick={() => copyToClipboard(prepareResults.join('\n'))}
                                                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all shadow-sm"
                                                >
                                                    <Copy size={14} /> Copy All
                                                </button>
                                            </div>

                                            <div className="h-[400px] overflow-y-auto bg-gray-50 rounded-2xl p-4 font-mono text-xs text-gray-600 space-y-1 border border-gray-100">
                                                {prepareResults.map((line, idx) => (
                                                    <div key={idx} className="flex gap-4 items-center px-3 py-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-100 group">
                                                        <span className="text-gray-300 font-bold w-6 text-right shrink-0">{idx + 1}</span>
                                                        <span className="flex-1 text-gray-700 break-all">{line}</span>
                                                        <button
                                                            onClick={() => copyToClipboard(line)}
                                                            className="opacity-0 group-hover:opacity-100 text-emerald-500 hover:text-emerald-700 transition-all shrink-0"
                                                        >
                                                            <Copy size={13} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </ExcelCard>
                                    )}
                                </div>
                            ) : (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {/* ── Upload by Interval (inside Prepare Upload, Admin only) ── */}
                                    <div className="space-y-6">
                                        <ExcelCard className="border-t-4 border-t-violet-500">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="p-2 bg-violet-50 rounded-lg">
                                                    <Layers size={18} className="text-violet-500" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Upload by Interval</h3>
                                                    <p className="text-[10px] text-gray-400 font-medium">Auto-number profiles using a custom ID range</p>
                                                </div>
                                            </div>

                                            {/* Interval inputs */}
                                            <div className="flex flex-wrap items-center gap-4 mb-6">
                                                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3">
                                                    <span className="text-xs font-black text-gray-500 uppercase tracking-wider">From</span>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={intervalFrom}
                                                        onChange={(e) => setIntervalFrom(e.target.value === '' ? '' : Number(e.target.value))}
                                                        placeholder="1"
                                                        className="w-20 text-center text-sm font-black text-violet-600 bg-transparent focus:outline-none"
                                                    />
                                                </div>
                                                <span className="text-gray-300 font-black text-lg">—</span>
                                                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3">
                                                    <span className="text-xs font-black text-gray-500 uppercase tracking-wider">To</span>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={intervalTo}
                                                        onChange={(e) => setIntervalTo(e.target.value === '' ? '' : Number(e.target.value))}
                                                        placeholder="100"
                                                        className="w-20 text-center text-sm font-black text-violet-600 bg-transparent focus:outline-none"
                                                    />
                                                </div>
                                                {intervalFrom !== '' && intervalTo !== '' && (
                                                    <span className="text-[11px] font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                                                        {Math.max(0, Number(intervalTo) - Number(intervalFrom) + 1)} slots
                                                    </span>
                                                )}
                                            </div>

                                            {/* Data input */}
                                            <div className="mb-5">
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Upload Data (email + IP, tab-separated)</label>
                                                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                                                        {intervalDataInput.split('\n').filter(Boolean).length} rows
                                                    </span>
                                                </div>
                                                <textarea
                                                    value={intervalDataInput}
                                                    onChange={(e) => setIntervalDataInput(e.target.value)}
                                                    placeholder={`email1@gmail.com\t195.178.137.9\nemail2@gmail.com\t64.44.195.217\nemail3@gmail.com\t194.180.37.219`}
                                                    className="w-full h-[280px] p-4 text-xs font-mono text-gray-600 border border-gray-100 rounded-2xl focus:outline-none focus:border-violet-400 resize-none bg-[#fafbfc] placeholder-gray-300 leading-relaxed"
                                                />
                                            </div>

                                            {/* Action buttons */}
                                            <div className="flex flex-wrap gap-3">
                                                <Button
                                                    onClick={handleIntervalUpload}
                                                    className="bg-violet-600 hover:bg-violet-700 px-10 py-3 h-auto text-sm font-black rounded-2xl shadow-lg shadow-violet-100 transform active:scale-95 transition-all"
                                                    leftIcon={<Zap size={16} />}
                                                >
                                                    Generate
                                                </Button>
                                                <Button
                                                    onClick={clearIntervalUpload}
                                                    variant="outline"
                                                    className="border-gray-200 text-gray-500 hover:bg-gray-50 px-8 py-3 h-auto text-sm font-bold rounded-2xl"
                                                    leftIcon={<RefreshCw size={16} />}
                                                >
                                                    Clear
                                                </Button>
                                            </div>
                                        </ExcelCard>

                                        {/* Interval Results */}
                                        {intervalResults.length > 0 && (
                                            <ExcelCard className="border-t-4 border-t-violet-500">
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                                    <div>
                                                        <h3 className="text-lg font-black text-gray-800">Interval Result</h3>
                                                        <p className="text-xs text-gray-500 font-medium italic">
                                                            IDs {intervalFrom} → {intervalTo} · {intervalResults.length} profiles generated
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(intervalResults.join('\n'))}
                                                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all shadow-sm shrink-0"
                                                    >
                                                        <Copy size={14} /> Copy All
                                                    </button>
                                                </div>

                                                <div className="h-[380px] overflow-y-auto bg-gray-50 rounded-2xl p-4 font-mono text-xs text-gray-600 space-y-1 border border-gray-100">
                                                    {intervalResults.map((line, idx) => (
                                                        <div key={idx} className="flex gap-4 items-center px-3 py-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-100 group">
                                                            <span className="text-violet-400 font-bold w-6 text-right shrink-0">{Number(intervalFrom) + idx}</span>
                                                            <span className="flex-1 text-gray-700 break-all">{line}</span>
                                                            <button
                                                                onClick={() => copyToClipboard(line)}
                                                                className="opacity-0 group-hover:opacity-100 text-violet-500 hover:text-violet-700 transition-all shrink-0"
                                                            >
                                                                <Copy size={13} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </ExcelCard>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

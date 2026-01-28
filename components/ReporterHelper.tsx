import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import {
    ShieldAlert, Activity, RefreshCw, FileText, Download, Trash2, Copy, Check,
    ChevronLeft, ChevronRight, LayoutDashboard, PieChart as PieIcon, List,
    ClipboardList, Send, Trash
} from 'lucide-react';
import { Button } from './ui/Button';

// --- Types ---
type SubTab = 'analyzer' | 'consumption' | 'recheck';

interface BlockedEmail {
    session: string;
    id: string;
    status: string;
    email: string;
    date: string;
}

interface ConsumptionData {
    drop: string;
    seedsActive: number;
    seedsBlocked: number;
    mailboxesActive: number;
    mailboxesDropped: number;
    sessionsOut: string;
}

// --- Helper Components ---

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-white border-2 border-slate-100 rounded-2xl shadow-lg p-6 ${className}`}>
        {children}
    </div>
);

const SectionTitle = ({ children, icon: Icon, color = "text-slate-900" }: { children: React.ReactNode, icon?: any, color?: string }) => (
    <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon size={18} className={color} />}
        <h3 className={`text-lg font-black uppercase italic tracking-tight ${color}`}>{children}</h3>
    </div>
);

// --- Main Component ---

export const ReporterHelper: React.FC = () => {
    const [activeSubTab, setActiveSubTab] = useState<SubTab>('analyzer');

    // --- Feature 1: Analyzer State ---
    const [analyzerInput, setAnalyzerInput] = useState('');
    const [analyzerResults, setAnalyzerResults] = useState<BlockedEmail[]>([]);

    const handleAnalyze = () => {
        const lines = analyzerInput.split('\n').filter(l => l.trim());
        const parsed: BlockedEmail[] = lines.map(line => {
            // "CMH1_P_IP_5,2704,Disconnected,tranxuanduc366@gmail.com,tranxuanduc366@gmail.com ,27-01-2026 11-5"
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

        const chartData = Object.entries(groups).map(([name, items]) => ({
            name,
            value: items.length
        }));

        return { groups, chartData, total: analyzerResults.length };
    }, [analyzerResults]);

    // --- Feature 2: Consumption State ---
    const [consumptionSeeds, setConsumptionSeeds] = useState('');
    const [consumptionMailboxes, setConsumptionMailboxes] = useState('');
    const [consumptionResults, setConsumptionResults] = useState<ConsumptionData[]>([]);

    const handleGenerateConsumption = () => {
        const seedsLines = consumptionSeeds.split('\n').filter(l => l.trim());
        const mailboxLines = consumptionMailboxes.split('\n').filter(l => l.trim());

        const results: ConsumptionData[] = seedsLines.map((line, index) => {
            const seedVal = parseInt(line) || 0;
            const mbVal = parseInt(mailboxLines[index]) || 0;
            return {
                drop: `Drop ${index + 1}`,
                seedsActive: mbVal, // Based on image logic: mbVal is active seeds
                seedsBlocked: Math.max(0, seedVal - mbVal),
                mailboxesActive: mbVal,
                mailboxesDropped: 0, // Placeholder
                sessionsOut: '0'
            };
        });
        setConsumptionResults(results);
    };

    const consumptionTotals = useMemo(() => {
        return consumptionResults.reduce((acc, curr) => ({
            total: acc.total + curr.seedsActive + curr.seedsBlocked,
            active: acc.active + curr.seedsActive,
            blocked: acc.blocked + curr.seedsBlocked
        }), { total: 0, active: 0, blocked: 0 });
    }, [consumptionResults]);

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

    const COLORS = ['#4F46E5', '#EF4444', '#10B981', '#F59E0B', '#6366F1'];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-white border-2 border-slate-100 rounded-3xl p-8 shadow-xl text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                <h1 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter">
                    Reporter Helper
                </h1>
            </div>

            {/* Navbar */}
            <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                    onClick={() => setActiveSubTab('analyzer')}
                    className={`px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeSubTab === 'analyzer' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 -translate-y-1' : 'bg-white text-slate-400 hover:bg-slate-50 border-2 border-slate-100'}`}
                >
                    <ShieldAlert size={18} /> Blocked Emails Analyzer
                </button>
                <button
                    onClick={() => setActiveSubTab('consumption')}
                    className={`px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeSubTab === 'consumption' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 -translate-y-1' : 'bg-white text-slate-400 hover:bg-slate-50 border-2 border-slate-100'}`}
                >
                    <Activity size={18} /> Consumption Dashboard
                </button>
                <button
                    onClick={() => setActiveSubTab('recheck')}
                    className={`px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeSubTab === 'recheck' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 -translate-y-1' : 'bg-white text-slate-400 hover:bg-slate-50 border-2 border-slate-100'}`}
                >
                    <RefreshCw size={18} /> Recheck Blocked Emails
                </button>
                <div className="h-10 w-px bg-slate-200 mx-2"></div>
            </div>

            {/* Content Area */}
            <div className="space-y-8">
                {activeSubTab === 'analyzer' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <Card>
                            <textarea
                                value={analyzerInput}
                                onChange={(e) => setAnalyzerInput(e.target.value)}
                                placeholder='"CMH1_P_IP_5,2704,Disconnected,email@gmail.com,email@gmail.com ,27-01-2026 11-5"'
                                className="w-full h-48 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:ring-0 transition-all font-mono text-xs resize-none mb-4"
                            />
                            <div className="flex justify-center">
                                <button
                                    onClick={handleAnalyze}
                                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                                >
                                    <Activity size={18} /> Analyze Blocked Emails
                                </button>
                            </div>
                        </Card>

                        {analyzerResults.length > 0 && (
                            <>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <Card>
                                        <SectionTitle icon={PieIcon} color="text-indigo-600">Blocked Email Distribution</SectionTitle>
                                        <div className="h-[300px] flex items-center">
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
                                                    <Tooltip />
                                                    <Legend verticalAlign="middle" align="right" layout="vertical" />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="text-center px-8 border-l-2 border-slate-50">
                                                <div className="text-3xl font-black text-indigo-600">{analyzerStats.total}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Blocked</div>
                                            </div>
                                        </div>
                                    </Card>

                                    <Card>
                                        <div className="flex justify-between items-center mb-4">
                                            <SectionTitle icon={List} color="text-indigo-600">All Blocked Emails</SectionTitle>
                                            <div className="flex gap-2">
                                                <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black">{analyzerResults.length}</span>
                                                <button className="bg-red-500 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">
                                                    <Copy size={12} /> Copy All
                                                </button>
                                            </div>
                                        </div>
                                        <div className="h-[300px] overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                                            {analyzerResults.map((item, i) => (
                                                <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                    <span className="text-xs font-bold text-slate-600 truncate max-w-[200px]">{item.email}</span>
                                                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${item.status === 'Disconnected' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {Object.entries(analyzerStats.groups).map(([status, items]) => (
                                        <Card key={status} className="border-t-4 border-t-indigo-500">
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="font-black text-slate-800 uppercase tracking-tight">{status}</h4>
                                                <span className="bg-indigo-100 text-indigo-600 px-2 py-1 rounded-lg text-xs font-black">{items.length}</span>
                                            </div>
                                            <div className="h-48 overflow-y-auto bg-slate-50 rounded-xl p-3 font-mono text-[10px] text-slate-500 space-y-1 mb-4">
                                                {items.map((it, idx) => <div key={idx}>{it.email}</div>)}
                                            </div>
                                            <button className="w-full py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
                                                <Copy size={12} /> Copy List
                                            </button>
                                        </Card>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeSubTab === 'consumption' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <Card className="border-t-4 border-t-indigo-500">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-black text-indigo-600 uppercase italic tracking-tighter">Consumption Report Generator</h2>
                                <p className="text-xs font-bold text-slate-400">{new Date().toLocaleDateString()}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consommation Seeds (Active + Blocked)</label>
                                    <textarea
                                        value={consumptionSeeds}
                                        onChange={(e) => setConsumptionSeeds(e.target.value)}
                                        placeholder="99&#10;99&#10;99"
                                        className="w-full h-48 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:ring-0 transition-all font-mono text-xs resize-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nbr Boites Active/Drop</label>
                                    <textarea
                                        value={consumptionMailboxes}
                                        onChange={(e) => setConsumptionMailboxes(e.target.value)}
                                        placeholder="80&#10;97&#10;83"
                                        className="w-full h-48 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:ring-0 transition-all font-mono text-xs resize-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sessions Out (text for all drops)</label>
                                    <textarea
                                        placeholder="0&#10;0&#10;0"
                                        className="w-full h-48 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:ring-0 transition-all font-mono text-xs resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={handleGenerateConsumption}
                                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                                >
                                    Generate Table & Chart
                                </button>
                                <button className="bg-red-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-100">
                                    Clear
                                </button>
                            </div>
                        </Card>

                        {consumptionResults.length > 0 && (
                            <>
                                <Card>
                                    <div className="flex justify-between items-start mb-8">
                                        <SectionTitle icon={Activity} color="text-indigo-600">Consumption Overview</SectionTitle>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-3 gap-8">
                                            <div className="text-center">
                                                <div className="text-xs font-bold text-slate-400 uppercase">Total</div>
                                                <div className="text-xl font-black text-indigo-600">{consumptionTotals.total}</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-xs font-bold text-slate-400 uppercase">Active</div>
                                                <div className="text-xl font-black text-emerald-500">{consumptionTotals.active}</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-xs font-bold text-slate-400 uppercase">Blocked</div>
                                                <div className="text-xl font-black text-red-500">{consumptionTotals.blocked}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="h-[400px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={consumptionResults}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="drop" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                                    cursor={{ fill: '#f8fafc' }}
                                                />
                                                <Legend verticalAlign="top" align="center" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                                                <Bar dataKey="seedsActive" name="Seeds Active" fill="#10B981" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="seedsBlocked" name="Seeds Blocked" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                <Card className="overflow-hidden p-0">
                                    <div className="p-6 border-b border-slate-100">
                                        <SectionTitle icon={ClipboardList} color="text-indigo-600">Detailed Data</SectionTitle>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-indigo-600 text-white">
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Drop N°</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Consommation Seeds</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Nbr Boites Active</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Nbr Boites Blocked</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Sessions Out</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {consumptionResults.map((row, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4 text-xs font-bold text-slate-600">{row.drop}</td>
                                                        <td className="px-6 py-4 text-xs font-medium text-slate-500">{row.seedsActive + row.seedsBlocked}</td>
                                                        <td className="px-6 py-4 text-xs font-medium text-slate-500">{row.seedsActive}</td>
                                                        <td className="px-6 py-4 text-xs font-bold text-red-500">{row.seedsBlocked}</td>
                                                        <td className="px-6 py-4 text-xs font-medium text-slate-500">{row.sessionsOut}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-slate-50 font-black text-[10px] uppercase tracking-widest text-slate-900">
                                                    <td className="px-6 py-4">Total</td>
                                                    <td className="px-6 py-4">{consumptionTotals.total}</td>
                                                    <td className="px-6 py-4 text-emerald-600">{consumptionTotals.active}</td>
                                                    <td className="px-6 py-4 text-red-600">{consumptionTotals.blocked}</td>
                                                    <td className="px-6 py-4">0</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </Card>
                            </>
                        )}
                    </div>
                )}

                {activeSubTab === 'recheck' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <Card>
                            <textarea
                                value={recheckInput}
                                onChange={(e) => setRecheckInput(e.target.value)}
                                placeholder='"CMH1_P_IP_5,2978,Disconnected,email@gmail.com..."'
                                className="w-full h-48 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:ring-0 transition-all font-mono text-xs resize-none mb-4"
                            />
                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={handleProcessRecheck}
                                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                                >
                                    <RefreshCw size={18} /> Process Data
                                </button>
                                <button onClick={() => setRecheckInput('')} className="bg-red-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-100 flex items-center gap-2">
                                    <Trash size={18} /> Clear
                                </button>
                            </div>
                        </Card>

                        {Object.keys(recheckGroups).length > 0 && (
                            <div className="space-y-6">
                                <SectionTitle icon={LayoutDashboard} color="text-indigo-600">Session Groups</SectionTitle>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {Object.entries(recheckGroups).map(([session, chunks]) => (
                                        <Card key={session} className="border-t-4 border-t-red-500">
                                            <div className="flex justify-between items-center mb-6">
                                                <h4 className="font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                                    <div className="w-1 h-4 bg-red-500 rounded-full"></div>
                                                    {session}
                                                </h4>
                                                <span className="bg-red-500 text-white px-2 py-1 rounded-full text-[10px] font-black">
                                                    {chunks.flat().length}
                                                </span>
                                            </div>

                                            <div className="space-y-4">
                                                {chunks.map((chunk, idx) => (
                                                    <div key={idx} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                                        <div className="text-center text-[10px] font-black text-indigo-600 uppercase mb-3">Group {idx + 1}</div>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {chunk.map(id => (
                                                                <div key={id} className="bg-white border border-slate-200 p-2 rounded-lg text-center font-mono text-[10px] font-bold text-slate-600 shadow-sm">
                                                                    {id}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-6 space-y-2">
                                                <button className="w-full py-3 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-md shadow-red-100">
                                                    <Copy size={14} /> Copy Current Group
                                                </button>
                                                <button className="w-full py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-md shadow-red-100">
                                                    <Copy size={14} /> Copy All Intervals
                                                </button>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

import React, { useState, useMemo } from 'react';
import { BarChart3, Users } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { formatNumber } from '../../utils/reporting';

interface DataItem {
    fromName: string;
    count: number;
}

interface FromNameDistributionProps {
    spamData: DataItem[];
    inboxData: DataItem[];
}

export const FromNameDistribution: React.FC<FromNameDistributionProps> = ({ spamData, inboxData }) => {
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

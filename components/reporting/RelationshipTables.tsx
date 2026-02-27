import React, { useState, useMemo } from 'react';
import { ShieldAlert, Users, ChevronDown, RotateCcw, Copy, Check, Zap, Inbox } from 'lucide-react';
import { formatNumber } from '../../utils/reporting';

interface RelationshipItem {
    fromName: string;
    domain: string;
    ip?: string;
    count: number;
    percentage: string | number;
}

interface SpamRelationshipsProps {
    data: RelationshipItem[];
}

export const SpamRelationships: React.FC<SpamRelationshipsProps> = ({ data }) => {
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

    const groupedData = useMemo(() => {
        const groups: Record<string, RelationshipItem[]> = {};
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

            <div className="overflow-x-auto max-h-[700px] custom-scrollbar bg-slate-50/30 p-3">
                <div className="space-y-4">
                    {Object.entries(groupedData).map(([fromName, items]) => (
                        <div key={fromName} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
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
                                        {formatNumber(items.reduce((s, i) => s + i.count, 0))} Total
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-4 px-20 py-2 bg-white border-b border-slate-50">
                                <div className="col-span-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Domain</div>
                                <div className="col-span-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">IP</div>
                                <div className="col-span-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Count</div>
                                <div className="col-span-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Share</div>
                            </div>

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

interface InboxRelationshipsProps {
    data: RelationshipItem[];
}

export const InboxRelationships: React.FC<InboxRelationshipsProps> = ({ data }) => {
    const [copied, setCopied] = useState(false);
    const totalCount = data.reduce((sum, item) => sum + item.count, 0);
    const uniqueDomains = new Set(data.map(item => item.domain)).size;

    const groupedData = useMemo(() => {
        const groups: Record<string, RelationshipItem[]> = {};
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

            <div className="overflow-x-auto max-h-[700px] custom-scrollbar bg-slate-50/30 p-3">
                <div className="space-y-4">
                    {Object.entries(groupedData).map(([fromName, items]) => (
                        <div key={fromName} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
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
                                        {formatNumber(items.reduce((s, i) => s + i.count, 0))} Total
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-4 px-6 py-2 bg-white border-b border-slate-50">
                                <div className="col-span-7 text-[9px] font-black text-slate-400 uppercase tracking-widest">Domain</div>
                                <div className="col-span-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Count</div>
                                <div className="col-span-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Share</div>
                            </div>

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

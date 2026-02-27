import React, { useState } from 'react';
import { List, Search, Copy, Check, Zap, Inbox, Globe, Mail } from 'lucide-react';

interface RawDataViewerProps {
    data: any;
}

export const RawDataViewer: React.FC<RawDataViewerProps> = ({ data }) => {
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

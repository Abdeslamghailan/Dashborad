import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Globe, Search, Copy, Download, Trash2, Check, Clock, ShieldAlert, Zap, Home } from 'lucide-react';
import { Button } from './ui/Button';
import { service } from '../services';

const GmailFilterGenerator = () => {
    const [subjects, setSubjects] = useState('');
    const [newerThan, setNewerThan] = useState('2');
    const [unit, setUnit] = useState('Hours');
    const [unreadOnly, setUnreadOnly] = useState(true);
    const [unreadSpam, setUnreadSpam] = useState(true);
    const [generated, setGenerated] = useState<{ inbox: string; spam: string } | null>(null);
    const [copied, setCopied] = useState<'inbox' | 'spam' | null>(null);

    const handleGenerate = () => {
        const subjectList = subjects.split('\n').filter(s => s.trim() !== '');
        if (subjectList.length === 0) return;

        const subjectQuery = subjectList.map(s => `subject:"${s.trim()}"`).join(' OR ');
        const timeQuery = `newer_than:${newerThan}${unit === 'Hours' ? 'h' : unit === 'Days' ? 'd' : 'm'}`;
        const unreadQuery = unreadOnly ? 'is:unread' : '';

        const inboxQuery = `(${subjectQuery}) ${unreadQuery} ${timeQuery}`.trim();
        const spamQuery = `in:spam (${subjectQuery}) ${unreadQuery} ${timeQuery}`.trim();

        setGenerated({ inbox: inboxQuery, spam: spamQuery });
    };

    const copyToClipboard = (text: string, type: 'inbox' | 'spam') => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const clearAll = () => {
        setSubjects('');
        setGenerated(null);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] mb-4">
                    <Search className="w-8 h-8 text-slate-900" />
                </div>
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-orange-500 transform -skew-x-6 translate-y-1"></div>
                    <h1 className="relative text-4xl md:text-5xl font-black text-white px-8 py-2 italic tracking-tighter uppercase">
                        Gmail Filter Generator
                    </h1>
                </div>
                <div className="flex justify-center">
                    <div className="bg-yellow-400 border-2 border-slate-900 px-6 py-2 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] -rotate-1">
                        <p className="font-bold text-slate-900">Create powerful search queries to find recent emails.</p>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto bg-white border-2 border-slate-100 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">List of Subjects</label>
                            <button onClick={clearAll} className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                                <Trash2 size={14} /> Clear
                            </button>
                        </div>
                        <div className="relative">
                            <textarea
                                value={subjects}
                                onChange={(e) => setSubjects(e.target.value)}
                                placeholder="subject 1&#10;subject 2"
                                className="w-full h-48 p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:ring-0 transition-all font-mono text-sm resize-none"
                            />
                            <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur px-2 py-1 rounded border border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                                Est. Query Size: {subjects.length} / 1200
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border-2 border-slate-100">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Newer Than:</span>
                            <input
                                type="number"
                                value={newerThan}
                                onChange={(e) => setNewerThan(e.target.value)}
                                className="w-20 p-2 bg-white border-2 border-slate-200 rounded-lg text-center font-bold"
                            />
                            <select
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                                className="flex-1 p-2 bg-white border-2 border-slate-200 rounded-lg font-bold"
                            >
                                <option>Minutes</option>
                                <option>Hours</option>
                                <option>Days</option>
                            </select>
                        </div>

                        <div className="flex gap-4">
                            <label className="flex-1 flex items-center justify-center gap-3 bg-slate-50 p-4 rounded-xl border-2 border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={unreadOnly}
                                    onChange={(e) => setUnreadOnly(e.target.checked)}
                                    className="w-5 h-5 rounded border-2 border-slate-300 text-indigo-600 focus:ring-0"
                                />
                                <span className="text-sm font-bold text-slate-700">Unread Only</span>
                            </label>
                            <label className="flex-1 flex items-center justify-center gap-3 bg-slate-50 p-4 rounded-xl border-2 border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={unreadSpam}
                                    onChange={(e) => setUnreadSpam(e.target.checked)}
                                    className="w-5 h-5 rounded border-2 border-slate-300 text-indigo-600 focus:ring-0"
                                />
                                <span className="text-sm font-bold text-slate-700">Unread Spam</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={handleGenerate}
                            className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none flex items-center justify-center gap-2"
                        >
                            Standard Generate <Zap size={18} className="fill-current" />
                        </button>
                        <button
                            disabled
                            className="flex-1 bg-slate-50 text-slate-400 py-4 rounded-xl font-black uppercase tracking-widest border-2 border-slate-100 flex items-center justify-center gap-2 cursor-not-allowed"
                        >
                            <ShieldAlert size={18} /> 1133 query chars to unlock AI
                        </button>
                    </div>
                </div>
            </div>

            {generated && (
                <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between px-4">
                        <h2 className="text-2xl font-black text-slate-900 italic uppercase">Generated Queries</h2>
                        <div className="bg-slate-900 text-white px-4 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                            <Clock size={14} /> {newerThan} {unit.toUpperCase()}
                        </div>
                    </div>

                    <div className="grid gap-6">
                        <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 shadow-lg space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-black text-slate-800 uppercase tracking-tight">Inbox Results</h3>
                                    <p className="text-xs text-slate-500 font-medium">Matches recent unread messages across your provided subjects.</p>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(generated.inbox, 'inbox')}
                                    className={`p-2 rounded-lg transition-all ${copied === 'inbox' ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                                >
                                    {copied === 'inbox' ? <Check size={20} /> : <Copy size={20} />}
                                </button>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-100 font-mono text-sm text-slate-700 break-all">
                                {generated.inbox}
                            </div>
                        </div>

                        <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 shadow-lg space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-black text-slate-800 uppercase tracking-tight">Spam Results</h3>
                                    <p className="text-xs text-slate-500 font-medium">Identifies matching results that were filtered into your spam folder.</p>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(generated.spam, 'spam')}
                                    className={`p-2 rounded-lg transition-all ${copied === 'spam' ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                                >
                                    {copied === 'spam' ? <Check size={20} /> : <Copy size={20} />}
                                </button>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-100 font-mono text-sm text-slate-700 break-all">
                                {generated.spam}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const DNSChecker = () => {
    const [domains, setDomains] = useState('');
    const [results, setResults] = useState<Record<string, { a: string; aaaa: string }> | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLookup = async () => {
        const domainList = domains.split('\n').filter(d => d.trim() !== '');
        if (domainList.length === 0) return;

        setLoading(true);
        try {
            const response = await fetch('/api/dashboard/dns-lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domains: domainList })
            });
            const data = await response.json();
            setResults(data);
        } catch (error) {
            console.error('DNS Lookup failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const downloadIPs = () => {
        if (!results) return;
        const content = Object.entries(results)
            .map(([domain, data]) => `${domain},${data.a},${data.aaaa}`)
            .join('\n');
        const blob = new Blob([`Domain,IPv4 (A),IPv6 (AAAA)\n${content}`], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dns_results.csv';
        a.click();
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] mb-4">
                    <Globe className="w-8 h-8 text-slate-900" />
                </div>
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-indigo-500 transform -skew-x-6 translate-y-1"></div>
                    <h1 className="relative text-4xl md:text-5xl font-black text-white px-8 py-2 italic tracking-tighter uppercase">
                        DNS Batch Lookup
                    </h1>
                </div>
                <div className="flex justify-center">
                    <div className="bg-white border-2 border-slate-900 px-6 py-2 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] rotate-1">
                        <p className="font-bold text-slate-900">Check IPv4 and IPv6 addresses for multiple domains at once.</p>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto bg-white border-2 border-slate-100 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Domains <span className="text-slate-400 font-normal">(One per line, e.g., google.com)</span></label>
                            <button onClick={() => setDomains('')} className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                                <Trash2 size={14} /> Clear
                            </button>
                        </div>
                        <textarea
                            value={domains}
                            onChange={(e) => setDomains(e.target.value)}
                            placeholder="google.com&#10;github.com"
                            className="w-full h-48 p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:ring-0 transition-all font-mono text-sm resize-none"
                        />
                    </div>

                    <button
                        onClick={handleLookup}
                        disabled={loading}
                        className="w-full md:w-auto px-8 bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <Search size={18} />
                        )}
                        Lookup Records
                    </button>
                </div>
            </div>

            {results && (
                <div className="max-w-4xl mx-auto space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between px-4">
                        <h2 className="text-2xl font-black text-slate-900 italic uppercase">Lookup Results</h2>
                        <button
                            onClick={downloadIPs}
                            className="bg-white border-2 border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <Download size={14} /> Download IPs
                        </button>
                    </div>

                    <div className="bg-white border-2 border-slate-100 rounded-2xl shadow-lg overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b-2 border-slate-100">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Domain</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">IPv4 Address (A)</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">IPv6 Address (AAAA)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-slate-50">
                                {Object.entries(results).map(([domain, data]) => (
                                    <tr key={domain} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-700">{domain}</td>
                                        <td className="px-6 py-4 font-mono text-sm text-slate-500">{data.a}</td>
                                        <td className="px-6 py-4 font-mono text-sm text-slate-500">{data.aaaa}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export const ToolsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'gFilter' | 'dns'>('gFilter');

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            {/* Sub-header with tabs */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1 rounded-lg font-black italic text-lg tracking-tighter">
                            WOW!
                        </div>
                        <nav className="flex items-center gap-1">
                            <Link
                                to="/"
                                className="px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
                            >
                                <Home size={16} /> Home
                            </Link>
                            <button
                                onClick={() => setActiveTab('gFilter')}
                                className={`px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'gFilter'
                                        ? 'bg-orange-500 text-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] -translate-y-0.5'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Mail size={16} /> gFilter
                            </button>
                            <button
                                onClick={() => setActiveTab('dns')}
                                className={`px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'dns'
                                        ? 'bg-indigo-600 text-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] -translate-y-0.5'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Globe size={16} /> DNS
                            </button>
                        </nav>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-8 py-12">
                {activeTab === 'gFilter' ? <GmailFilterGenerator /> : <DNSChecker />}
            </div>
        </div>
    );
};

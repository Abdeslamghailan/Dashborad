import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Globe, Search, Copy, Download, Trash2, Check, Clock, ShieldAlert, Zap, Scissors, Wand2, AlertTriangle, X, Star, Users } from 'lucide-react';
import { Button } from './ui/Button';
import { service } from '../services';
import { SimulationExcel } from './SimulationExcel';
import { ReporterHelper } from './ReporterHelper';
import { FileSpreadsheet, ClipboardCheck, Activity } from 'lucide-react';
import { ConsumptionHelper } from './ConsumptionHelper';
import { ProxySync } from './ProxySync';
import { Share2, Fingerprint, ArrowRightLeft, RotateCcw, FileText, Filter, ClipboardList } from 'lucide-react';
import { ReportIPExtractor } from './ReportIPExtractor';
import { IPClassSplitter } from './IPClassSplitter';

const WowAnimations = () => (
    <style dangerouslySetInnerHTML={{
        __html: `
    @keyframes wow-float {
      0%, 100% { transform: translateY(0) rotate(0); }
      50% { transform: translateY(-10px) rotate(2deg); }
    }
    @keyframes wow-skew-slide {
      0% { transform: translateX(-100px) skewX(-15deg); opacity: 0; }
      100% { transform: translateX(0) skewX(-6deg); opacity: 1; }
    }
    @keyframes wow-pop {
      0% { transform: scale(0.8) rotate(-5deg); opacity: 0; }
      70% { transform: scale(1.1) rotate(2deg); }
      100% { transform: scale(1) rotate(-1deg); opacity: 1; }
    }
    @keyframes wow-pulse-shadow {
      0%, 100% { shadow: 4px 4px 0px 0px rgba(15,23,42,1); }
      50% { shadow: 8px 8px 0px 0px rgba(15,23,42,1); }
    }
    .animate-wow-float { animation: wow-float 3s ease-in-out infinite; }
    .animate-wow-skew-slide { animation: wow-skew-slide 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
    .animate-wow-pop { animation: wow-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
    @keyframes wow-shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    .wow-shimmer-text {
      background: linear-gradient(90deg, #fff 0%, #fff 40%, #ffedd5 50%, #fff 60%, #fff 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: wow-shimmer 4s linear infinite;
    }
  `}} />
);

const GmailFilterGenerator = () => {
    const [mode, setMode] = useState<'subjects' | 'froms'>('subjects');
    const [subjects, setSubjects] = useState('');
    const [newerThan, setNewerThan] = useState('2');
    const [unit, setUnit] = useState('Hours');
    const [unreadOnly, setUnreadOnly] = useState(true);
    const [unreadSpam, setUnreadSpam] = useState(true);
    const [generated, setGenerated] = useState<{ inbox: string; spam: string } | null>(null);
    const [copied, setCopied] = useState<'inbox' | 'spam' | null>(null);
    const [isAiShortened, setIsAiShortened] = useState(false);
    const [showAiWarning, setShowAiWarning] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);

    const isFromsMode = mode === 'froms';

    const buildItemQuery = (item: string) =>
        isFromsMode ? `from:${item.trim()}` : `subject:"${item.trim()}"`;

    const calculateQueryLength = (subjectList: string[]) => {
        const itemQuery = subjectList.map(s => buildItemQuery(s)).join(' OR ');
        const timeQuery = `newer_than:${newerThan}${unit === 'Hours' ? 'h' : unit === 'Days' ? 'd' : 'm'}`;
        const unreadQuery = unreadOnly ? 'is:unread' : '';
        return `(${itemQuery}) ${unreadQuery} ${timeQuery}`.trim().length;
    };

    const handleGenerate = async (forceAi = false) => {
        let itemList = subjects.split('\n').filter(s => s.trim() !== '');
        if (itemList.length === 0) return;

        if (forceAi) {
            setIsAiProcessing(true);
            // Simulate AI processing time
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        let shortened = false;
        if (forceAi && !isFromsMode) {
            const maxChars = 1100; // Leave room for other parts of query

            // AI Logic: Extract key words instead of full sentences (subjects only)
            const stopWords = new Set(['the', 'and', 'for', 'with', 'your', 'from', 'this', 'that', 'have', 'been', 'subject', 'regarding', 'about']);
            let processedList = itemList.map(s => {
                const words = s.replace(/[^\w\s]/gi, ' ').split(/\s+/).filter(w =>
                    w.length > 1 && !stopWords.has(w.toLowerCase())
                );
                // Take up to 3 most "significant" words (longer words or first ones)
                return words.slice(0, 3).join(' ');
            });

            let currentList: string[] = [];
            for (const s of processedList) {
                const testList = [...currentList, s];
                if (calculateQueryLength(testList) > maxChars) {
                    shortened = true;
                    break;
                }
                currentList.push(s);
            }
            itemList = currentList;
        } else if (forceAi && isFromsMode) {
            // For froms mode: just truncate if too long
            const maxChars = 1100;
            let currentList: string[] = [];
            for (const s of itemList) {
                const testList = [...currentList, s];
                if (calculateQueryLength(testList) > maxChars) {
                    shortened = true;
                    break;
                }
                currentList.push(s);
            }
            itemList = currentList;
        }

        const itemQuery = itemList.map(s => buildItemQuery(s)).join(' OR ');
        const timeQuery = `newer_than:${newerThan}${unit === 'Hours' ? 'h' : unit === 'Days' ? 'd' : 'm'}`;
        const unreadQuery = unreadOnly ? 'is:unread' : '';

        const inboxQuery = `(${itemQuery}) ${unreadQuery} ${timeQuery}`.trim();
        const spamQuery = `in:spam (${itemQuery}) ${unreadQuery} ${timeQuery}`.trim();

        setGenerated({ inbox: inboxQuery, spam: spamQuery });
        setIsAiShortened(forceAi);
        setShowAiWarning(forceAi && shortened);
        setIsAiProcessing(false);
    };

    const copyToClipboard = (text: string, type: 'inbox' | 'spam') => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const clearAll = () => {
        setSubjects('');
        setGenerated(null);
        setShowAiWarning(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <WowAnimations />
            <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] mb-4 animate-wow-float">
                    <Search className="w-8 h-8 text-slate-900" />
                </div>
                <div className="relative inline-block animate-wow-skew-slide">
                    <div className="absolute inset-0 bg-orange-500 transform -skew-x-6 translate-y-1"></div>
                    <h1 className="relative text-4xl md:text-5xl font-black text-white px-8 py-2 italic tracking-tighter uppercase wow-shimmer-text">
                        Gmail Filter Generator
                    </h1>
                </div>
                <div className="flex justify-center animate-wow-pop" style={{ animationDelay: '0.2s' }}>
                    <div className="bg-yellow-400 border-2 border-slate-900 px-6 py-2 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] -rotate-1">
                        <p className="font-bold text-slate-900">Create powerful search queries to find recent emails.</p>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto bg-white border-2 border-slate-100 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                    {isFromsMode ? 'List of Froms' : 'List of Subjects'}
                                </label>
                                {/* Mode Toggle */}
                                <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                                    <button
                                        onClick={() => { setMode('subjects'); setGenerated(null); }}
                                        className={`px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider transition-all ${!isFromsMode
                                            ? 'bg-orange-500 text-white shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        Subjects
                                    </button>
                                    <button
                                        onClick={() => { setMode('froms'); setGenerated(null); }}
                                        className={`px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider transition-all ${isFromsMode
                                            ? 'bg-orange-500 text-white shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        Froms
                                    </button>
                                </div>
                            </div>
                            <button onClick={clearAll} className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                                <Trash2 size={14} /> Clear
                            </button>
                        </div>
                        <div className="relative">
                            <textarea
                                value={subjects}
                                onChange={(e) => setSubjects(e.target.value)}
                                placeholder={isFromsMode ? 'sender@example.com\nnoreply@domain.com' : 'subject 1\nsubject 2'}
                                className="w-full h-48 p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:ring-0 transition-all font-mono text-sm resize-none"
                            />
                            <div className={`absolute bottom-4 right-4 bg-white/80 backdrop-blur px-2 py-1 rounded border text-[10px] font-bold uppercase flex items-center gap-1 ${subjects.length > 1200 ? 'text-orange-600 border-orange-200' : 'text-slate-500 border-slate-200'}`}>
                                {subjects.length > 1200 && <AlertTriangle size={10} />}
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
                            onClick={() => handleGenerate(false)}
                            disabled={isAiProcessing}
                            className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            Standard Generate <Zap size={18} className="fill-current" />
                        </button>
                        {subjects.length > 1200 ? (
                            <button
                                onClick={() => handleGenerate(true)}
                                disabled={isAiProcessing}
                                className="flex-1 bg-white text-indigo-600 py-4 rounded-xl font-black uppercase tracking-widest border-2 border-indigo-600 hover:bg-indigo-50 transition-all shadow-[4px_4px_0px_0px_rgba(79,70,229,0.2)] active:translate-y-1 active:shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isAiProcessing ? (
                                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <Scissors size={18} />
                                )}
                                AI Shorten & Generate
                            </button>
                        ) : (
                            <button
                                disabled
                                className="flex-1 bg-slate-50 text-slate-400 py-4 rounded-xl font-black uppercase tracking-widest border-2 border-slate-100 flex items-center justify-center gap-2 cursor-not-allowed"
                            >
                                <ShieldAlert size={18} /> {1200 - subjects.length} query chars to unlock AI
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {showAiWarning && (
                <div className="max-w-4xl mx-auto animate-in slide-in-from-top-4 duration-500">
                    <div className="bg-red-400 border-2 border-slate-900 p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] relative overflow-hidden group">
                        <div className="flex items-start gap-4 relative z-10">
                            <div className="bg-white p-2 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-black uppercase italic tracking-tighter text-xl mb-1">Critical Verification Required</h3>
                                <p className="text-white/90 font-bold text-sm uppercase leading-tight">
                                    AI shortening applied. Manually verify and fix machine errors/truncation in your search terms before use.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowAiWarning(false)}
                                className="text-white hover:bg-white/20 p-1 rounded transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 -rotate-45 translate-x-16 -translate-y-16 pointer-events-none"></div>
                    </div>
                </div>
            )}

            {generated && (
                <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between px-4">
                        <h2 className="text-2xl font-black text-slate-900 italic uppercase">Generated Queries</h2>
                        <div className="flex gap-2">
                            <div className="bg-slate-900 text-white px-4 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                                <Clock size={14} /> {newerThan} {unit.toUpperCase()}
                            </div>
                            {isAiShortened && (
                                <div className="bg-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold flex items-center gap-2 animate-pulse">
                                    <Wand2 size={14} /> AI Shortened
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-6">
                        <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 shadow-lg space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-black text-slate-800 uppercase tracking-tight">Inbox Results</h3>
                                    <p className="text-xs text-slate-500 font-medium">
                                        {isFromsMode ? 'Matches recent messages from your listed senders.' : 'Matches recent unread messages across your provided subjects.'}
                                    </p>
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
                                    <p className="text-xs text-slate-500 font-medium">
                                        {isFromsMode ? 'Spam messages from your listed senders.' : 'Identifies matching results that were filtered into your spam folder.'}
                                    </p>
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
    const { token } = useAuth();
    const [domains, setDomains] = useState('');
    const [results, setResults] = useState<Record<string, { a: string; aaaa: string }> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLookup = async () => {
        const domainList = domains.split('\n').filter(d => d.trim() !== '');
        if (domainList.length === 0) return;

        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const data = await service.dnsLookup(domainList);
            setResults(data);
        } catch (err: any) {
            console.error('DNS Lookup failed:', err);
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const downloadIPs = () => {
        if (!results) return;
        const content = (Object.entries(results) as [string, { a: string; aaaa: string }][])
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
            <WowAnimations />
            <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] mb-4 animate-wow-float">
                    <Globe className="w-8 h-8 text-slate-900" />
                </div>
                <div className="relative inline-block animate-wow-skew-slide">
                    <div className="absolute inset-0 bg-indigo-500 transform -skew-x-6 translate-y-1"></div>
                    <h1 className="relative text-4xl md:text-5xl font-black text-white px-8 py-2 italic tracking-tighter uppercase wow-shimmer-text">
                        DNS Batch Lookup
                    </h1>
                </div>
                <div className="flex justify-center animate-wow-pop" style={{ animationDelay: '0.2s' }}>
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

            {error && (
                <div className="max-w-4xl mx-auto animate-in slide-in-from-top-2 duration-300">
                    <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-4 flex items-center gap-3 text-red-700 font-bold">
                        <ShieldAlert className="shrink-0" />
                        {error}
                    </div>
                </div>
            )}

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
                                {(Object.entries(results) as [string, { a: string; aaaa: string }][]).map(([domain, data]) => (
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

const SubjectFormatter = () => {
    const [inputValue, setInputValue] = useState('');
    const [separator, setSeparator] = useState(':');
    const [formattedLines, setFormattedLines] = useState<string[]>([]);
    const [joinedResult, setJoinedResult] = useState('');
    const [copied, setCopied] = useState<'lines' | 'joined' | null>(null);

    const handleFormat = () => {
        const lines = inputValue.split('\n').filter(line => line.trim() !== '');
        const formatted = lines.map(line => line.trim().replace(/ /g, '<sp>'));
        setFormattedLines(formatted);
        setJoinedResult(formatted.join(separator));
    };

    const copyToClipboard = (text: string, type: 'lines' | 'joined') => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const clearAll = () => {
        setInputValue('');
        setFormattedLines([]);
        setJoinedResult('');
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <WowAnimations />
            <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] mb-4 animate-wow-float">
                    <Wand2 className="w-8 h-8 text-slate-900" />
                </div>
                <div className="relative inline-block animate-wow-skew-slide">
                    <div className="absolute inset-0 bg-purple-500 transform -skew-x-6 translate-y-1"></div>
                    <h1 className="relative text-4xl md:text-5xl font-black text-white px-8 py-2 italic tracking-tighter uppercase wow-shimmer-text">
                        SUB Formatter
                    </h1>
                </div>
                <div className="flex justify-center animate-wow-pop" style={{ animationDelay: '0.2s' }}>
                    <div className="bg-white border-2 border-slate-900 px-6 py-2 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] -rotate-1">
                        <p className="font-bold text-slate-900">Format subjects by replacing spaces and joining them.</p>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto bg-white border-2 border-slate-100 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Input Subjects</label>
                            <button onClick={clearAll} className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                                <Trash2 size={14} /> Clear
                            </button>
                        </div>
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Welcome to PartsBase!&#10;Reset Password Notification"
                            className="w-full h-48 p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:ring-0 transition-all font-mono text-sm resize-none"
                        />
                    </div>

                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border-2 border-slate-100">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Separator:</span>
                        <input
                            type="text"
                            value={separator}
                            onChange={(e) => setSeparator(e.target.value)}
                            className="flex-1 p-2 bg-white border-2 border-slate-200 rounded-lg font-bold"
                            placeholder="e.g. :"
                        />
                    </div>

                    <button
                        onClick={handleFormat}
                        className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none flex items-center justify-center gap-2"
                    >
                        Format Subjects <Zap size={18} className="fill-current" />
                    </button>
                </div>
            </div>

            {(formattedLines.length > 0 || joinedResult) && (
                <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="grid gap-6">
                        <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 shadow-lg space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-black text-slate-800 uppercase tracking-tight">Space Replaced (&lt;sp&gt;)</h3>
                                    <p className="text-xs text-slate-500 font-medium">Each subject on its own line.</p>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(formattedLines.join('\n'), 'lines')}
                                    className={`p-2 rounded-lg transition-all ${copied === 'lines' ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                                >
                                    {copied === 'lines' ? <Check size={20} /> : <Copy size={20} />}
                                </button>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-100 font-mono text-sm text-slate-700 whitespace-pre-wrap break-all">
                                {formattedLines.join('\n')}
                            </div>
                        </div>

                        <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 shadow-lg space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-black text-slate-800 uppercase tracking-tight">Joined Result</h3>
                                    <p className="text-xs text-slate-500 font-medium">All subjects joined by "{separator}".</p>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(joinedResult, 'joined')}
                                    className={`p-2 rounded-lg transition-all ${copied === 'joined' ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                                >
                                    {copied === 'joined' ? <Check size={20} /> : <Copy size={20} />}
                                </button>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-100 font-mono text-sm text-slate-700 break-all">
                                {joinedResult}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface ParsedGroup {
    listName: string;
    profiles: string[];
}

const ProfileExtractor: React.FC = () => {
    const [input, setInput] = useState('');
    const [proxiesMap, setProxiesMap] = useState<Record<string, string>>({});
    const [groups, setGroups] = useState<ParsedGroup[]>([]);
    const [copied, setCopied] = useState(false);
    const [copiedName, setCopiedName] = useState(false);
    const [parseError, setParseError] = useState('');
    const [fileName, setFileName] = useState('');

    const [viewMode, setViewMode] = useState<'synced' | 'simple'>('synced');

    const randomName = useMemo(() => {
        if (groups.length === 0) return '';
        return `PROFILES_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }, [groups]);

    const parseInput = (text: string) => {
        setParseError('');
        const normalised = text.replace(/\r/g, '').replace(/\n/g, ' ');
        const pattern = /The selected profiles\s*\(([^)]+)\)\s*in list\s+([\w]+)\s*\(#\d+\)\s*do not have assigned proxies/gi;

        const results: ParsedGroup[] = [];
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(normalised)) !== null) {
            const profilesRaw = match[1];
            const listName = match[2];
            const profiles = profilesRaw
                .split(',')
                .map(p => p.trim())
                .filter(p => p.length > 0);
            if (profiles.length > 0) {
                results.push({ listName, profiles });
            }
        }

        if (results.length === 0 && text.trim().length > 0) {
            setParseError('No matching patterns found. Make sure the text follows the expected format.');
        }
        setGroups(results);
    };

    const getEntity = (listName: string) => listName.split('_')[0];

    const entityRequirements = useMemo(() => {
        const reqs: Record<string, number> = {};
        groups.forEach(g => {
            const entity = getEntity(g.listName);
            reqs[entity] = (reqs[entity] || 0) + g.profiles.length;
        });
        return reqs;
    }, [groups]);

    const proxyPools = useMemo(() => {
        const pools: Record<string, string[]> = {};
        Object.keys(entityRequirements).forEach(entity => {
            const raw = proxiesMap[entity] || '';
            const lines = raw.split('\n').map(l => l.trim()).filter(l => l);
            for (let i = lines.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [lines[i], lines[j]] = [lines[j], lines[i]];
            }
            pools[entity] = lines;
        });
        return pools;
    }, [proxiesMap, entityRequirements]);

    const totalRequired: number = useMemo(() => Object.values(entityRequirements).reduce((a: number, b: number) => a + Number(b), 0), [entityRequirements]);
    const totalProvided: number = useMemo(() => Object.values(proxyPools).reduce((a: number, b: string[]) => a + b.length, 0), [proxyPools]);
    const hasMissingProxies = viewMode === 'synced' && totalProvided < totalRequired;

    const buildOutputText = () => {
        if (viewMode === 'simple') {
            return groups
                .map(g => [g.listName, ...g.profiles].join('\n'))
                .join('\n\n');
        }

        const entityIndices: Record<string, number> = {};
        const outputLines: string[] = [];
        groups.forEach(g => {
            const entity = getEntity(g.listName);
            outputLines.push(g.listName);
            g.profiles.forEach(profile => {
                const pool = proxyPools[entity] || [];
                const idx = entityIndices[entity] || 0;
                let proxy = pool[idx] || 'MISSING_PROXY';
                if (proxy !== 'MISSING_PROXY' && !proxy.includes(':')) {
                    proxy = `${proxy}:92`;
                }
                outputLines.push(`${profile}#${g.listName}#${proxy}`);
                entityIndices[entity] = idx + 1;
            });
        });
        return outputLines.join('\n').trim();
    };

    const handleCopy = () => {
        if (hasMissingProxies) return;
        navigator.clipboard.writeText(buildOutputText());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyName = () => {
        if (!randomName) return;
        navigator.clipboard.writeText(randomName);
        setCopiedName(true);
        setTimeout(() => setCopiedName(false), 2000);
    };

    const handleDownload = () => {
        if (hasMissingProxies) return;
        const blob = new Blob([buildOutputText()], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = randomName ? `${randomName}.txt` : 'profiles.txt';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = ev => {
            const text = ev.target?.result as string;
            setInput(text);
            parseInput(text);
        };
        reader.readAsText(file);
    };

    const updateProxyForEntity = (entity: string, value: string) => {
        setProxiesMap(prev => ({ ...prev, [entity]: value }));
    };

    const entities = Object.keys(entityRequirements);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 w-full max-w-[2000px] mx-auto px-10 py-10 overflow-y-auto min-h-0 flex-1">
            <div className="bg-white border-2 border-slate-100 rounded-3xl shadow-xl shadow-slate-200/40 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
                        <Users size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight leading-tight uppercase italic">Profile Extractor</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Synced & simple result modes</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {input && (
                        <button
                            onClick={() => { setInput(''); setProxiesMap({}); setGroups([]); setParseError(''); setFileName(''); }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center gap-1.5"
                        >
                            <Trash2 size={13} /> Clear
                        </button>
                    )}
                    <label className="px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm">
                        <Download size={13} className="rotate-180" />
                        {fileName || 'Upload File'}
                        <input type="file" accept=".txt,.log" className="hidden" onChange={handleFile} />
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* COL 1 — Raw Logs */}
                <div className="flex flex-col bg-white border-2 border-slate-100 rounded-3xl shadow-xl shadow-slate-200/40 overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-3 bg-slate-50/50 border-b border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. paste raw logs</span>
                    </div>
                    <div className="relative h-[480px]">
                        <textarea
                            value={input}
                            onChange={e => { setInput(e.target.value); parseInput(e.target.value); }}
                            placeholder={`Paste log messages here...`}
                            className="w-full h-full p-6 bg-white focus:outline-none font-mono text-sm text-slate-700 resize-none overflow-y-auto leading-6 placeholder:text-slate-300"
                            style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
                        />
                    </div>
                </div>

                {/* COL 2 — Individual Proxy Inputs */}
                <div className="flex flex-col bg-slate-50/30 border-2 border-slate-100 rounded-3xl shadow-xl shadow-slate-200/40 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. entity proxies</span>
                    </div>
                    <div className="h-[480px] overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
                        {entities.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale py-12">
                                <Search size={24} className="mb-2" />
                                <p className="text-[10px] font-black uppercase">No entities found in logs</p>
                            </div>
                        ) : (
                            entities.map(entity => {
                                const required = entityRequirements[entity];
                                const provided = proxyPools[entity]?.length || 0;
                                const isSatisfied = provided >= required;
                                return (
                                    <div key={entity} className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden shadow-sm transition-all hover:border-slate-200">
                                        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
                                            <span className="text-[11px] font-black text-slate-800 tracking-tight">{entity}</span>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${isSatisfied ? 'bg-teal-50 text-teal-600' : 'bg-amber-50 text-amber-600'}`}>
                                                    {provided} / {required}
                                                </span>
                                            </div>
                                        </div>
                                        <textarea
                                            value={proxiesMap[entity] || ''}
                                            onChange={e => updateProxyForEntity(entity, e.target.value)}
                                            placeholder={`Paste proxies for ${entity} here...`}
                                            className="w-full h-32 p-3 font-mono text-[10px] text-slate-600 focus:outline-none resize-none placeholder:text-slate-200"
                                            style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
                                        />
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* COL 3 — Result */}
                <div className="flex flex-col bg-slate-950 border-2 border-slate-900 rounded-3xl shadow-xl shadow-black/20 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 bg-slate-900/50 border-b border-slate-800 shrink-0">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setViewMode('synced')}
                                className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter transition-all ${viewMode === 'synced' ? 'bg-teal-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Synced
                            </button>
                            <button
                                onClick={() => setViewMode('simple')}
                                className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter transition-all ${viewMode === 'simple' ? 'bg-teal-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Simple
                            </button>
                        </div>
                        {groups.length > 0 && (
                            <div className="flex items-center gap-2">
                                {randomName && (
                                    <button
                                        onClick={handleCopyName}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 ${copiedName
                                            ? 'bg-purple-900/40 border-purple-600 text-purple-400'
                                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                                            }`}
                                    >
                                        {copiedName ? <Check size={10} /> : <Copy size={10} />}
                                        {copiedName ? 'Name Copied' : 'Copy Name'}
                                    </button>
                                )}
                                <button
                                    onClick={handleCopy}
                                    disabled={hasMissingProxies}
                                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 ${hasMissingProxies
                                        ? 'bg-slate-900 border-slate-800 text-slate-700 cursor-not-allowed'
                                        : copied
                                            ? 'bg-green-900/40 border-green-600 text-green-400'
                                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                                        }`}
                                >
                                    {copied ? <Check size={10} /> : <Copy size={10} />}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                                <button
                                    onClick={handleDownload}
                                    disabled={hasMissingProxies}
                                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 ${hasMissingProxies
                                        ? 'bg-slate-900 border-slate-800 text-slate-700 cursor-not-allowed'
                                        : 'border-teal-700 bg-teal-900/40 text-teal-300 hover:bg-teal-800/60 hover:text-teal-200'
                                        }`}
                                >
                                    <Download size={10} />
                                    Export
                                </button>
                            </div>
                        )}
                    </div>

                    <div
                        className="h-[480px] overflow-y-auto"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}
                    >
                        {hasMissingProxies && (
                            <div className="m-4 flex items-center gap-3 bg-red-950/40 border-2 border-red-900/50 rounded-2xl p-4 animate-in slide-in-from-top-2">
                                <div className="w-8 h-8 rounded-xl bg-red-600/20 flex items-center justify-center text-red-500">
                                    <ShieldAlert size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest italic">Action Blocked</span>
                                    <span className="text-[11px] font-black text-white uppercase italic leading-tight">Missing {totalRequired - totalProvided} Proxies</span>
                                </div>
                            </div>
                        )}

                        <div className="p-6 font-mono text-xs">
                            {parseError ? (
                                <div className="flex items-start gap-2 text-amber-400 text-[10px] font-bold p-3 bg-amber-950/30 border border-amber-800/40 rounded-lg uppercase">
                                    <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                                    <span>{parseError}</span>
                                </div>
                            ) : groups.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[300px] text-center opacity-30 grayscale">
                                    <Users size={32} className="text-slate-600 mb-2" />
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Waiting for data</p>
                                </div>
                            ) : (viewMode === 'simple' ? (
                                <div className="space-y-6">
                                    {groups.map((g, i) => (
                                        <div key={i} className="group">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="w-1 h-3 rounded-full bg-emerald-500" />
                                                <p className="text-emerald-400 font-black text-xs uppercase tracking-tight">
                                                    {g.listName}
                                                </p>
                                            </div>
                                            <div className="pl-3 border-l-2 border-slate-900 space-y-1">
                                                {g.profiles.map((p, j) => (
                                                    <p key={j} className="text-amber-200/90 text-[11px] font-bold">{p}</p>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {buildOutputText().split('\n').map((line, i) => (
                                        <div key={i} className="flex gap-2">
                                            <span className="text-slate-800 text-[10px] w-6 text-right select-none">{i + 1}</span>
                                            <p className={`${line.includes('MISSING_PROXY') ? 'text-red-400' : 'text-amber-200/90'} font-bold`}>
                                                {line}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
const IPLinePurge = () => {
    const [zone1, setZone1] = useState('');
    const [zone2, setZone2] = useState('');
    const [output, setOutput] = useState('');
    const [stats, setStats] = useState<{ total: number; removed: number; final: number } | null>(null);
    const [copied, setCopied] = useState(false);

    const handlePurge = () => {
        if (!zone1.trim() || !zone2.trim()) return;

        const blacklist = new Set(
            zone1
                .split(/[\s,]+/)
                .map(ip => ip.trim())
                .filter(ip => ip.length > 0)
        );

        if (blacklist.size === 0) return;

        const lines = zone2.split('\n');
        const initialCount = lines.length;

        const resultLines = lines.filter(line => {
            const trimmed = line.trim();
            if (!trimmed) return true;
            for (const ip of blacklist) {
                if (line.includes(ip)) {
                    return false;
                }
            }
            return true;
        });

        const finalCount = resultLines.length;
        const removedCount = initialCount - finalCount;

        setOutput(resultLines.join('\n'));
        setStats({
            total: initialCount,
            removed: removedCount,
            final: finalCount
        });
    };

    const handleClear = () => {
        setZone1('');
        setZone2('');
        setOutput('');
        setStats(null);
    };

    const handleCopy = () => {
        if (!output) return;
        navigator.clipboard.writeText(output);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center py-10 px-8">
            <div className="space-y-8 animate-in fade-in duration-500 w-full max-w-5xl">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-500 rounded-2xl shadow-lg mb-4 text-white">
                        <Zap className="w-8 h-8 fill-current" />
                    </div>
                    <div className="relative inline-block">
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                            IP Line Purge
                        </h1>
                    </div>
                    <div className="flex justify-center">
                        <p className="text-slate-500 font-medium text-sm max-w-2xl">
                            Rapidly remove lines from your dataset that contain blacklisted IP addresses. Perfect for cleaning proxy lists, server logs, or access files.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className="bg-white border-2 border-slate-100 rounded-2xl shadow-xl overflow-hidden flex flex-col">
                        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-red-500" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ZONE 1: BLACKLISTED IPS</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                {zone1.split(/[\s,]+/).filter(ip => ip.trim().length > 0).length} Count
                            </span>
                        </div>
                        <textarea
                            value={zone1}
                            onChange={(e) => setZone1(e.target.value)}
                            className="w-full h-[400px] p-4 bg-white focus:outline-none font-mono text-sm text-slate-700 resize-none placeholder:text-slate-300"
                            placeholder="199.248.56.77:92&#10;198.181.0.59:92..."
                            spellCheck={false}
                            style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
                        />
                    </div>

                    <div className="bg-white border-2 border-slate-100 rounded-2xl shadow-xl overflow-hidden flex flex-col">
                        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-500" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ZONE 2: TARGET DATA TO CLEAN</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                {zone2 ? zone2.split('\n').length : 0} Lines
                            </span>
                        </div>
                        <textarea
                            value={zone2}
                            onChange={(e) => setZone2(e.target.value)}
                            className="w-full h-[400px] p-4 bg-white focus:outline-none font-mono text-sm text-slate-700 resize-none placeholder:text-slate-300"
                            placeholder="5847#162.33.167.213:92&#10;5848#23.174..."
                            spellCheck={false}
                            style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
                        />
                    </div>
                </div>

                <div className="flex justify-center gap-4">
                    <button
                        onClick={handlePurge}
                        className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                    >
                        <Zap size={18} className="fill-current" /> Purge Lines
                    </button>
                    <button
                        onClick={handleClear}
                        className="flex items-center gap-2 px-8 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                        <RotateCcw size={18} /> Clear All
                    </button>
                </div>

                {stats && (
                    <div className="bg-white border-2 border-slate-100 rounded-2xl shadow-xl overflow-hidden p-6 mt-8 animate-in slide-in-from-bottom-4">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-8">
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">TOTAL LINES</div>
                                    <div className="text-2xl font-black text-slate-900">{stats.total}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">REMOVED</div>
                                    <div className="text-2xl font-black text-red-500">-{stats.removed}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">FINAL COUNT</div>
                                    <div className="text-2xl font-black text-green-500">{stats.final}</div>
                                </div>
                            </div>
                            <button
                                onClick={handleCopy}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-bold hover:bg-indigo-100 transition-colors text-sm"
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                {copied ? 'Copied' : 'Copy Results'}
                            </button>
                        </div>

                        <div className="bg-slate-950 rounded-xl p-4 h-[400px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
                            <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap break-all">{output}</pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

interface ProfileEntry {
    id: string;
    statuses: { status: string; date: string; color: string }[];
}

const ProfileStatusFilter: React.FC = () => {
    const [input, setInput] = useState('');
    const [profiles, setProfiles] = useState<ProfileEntry[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [copiedIds, setCopiedIds] = useState(false);
    const [parseError, setParseError] = useState('');

    const parseInput = (text: string) => {
        setParseError('');
        setSelectedStatus(null);
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const result: ProfileEntry[] = [];

        for (const line of lines) {
            // Support tab-separated format (960\t[...]) and space-separated as fallback
            const tabIdx = line.indexOf('\t');
            const delimIdx = tabIdx !== -1 ? tabIdx : line.indexOf(' ');
            if (delimIdx === -1) continue;
            const id = line.slice(0, delimIdx).trim();
            const jsonPart = line.slice(delimIdx + 1).trim();
            try {
                const parsed = JSON.parse(jsonPart);
                if (Array.isArray(parsed)) {
                    result.push({
                        id,
                        statuses: parsed.map((s: any) => ({ status: s.status, date: s.date, color: s.color }))
                    });
                }
            } catch {
                // skip unparseable lines
            }
        }

        if (result.length === 0 && text.trim().length > 0) {
            setParseError('Could not parse any profiles. Expected format: 960\t[{"status":"..."}]');
        }
        setProfiles(result);
    };

    const allStatuses = useMemo(() => {
        const statusMap = new Map<string, string>(); // status -> color
        for (const p of profiles) {
            for (const s of p.statuses) {
                if (!statusMap.has(s.status)) statusMap.set(s.status, s.color);
            }
        }
        return Array.from(statusMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [profiles]);

    // For each status, count how many profiles have it (appear at least once)
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const p of profiles) {
            const seen = new Set<string>();
            for (const s of p.statuses) {
                if (!seen.has(s.status)) {
                    seen.add(s.status);
                    counts[s.status] = (counts[s.status] || 0) + 1;
                }
            }
        }
        return counts;
    }, [profiles]);

    const filteredIds = useMemo(() => {
        if (!selectedStatus) return [];
        return profiles
            .filter(p => p.statuses.some(s => s.status === selectedStatus))
            .map(p => p.id);
    }, [profiles, selectedStatus]);

    const selectedColor = useMemo(() => {
        if (!selectedStatus) return '#6366f1';
        return allStatuses.find(([s]) => s === selectedStatus)?.[1] || '#6366f1';
    }, [selectedStatus, allStatuses]);

    const handleCopyIds = () => {
        navigator.clipboard.writeText(filteredIds.join('\n'));
        setCopiedIds(true);
        setTimeout(() => setCopiedIds(false), 2000);
    };

    const handleClear = () => {
        setInput('');
        setProfiles([]);
        setSelectedStatus(null);
        setParseError('');
        setCopiedIds(false);
    };

    return (
        <div className="flex flex-col h-full min-h-screen bg-slate-50/50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                        <ClipboardList size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight leading-tight uppercase italic">Profile Status Filter</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Paste logs and filter by status</p>
                    </div>
                </div>
                {profiles.length > 0 && (
                    <button
                        onClick={handleClear}
                        className="flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all"
                    >
                        <Trash2 size={14} /> Clear All
                    </button>
                )}
            </div>

            {/* Body */}
            <div className="flex flex-1 gap-6 p-8 min-h-0">
                {/* Left: Input */}
                <div className="w-[420px] shrink-0 flex flex-col bg-white border-2 border-slate-100 rounded-2xl shadow-lg overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Input Logs</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${profiles.length > 0 ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-400'
                            }`}>{profiles.length} profiles loaded</span>
                    </div>
                    <textarea
                        value={input}
                        onChange={e => { setInput(e.target.value); parseInput(e.target.value); }}
                        placeholder={`Paste your logs here...\nExample:\n33 [{"status":"Unlocked",...}]`}
                        className="flex-1 p-5 font-mono text-xs text-slate-700 resize-none focus:outline-none placeholder:text-slate-300 leading-5"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
                    />
                    {parseError && (
                        <div className="mx-4 mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-700 text-[10px] font-bold uppercase">
                            <AlertTriangle size={12} className="shrink-0" />
                            {parseError}
                        </div>
                    )}
                </div>

                {/* Right: Status Filter + Results */}
                <div className="flex-1 flex flex-col gap-6 min-h-0">
                    {/* Status pills panel */}
                    <div className="bg-white border-2 border-slate-100 rounded-2xl shadow-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Filter size={14} className="text-slate-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Status</span>
                        </div>
                        {allStatuses.length === 0 ? (
                            <p className="text-slate-300 text-sm font-medium italic">Paste data to see available statuses</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {allStatuses.map(([status, color]) => {
                                    const isSelected = selectedStatus === status;
                                    return (
                                        <button
                                            key={status}
                                            onClick={() => setSelectedStatus(isSelected ? null : status)}
                                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${isSelected
                                                ? 'text-white border-transparent shadow-md scale-105'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                            style={isSelected ? { backgroundColor: color, borderColor: color } : {}}
                                        >
                                            {status}
                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                {statusCounts[status] || 0}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Results panel */}
                    {selectedStatus && (
                        <div className="bg-white border-2 border-slate-100 rounded-2xl shadow-lg flex flex-col overflow-hidden animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedColor }} />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Results: {selectedStatus}
                                    </span>
                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                        {filteredIds.length} profiles
                                    </span>
                                </div>
                                <button
                                    onClick={handleCopyIds}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${copiedIds
                                        ? 'bg-green-50 text-green-600 border-green-200'
                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                >
                                    {copiedIds ? <Check size={13} /> : <Copy size={13} />}
                                    {copiedIds ? 'Copied!' : 'Copy IDs'}
                                </button>
                            </div>
                            <div
                                className="p-6 overflow-y-auto"
                                style={{ maxHeight: '380px', scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
                            >
                                {filteredIds.length === 0 ? (
                                    <p className="text-slate-300 text-sm font-medium italic">No profiles found with this status.</p>
                                ) : (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                                        {filteredIds.map(id => (
                                            <div
                                                key={id}
                                                className="flex items-center justify-center bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-2 font-mono text-sm font-black text-slate-700 hover:border-slate-300 hover:bg-white transition-all"
                                            >
                                                {id}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const ToolsPage: React.FC = () => {
    const { user, isAdmin, isMailer } = useAuth();

    // Define tabs with their permissions
    const allTabs = [
        { id: 'gFilter', label: 'gFilter', icon: <Mail size={16} />, color: 'bg-orange-500', component: <GmailFilterGenerator />, roles: ['ADMIN', 'MAILER'] },
        { id: 'subjectTool', label: 'SUB', icon: <Zap size={16} />, color: 'bg-purple-600', component: <SubjectFormatter />, roles: ['ADMIN', 'MAILER'] },
        { id: 'dns', label: 'DNS', icon: <Globe size={16} />, color: 'bg-indigo-600', component: <DNSChecker />, roles: ['ADMIN', 'MAILER', 'USER'] },
        { id: 'excel', label: 'Excel', icon: <FileSpreadsheet size={16} />, color: 'bg-emerald-500', component: <SimulationExcel />, roles: ['ADMIN', 'MAILER', 'USER'] },
        { id: 'reporter', label: 'Reporter', icon: <ClipboardCheck size={16} />, color: 'bg-rose-500', component: <ReporterHelper />, roles: ['ADMIN', 'MAILER'] },
        { id: 'consumption', label: 'Consumption', icon: <Activity size={16} />, color: 'bg-indigo-600', component: <ConsumptionHelper />, roles: ['ADMIN', 'MAILER'] },
        { id: 'proxySync', label: 'ProxySync', icon: <Share2 size={16} />, color: 'bg-indigo-600', component: <ProxySync />, roles: ['ADMIN', 'MAILER'] },
        { id: 'ipExtractor', label: 'IP Extractor', icon: <Fingerprint size={16} />, color: 'bg-indigo-600', component: <ReportIPExtractor />, roles: ['ADMIN', 'MAILER'] },
        { id: 'ipSplitter', label: 'IP Splitter', icon: <ArrowRightLeft size={16} />, color: 'bg-blue-600', component: <IPClassSplitter />, roles: ['ADMIN', 'MAILER', 'USER'] },
        { id: 'profileExtractor', label: 'Profile Extractor', icon: <Users size={16} />, color: 'bg-teal-600', component: <ProfileExtractor />, roles: ['ADMIN', 'MAILER'] },
        { id: 'ipLinePurge', label: 'IP Purge', icon: <Zap size={16} />, color: 'bg-indigo-600', component: <IPLinePurge />, roles: ['ADMIN'] },
        { id: 'profileStatusFilter', label: 'Status Filter', icon: <Filter size={16} />, color: 'bg-violet-600', component: <ProfileStatusFilter />, roles: ['ADMIN'] },
    ] as const;

    type TabId = typeof allTabs[number]['id'];

    const [pinnedTabs, setPinnedTabs] = useState<TabId[]>(() => {
        const saved = localStorage.getItem('pinnedTools');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('pinnedTools', JSON.stringify(pinnedTabs));
    }, [pinnedTabs]);

    const togglePin = (e: React.MouseEvent, id: TabId) => {
        e.stopPropagation();
        setPinnedTabs(prev =>
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    };

    // Filter and sort tabs based on user role and pin status
    const filteredTabs = useMemo(() => {
        return allTabs
            .filter(tab =>
                ((tab.roles as any).includes('ADMIN') && isAdmin) ||
                (tab.roles as any).includes(user?.role || '')
            )
            .sort((a, b) => {
                const aPinned = pinnedTabs.includes(a.id);
                const bPinned = pinnedTabs.includes(b.id);

                // Prioritize pinned tabs globally
                if (aPinned && !bPinned) return -1;
                if (!aPinned && bPinned) return 1;

                // Stable secondary sort (original order)
                return allTabs.indexOf(a) - allTabs.indexOf(b);
            });
    }, [isAdmin, user?.role, pinnedTabs]);

    const [activeTab, setActiveTab] = useState<TabId>(filteredTabs[0]?.id || 'dns');

    const activeTabObj = filteredTabs.find(t => t.id === activeTab) || filteredTabs[0];

    const fullHeightTabs = ['ipSplitter', 'profileExtractor'];
    const isFullHeight = fullHeightTabs.includes(activeTab);

    return (
        <div className={`bg-slate-50/50 flex flex-col ${isFullHeight ? 'h-full overflow-hidden' : 'min-h-screen pb-20'}`}>
            {/* Sub-header with tabs */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className={`${isFullHeight ? 'max-w-full' : 'max-w-7xl'} mx-auto px-4 py-2`}>
                    <nav className="flex items-center flex-wrap gap-1">
                        {filteredTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`group px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeTab === tab.id
                                    ? `${tab.color} text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] -translate-y-0.5`
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                                <div
                                    onClick={(e) => togglePin(e, tab.id)}
                                    className={`ml-0.5 transition-all ${pinnedTabs.includes(tab.id)
                                        ? 'text-yellow-400 opacity-100'
                                        : 'text-slate-300 opacity-0 group-hover:opacity-100 hover:text-yellow-400'
                                        }`}
                                >
                                    <Star size={11} fill={pinnedTabs.includes(tab.id) ? "currentColor" : "none"} />
                                </div>
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            <div className={`${isFullHeight ? 'max-w-full px-0 pt-0 pb-0 flex-1 min-h-0' : 'max-w-7xl px-8 pt-4 pb-12'} mx-auto w-full flex flex-col overflow-hidden`}>
                {activeTabObj?.component}
            </div>
        </div>
    );
};


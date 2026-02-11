import React, { useState, useMemo } from 'react';
import {
    Shuffle, Trash2, Copy, Check, List,
    Undo2, Redo2, Layout, ShieldAlert,
    Box, Search, Zap, Scissors, AlertTriangle, Wand2, Clock
} from 'lucide-react';

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
      background: linear-gradient(90deg, #fff 0%, #fff 40%, #bfdbfe 50%, #fff 60%, #fff 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: wow-shimmer 4s linear infinite;
    }
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #e2e8f0;
        border-radius: 20px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #cbd5e1;
    }
    .custom-scrollbar-h::-webkit-scrollbar {
        height: 5px;
    }
    .custom-scrollbar-h::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar-h::-webkit-scrollbar-thumb {
        background: #e2e8f0;
        border-radius: 20px;
    }
    .custom-scrollbar-h::-webkit-scrollbar-thumb:hover {
        background: #cbd5e1;
    }
  `}} />
);

export const IPClassSplitter: React.FC = () => {
    const [numColumns, setNumColumns] = useState<number>(4);
    const [inputIPs, setInputIPs] = useState<string>('');
    const [columns, setColumns] = useState<string[][]>([]);
    const [spamIPs, setSpamIPs] = useState<string>('');
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [history, setHistory] = useState<string[][][]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);

    const parseIPs = (text: string): string[] => {
        return text.split(/[\s,\n]+/).filter(ip => ip.trim() !== '');
    };

    const shuffleArray = (array: string[]) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    const addToHistory = (newColumns: string[][]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newColumns);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const handleShuffleAndSplit = () => {
        const ips = parseIPs(inputIPs);
        if (ips.length === 0) return;

        const shuffled = shuffleArray(ips);
        const result: string[][] = Array.from({ length: numColumns }, () => []);

        shuffled.forEach((ip, index) => {
            result[index % numColumns].push(ip);
        });

        setColumns(result);
        addToHistory(result);
    };

    const handleRemoveSpam = () => {
        const spamSet = new Set(parseIPs(spamIPs));
        if (spamSet.size === 0 || columns.length === 0) return;

        const updatedColumns = columns.map(col =>
            col.filter(ip => !spamSet.has(ip))
        );

        setColumns(updatedColumns);
        addToHistory(updatedColumns);
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setColumns(history[newIndex]);
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setColumns(history[newIndex]);
        }
    };

    const copyColumn = (index: number) => {
        const content = columns[index].join('\n');
        navigator.clipboard.writeText(content);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const totalIPsResult = useMemo(() => columns.reduce((acc, col) => acc + col.length, 0), [columns]);

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] animate-in fade-in duration-500 overflow-hidden">
            <WowAnimations />


            <div className="flex flex-1 overflow-hidden p-6 gap-6">
                {/* Left Sidebar: Configuration */}
                <div className="w-[320px] flex flex-col gap-4 flex-shrink-0">
                    <div className="flex items-center gap-2 px-1">
                        <List size={16} className="text-slate-400" />
                        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Configuration</h2>
                    </div>

                    <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm p-6 space-y-7 flex-1 flex flex-col">
                        <div className="space-y-3">
                            <label className="text-[11px] font-bold text-slate-700">Number of Columns</label>
                            <input
                                type="number"
                                min="1"
                                max="12"
                                value={numColumns}
                                onChange={(e) => setNumColumns(parseInt(e.target.value) || 1)}
                                className="w-full p-3.5 bg-white border border-slate-200 rounded-xl focus:border-blue-400 focus:ring-0 transition-all font-bold text-slate-700 text-sm"
                            />
                        </div>

                        <div className="space-y-2 flex-1 flex flex-col">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-[11px] font-bold text-slate-700">Input IPs</label>
                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">Newline separated</span>
                            </div>
                            <textarea
                                value={inputIPs}
                                onChange={(e) => setInputIPs(e.target.value)}
                                placeholder="Paste your IPs here..."
                                className="w-full flex-1 p-4 bg-white border border-slate-200 rounded-2xl focus:border-blue-400 focus:ring-0 transition-all font-mono text-[11px] text-slate-500 leading-relaxed resize-none custom-scrollbar"
                            />
                        </div>

                        <button
                            onClick={handleShuffleAndSplit}
                            className="w-full bg-[#3b82f6] text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-50 active:scale-[0.98]"
                        >
                            <Shuffle size={14} /> Shuffle & Split
                        </button>
                    </div>
                </div>

                {/* Center Main: Results */}
                <div className="flex-1 flex flex-col gap-4 overflow-hidden min-w-0">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <Layout size={16} className="text-slate-400" />
                            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Results</h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
                                <button
                                    onClick={handleUndo}
                                    disabled={historyIndex <= 0}
                                    className="p-1.5 hover:bg-white rounded-lg transition-all disabled:opacity-20 text-slate-600"
                                >
                                    <Undo2 size={16} />
                                </button>
                                <button
                                    onClick={handleRedo}
                                    disabled={historyIndex >= history.length - 1}
                                    className="p-1.5 hover:bg-white rounded-lg transition-all disabled:opacity-20 text-slate-600"
                                >
                                    <Redo2 size={16} />
                                </button>
                            </div>
                            <div className="bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                Total: {totalIPsResult}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm flex-1 overflow-x-auto p-8 flex gap-6 min-h-0 bg-slate-50/20 custom-scrollbar-h content-start">
                        {columns.length > 0 ? (
                            columns.map((col, idx) => (
                                <div
                                    key={idx}
                                    className={`flex flex-col bg-white border border-slate-200 rounded-[22px] shadow-sm overflow-hidden max-h-full transition-all duration-300
                                        ${columns.length > 5 ? 'w-[300px] shrink-0' : 'flex-1 min-w-[200px]'}
                                    `}
                                >
                                    <div className="bg-[#f8fafc] border-b border-slate-100 px-5 py-4 flex justify-between items-center">
                                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Column {idx + 1}</span>
                                        <div className="bg-blue-50 text-blue-500 text-[9px] font-[900] px-2.5 py-1 rounded-lg border border-blue-100 uppercase tracking-wider">
                                            {col.length} IPs
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-5 font-mono text-[11px] text-slate-500 leading-[1.8] space-y-1 custom-scrollbar">
                                        {col.map((ip, i) => (
                                            <div key={i} className="hover:text-blue-500 transition-colors uppercase">{ip}</div>
                                        ))}
                                    </div>
                                    <div className="p-4 bg-white border-t border-slate-50">
                                        <button
                                            onClick={() => copyColumn(idx)}
                                            className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${copiedIndex === idx ? 'bg-green-500 text-white border-green-600' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50 shadow-sm hover:border-slate-200'}`}
                                        >
                                            <Copy size={12} />
                                            {copiedIndex === idx ? 'Copied' : 'Copy Column'}
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="w-full flex flex-col items-center justify-center text-slate-300 gap-5 opacity-40">
                                <Box size={60} className="stroke-[1] animate-wow-float" />
                                <div className="text-center animate-wow-pop">
                                    <p className="font-black uppercase tracking-[0.2em] text-xs">Waiting for data</p>
                                    <p className="text-[10px] font-bold mt-2 uppercase tracking-widest">Set columns and add IPs to start splitting</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Sidebar: Spam Removal */}
                <div className="w-[320px] flex flex-col gap-4 flex-shrink-0">
                    <div className="flex items-center gap-2 px-1">
                        <ShieldAlert size={16} className="text-red-400" />
                        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Spam Removal</h2>
                    </div>

                    <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm p-6 space-y-7 flex-1 flex flex-col">
                        <div className="space-y-3 flex-1 flex flex-col">
                            <label className="text-[11px] font-bold text-slate-700">IPs to Remove</label>
                            <textarea
                                value={spamIPs}
                                onChange={(e) => setSpamIPs(e.target.value)}
                                placeholder="Paste spam IPs here..."
                                className="w-full flex-1 p-4 bg-white border border-slate-200 rounded-2xl focus:border-red-400 focus:ring-0 transition-all font-mono text-[11px] text-slate-500 leading-relaxed resize-none custom-scrollbar"
                            />
                        </div>

                        <button
                            onClick={handleRemoveSpam}
                            className="w-full bg-[#fff1f2] text-red-500 py-4 rounded-xl font-[900] text-[10px] uppercase tracking-widest hover:bg-red-100 border border-red-100 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            <Trash2 size={13} /> Clean Columns
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

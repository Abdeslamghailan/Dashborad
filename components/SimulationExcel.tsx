import React, { useState, useRef, useCallback } from 'react';
import {
    Upload,
    Download,
    Trash2,
    ArrowDownAZ,
    ArrowUpAZ,
    Minus,
    Combine,
    Split,
    Copy,
    Check,
    Search,
    Zap,
    Filter,
    ArrowLeftRight,
    Users,
    Layers,
    SquareMinus,
    Wand2,
    Settings2,
    RotateCcw,
    RotateCw,
    Eraser,
    Type,
    AlignLeft,
    Sparkles,
    LayoutGrid,
    ZapOff,
    Info,
    HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { Virtuoso } from 'react-virtuoso';
import { Button } from './ui/Button';

// --- Sub-components ---

function ActionGridButton({
    icon,
    label,
    onClick,
    active,
    description
}: {
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    active: boolean,
    description?: string
}) {
    return (
        <div className="relative group/btn">
            <button
                onClick={onClick}
                className={`w-full flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center gap-2 h-[85px] ${active ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'}`}
            >
                <span className={active ? 'text-white' : 'text-[#5c7cfa]'}>{icon}</span>
                <span className="text-[10px] font-bold leading-tight">{label}</span>
            </button>
            {description && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
                    <div className="font-bold mb-1 border-b border-gray-700 pb-1">{label}</div>
                    {description}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900" />
                </div>
            )}
        </div>
    );
}

function AdvancedToolButton({
    icon,
    label,
    onClick,
    description
}: {
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    description?: string
}) {
    return (
        <div className="flex-1 relative group/tool">
            <button
                onClick={onClick}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-bold text-gray-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all border border-transparent hover:border-gray-100"
            >
                {icon}
                {label}
            </button>
            {description && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 p-2 bg-indigo-900 text-white text-[10px] rounded-lg opacity-0 group-hover/tool:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
                    {description}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-indigo-900" />
                </div>
            )}
        </div>
    );
}

// --- Main Component ---

type Version = 'basic' | 'advanced';

export const SimulationExcel: React.FC = () => {
    const [version, setVersion] = useState<Version>('basic');
    const [showHelp, setShowHelp] = useState(false);

    // Core State
    const textareaARef = useRef<HTMLTextAreaElement>(null);
    const textareaBRef = useRef<HTMLTextAreaElement>(null);
    const [countA, setCountA] = useState(0);
    const [countB, setCountB] = useState(0);
    const [results, setResults] = useState<string[]>([]);
    const [activeOperation, setActiveOperation] = useState<string | null>(null);
    const [isCopying, setIsCopying] = useState(false);

    const fileInputARef = useRef<HTMLInputElement>(null);
    const fileInputBRef = useRef<HTMLInputElement>(null);

    // Advanced Settings
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [historyA, setHistoryA] = useState<string[]>([]);
    const [historyB, setHistoryB] = useState<string[]>([]);

    const getArrayFromText = useCallback((text: string) => {
        if (!text) return [];
        return text.split(/\r?\n/).map(item => item.trim()).filter(item => item.length > 0);
    }, []);

    const updateCounts = useCallback(() => {
        setCountA(getArrayFromText(textareaARef.current?.value || '').length);
        setCountB(getArrayFromText(textareaBRef.current?.value || '').length);
    }, [getArrayFromText]);

    // History Management
    const pushHistory = (target: 'A' | 'B', value: string) => {
        if (target === 'A') setHistoryA(prev => [...prev.slice(-19), value]);
        else setHistoryB(prev => [...prev.slice(-19), value]);
    };

    const handleUndo = (target: 'A' | 'B') => {
        const history = target === 'A' ? historyA : historyB;
        if (history.length === 0) return;

        const lastValue = history[history.length - 1];
        const newHistory = history.slice(0, -1);

        if (target === 'A') {
            if (textareaARef.current) textareaARef.current.value = lastValue;
            setHistoryA(newHistory);
        } else {
            if (textareaBRef.current) textareaBRef.current.value = lastValue;
            setHistoryB(newHistory);
        }
        updateCounts();
    };

    // Advanced Cleaning Tools
    const cleanList = (target: 'A' | 'B', type: 'trim' | 'empty' | 'lower' | 'unique') => {
        const ref = target === 'A' ? textareaARef : textareaBRef;
        if (!ref.current) return;

        pushHistory(target, ref.current.value);
        let items = ref.current.value.split(/\r?\n/);

        if (type === 'trim') items = items.map(i => i.trim());
        if (type === 'empty') items = items.filter(i => i.trim().length > 0);
        if (type === 'lower') items = items.map(i => i.toLowerCase());
        if (type === 'unique') items = Array.from(new Set(items));

        ref.current.value = items.join('\n');
        updateCounts();
    };

    const handleOperation = (op: string) => {
        setActiveOperation(op);
        setResults([]);

        const textA = textareaARef.current?.value || '';
        const textB = textareaBRef.current?.value || '';

        const itemsA = getArrayFromText(textA);
        const itemsB = getArrayFromText(textB);

        const process = (val: string) => caseSensitive ? val : val.toLowerCase();

        const setA = new Set(itemsA.map(process));
        const setB = new Set(itemsB.map(process));

        let res: string[] = [];

        switch (op) {
            case 'inANotB':
                res = itemsA.filter(x => !setB.has(process(x)));
                break;
            case 'inBNotA':
                res = itemsB.filter(x => !setA.has(process(x)));
                break;
            case 'removeBFromA':
                pushHistory('A', textA);
                const newA = itemsA.filter(x => !setB.has(process(x)));
                if (textareaARef.current) textareaARef.current.value = newA.join('\n');
                updateCounts();
                break;
            case 'removeAFromB':
                pushHistory('B', textB);
                const newB = itemsB.filter(x => !setA.has(process(x)));
                if (textareaBRef.current) textareaBRef.current.value = newB.join('\n');
                updateCounts();
                break;
            case 'common':
                res = itemsA.filter(x => setB.has(process(x)));
                break;
            case 'combineUnique':
                const combined = [...itemsA, ...itemsB];
                const seen = new Set();
                res = combined.filter(x => {
                    const p = process(x);
                    if (seen.has(p)) return false;
                    seen.add(p);
                    return true;
                });
                break;
            case 'uniqueToEach':
                const onlyA = itemsA.filter(x => !setB.has(process(x)));
                const onlyB = itemsB.filter(x => !setA.has(process(x)));
                res = [...onlyA, ...onlyB];
                break;
            case 'duplicatesA':
                const seenA = new Set();
                const dupsA = new Set();
                itemsA.forEach(x => {
                    const p = process(x);
                    if (seenA.has(p)) dupsA.add(p);
                    seenA.add(p);
                });
                res = Array.from(dupsA) as string[];
                break;
            case 'uniqueA':
                const seenU = new Set();
                res = itemsA.filter(x => {
                    const p = process(x);
                    if (seenU.has(p)) return false;
                    seenU.add(p);
                    return true;
                });
                break;
            default: break;
        }

        setTimeout(() => {
            setResults(res);
            setActiveOperation(null);
        }, 150);
    };

    const handleClearAll = () => {
        if (confirm('Are you sure you want to clear all lists and results?')) {
            if (textareaARef.current) textareaARef.current.value = '';
            if (textareaBRef.current) textareaBRef.current.value = '';
            setResults([]);
            setCountA(0);
            setCountB(0);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'A' | 'B') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
            const flatData = data.flat().map(String).filter(s => s.trim().length > 0);
            const newText = flatData.join('\n');

            const ref = target === 'A' ? textareaARef : textareaBRef;
            if (ref.current) {
                ref.current.value = ref.current.value ? ref.current.value + '\n' + newText : newText;
                updateCounts();
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const handleSort = (target: 'A' | 'B', direction: 'asc' | 'desc') => {
        const ref = target === 'A' ? textareaARef : textareaBRef;
        if (!ref.current) return;
        const items = getArrayFromText(ref.current.value);
        const sorted = [...items].sort((a, b) => direction === 'asc' ? a.localeCompare(b) : b.localeCompare(a));
        ref.current.value = sorted.join('\n');
        updateCounts();
    };

    return (
        <div className="min-h-screen py-6 px-4 font-sans bg-[#f8fafc]">
            <div className="max-w-[1400px] mx-auto space-y-6">

                {/* Version Switcher Toolbar */}
                <div className="flex items-center justify-between">
                    <div className="w-10" /> {/* Spacer */}
                    <div className="bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-1">
                        <button
                            onClick={() => setVersion('basic')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${version === 'basic' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <Zap size={18} />
                            Basic Mode
                        </button>
                        <button
                            onClick={() => setVersion('advanced')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${version === 'advanced' ? 'bg-[#5c7cfa] text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <Sparkles size={18} />
                            Advanced Mode
                        </button>
                    </div>
                    <button
                        onClick={() => setShowHelp(!showHelp)}
                        className={`p-2.5 rounded-xl border transition-all ${showHelp ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-400 hover:text-indigo-600'}`}
                        title="Feature Guide"
                    >
                        <HelpCircle size={22} />
                    </button>
                </div>

                {/* Help Panel */}
                <AnimatePresence>
                    {showHelp && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-indigo-900 rounded-2xl overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-4">
                                    <h3 className="text-indigo-200 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                                        <Zap size={14} /> Core Operations
                                    </h3>
                                    <ul className="space-y-3">
                                        <HelpItem label="In A, Not B" text="Finds items present in List A but missing from List B." />
                                        <HelpItem label="Common Items" text="Finds items that exist in both lists." />
                                        <HelpItem label="Combine Unique" text="Merges both lists and removes all duplicates." />
                                        <HelpItem label="Unique to Each" text="Finds items that appear in only one of the lists." />
                                    </ul>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-indigo-200 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                                        <Sparkles size={14} /> Advanced Cleaning
                                    </h3>
                                    <ul className="space-y-3">
                                        <HelpItem label="Trim" text="Removes leading and trailing spaces from every line." />
                                        <HelpItem label="Clean" text="Deletes all empty or blank lines from the list." />
                                        <HelpItem label="Lower" text="Converts all text to lowercase for easier matching." />
                                        <HelpItem label="Unique" text="Removes duplicate items within the same list." />
                                    </ul>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-indigo-200 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                                        <Settings2 size={14} /> Power Tools
                                    </h3>
                                    <ul className="space-y-3">
                                        <HelpItem label="Case Sensitive" text="Toggle whether 'Apple' and 'apple' are different items." />
                                        <HelpItem label="Undo" text="Reverts the last cleaning operation performed on a list." />
                                        <HelpItem label="Remove B from A" text="Directly modifies List A by deleting items found in B." />
                                        <HelpItem label="Fuzzy Match" text="Identifies similar items with slight differences (Coming Soon)." />
                                    </ul>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Header Section */}
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                        Simulation Excel <span className="text-[#5c7cfa]">CMHW</span>
                    </h1>
                    <p className="text-gray-500 text-sm font-medium">
                        {version === 'basic' ? 'Compare and manage your lists with ease.' : 'Powerful data cleaning and advanced list analysis.'}
                    </p>
                </div>

                {/* Advanced Global Settings */}
                <AnimatePresence mode="wait">
                    {version === 'advanced' && (
                        <motion.div
                            key="advanced-settings"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm flex items-center justify-center gap-8"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Settings:</span>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-10 h-5 rounded-full transition-all relative ${caseSensitive ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                                        <input type="checkbox" className="hidden" checked={caseSensitive} onChange={() => setCaseSensitive(!caseSensitive)} />
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${caseSensitive ? 'left-6' : 'left-1'}`} />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">Case Sensitive</span>
                                </label>
                            </div>
                            <div className="h-4 w-px bg-gray-200" />
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Quick Clean:</span>
                                <button
                                    onClick={() => { cleanList('A', 'trim'); cleanList('B', 'trim'); }}
                                    className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-all"
                                    title="Trim All Whitespace: Removes spaces from start/end of all lines in both lists."
                                >
                                    <AlignLeft size={18} />
                                </button>
                                <button
                                    onClick={() => { cleanList('A', 'empty'); cleanList('B', 'empty'); }}
                                    className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-all"
                                    title="Remove Empty Lines: Deletes all blank lines from both lists."
                                >
                                    <Eraser size={18} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Interface Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px_1fr] gap-6 items-start">

                    {/* List A Container */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4 relative group">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-700 text-lg">List A</span>
                                {version === 'advanced' && historyA.length > 0 && (
                                    <button onClick={() => handleUndo('A')} className="p-1 text-indigo-400 hover:text-indigo-600 transition-colors" title="Undo Last Change">
                                        <RotateCcw size={16} />
                                    </button>
                                )}
                            </div>
                            <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-full">
                                {countA} items
                            </span>
                        </div>

                        {version === 'advanced' && (
                            <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-xl border border-gray-100">
                                <AdvancedToolButton icon={<AlignLeft size={14} />} label="Trim" onClick={() => cleanList('A', 'trim')} description="Remove leading/trailing spaces from List A." />
                                <AdvancedToolButton icon={<Eraser size={14} />} label="Clean" onClick={() => cleanList('A', 'empty')} description="Remove all empty lines from List A." />
                                <AdvancedToolButton icon={<Type size={14} />} label="Lower" onClick={() => cleanList('A', 'lower')} description="Convert all text in List A to lowercase." />
                                <AdvancedToolButton icon={<LayoutGrid size={14} />} label="Unique" onClick={() => cleanList('A', 'unique')} description="Remove duplicate items within List A." />
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <button onClick={() => handleSort('A', 'asc')} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors" title="Sort A-Z"><ArrowDownAZ size={18} /></button>
                            <button onClick={() => handleSort('A', 'desc')} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors" title="Sort Z-A"><ArrowUpAZ size={18} /></button>
                            <div className="flex-1 relative">
                                <input type="text" placeholder="Filter list..." className="w-full pl-3 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                            </div>
                            <button onClick={() => fileInputARef.current?.click()} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors" title="Upload File"><Upload size={20} /></button>
                            <input type="file" ref={fileInputARef} className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => handleFileUpload(e, 'A')} />
                        </div>

                        <textarea
                            ref={textareaARef}
                            onBlur={updateCounts}
                            className="w-full h-[450px] p-4 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 resize-none bg-white placeholder-gray-300 leading-relaxed"
                            placeholder="Paste your list here..."
                        />
                    </div>

                    {/* Middle Actions Column */}
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-3">
                            <ActionGridButton icon={<ArrowLeftRight size={18} />} label="In A, Not B" onClick={() => handleOperation('inANotB')} active={activeOperation === 'inANotB'} description="Find items that are in List A but missing from List B." />
                            <ActionGridButton icon={<ArrowLeftRight size={18} className="rotate-180" />} label="In B, Not A" onClick={() => handleOperation('inBNotA')} active={activeOperation === 'inBNotA'} description="Find items that are in List B but missing from List A." />
                            <ActionGridButton icon={<SquareMinus size={18} />} label="Remove B from A" onClick={() => handleOperation('removeBFromA')} active={activeOperation === 'removeBFromA'} description="Deletes all items from List A that also exist in List B." />
                            <ActionGridButton icon={<SquareMinus size={18} />} label="Remove A from B" onClick={() => handleOperation('removeAFromB')} active={activeOperation === 'removeAFromB'} description="Deletes all items from List B that also exist in List A." />
                            <ActionGridButton icon={<Users size={18} />} label="Common Items" onClick={() => handleOperation('common')} active={activeOperation === 'common'} description="Find items that exist in both List A and List B." />
                            <ActionGridButton icon={<Combine size={18} />} label="Combine Unique" onClick={() => handleOperation('combineUnique')} active={activeOperation === 'combineUnique'} description="Merge both lists into one, removing all duplicates." />
                            <ActionGridButton icon={<Split size={18} />} label="Unique to Each" onClick={() => handleOperation('uniqueToEach')} active={activeOperation === 'uniqueToEach'} description="Find items that appear in only one list (not both)." />
                            <ActionGridButton icon={<Copy size={18} />} label="Duplicates in A" onClick={() => handleOperation('duplicatesA')} active={activeOperation === 'duplicatesA'} description="Show only the items that appear more than once in List A." />
                            <ActionGridButton icon={<Filter size={18} />} label="Unique Items in A" onClick={() => handleOperation('uniqueA')} active={activeOperation === 'uniqueA'} description="Remove duplicates from List A and show the clean list." />
                            <div className="col-span-1">
                                <ActionGridButton icon={<Trash2 size={18} />} label="Clear All" onClick={handleClearAll} active={false} description="Wipe all lists and results to start fresh." />
                            </div>
                        </div>

                        {version === 'advanced' && (
                            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-3">
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Advanced Tools</span>
                                <button className="w-full py-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2 group/fuzzy">
                                    <Wand2 size={14} />
                                    Fuzzy Match (Soon)
                                    <div className="absolute left-full ml-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover/fuzzy:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
                                        Matches items with slight differences (typos, extra dots, etc.).
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* List B Container */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4 relative group">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-700 text-lg">List B</span>
                                {version === 'advanced' && historyB.length > 0 && (
                                    <button onClick={() => handleUndo('B')} className="p-1 text-indigo-400 hover:text-indigo-600 transition-colors" title="Undo Last Change">
                                        <RotateCcw size={16} />
                                    </button>
                                )}
                            </div>
                            <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-full">
                                {countB} items
                            </span>
                        </div>

                        {version === 'advanced' && (
                            <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-xl border border-gray-100">
                                <AdvancedToolButton icon={<AlignLeft size={14} />} label="Trim" onClick={() => cleanList('B', 'trim')} description="Remove leading/trailing spaces from List B." />
                                <AdvancedToolButton icon={<Eraser size={14} />} label="Clean" onClick={() => cleanList('B', 'empty')} description="Remove all empty lines from List B." />
                                <AdvancedToolButton icon={<Type size={14} />} label="Lower" onClick={() => cleanList('B', 'lower')} description="Convert all text in List B to lowercase." />
                                <AdvancedToolButton icon={<LayoutGrid size={14} />} label="Unique" onClick={() => cleanList('B', 'unique')} description="Remove duplicate items within List B." />
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <button onClick={() => handleSort('B', 'asc')} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors" title="Sort A-Z"><ArrowDownAZ size={18} /></button>
                            <button onClick={() => handleSort('B', 'desc')} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors" title="Sort Z-A"><ArrowUpAZ size={18} /></button>
                            <div className="flex-1 relative">
                                <input type="text" placeholder="Filter list..." className="w-full pl-3 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                            </div>
                            <button onClick={() => fileInputBRef.current?.click()} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors" title="Upload File"><Upload size={20} /></button>
                            <input type="file" ref={fileInputBRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => handleFileUpload(e, 'B')} />
                        </div>

                        <textarea
                            ref={textareaBRef}
                            onBlur={updateCounts}
                            className="w-full h-[450px] p-4 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 resize-none bg-white placeholder-gray-300 leading-relaxed"
                            placeholder="Paste your list here..."
                        />
                    </div>
                </div>

                {/* Results Section */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-gray-700">Results</span>
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full border border-indigo-100">
                                {results.length} items
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(results.join('\n')); setIsCopying(true); setTimeout(() => setIsCopying(false), 2000); }} leftIcon={isCopying ? <Check size={14} /> : <Copy size={14} />} className={`h-8 text-xs ${isCopying ? 'text-green-600 border-green-200 bg-green-50' : 'text-indigo-600 border-indigo-100 hover:bg-indigo-50'}`}>
                                {isCopying ? 'Copied!' : 'Copy'}
                            </Button>
                            <Button size="sm" variant="primary" onClick={() => { const ws = XLSX.utils.aoa_to_sheet(results.map(r => [r])); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Results"); XLSX.writeFile(wb, "simulation_results.xlsx"); }} leftIcon={<Download size={14} />} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700">
                                Export
                            </Button>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="w-full h-[350px] border border-gray-100 rounded-xl bg-white overflow-hidden">
                            {results.length > 0 ? (
                                <Virtuoso
                                    style={{ height: '350px' }}
                                    totalCount={results.length}
                                    itemContent={(index) => (
                                        <div className="px-4 py-1.5 text-sm font-mono text-gray-600 border-b border-gray-50 hover:bg-gray-50 flex items-center gap-3">
                                            <span className="text-[10px] text-gray-300 w-8">{index + 1}</span>
                                            {results[index]}
                                        </div>
                                    )}
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-3">
                                    <ZapOff size={32} className="opacity-20" />
                                    <span className="text-sm font-medium">Results will be displayed here</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const HelpItem = ({ label, text }: { label: string, text: string }) => (
    <li className="flex flex-col gap-0.5">
        <span className="text-[10px] font-black text-white uppercase tracking-wider">{label}</span>
        <span className="text-[11px] text-indigo-200 leading-relaxed">{text}</span>
    </li>
);

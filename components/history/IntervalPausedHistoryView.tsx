import React, { useState, useEffect, useMemo } from 'react';
import { service } from '../../services';
import { Entity, ParentCategory, MethodType } from '../../types';
import { ChangeHistoryEntry } from './ChangeHistory';
import {
    Clock, Filter, User, Layers, Calendar, X, Timer,
    ChevronRight, Hash, BarChart3, Activity, AlertCircle,
    CheckCircle2, ArrowUpRight, Search, LayoutGrid, List
} from 'lucide-react';
import { getMethodConfig } from '../../config/methods';

interface IntervalPausedHistoryViewProps {
    initialHistory: ChangeHistoryEntry[];
    isAdmin?: boolean;
}

export const IntervalPausedHistoryView: React.FC<IntervalPausedHistoryViewProps> = ({ initialHistory, isAdmin }) => {
    const [entities, setEntities] = useState<Entity[]>([]);
    const [selectedEntityId, setSelectedEntityId] = useState<string>('');
    const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [startDate, setStartDate] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30); // Default to 30 days
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<any[]>(initialHistory);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        const fetchEntities = async () => {
            try {
                const data = await service.getEntities();
                setEntities(data);
            } catch (error) {
                console.error('Failed to fetch entities:', error);
            }
        };
        fetchEntities();
    }, []);

    const selectedEntity = useMemo(() =>
        entities.find(e => e.id === selectedEntityId),
        [entities, selectedEntityId]);

    const availableMethods = useMemo(() => {
        if (!selectedEntity) return ['desktop', 'webautomate', 'mobile', 'api'];
        return selectedEntity.enabledMethods || ['desktop'];
    }, [selectedEntity]);

    const availableCategories = useMemo(() => {
        if (!selectedEntity) return [];
        const categories: ParentCategory[] = [];
        const methodsToProcess = selectedMethods.length > 0 ? selectedMethods : availableMethods;

        methodsToProcess.forEach(methodId => {
            const methodData = selectedEntity.methodsData?.[methodId as MethodType];
            if (methodData?.parentCategories) {
                categories.push(...methodData.parentCategories);
            } else if (methodId.toLowerCase() === 'desktop' && selectedEntity.reporting?.parentCategories) {
                categories.push(...selectedEntity.reporting.parentCategories);
            }
        });
        return Array.from(new Map(categories.map(c => [c.id, c])).values());
    }, [selectedEntity, selectedMethods, availableMethods]);

    useEffect(() => {
        const fetchFilteredHistory = async () => {
            setLoading(true);
            try {
                const data = await service.getIntervalPauseHistory({
                    entityId: selectedEntityId || undefined,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                    limit: 10000
                });

                // Deduplicate history entries (same event might be in both legacy and new tables)
                const seenEntries = new Set<string>();
                const uniqueHistory = data.filter((entry: any) => {
                    if (!entry) return false;

                    // Create a unique key based on the actual event data
                    // We use an approximate timestamp (rounding to nearest 2 seconds) to catch simultaneous logs
                    const timeKey = Math.round(new Date(entry.createdAt).getTime() / 2000);
                    const key = `${entry.entityId}-${entry.profileName}-${entry.interval}-${entry.pauseType}-${entry.action}-${timeKey}`;

                    if (seenEntries.has(key)) return false;
                    seenEntries.add(key);
                    return true;
                });

                let filtered = uniqueHistory;

                if (selectedMethods.length > 0) {
                    filtered = filtered.filter(h =>
                        h.methodId && selectedMethods.some(m => m.toLowerCase() === h.methodId.toLowerCase())
                    );
                }

                if (selectedCategories.length > 0) {
                    filtered = filtered.filter(h => h.categoryId && selectedCategories.includes(h.categoryId));
                }

                setHistory(filtered);
            } catch (error) {
                console.error('Failed to fetch filtered history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchFilteredHistory();
    }, [selectedEntityId, selectedMethods, selectedCategories, startDate, endDate]);

    const stats = useMemo(() => {
        const total = history.length;
        const pauses = history.filter(h => h.action === 'PAUSE').length;
        const unpauses = history.filter(h => h.action === 'UNPAUSE').length;
        const uniqueEntities = new Set(history.map(h => h.entityId)).size;
        return { total, pauses, unpauses, uniqueEntities };
    }, [history]);

    const parseEntryDetails = (entry: any) => {
        const sessionName = entry.profileName || 'Unknown Session';
        const createdDate = new Date(entry.createdAt);
        const now = new Date();

        const isToday = createdDate.toDateString() === now.toDateString();
        const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === createdDate.toDateString();

        // Reset now for further calculations if needed
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - createdDate.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        let duration = `${diffDays}d ago`;
        if (isToday) duration = 'Today';
        else if (isYesterday) duration = 'Yesterday';
        else if (diffDays === 0) duration = '1d ago'; // Handle edge case where it's not today but < 24h

        return { sessionName, duration };
    };

    const formatEntityId = (id: string | null) => {
        if (!id) return '-';
        return id.replace(/^ent_/, '').toUpperCase();
    };

    const groupedHistory = useMemo(() => {
        const groups: Record<string, Record<string, Record<string, any[]>>> = {};
        history.forEach(entry => {
            if (!entry || !entry.createdAt) return;
            const date = new Date(entry.createdAt).toLocaleDateString('en-GB');
            const category = entry.categoryName || 'General';
            const pauseType = entry.pauseType || 'Update';
            const interval = entry.interval || 'NO';
            const groupKey = `${pauseType}|${interval}`;

            if (!groups[date]) groups[date] = {};
            if (!groups[date][category]) groups[date][category] = {};
            if (!groups[date][category][groupKey]) groups[date][category][groupKey] = [];
            groups[date][category][groupKey].push(entry);
        });
        return groups;
    }, [history]);

    const sortedDates = useMemo(() => {
        return Object.entries(groupedHistory).sort((a, b) => {
            const dateA = a[0].split('/').reverse().join('-');
            const dateB = b[0].split('/').reverse().join('-');
            return dateB.localeCompare(dateA);
        });
    }, [groupedHistory]);

    const getPauseTypeStyles = (type: string) => {
        switch (type.toLowerCase()) {
            case 'quality': return 'bg-amber-50 text-amber-600 border-amber-100 ring-amber-500/10';
            case 'toxic': return 'bg-rose-50 text-rose-600 border-rose-100 ring-rose-500/10';
            case 'search': return 'bg-sky-50 text-sky-600 border-sky-100 ring-sky-500/10';
            default: return 'bg-slate-50 text-slate-600 border-slate-100 ring-slate-500/10';
        }
    };

    const [selectedBatch, setSelectedBatch] = useState<any[] | null>(null);

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Batch Details Modal */}
            {selectedBatch && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setSelectedBatch(null)}></div>
                    <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
                        <div className="bg-slate-900 p-8 text-white relative">
                            <button
                                onClick={() => setSelectedBatch(null)}
                                className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-xl transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/20">
                                    <Activity size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight">Batch Audit Details</h3>
                                    <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest">ID: {selectedBatch[0]?.batchId || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mt-8">
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                    <p className="text-[10px] font-black text-indigo-300 uppercase mb-1">Performed By</p>
                                    <p className="text-sm font-bold flex items-center gap-2">
                                        <User size={14} className="text-indigo-400" /> {selectedBatch[0]?.username}
                                    </p>
                                </div>
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                    <p className="text-[10px] font-black text-indigo-300 uppercase mb-1">Timestamp</p>
                                    <p className="text-sm font-bold flex items-center gap-2">
                                        <Clock size={14} className="text-indigo-400" /> {new Date(selectedBatch[0]?.createdAt).toLocaleString()}
                                    </p>
                                </div>
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                    <p className="text-[10px] font-black text-indigo-300 uppercase mb-1">Total Impact</p>
                                    <p className="text-sm font-bold flex items-center gap-2">
                                        <Hash size={14} className="text-indigo-400" /> {selectedBatch.length} Sessions
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <List size={16} className="text-indigo-600" /> Affected Sessions
                                </h4>
                                <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase border ${getPauseTypeStyles(selectedBatch[0]?.pauseType || 'Update')}`}>
                                    {selectedBatch[0]?.pauseType} → {selectedBatch[0]?.interval}
                                </div>
                            </div>

                            <div className="max-h-[40vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                                <div className="grid grid-cols-1 gap-2">
                                    {selectedBatch.map((entry, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                                                    <Hash size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800">{entry.profileName}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{entry.categoryName}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-indigo-600 uppercase">{entry.methodId || 'Desktop'}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">{formatEntityId(entry.entityId)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedBatch(null)}
                                className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-200"
                            >
                                Close Audit View
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Premium Filter Bar */}
            <div className="bg-white/80 backdrop-blur-md sticky top-4 z-30 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-3 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                    <div className="relative flex-1">
                        <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                            value={selectedEntityId}
                            onChange={(e) => {
                                setSelectedEntityId(e.target.value);
                                setSelectedMethods([]);
                                setSelectedCategories([]);
                            }}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer"
                        >
                            <option value="">All Entities (Global View)</option>
                            {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                        {availableMethods.map(m => {
                            const isSelected = selectedMethods.includes(m.toLowerCase());
                            return (
                                <button
                                    key={m}
                                    onClick={() => setSelectedMethods(prev =>
                                        prev.includes(m.toLowerCase()) ? prev.filter(x => x !== m.toLowerCase()) : [...prev, m.toLowerCase()]
                                    )}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${isSelected ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                >
                                    {m}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                        <Calendar size={14} className="text-slate-400" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent border-none text-xs font-bold text-slate-600 focus:ring-0 outline-none w-28"
                        />
                        <span className="text-slate-300 font-bold">→</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent border-none text-xs font-bold text-slate-600 focus:ring-0 outline-none w-28"
                        />
                    </div>

                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                        >
                            <List size={16} />
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            setStartDate('');
                            setEndDate('');
                            setSelectedEntityId('');
                            setSelectedMethods([]);
                            setSelectedCategories([]);
                        }}
                        className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                        title="Reset All Filters"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div className="space-y-10">
                {loading ? (
                    <div className="py-32 text-center">
                        <div className="relative w-16 h-16 mx-auto mb-6">
                            <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                        </div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Synchronizing Database...</p>
                    </div>
                ) : sortedDates.length === 0 ? (
                    <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-24 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Search size={40} className="text-slate-200" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">No History Found</h3>
                        <p className="text-slate-500 font-medium max-w-xs mx-auto">Try adjusting your filters or expanding the date range to find what you're looking for.</p>
                    </div>
                ) : (
                    sortedDates.map(([date, categories]) => (
                        <div key={date} className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="px-5 py-2 bg-slate-900 text-white rounded-2xl text-xs font-black tracking-[0.2em] shadow-lg shadow-slate-200">
                                    {date}
                                </div>
                                <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
                            </div>

                            {Object.entries(categories as Record<string, Record<string, any[]>>).map(([category, typeGroups]) => (
                                <div key={category} className="space-y-4">
                                    <div className="flex items-center gap-3 px-2">
                                        <div className="w-1.5 h-5 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{category}</h4>
                                    </div>

                                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" : "space-y-4"}>
                                        {Object.entries(typeGroups as Record<string, any[]>).map(([groupKey, entries]) => {
                                            const [pauseType, interval] = groupKey.split('|');
                                            return (
                                                <div key={groupKey} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-500 group/card">
                                                    <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase border ring-4 ${getPauseTypeStyles(pauseType)}`}>
                                                                {pauseType}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Interval</span>
                                                                <span className="text-lg font-black text-indigo-600 leading-none tracking-tight">{interval}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="block text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Impact</span>
                                                            <span className="text-sm font-black text-slate-700 leading-none">{entries.length} Sessions</span>
                                                        </div>
                                                    </div>

                                                    <div className="p-3 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                                                        <div className="space-y-1">
                                                            {entries.map((entry) => {
                                                                const { sessionName, duration } = parseEntryDetails(entry);
                                                                return (
                                                                    <div key={entry.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-all group/row">
                                                                        <div className="flex items-center gap-3 min-w-0">
                                                                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover/row:bg-indigo-50 group-hover/row:text-indigo-500 transition-colors">
                                                                                <Hash size={14} />
                                                                            </div>
                                                                            <div className="flex flex-col min-w-0">
                                                                                <span className="text-xs font-black text-slate-700 truncate group-hover/row:text-indigo-600 transition-colors">{sessionName}</span>
                                                                                <span className="text-[9px] font-bold text-slate-400 uppercase">{entry.methodId || 'Desktop'}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="flex flex-col items-end">
                                                                                <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider">{duration}</span>
                                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                                    <User size={10} className="text-slate-300" />
                                                                                    <span className="text-[9px] font-bold text-slate-400">{entry.username}</span>
                                                                                </div>
                                                                            </div>
                                                                            <ChevronRight size={14} className="text-slate-200 group-hover/row:translate-x-1 transition-transform" />
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    <div className="px-6 py-3 bg-slate-50/30 border-t border-slate-100 flex items-center justify-between">
                                                        <button
                                                            onClick={() => setSelectedBatch(entries)}
                                                            className="text-[10px] font-black text-slate-400 uppercase hover:text-indigo-600 transition-colors"
                                                        >
                                                            Batch ID: {entries[0]?.batchId?.substring(0, 8) || 'N/A'}
                                                        </button>
                                                        <button
                                                            onClick={() => setSelectedBatch(entries)}
                                                            className="text-[10px] font-black text-indigo-600 uppercase hover:underline flex items-center gap-1"
                                                        >
                                                            Details <ArrowUpRight size={10} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

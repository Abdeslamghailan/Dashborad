import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Filter, Search, X, Trash2, Plus, Edit3, Layers, User as UserIcon, Calendar, Activity, Hash, LayoutGrid, List, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Entity } from '../types';
import { service } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { ChangeHistoryEntry } from './history/ChangeHistory';
import { HistoryTable } from './history/HistoryTable';
import { IntervalPausedHistoryView } from './history/IntervalPausedHistoryView';

export const HistoryPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'audit' | 'interval'>('audit');
    const [history, setHistory] = useState<ChangeHistoryEntry[]>([]);
    const [intervalHistory, setIntervalHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [entities, setEntities] = useState<Entity[]>([]);
    const [showFilters, setShowFilters] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Filter states
    const [entityIdFilter, setEntityIdFilter] = useState('');
    const [entityTypeFilter, setEntityTypeFilter] = useState('');
    const [usernameFilter, setUsernameFilter] = useState('');
    const [changeTypeFilter, setChangeTypeFilter] = useState('');
    const [methodIdFilter, setMethodIdFilter] = useState('');
    const [categoryIdFilter, setCategoryIdFilter] = useState('');
    const [fieldChangedFilter, setFieldChangedFilter] = useState('');
    const [startDateFilter, setStartDateFilter] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30); // Default to 30 days
        return d.toISOString().split('T')[0];
    });
    const [endDateFilter, setEndDateFilter] = useState(() => new Date().toISOString().split('T')[0]);

    // Redirect non-admins/mailers and fetch entities
    useEffect(() => {
        if (user?.role !== 'ADMIN' && user?.role !== 'MAILER') {
            navigate('/');
            return;
        }

        const fetchEntities = async () => {
            try {
                const data = await service.getEntities();
                setEntities(data);
            } catch (error) {
                console.error('Failed to fetch entities:', error);
            }
        };
        fetchEntities();
    }, [user, navigate]);

    useEffect(() => {
        if (activeTab === 'audit') {
            fetchHistory();
        } else {
            fetchIntervalHistory();
        }
    }, [
        activeTab,
        entityIdFilter,
        entityTypeFilter,
        usernameFilter,
        changeTypeFilter,
        methodIdFilter,
        categoryIdFilter,
        fieldChangedFilter,
        startDateFilter,
        endDateFilter
    ]);

    const fetchIntervalHistory = async () => {
        try {
            setLoading(true);
            const data = await service.getIntervalPauseHistory({
                entityId: entityIdFilter || undefined,
                startDate: startDateFilter || undefined,
                endDate: endDateFilter || undefined,
                limit: 10000
            });
            setIntervalHistory(data);
        } catch (error) {
            console.error('Failed to fetch interval history:', error);
            setIntervalHistory([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            setLoading(true);

            // Base filters
            const formattedEntityId = entityIdFilter && !entityIdFilter.startsWith('ent_')
                ? `ent_${entityIdFilter.toLowerCase()}`
                : entityIdFilter;

            const filters: any = {
                entityId: formattedEntityId || undefined,
                entityType: entityTypeFilter || undefined,
                username: usernameFilter || undefined,
                changeType: changeTypeFilter || undefined,
                methodId: methodIdFilter || undefined,
                categoryId: categoryIdFilter || undefined,
                fieldChanged: fieldChangedFilter || undefined,
                startDate: startDateFilter || undefined,
                endDate: endDateFilter || undefined,
                limit: 10000
            };

            const data = await service.getAllHistory(filters);
            setHistory(data);
        } catch (error) {
            console.error('Failed to fetch history:', error);
            setHistory([]);
        } finally {
            setLoading(false);
        }
    };

    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteClick = (id: number) => {
        setDeleteId(id);
        setShowDeleteConfirm(true);
    };

    const handleDeleteAllClick = () => {
        setDeleteId(-1); // -1 indicates delete all
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (deleteId === null || user?.role !== 'ADMIN') return;

        try {
            setIsDeleting(true);
            if (deleteId === -1) {
                await service.deleteAllHistory();
            } else {
                await service.deleteHistoryEntry(deleteId);
            }
            await fetchHistory();
            setShowDeleteConfirm(false);
            setDeleteId(null);
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete history');
        } finally {
            setIsDeleting(false);
        }
    };

    const getEntityDisplayName = (id: string | null, entries: ChangeHistoryEntry[]) => {
        if (!id) return '-';

        // 0. Primary source: Check the entities list that we already have
        const knownEntity = entities.find(e => e.id === id);
        if (knownEntity) return knownEntity.name;

        // Check if it's a UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        if (isUuid || id.startsWith('ent_')) {
            // 1. Try to find name in descriptions
            const patterns = [/for "([^"]+)"/, /script "([^"]+)"/, /scenario "([^"]+)"/, /"([^"]+)"/];
            for (const entry of entries) {
                for (const pattern of patterns) {
                    const match = entry.description.match(pattern);
                    if (match && match[1]) return match[1];
                }
            }

            // 2. Try to find name in categoryName or profileName
            for (const entry of entries) {
                if (entry.categoryName) return entry.categoryName;
                if (entry.profileName) return entry.profileName;
            }

            // 3. Try to parse JSON for 'name' or 'profileName'
            for (const entry of entries) {
                try {
                    const data = JSON.parse(entry.newValue || entry.oldValue || '{}');
                    if (data.name) return data.name;
                    if (data.profileName) return data.profileName;
                } catch (e) { }
            }
        }

        return id.replace(/^ent_/, '').toUpperCase();
    };

    const clearFilters = () => {
        setEntityIdFilter('');
        setEntityTypeFilter('');
        setUsernameFilter('');
        setChangeTypeFilter('');
        setMethodIdFilter('');
        setCategoryIdFilter('');
        setFieldChangedFilter('');
        setStartDateFilter('');
        setEndDateFilter('');
    };

    if (user?.role !== 'ADMIN' && user?.role !== 'MAILER') {
        return null;
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-20 px-4">
            {/* Dynamic Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pt-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
                            {activeTab === 'audit' ? <Clock size={24} className="text-white" /> : <Activity size={24} className="text-white" />}
                        </div>
                        {activeTab === 'audit' ? 'Audit Log & History' : 'Interval Audit Log'}
                    </h1>
                    <p className="text-slate-500 font-medium text-sm ml-14">
                        {activeTab === 'audit'
                            ? 'Track all system changes and user actions across the platform.'
                            : 'Track and analyze session pause events across all entities.'}
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:w-auto w-full">
                    {activeTab === 'audit' ? (
                        [
                            { label: 'Total Changes', value: history.length, icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                            { label: 'Creates', value: history.filter(h => h.changeType?.toLowerCase() === 'create').length, icon: Plus, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Updates', value: history.filter(h => h.changeType?.toLowerCase() === 'update').length, icon: Edit3, color: 'text-blue-600', bg: 'bg-blue-50' },
                            { label: 'Deletes', value: history.filter(h => h.changeType?.toLowerCase() === 'delete').length, icon: Trash2, color: 'text-rose-600', bg: 'bg-rose-50' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex items-center gap-3 hover:border-indigo-200 transition-all group">
                                <div className={`p-2 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                                    <stat.icon size={16} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">{stat.label}</p>
                                    <p className="text-lg font-black text-slate-800 leading-none">{stat.value}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        [
                            { label: 'Total Events', value: intervalHistory.length, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                            { label: 'Pauses', value: intervalHistory.filter(h => h.action === 'PAUSE').length, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
                            { label: 'Unpauses', value: intervalHistory.filter(h => h.action === 'UNPAUSE').length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Entities', value: new Set(intervalHistory.map(h => h.entityId)).size, icon: Layers, color: 'text-amber-600', bg: 'bg-amber-50' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex items-center gap-3 hover:border-indigo-200 transition-all group">
                                <div className={`p-2 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                                    <stat.icon size={16} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">{stat.label}</p>
                                    <p className="text-lg font-black text-slate-800 leading-none">{stat.value}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between gap-4">
                <div className="p-1 bg-slate-100 rounded-[1.25rem] border border-slate-200 flex items-center gap-1">
                    <button
                        onClick={() => setActiveTab('audit')}
                        className={`flex items-center gap-2 px-6 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${activeTab === 'audit'
                            ? 'bg-white text-indigo-600 shadow-md shadow-indigo-100'
                            : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <List size={14} />
                        Audit Log & History
                    </button>
                    <button
                        onClick={() => setActiveTab('interval')}
                        className={`flex items-center gap-2 px-6 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${activeTab === 'interval'
                            ? 'bg-white text-indigo-600 shadow-md shadow-indigo-100'
                            : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <Activity size={14} />
                        Interval History
                    </button>
                </div>

                <div className="flex items-center gap-3">
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

                    <div className="flex gap-2">
                        {activeTab === 'audit' && (
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-xs font-black uppercase tracking-widest border ${showFilters
                                    ? 'bg-slate-100 text-slate-700 border-slate-200'
                                    : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                                    }`}
                            >
                                <Filter size={16} />
                                {showFilters ? 'Hide Filters' : 'Show Filters'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {activeTab === 'audit' ? (
                <>
                    {/* Filters Section */}
                    {showFilters && (
                        <div className="bg-white/80 backdrop-blur-md sticky top-4 z-30 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 p-6 animate-in slide-in-from-top-4 duration-500">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entity Name</label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            value={entityIdFilter}
                                            onChange={(e) => setEntityIdFilter(e.target.value)}
                                            placeholder="e.g., CMH1"
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Change Type</label>
                                    <div className="relative">
                                        <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <select
                                            value={changeTypeFilter}
                                            onChange={(e) => setChangeTypeFilter(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="">All Changes</option>
                                            <option value="create">Create</option>
                                            <option value="update">Update</option>
                                            <option value="delete">Delete</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                                    <div className="relative">
                                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            value={usernameFilter}
                                            onChange={(e) => setUsernameFilter(e.target.value)}
                                            placeholder="Search user..."
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entity Type</label>
                                    <div className="relative">
                                        <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <select
                                            value={entityTypeFilter}
                                            onChange={(e) => setEntityTypeFilter(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="">All Types</option>
                                            <option value="DayPlan">Day Plan</option>
                                            <option value="PlanningAssignment">Planning</option>
                                            <option value="Entity">Entity Config</option>
                                            <option value="ProxyServer">Proxy</option>
                                            <option value="Mailer">Mailer</option>
                                            <option value="Team">Team</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Method ID</label>
                                    <div className="relative">
                                        <LayoutGrid className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            value={methodIdFilter}
                                            onChange={(e) => setMethodIdFilter(e.target.value)}
                                            placeholder="e.g., desktop"
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Field Changed</label>
                                    <div className="relative">
                                        <Edit3 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            value={fieldChangedFilter}
                                            onChange={(e) => setFieldChangedFilter(e.target.value)}
                                            placeholder="e.g., step, start"
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                type="date"
                                                value={startDateFilter}
                                                onChange={(e) => setStartDateFilter(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                type="date"
                                                value={endDateFilter}
                                                onChange={(e) => setEndDateFilter(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-100">
                                <button
                                    onClick={() => {
                                        clearFilters();
                                        setTimeout(fetchHistory, 100);
                                    }}
                                    className="flex items-center gap-2 px-8 py-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all text-xs font-black uppercase tracking-widest"
                                >
                                    <X size={16} />
                                    Reset
                                </button>

                                {user?.role === 'ADMIN' && (
                                    <button
                                        onClick={handleDeleteAllClick}
                                        className="flex items-center gap-2 px-8 py-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-all text-xs font-black uppercase tracking-widest border border-rose-100"
                                    >
                                        <Trash2 size={16} />
                                        Clear All History
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Content Section */}
                    <div className="space-y-10">
                        {loading ? (
                            <div className="py-32 text-center">
                                <div className="relative w-16 h-16 mx-auto mb-6">
                                    <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                                </div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Synchronizing Database...</p>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-24 text-center">
                                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                    <Search size={40} className="text-slate-200" />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 mb-2">No History Found</h3>
                                <p className="text-slate-500 font-medium max-w-xs mx-auto">Try adjusting your filters or expanding the date range to find what you're looking for.</p>
                            </div>
                        ) : viewMode === 'list' ? (
                            <div className="animate-in fade-in duration-500">
                                <HistoryTable
                                    history={history}
                                    entities={entities}
                                    onDelete={user?.role === 'ADMIN' ? handleDeleteClick : undefined}
                                    isAdmin={user?.role === 'ADMIN'}
                                />
                            </div>
                        ) : (
                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {Object.entries(
                                    history.reduce((groups, entry) => {
                                        const date = new Date(entry.createdAt).toLocaleDateString('en-GB');
                                        if (!groups[date]) groups[date] = {};
                                        const category = entry.categoryName || entry.entityType || 'General';
                                        if (!groups[date][category]) groups[date][category] = [];
                                        groups[date][category].push(entry);
                                        return groups;
                                    }, {} as Record<string, Record<string, ChangeHistoryEntry[]>>)
                                ).sort((a, b) => b[0].split('/').reverse().join('-').localeCompare(a[0].split('/').reverse().join('-'))).map(([date, categories]) => (
                                    <div key={date} className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="px-5 py-2 bg-slate-900 text-white rounded-2xl text-xs font-black tracking-[0.2em] shadow-lg shadow-slate-200">
                                                {date}
                                            </div>
                                            <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
                                        </div>

                                        {Object.entries(categories).map(([category, entries]) => (
                                            <div key={category} className="space-y-4">
                                                <div className="flex items-center gap-3 px-2">
                                                    <div className="w-1.5 h-5 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{category}</h4>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                                    {/* Group entries by entityId within the category for cleaner cards */}
                                                    {Object.entries(
                                                        (entries as ChangeHistoryEntry[]).reduce((groups, entry) => {
                                                            const key = entry.entityId || 'Global';
                                                            if (!groups[key]) groups[key] = [];
                                                            groups[key].push(entry);
                                                            return groups;
                                                        }, {} as Record<string, ChangeHistoryEntry[]>)
                                                    ).map(([entityId, entityEntries]) => (
                                                        <div key={entityId} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-500 group/card">
                                                            <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-2 bg-white rounded-xl border border-slate-200 text-indigo-600 shadow-sm">
                                                                        <Hash size={16} />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Entity Name</span>
                                                                        <span className="text-sm font-black text-slate-700 leading-none tracking-tight">{getEntityDisplayName(entityId, entityEntries as ChangeHistoryEntry[])}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="block text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Changes</span>
                                                                    <span className="text-sm font-black text-indigo-600 leading-none">{(entityEntries as ChangeHistoryEntry[]).length}</span>
                                                                </div>
                                                            </div>

                                                            <div className="p-3 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                                                                <div className="space-y-1">
                                                                    {(entityEntries as ChangeHistoryEntry[]).map((entry) => (
                                                                        <div key={entry.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-all group/row">
                                                                            <div className="flex items-center gap-3 min-w-0">
                                                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${entry.changeType === 'create' ? 'bg-emerald-50 text-emerald-600' : entry.changeType === 'delete' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-400 group-hover/row:bg-indigo-50 group-hover/row:text-indigo-500'}`}>
                                                                                    {entry.changeType === 'create' ? <Plus size={14} /> : entry.changeType === 'delete' ? <Trash2 size={14} /> : <Edit3 size={14} />}
                                                                                </div>
                                                                                <div className="flex flex-col min-w-0">
                                                                                    <span className="text-xs font-black text-slate-700 truncate group-hover/row:text-indigo-600 transition-colors">
                                                                                        {entry.fieldChanged ? entry.fieldChanged.replace(/([A-Z])/g, ' $1').trim() : entry.changeType}
                                                                                    </span>
                                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{entry.methodId || entry.entityType}</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-4">
                                                                                <div className="flex flex-col items-end">
                                                                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">
                                                                                        {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                                    </span>
                                                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                                                        <UserIcon size={10} className="text-slate-300" />
                                                                                        <span className="text-[9px] font-bold text-slate-400">{entry.username}</span>
                                                                                    </div>
                                                                                </div>
                                                                                {user?.role === 'ADMIN' && (
                                                                                    <button
                                                                                        onClick={() => handleDeleteClick(entry.id)}
                                                                                        className="p-1 text-slate-200 hover:text-rose-500 transition-colors"
                                                                                    >
                                                                                        <Trash2 size={12} />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div className="px-6 py-3 bg-slate-50/30 border-t border-slate-100 flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <Activity size={12} className="text-slate-400" />
                                                                    <span className="text-[10px] font-black text-slate-400 uppercase">Audit Record</span>
                                                                </div>
                                                                <div className="text-[10px] font-black text-indigo-600 uppercase">
                                                                    {entityEntries[0]?.entityType}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <IntervalPausedHistoryView initialHistory={intervalHistory} isAdmin={user?.role === 'ADMIN'} />
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {deleteId === -1 ? 'Clear All History?' : 'Delete Entry?'}
                        </h3>
                        <p className="text-gray-500 text-sm leading-relaxed mb-6">
                            {deleteId === -1
                                ? 'This will permanently erase all audit logs. This action cannot be undone.'
                                : 'Are you sure you want to delete this specific audit log? This action cannot be undone.'}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setDeleteId(null);
                                }}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all font-medium text-sm"
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-bold text-sm flex items-center gap-2"
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

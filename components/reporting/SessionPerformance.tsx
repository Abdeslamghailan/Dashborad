import React, { useState, useMemo } from 'react';
import { Activity, ChevronDown, Users, TrendingDown, TrendingUp, BarChart3, Layers, Search } from 'lucide-react';

interface Session {
    id: string;
    entity: string;
    inbox: number;
    spam: number;
    total?: number;
    profilesCount: number[];
    spamPct: number;
}

interface SessionPerformanceProps {
    sessions: Session[];
    stats: {
        totalProfiles: number;
        minSpam: number;
        maxSpam: number;
        avgSpam: string | number;
    };
}

export const SessionPerformance: React.FC<SessionPerformanceProps> = ({ sessions, stats }) => {
    const [selectedEntity, setSelectedEntity] = useState<string>('all');

    // Get unique entities from sessions
    const entities = useMemo(() => {
        const uniqueEntities = Array.from(new Set(sessions.map(s => s.entity))).sort();
        return ['all', ...uniqueEntities];
    }, [sessions]);

    // Filter sessions based on selected entity
    const filteredSessions = useMemo(() => {
        if (selectedEntity === 'all') return sessions;
        return sessions.filter(s => s.entity === selectedEntity);
    }, [sessions, selectedEntity]);

    // Calculate filtered stats
    const filteredStats = useMemo(() => {
        if (selectedEntity === 'all') return stats;

        const entitySessions = sessions.filter(s => s.entity === selectedEntity);
        const spamCounts = entitySessions.map(s => s.spam);

        return {
            totalProfiles: new Set(entitySessions.flatMap(s => s.profilesCount)).size,
            minSpam: spamCounts.length > 0 ? Math.min(...spamCounts) : 0,
            maxSpam: spamCounts.length > 0 ? Math.max(...spamCounts) : 0,
            avgSpam: spamCounts.length > 0 ? (spamCounts.reduce((a, b) => a + b, 0) / spamCounts.length).toFixed(2) : '0',
        };
    }, [sessions, selectedEntity, stats]);

    return (
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-blue-200/50 overflow-hidden mb-8 shadow-sm">
            {/* Clean Modern Header with Filter */}
            <div className="px-6 py-4 border-b border-blue-200/50 bg-white/60 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-lg shadow-sm">
                            <Activity size={18} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-base">Session Performance</h3>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Real-time Overview</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Entity Filter */}
                        <div className="relative">
                            <select
                                value={selectedEntity}
                                onChange={(e) => setSelectedEntity(e.target.value)}
                                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer outline-none hover:border-blue-400 transition-colors appearance-none pr-8 shadow-sm"
                            >
                                <option value="all">All Entities</option>
                                {entities.filter(e => e !== 'all').map(entity => (
                                    <option key={entity} value={entity}>{entity}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>

                        {/* Live Badge */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500 rounded-lg shadow-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            <span className="text-xs font-semibold text-white">Live</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {/* Modern Stats Grid with Enhanced Design */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    {/* Profiles Card */}
                    <div className="group bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-blue-200/60 hover:border-blue-400 hover:bg-white hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md group-hover:shadow-lg transition-shadow">
                                <Users size={16} className="text-white" />
                            </div>
                            <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                TOTAL
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900 mb-1">{filteredStats.totalProfiles}</div>
                        <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Profiles</div>
                    </div>

                    {/* Min Spam Card */}
                    <div className="group bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-emerald-200/60 hover:border-emerald-400 hover:bg-white hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-md group-hover:shadow-lg transition-shadow">
                                <TrendingDown size={16} className="text-white" />
                            </div>
                            <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                MIN
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900 mb-1">{filteredStats.minSpam}</div>
                        <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Min Spam</div>
                    </div>

                    {/* Max Spam Card */}
                    <div className="group bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-rose-200/60 hover:border-rose-400 hover:bg-white hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg shadow-md group-hover:shadow-lg transition-shadow">
                                <TrendingUp size={16} className="text-white" />
                            </div>
                            <div className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
                                MAX
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900 mb-1">{filteredStats.maxSpam}</div>
                        <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Max Spam</div>
                    </div>

                    {/* Avg Spam Card */}
                    <div className="group bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-amber-200/60 hover:border-amber-400 hover:bg-white hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-md group-hover:shadow-lg transition-shadow">
                                <BarChart3 size={16} className="text-white" />
                            </div>
                            <div className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                                AVG
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900 mb-1">{filteredStats.avgSpam}</div>
                        <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Avg Spam</div>
                    </div>

                    {/* Sessions Card */}
                    <div className="group bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-purple-200/60 hover:border-purple-400 hover:bg-white hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md group-hover:shadow-lg transition-shadow">
                                <Layers size={16} className="text-white" />
                            </div>
                            <div className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                                LIVE
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900 mb-1">{filteredSessions.length}</div>
                        <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Sessions</div>
                    </div>
                </div>

                {/* Clean Sessions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {filteredSessions.map((session, idx) => (
                        <div
                            key={idx}
                            className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-slate-200/50 hover:border-blue-400 hover:bg-white hover:shadow-md transition-all"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-2.5">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="font-semibold text-xs text-slate-700 truncate">{session.id}</span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{Array.isArray(session.profilesCount) ? session.profilesCount.length : session.profilesCount} PR</span>
                            </div>

                            {/* Stats */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-[9px] font-semibold">
                                    <span className="text-emerald-600">INBOX: {session.inbox}</span>
                                    <span className="text-rose-600">SPAM: {session.spam}</span>
                                </div>

                                {/* Clean Progress Bar */}
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                    <div
                                        className="h-full bg-emerald-500"
                                        style={{ width: `${(session.inbox / (session.total || 1)) * 100}%` }}
                                    />
                                    <div
                                        className="h-full bg-rose-500"
                                        style={{ width: `${(session.spam / (session.total || 1)) * 100}%` }}
                                    />
                                </div>

                                {/* Footer */}
                                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                    <span className="text-[9px] text-slate-500 font-medium">{session.entity}</span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${session.spamPct > 15 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {session.spamPct.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* No Results Message */}
                {filteredSessions.length === 0 && (
                    <div className="text-center py-12">
                        <div className="bg-white/70 backdrop-blur-sm w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-200">
                            <Search size={24} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-semibold text-slate-600">No sessions found</p>
                        <p className="text-xs text-slate-500 mt-1">Try selecting a different entity</p>
                    </div>
                )}
            </div>
        </div>
    );
};

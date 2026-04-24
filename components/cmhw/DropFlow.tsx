import React, { useState, useEffect, useMemo } from 'react';
import { cmhwApi } from './cmhwApi';
import { CMHWReportingTypeCard } from './CMHWReportingTypeCard';
import { CMHWModal } from './CMHWModal';
import { CMHWTagSelect } from './CMHWTagSelect';
import { service } from '../../services';
import {
    Zap, ClipboardList, Info, Plus,
    Filter, Globe2, Droplets, Box, Clock,
    Monitor, Globe, Smartphone, Cpu, FileText, AlertTriangle, ExternalLink, Trash2,
    Users, RefreshCw
} from 'lucide-react';
import { Entity, ParentCategory, MethodType } from '../../types';

// ─── Types ───────────────────────────────────────────────────────────────────
type SubTab = 'lists';

interface DashboardEntity { id: string; name: string; status?: string }
interface FlaskEntity { id: number; name: string; plans?: any[]; reporting_types?: any[] }

// A plan derived from the entity's plan configuration
interface DerivedPlan {
    method: MethodType;
    categoryId: string;
    categoryName: string;
    status: 'active' | 'stopped';
    drops: { id: string; time?: string; value: number }[];
    seeds: number;
    startTime: string;
    endTime: string;
}

// ─── Method icon + label map ──────────────────────────────────────────────────
const METHOD_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    desktop: { label: 'Desktop', icon: <Monitor size={11} />, color: 'bg-violet-100 text-violet-700 border-violet-200' },
    webautomate: { label: 'Webautomate', icon: <Globe size={11} />, color: 'bg-blue-100 text-blue-700 border-blue-200' },
    mobile: { label: 'Mobile', icon: <Smartphone size={11} />, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    api: { label: 'API', icon: <Cpu size={11} />, color: 'bg-amber-100 text-amber-700 border-amber-200' },
};

// ─── Plan card — editable style matching Screen 2 ─────────────────────────
const PlanCard: React.FC<{
    plan: DerivedPlan;
    onSave: (method: MethodType, categoryId: string, name: string, timingText: string) => void;
}> = ({ plan, onSave }) => {
    const meta = METHOD_META[plan.method] ?? { label: plan.method, icon: <Cpu size={11} />, color: 'bg-slate-100 text-slate-600 border-slate-200' };

    const initialText = plan.drops
        .map(d => d.time || '')
        .join('\n');

    const [name, setName] = useState(plan.categoryName);
    const [rows, setRows] = useState(initialText);

    useEffect(() => {
        setName(plan.categoryName);
        setRows(initialText);
    }, [plan.categoryName, initialText]);

    return (
        <div className="bg-white border border-slate-200/60 rounded-[24px] shadow-sm hover:shadow-md hover:border-indigo-200/50 transition-all duration-300 p-7 mb-4">
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                             PLAN NAME
                        </label>
                        <input
                            className="bg-transparent border-none p-0 font-bold text-slate-900 text-base focus:ring-0 outline-none w-full placeholder:text-slate-300"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter plan name..."
                        />
                    </div>
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border shadow-sm ${meta.color}`}>
                        {meta.icon} {meta.label}
                    </span>
                </div>

                <div className="h-px bg-slate-100/80 -mx-7" />

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                            <Clock size={12} className="text-slate-300" /> TIMING ROWS
                        </label>
                        <span className="text-[10px] font-bold text-slate-300 bg-slate-50 px-2 py-0.5 rounded-md italic">
                            {plan.drops.length} total drops
                        </span>
                    </div>
                    <textarea
                        className="w-full h-44 p-5 bg-slate-50/50 border border-slate-100 rounded-2xl font-mono text-sm text-slate-600 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none resize-none leading-relaxed custom-scrollbar"
                        value={rows}
                        onChange={(e) => setRows(e.target.value)}
                        placeholder="09:00 AM&#10;10:00 AM"
                    />
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={() => onSave(plan.method, plan.categoryId, name, rows)}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-md hover:shadow-indigo-200 active:scale-[0.98]"
                    >
                        <Zap size={14} fill="currentColor" /> Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Sidebar ─────────────────────────────────────────────────────────────────
const DropFlowSidebar: React.FC<{
    entities: DashboardEntity[];
    selectedName: string | null;
    onSelect: (name: string) => void;
}> = ({ entities, selectedName, onSelect }) => (
    <aside className="w-64 shrink-0 flex flex-col bg-white border-r border-slate-200/60 h-full overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Box size={14} className="text-slate-400" /> ENTITIES
            </span>
            <span className="bg-white border border-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
                {entities.length}
            </span>
        </div>
        <div className="flex-1 overflow-y-auto py-3 custom-scrollbar px-1">
            {entities.length === 0 ? (
                <div className="px-6 py-12 text-center">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <Box size={24} className="text-slate-200" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No active entities</p>
                </div>
            ) : (
                entities.map(entity => (
                    <div
                        key={entity.id}
                        onClick={() => onSelect(entity.name)}
                        className={`group relative flex items-center gap-4 px-5 py-3.5 mx-2 rounded-2xl cursor-pointer transition-all duration-200 ${selectedName === entity.name
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 ring-2 ring-indigo-50'
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <div className={`w-2 h-2 rounded-full transition-all ${selectedName === entity.name
                                ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] scale-110'
                                : 'bg-slate-300 group-hover:bg-slate-400'
                            }`} />
                        <span className={`flex-1 text-[13px] font-bold truncate tracking-tight`}>
                            {entity.name}
                        </span>
                        {entity.status && (
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border transition-colors ${selectedName === entity.name
                                    ? 'bg-white/20 border-white/20 text-white'
                                    : entity.status === 'active'
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                        : 'bg-slate-100 text-slate-400 border-slate-200'
                                }`}>
                                {entity.status}
                            </span>
                        )}
                        {selectedName === entity.name && (
                            <div className="absolute -right-3 w-1.5 h-8 bg-indigo-600 rounded-l-full shadow-inner" />
                        )}
                    </div>
                ))
            )}
        </div>
    </aside>
);

// ─── Column accent colors ─────────────────────────────────────────────────────
const COL_COLORS_CLS = [
    'text-sky-600', 'text-violet-600', 'text-orange-500',
    'text-teal-600', 'text-rose-500', 'text-indigo-600', 'text-amber-600', 'text-emerald-600',
];

// ─── Interval helpers (duplicated from DayPlan logic) ────────────────────────
function parseRangesLists(str: string): [number, number][] {
    if (!str) return [];
    const ranges: [number, number][] = [];
    str.split(',').forEach(part => {
        const p = part.trim();
        if (!p || p.toUpperCase() === 'NO') return;
        if (p.includes('-')) {
            const [a, b] = p.split('-').map(s => parseInt(s.trim()));
            if (!isNaN(a) && !isNaN(b)) ranges.push([Math.min(a, b), Math.max(a, b)]);
        } else {
            const v = parseInt(p);
            if (!isNaN(v)) ranges.push([v, v]);
        }
    });
    return ranges;
}

function getStepForDropL(dropIdx: number, config: string | number): number {
    const cfg = String(config ?? '');
    if (!cfg.includes(':')) return parseInt(cfg) || 0;
    const target = dropIdx + 1;
    for (const part of cfg.split(',')) {
        const [range, val] = part.split(':').map(s => s.trim());
        if (!range || !val) continue;
        const step = parseInt(val);
        if (isNaN(step)) continue;
        if (range.includes('-')) {
            const [s, e] = range.split('-').map(Number);
            if (target >= s && target <= e) return step;
        } else if (target === parseInt(range)) return step;
    }
    return 0;
}

function calcIntervalL(dropIdx: number, stepCfg: string | number, intervalsStr: string, startPos: number): string {
    const ranges = parseRangesLists(intervalsStr);
    if (ranges.length === 0) return '-';
    let cur = startPos;
    for (let d = 0; d <= dropIdx; d++) {
        let ri = ranges.findIndex(([s, e]) => cur >= s && cur <= e);
        if (ri === -1) {
            ri = ranges.findIndex(([s]) => s > cur);
            if (ri === -1) ri = 0;
            cur = ranges[ri][0];
        }
        const [, rEnd] = ranges[ri];
        const avail = rEnd - cur + 1;
        const step = getStepForDropL(d, stepCfg);
        if (step <= 0) { if (d === dropIdx) return '-'; continue; }
        if (d === dropIdx) {
            if (avail >= step) return `${cur}-${cur + step - 1}`;
            const next = (ri + 1) % ranges.length;
            return `${ranges[next][0]}-${ranges[next][0] + step - 1}`;
        }
        if (avail >= step) {
            cur = cur + step;
            if (cur > rEnd) cur = ranges[(ri + 1) % ranges.length][0];
        } else {
            const next = (ri + 1) % ranges.length;
            cur = ranges[next][0] + step;
            if (cur > ranges[next][1]) cur = ranges[(next + 1) % ranges.length][0];
        }
    }
    return '-';
}

// ─── Single category card ─────────────────────────────────────────────────────
const ListCategoryCard: React.FC<{
    cat: any;
    entity: Entity;
    dayPlan: Record<string, any>;
}> = ({ cat, entity, dayPlan }) => {
    const [name, setName] = useState(cat.name || '');
    const [replaceFrom, setReplaceFrom] = useState(1);
    const [editMode, setEditMode] = useState(true);
    const [extraEntities, setExtraEntities] = useState<string[]>([]);
    const [isV2, setIsV2] = useState(cat.method?.toLowerCase().includes('webautomat') || false);
    const [users, setUsers] = useState(cat.defaultUsers || '');

    useEffect(() => {
        if (cat.defaultUsers && !users) {
            setUsers(cat.defaultUsers);
        }
    }, [cat.defaultUsers]);

    const principals = useMemo(
        () => (cat.profiles || []).filter((p: any) => !p.isMirror),
        [cat]
    );
    const numDrops = cat.planConfiguration?.drops?.length || 0;
    const catPlan = (dayPlan[cat.id] || {}) as Record<number, { step: string | number; start: string | number }>;

    // Build table data
    const { headers, rows } = useMemo(() => {
        const hdrs = principals.map((p: any) => p.profileName);
        const tableRows: string[][] = [];
        for (let di = 0; di < numDrops; di++) {
            const row = principals.map((profile: any, si: number) => {
                const pd = (catPlan[si] || {}) as any;
                const step = pd.step || 0;
                const start = pd.start || 0;
                if (!step || !start) return '-';
                const limit = (entity.limitsConfiguration || []).find(
                    (l: any) => l.profileName === profile.profileName &&
                        (!l.categoryId || l.categoryId === cat.id)
                ) as any;
                const repo = limit?.intervalsInRepo || limit?.limitActiveSession || '';
                return calcIntervalL(di, step, repo, Number(start));
            });
            tableRows.push(row);
        }
        return { headers: hdrs, rows: tableRows };
    }, [cat, entity, dayPlan, principals, numDrops]);

    const rawContent = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const [content, setContent] = useState(rawContent);

    useEffect(() => { setContent(rawContent); }, [rawContent]);

    const handleGenerate = async () => {
        const data = {
            reportingType: name.trim() || cat.name,
            reporting_type: name.trim() || cat.name,
            entity: entity.name,
            content: content.trim(),
            isV2: isV2,
            is_v2: isV2,
            extraEntities: extraEntities,
            extra_entities: extraEntities,
            replaceFrom: parseInt(String(replaceFrom)) || 1,
            replace_from: parseInt(String(replaceFrom)) || 1,
            users: users.split('\n').map(u => u.trim()).filter(u => u)
        };

        try {
            const res = await cmhwApi.createSessionToken(data);
            const url = `http://95.216.72.6:90/seed/email/sessions#CMHW-MANAGER|${res.token}`;
            window.open(url, '_blank');
        } catch (e) {
            console.error('Generate failed', e);
            alert('Generate failed');
        }
    };

    return (
        <div className="bg-white border border-slate-200/70 rounded-[20px] pb-7 pt-5 px-7 mb-6 shadow-sm hover:shadow-md transition-all duration-300">
            {/* Top Row: Method Badge + Webautomat V2 Toggle */}
            <div className="flex items-center justify-between pb-4">
                <div className="flex items-center gap-2">
                    {cat.method?.toLowerCase().includes('webautomat') ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-100/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                            <span className="text-[10px] font-black text-teal-700 uppercase tracking-widest">Webautomat</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Desktop</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
                        Webautomat V2
                    </span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={isV2}
                        onClick={() => setIsV2(v => !v)}
                        className={`relative inline-flex h-[18px] w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${isV2 ? 'bg-teal-500' : 'bg-slate-200'}`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${isV2 ? 'translate-x-[18px]' : 'translate-x-0'}`}
                        />
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-5">

                {/* REPORTING NAME */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">REPORTING NAME</label>
                    <input
                        className="w-full h-12 px-5 bg-white border border-teal-400/30 rounded-xl font-semibold text-slate-800 text-base placeholder:text-slate-300 focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5 outline-none transition-all"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. IP hfgh"
                    />
                </div>

                {/* EXTRA ENTITIES */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">EXTRA ENTITIES</label>
                    <div className="min-h-[38px] w-full border border-slate-200 rounded-xl bg-slate-50/30 flex items-center">
                        <CMHWTagSelect
                            value={extraEntities}
                            onChange={setExtraEntities}
                            excludeName={entity.name}
                        />
                    </div>
                </div>

                <div className="h-px bg-slate-100" />

                {/* LIST CONTENT */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <ClipboardList size={13} className="text-teal-500" />
                            LIST CONTENT
                            <span className="text-slate-400/60 italic normal-case tracking-normal font-normal ml-1">(tab-separated)</span>
                        </label>
                        <button
                            onClick={() => setEditMode(v => !v)}
                            className="text-[10px] font-semibold text-slate-400 hover:text-teal-600 uppercase tracking-widest transition-colors"
                        >
                            {editMode ? '— View Table' : '— Edit Raw'}
                        </button>
                    </div>

                    {editMode || headers.length === 0 ? (
                        <textarea
                            className="w-full h-64 p-5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm text-slate-700 outline-none resize-none leading-relaxed focus:bg-white focus:border-teal-400/40 transition-all"
                            style={{ scrollbarWidth: 'thin' }}
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder="Paste tab-separated content here…"
                        />
                    ) : (
                        <div
                            className="rounded-xl border border-slate-200 bg-white cursor-pointer overflow-hidden"
                            onClick={() => setEditMode(true)}
                        >
                            <div className="overflow-auto max-h-64" style={{ scrollbarWidth: 'thin' }}>
                                <table className="w-full text-sm font-mono border-collapse">
                                    <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-sm border-b border-slate-100">
                                        <tr>
                                            {headers.map((h, i) => (
                                                <th key={i} className={`text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide whitespace-nowrap ${COL_COLORS_CLS[i % COL_COLORS_CLS.length]}`}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row, ri) => (
                                            <tr key={ri} className="hover:bg-slate-50/50 transition-colors">
                                                {headers.map((_, ci) => (
                                                    <td key={ci} className={`px-4 py-1.5 text-[13px] whitespace-nowrap ${row[ci] && row[ci] !== '-' ? COL_COLORS_CLS[ci % COL_COLORS_CLS.length] : 'text-slate-300'}`}>
                                                        {row[ci] || '-'}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* BOTTOM TOOLS: Redesigned Session Configuration Toolbar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-4 mt-2 border-t border-slate-50">
                    
                    {/* Config Group */}
                    <div className="flex items-center gap-4 bg-slate-50/50 p-1.5 rounded-[14px] border border-slate-100">
                        {/* REPLACE FROM */}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100 min-w-[110px]">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter shrink-0 leading-none">Rep From</span>
                            <input
                                type="number"
                                className="w-full bg-transparent font-mono font-black text-teal-600 text-sm text-right outline-none"
                                value={replaceFrom}
                                onChange={e => setReplaceFrom(parseInt(e.target.value) || 1)}
                            />
                        </div>

                        {/* USERS */}
                        <div className="flex items-center gap-3 px-4 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100 flex-1 min-w-[200px]">
                            <Users size={14} className="text-slate-400 shrink-0" />
                            <textarea
                                className="w-full bg-transparent font-bold text-slate-700 text-[11px] outline-none resize-none h-20 leading-relaxed custom-scrollbar overflow-y-auto"
                                value={users}
                                onChange={e => setUsers(e.target.value)}
                                placeholder="One user per line..."
                                title="Session users separated by newline"
                            />
                        </div>
                    </div>

                    {/* Actions Group */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setContent(rawContent)}
                            title="Reset content to today's current plan"
                            className="flex items-center justify-center p-2.5 bg-white border border-slate-200 text-teal-600 rounded-xl hover:bg-teal-50 hover:border-teal-200 transition-all active:scale-95 shadow-sm"
                        >
                            <RefreshCw size={16} />
                        </button>
                        
                        <button
                            onClick={() => { navigator.clipboard.writeText(content); }}
                            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm"
                        >
                            Copy
                        </button>

                        <button
                            onClick={handleGenerate}
                            className="flex-1 lg:flex-none flex items-center justify-center gap-2.5 px-7 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-teal-500 transition-all shadow-lg active:translate-y-0.5"
                        >
                            <ExternalLink size={14} /> 
                            Generate
                        </button>

                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Lists From Task Today  ───────────────────────────────────────────────────
const ListsFromTaskToday: React.FC<{ entity: Entity | null; entityName: string; methodFilter: string }> = ({ entity, entityName, methodFilter }) => {
    const [dayPlan, setDayPlan] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(false);
    const [mailerUsers, setMailerUsers] = useState<string>('');

    useEffect(() => {
        if (!entity) return;
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];
        service.getDayPlan(entity.id, today)
            .then(p => setDayPlan(p || {}))
            .catch(() => setDayPlan({}))
            .finally(() => setLoading(false));
            
        // Fetch mailer users for default population
        (service as any).getAdminUsers?.().then((users: any[]) => {
            const names = users
                .filter(u => (u.role === 'MAILER' || u.role === 'ADMIN') && u.isApproved)
                .map(u => `${u.firstName || ''} ${u.lastName || ''}`.trim())
                .filter(n => n)
                .join('\n');
            setMailerUsers(names);
        }).catch(console.error);
    }, [entity]);

    if (!entity) return null;

    const allCats = useMemo(() => {
        const cats: any[] = [];
        const seenIds = new Set<string>();

        Object.entries(entity.methodsData || {}).forEach(([methodName, m]: [string, any]) => {
            (m.parentCategories || []).forEach((cat: any) => {
                if (seenIds.has(cat.id)) return;
                seenIds.add(cat.id);
                cats.push({ ...cat, method: methodName, defaultUsers: mailerUsers });
            });
        });
        return cats.filter(cat => {
            const matchesMethod = methodFilter === 'all' || cat.method?.toLowerCase() === methodFilter.toLowerCase();
            if (!matchesMethod) return false;

            // Fix for backend leak: only show categories belonging to this entity
            if (cat.entityId && String(cat.entityId) !== String(entity.id)) return false;
            if (cat.entity_id && String(cat.entity_id) !== String(entity.id)) return false;

            return true;
        });
    }, [entity.methodsData, mailerUsers, methodFilter]);

    if (loading) return (
        <div className="h-full flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading today's plan…</p>
        </div>
    );

    if (allCats.length === 0) return (
        <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
            <p className="text-lg font-black text-slate-800 uppercase tracking-tight">No Categories Found</p>
            <p className="text-sm text-slate-400">Configure methods and categories in the Admin Panel first.</p>
        </div>
    );

    return (
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
            {allCats.map(cat => (
                <ListCategoryCard key={cat.id} cat={cat} entity={entity} dayPlan={dayPlan} />
            ))}
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const DropFlow: React.FC = () => {
    const [dashboardEntities, setDashboardEntities] = useState<DashboardEntity[]>([]);
    const [flaskEntities, setFlaskEntities] = useState<FlaskEntity[]>([]);
    const [flaskError, setFlaskError] = useState<string | null>(null);
    const [fullEntity, setFullEntity] = useState<Entity | null>(null);

    const [selectedEntityName, setSelectedEntityName] = useState<string | null>(null);
    const [subTab, setSubTab] = useState<SubTab>('lists');
    const [modal, setModal] = useState<any>(null);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [entityLoading, setEntityLoading] = useState(false);
    const [methodFilter, setMethodFilter] = useState('all');

    // ── Load sidebar entities + Flask entities (independently) ───────────────
    const refreshData = async () => {
        // 1. Dashboard entities
        try {
            const dashRaw = await service.getEntities();
            const sorted = [...(dashRaw || [])].sort((a, b) => {
                const n = (s: string) => parseInt(s.replace(/\D/g, '')) || 0;
                return n(a.name) - n(b.name);
            });
            setDashboardEntities(sorted);
        } catch (err) {
            console.error('Drop-Flow: failed to load dashboard entities:', err);
        }

        // 2. Flask entities — used only for Lists tab
        try {
            const flaskRaw = await cmhwApi.getEntities();
            setFlaskEntities(flaskRaw || []);
            setFlaskError(null);
        } catch (err: any) {
            console.error('Drop-Flow: failed to load Flask entities:', err);
            setFlaskError(err.message || 'Flask backend unreachable');
        }

        setLoading(false);
    };

    useEffect(() => { refreshData(); }, []);

    const availableMethods = useMemo(() => {
        if (!fullEntity?.methodsData) return ['all'];
        const methods = Object.keys(fullEntity.methodsData).filter(m => {
            const data = (fullEntity.methodsData as any)[m];
            return data?.parentCategories && data.parentCategories.length > 0;
        });
        return ['all', ...methods];
    }, [fullEntity]);
    
    // Auto-select first entity
    useEffect(() => {
        if (!selectedEntityName && dashboardEntities.length > 0) {
            setSelectedEntityName(dashboardEntities[0].name);
        }
    }, [dashboardEntities, selectedEntityName]);

    const handleSaveDashboardPlan = async (method: MethodType, categoryId: string, newName: string, timingText: string) => {
        if (!fullEntity) return;

        try {
            // Clone the entity to avoid direct state mutation
            const updatedEntity = JSON.parse(JSON.stringify(fullEntity));
            const methodData = updatedEntity.methodsData[method];
            if (!methodData?.parentCategories) return;

            const cat = methodData.parentCategories.find((c: any) => c.id === categoryId);
            if (!cat) return;

            // Update Name
            cat.name = newName;

            // Update Drops (parsing the textarea)
            const lines = timingText.split('\n').map(l => l.trim()).filter(Boolean);
            
            // Reconstruct the drops array
            // We try to preserve existing IDs if possible, or create new ones
            const existingDrops = cat.planConfiguration.drops || [];
            cat.planConfiguration.drops = lines.map((line, idx) => {
                const existing = existingDrops[idx];
                return {
                    id: existing?.id || `drop_${Date.now()}_${idx}`,
                    value: existing?.value || 0, // Keep value if existing
                    time: line
                };
            });

            // Persist to Admin Panel
            await service.saveEntity(updatedEntity, { isUpdate: true });
            
            // Refresh to see changes
            await refreshData();
        } catch (err) {
            console.error('Drop-Flow: Failed to save dashboard plan:', err);
            alert('Failed to save changes to Admin Panel');
        }
    };

    // ── Load full entity detail when selection changes ────────────────────────
    useEffect(() => {
        if (!selectedEntityName) { setFullEntity(null); return; }
        const dash = dashboardEntities.find(e => e.name === selectedEntityName);
        if (!dash) { setFullEntity(null); return; }

        setFullEntity(null);
        setEntityLoading(true);
        service.getEntity(dash.id)
            .then(e => setFullEntity(e ?? null))
            .catch(() => setFullEntity(null))
            .finally(() => setEntityLoading(false));
    }, [selectedEntityName, dashboardEntities]);

    // ── Calculations matching Admin Panel ──────────────────────────────────
    const calculateDropTime = (startTime: string, index: number): string => {
        if (!startTime) return '';
        const [h, m] = startTime.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return startTime;
        let newH = (h + index) % 24;
        return `${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    // ── Derive plans from entity's methodsData ─────────────────────────────────
    const derivedPlans = useMemo<DerivedPlan[]>(() => {
        if (!fullEntity?.methodsData) return [];
        const plans: DerivedPlan[] = [];
        (Object.entries(fullEntity.methodsData) as [MethodType, any][]).forEach(([method, methodData]) => {
            if (!methodData?.parentCategories) return;
            (methodData.parentCategories as ParentCategory[]).forEach(cat => {
                const cfg = cat.planConfiguration;
                const startTime = cfg?.timeConfig?.startTime || '';
                
                plans.push({
                    method,
                    categoryId: cat.id,
                    categoryName: cat.name,
                    status: cfg?.status ?? 'stopped',
                    drops: (cfg?.drops ?? []).map((d, index) => ({ 
                        id: d.id, 
                        time: d.time || calculateDropTime(startTime, index), 
                        value: d.value 
                    })),
                    seeds: cfg?.seeds ?? 0,
                    startTime: startTime,
                    endTime:   cfg?.timeConfig?.endTime ?? '',
                });
            });
        });
        return plans;
    }, [fullEntity]);

    // ── Flask entity for Lists tab ────────────────────────────────────────────
    const flaskEntity = useMemo(
        () => flaskEntities.find(e => e.name.toLowerCase() === selectedEntityName?.toLowerCase()) ?? null,
        [flaskEntities, selectedEntityName]
    );

    // ── Lists handlers (Flask) ────────────────────────────────────────────────
    const handleAddRT = () => {
        if (!flaskEntity) return;
        setModal({
            title: 'New Reporting Type',
            fields: [{ id: 'name', label: 'Name', placeholder: 'e.g. IP 1 REPORTING' }],
            onConfirm: async (vals: any) => {
                if (!vals.name) return;
                await cmhwApi.createReportingType(flaskEntity.id, vals.name);
                await refreshData();
            }
        });
    };

    const handleInitializeFlaskEntity = async () => {
        if (!selectedEntityName) return;
        setEntityLoading(true);
        try {
            await cmhwApi.createEntity(selectedEntityName);
            await refreshData();
        } catch (err: any) {
            alert('Failed to initialize: ' + err.message);
        } finally {
            setEntityLoading(false);
        }
    };

    const handleSaveRT = async (id: number, data: any) => { await cmhwApi.updateReportingType(id, data); await refreshData(); };
    const handleDeleteRT = async (id: number) => {
        if (!window.confirm('Delete this reporting type?')) return;
        await cmhwApi.deleteReportingType(id); await refreshData();
    };

    // ─── Task Today Sync Logic ─────────────────────────
    const parseRanges = (str: string): [number, number][] => {
        if (!str || typeof str !== 'string') return [];
        const ranges: [number, number][] = [];
        const parts = str.split(',');
        parts.forEach(part => {
            const p = part.trim();
            if (!p || p.toUpperCase() === 'NO') return;
            if (p.includes('-')) {
                const [start, end] = p.split('-').map(s => parseInt(s.trim()));
                if (!isNaN(start) && !isNaN(end)) ranges.push([Math.min(start, end), Math.max(start, end)]);
            } else {
                const val = parseInt(p);
                if (!isNaN(val)) ranges.push([val, val]);
            }
        });
        return ranges;
    };

    const getStepForDrop = (dropIdx: number, config: string | number): number => {
        if (typeof config === 'number') return config;
        if (!config || !config.toString().includes(':')) return parseInt(config.toString()) || 0;
        const parts = config.toString().split(',');
        const targetDrop = dropIdx + 1;
        for (const part of parts) {
            const [range, stepVal] = part.split(':').map(s => s.trim());
            if (!range || !stepVal) continue;
            const step = parseInt(stepVal);
            if (isNaN(step)) continue;
            if (range.includes('-')) {
                const [start, end] = range.split('-').map(s => parseInt(s));
                if (targetDrop >= start && targetDrop <= end) return step;
            } else { if (targetDrop === parseInt(range)) return step; }
        }
        return 0;
    };

    const calculateDropIntervalWithStart = (dropIndex: number, stepConfig: string | number, intervalsInRepo: string, defaultStart: number): string => {
        const ranges = parseRanges(intervalsInRepo);
        if (ranges.length === 0) return '-';
        let currentPosition = defaultStart;
        for (let drop = 0; drop <= dropIndex; drop++) {
            let rangeIdx = ranges.findIndex(([start, end]) => currentPosition >= start && currentPosition <= end);
            if (rangeIdx === -1) {
                rangeIdx = ranges.findIndex(([start]) => start > currentPosition);
                if (rangeIdx === -1) rangeIdx = 0;
                currentPosition = ranges[rangeIdx][0];
            }
            const [rangeStart, rangeEnd] = ranges[rangeIdx];
            const availableInRange = rangeEnd - currentPosition + 1;
            const currentStep = getStepForDrop(drop, stepConfig);
            if (currentStep <= 0) { if (drop === dropIndex) return '-'; continue; }
            if (drop === dropIndex) {
                if (availableInRange >= currentStep) return `${currentPosition}-${currentPosition + currentStep - 1}`;
                else {
                    const nextRangeIdx = (rangeIdx + 1) % ranges.length;
                    const nextStart = ranges[nextRangeIdx][0];
                    return `${nextStart}-${nextStart + currentStep - 1}`;
                }
            } else {
                if (availableInRange >= currentStep) {
                    currentPosition = currentPosition + currentStep;
                    if (currentPosition > rangeEnd) currentPosition = ranges[(rangeIdx + 1) % ranges.length][0];
                } else {
                    const nextRangeIdx = (rangeIdx + 1) % ranges.length;
                    currentPosition = ranges[nextRangeIdx][0] + currentStep;
                    if (currentPosition > ranges[nextRangeIdx][1]) currentPosition = ranges[(nextRangeIdx + 1) % ranges.length][0];
                }
            }
        }
        return '-';
    };

    const handleSyncToday = async (rtId: number) => {
        if (!fullEntity || !selectedEntityName) return;
        const rt = (flaskEntity?.reporting_types || []).find((r: any) => r.id === rtId);
        if (!rt) return;

        try {
            setEntityLoading(true);
            const today = new Date().toISOString().split('T')[0];
            const dayPlan = await service.getDayPlan(fullEntity.id, today);

            // Collect ALL sessions across ALL active categories (all methods)
            // Each unique session (profileName) becomes a column in the table
            interface SessionEntry {
                profileName: string;
                catId: string;
                sessionIdx: number;
                numDrops: number;
                intervalsInRepo: string;
            }
            const allSessions: SessionEntry[] = [];
            const seenProfiles = new Set<string>();

            Object.values(fullEntity.methodsData).forEach((m: any) => {
                if (!m.parentCategories) return;
                m.parentCategories.forEach((cat: any) => {
                    if (cat.planConfiguration?.status?.toLowerCase() === 'stopped') return;
                    const numDrops = cat.planConfiguration?.drops?.length || 1;
                    const principals = (cat.profiles || []).filter((p: any) => !p.isMirror);
                    principals.forEach((profile: any, sessionIdx: number) => {
                        if (seenProfiles.has(profile.profileName)) return;
                        seenProfiles.add(profile.profileName);
                        const limit = fullEntity.limitsConfiguration.find(
                            (l: any) => l.profileName === profile.profileName &&
                                (!l.categoryId || l.categoryId === cat.id)
                        );
                        const intervalsInRepo = (limit as any)?.intervalsInRepo || (limit as any)?.limitActiveSession || '';
                        allSessions.push({ profileName: profile.profileName, catId: cat.id, sessionIdx, numDrops, intervalsInRepo });
                    });
                });
            });

            if (allSessions.length === 0) throw new Error('No sessions found in this entity');

            // Determine total drops (use max across all categories)
            const maxDrops = Math.max(...allSessions.map(s => s.numDrops));

            // Build tab-separated table
            const headers = allSessions.map(s => s.profileName).join('\t');
            const rows: string[] = [];

            for (let dropIdx = 0; dropIdx < maxDrops; dropIdx++) {
                const cells = allSessions.map(session => {
                    const catDayPlan = (dayPlan[session.catId] || {}) as Record<number, { step: string | number; start: string | number }>;
                    const planData = (catDayPlan[session.sessionIdx] || {}) as any;
                    const step = planData.step || 0;
                    const start = planData.start || 0;
                    if (!step || !start || dropIdx >= session.numDrops) return '-';
                    return calculateDropIntervalWithStart(dropIdx, step, session.intervalsInRepo, Number(start));
                });
                rows.push(cells.join('\t'));
            }

            const newContent = `${headers}\n${rows.join('\n')}`;
            await cmhwApi.updateReportingType(rtId, { ...rt, content: newContent });
            await refreshData();
        } catch (err: any) {
            console.error('Sync failed:', err);
            alert('Sync failed: ' + err.message);
        } finally {
            setEntityLoading(false);
        }
    };
    const handleGenerate = async (rtId: number, entityName: string) => {
        const ent = flaskEntities.find(e => e.name === entityName);
        if (!ent) return;
        const rt = ent.reporting_types?.find((r: any) => r.id === rtId);
        if (!rt) return;
        try {
            const res = await cmhwApi.createSessionToken({
                reportingType: rt.name, reporting_type: rt.name,
                entity: entityName, content: rt.content,
                isV2: rt.is_v2, is_v2: rt.is_v2,
                extraEntities: rt.extra_entities || [], extra_entities: rt.extra_entities || [],
                replaceFrom: rt.replace_from || 1, replace_from: rt.replace_from || 1
            });
            window.open(`http://95.216.72.6:90/seed/email/sessions#CMHW-MANAGER|${res.token}`, '_blank');
        } catch (e) { console.error('Generate failed', e); alert('Generate failed'); }
    };

    const filteredRTs = useMemo(() => {
        if (!flaskEntity?.reporting_types) return [];
        return flaskEntity.reporting_types.filter((r: any) => {
            if (filter === 'all') return true;
            if (filter === 'v2') return r.is_v2;
            if (filter === 'classic') return !r.is_v2;
            return true;
        });
    }, [flaskEntity, filter]);

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex h-[calc(100vh-180px)] items-center justify-center bg-white rounded-[32px] border border-slate-200/60 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-700">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                        <div className="w-20 h-20 border-[6px] border-slate-50 rounded-full" />
                        <div className="w-20 h-20 border-[6px] border-indigo-600 border-t-transparent rounded-full animate-[spin_0.8s_linear_infinite] absolute top-0 left-0" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Droplets size={28} className="text-indigo-600 animate-bounce" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-black text-slate-800 uppercase tracking-[0.3em] mb-1">INITIALIZING</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Drop-Flow Analytics Engine</p>
                    </div>
                </div>
            </div>
        );
    }

    const isTimedrops = subTab === 'timedrops';

    return (
        <div className="flex h-[calc(100vh-180px)] bg-white rounded-3xl border-2 border-slate-100 shadow-xl overflow-hidden animate-in fade-in duration-500">

            {/* Sidebar */}
            <DropFlowSidebar
                entities={dashboardEntities}
                selectedName={selectedEntityName}
                onSelect={setSelectedEntityName}
            />

            {/* Right panel */}
            <section className="flex-1 flex flex-col min-w-0 bg-slate-50/10">

                {/* Header */}
                <header className="px-10 py-7 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 gap-8 shadow-sm relative z-20">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 bg-emerald-500">
                             <ClipboardList size={24} className="text-white" />
                        </div>
                        <div className="space-y-0.5">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                <span className="italic uppercase">LISTS</span>
                                {selectedEntityName && (
                                    <>
                                        <div className="w-2.5 h-px bg-slate-100 mx-2" />
                                        <span className="px-4 py-1 rounded-full text-[11px] font-black tracking-wide border bg-teal-50 text-teal-600 border-teal-100">
                                            {selectedEntityName}
                                        </span>
                                    </>
                                )}
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Reporting Content & Session Logic Configuration
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                        {selectedEntityName && (
                            <div className="flex items-center bg-slate-100/90 p-1 rounded-[16px] border border-slate-200/50 shadow-inner overflow-hidden">
                                {availableMethods.map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setMethodFilter(m)}
                                        className={`px-4 py-2 rounded-[12px] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${methodFilter === m 
                                            ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-100/50' 
                                            : 'text-slate-400 hover:text-slate-600 hover:bg-white/40'}`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Lists action button */}
                        {flaskEntity && (
                            <button
                                onClick={handleAddRT}
                                className="group flex items-center gap-2 px-6 py-3 text-[11px] font-black uppercase tracking-widest text-white bg-slate-900 hover:bg-emerald-600 rounded-xl transition-all duration-300 shadow-lg active:scale-95"
                            >
                                <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" /> NEW TYPE
                            </button>
                        )}
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/20">

                    {/* No entity selected */}
                    {!selectedEntityName ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-in slide-in-from-bottom-5 duration-700">
                            <div className="relative">
                                <div className="w-32 h-32 bg-white rounded-[40px] border-2 border-slate-100 flex items-center justify-center shadow-sm relative z-10">
                                    <ClipboardList size={56} className="text-slate-200" />
                                </div>
                                <div className="absolute inset-0 bg-teal-500/5 blur-3xl rounded-full scale-150 animate-pulse" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight italic">Waiting for Selection</h3>
                                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest max-w-[240px] mx-auto leading-relaxed">
                                    Select an entity from the sidebar to manage Reporting Lists
                                </p>
                            </div>
                        </div>
                    ) : (
                        <ListsFromTaskToday
                            entity={fullEntity}
                            entityName={selectedEntityName!}
                            methodFilter={methodFilter}
                        />
                    )}
                </div>
            </section>

            {modal && (
                <CMHWModal
                    title={modal.title}
                    fields={modal.fields}
                    onConfirm={modal.onConfirm}
                    onClose={() => setModal(null)}
                />
            )}
        </div>
    );
};

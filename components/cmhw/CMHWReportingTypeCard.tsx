
import React, { useState, useMemo } from 'react';
import { CMHWTagSelect } from './CMHWTagSelect';

interface ReportingType {
    id: number;
    name: string;
    content: string;
    is_v2: boolean;
    extra_entities: string[];
    replace_from: number;
}

interface CMHWReportingTypeCardProps {
    rt: ReportingType;
    entityName: string;
    onSave: (id: number, data: any) => void;
    onDelete: (id: number) => void;
    onGenerate: (id: number, entityName: string, localData?: any) => void;
    onSyncToday?: (id: number) => void;
}

const COL_COLORS = [
    'text-sky-500',
    'text-violet-500',
    'text-orange-500',
    'text-teal-500',
    'text-rose-500',
    'text-indigo-500',
    'text-amber-500',
    'text-emerald-500',
];

function parseContent(content: string): { headers: string[]; rows: string[][] } {
    if (!content || !content.trim()) return { headers: [], rows: [] };
    const lines = content.trim().split('\n');
    const headers = lines[0].split('\t').map(h => h.trim());
    const rows = lines.slice(1).map(line => line.split('\t').map(c => c.trim()));
    return { headers, rows };
}

export const CMHWReportingTypeCard: React.FC<CMHWReportingTypeCardProps> = ({
    rt,
    entityName,
    onSave,
    onDelete,
    onGenerate,
}) => {
    const [name, setName] = useState(rt.name);
    const [content, setContent] = useState(rt.content || '');
    const [extraEntities, setExtraEntities] = useState(rt.extra_entities || []);
    const [replaceFrom, setReplaceFrom] = useState(rt.replace_from || 1);
    const [isV2, setIsV2] = useState(rt.is_v2 === true || rt.is_v2 === 1 || rt.is_v2 === '1' || rt.is_v2 === 'true');
    const [editingContent, setEditingContent] = useState(false);

    React.useEffect(() => {
        setName(rt.name);
        setContent(rt.content || '');
        setExtraEntities(rt.extra_entities || []);
        setReplaceFrom(rt.replace_from || 1);
        setIsV2(rt.is_v2 === true || rt.is_v2 === 1 || rt.is_v2 === '1' || rt.is_v2 === 'true');
    }, [rt]);

    const handleSave = () => {
        onSave(rt.id, {
            name: name.trim(),
            content: content.trim(),
            extra_entities: extraEntities,
            replace_from: parseInt(String(replaceFrom)) || 1,
            is_v2: isV2,
        });
    };

    const { headers, rows } = useMemo(() => parseContent(content), [content]);

    return (
        <div className="bg-white border border-slate-200/70 rounded-2xl mb-5 shadow-sm hover:shadow-md transition-shadow duration-300">

            {/* ── Top Row: Webautomat V2 Toggle ───────────────────── */}
            <div className="flex items-center justify-end px-7 pt-5 pb-0">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest select-none">
                        Webautomat V2
                    </span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={isV2}
                        onClick={() => setIsV2(v => !v)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${isV2 ? 'bg-teal-500' : 'bg-slate-200'}`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${isV2 ? 'translate-x-4' : 'translate-x-0'}`}
                        />
                    </button>
                </div>
            </div>

            <div className="px-7 pt-4 pb-6 flex flex-col gap-5">

                {/* ── NAME ──────────────────────────────────────────── */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                        NAME
                    </label>
                    <input
                        className="w-56 h-9 px-4 bg-white border border-teal-400/40 rounded-lg font-mono text-[13px] text-teal-600 font-semibold placeholder:text-slate-300 focus:border-teal-500/60 focus:ring-2 focus:ring-teal-500/10 outline-none transition-all"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. IP 1 REPORTING"
                    />
                </div>

                {/* ── EXTRA ENTITIES ────────────────────────────────── */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                        EXTRA ENTITIES
                    </label>
                    <div className="min-h-[38px] w-full border border-slate-200 rounded-lg bg-slate-50/30 flex items-center">
                        <CMHWTagSelect
                            value={extraEntities}
                            onChange={setExtraEntities}
                            excludeName={entityName}
                        />
                    </div>
                </div>

                {/* ── CONTENT ───────────────────────────────────────── */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            CONTENT{' '}
                            <span className="text-slate-300 normal-case font-normal tracking-normal text-[10px]">
                                (tab-separated, session names in first row)
                            </span>
                        </label>
                        <button
                            onClick={() => setEditingContent(v => !v)}
                            className="text-[10px] font-semibold text-slate-400 hover:text-teal-600 uppercase tracking-widest transition-colors"
                        >
                            {editingContent ? '← View Table' : '✏ Edit Raw'}
                        </button>
                    </div>

                    {editingContent || headers.length === 0 ? (
                        <textarea
                            className="w-full h-44 p-4 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm text-slate-700 outline-none resize-none leading-relaxed focus:bg-white focus:border-teal-400/40 focus:ring-2 focus:ring-teal-500/5 transition-all"
                            style={{ scrollbarWidth: 'thin' }}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Paste tab-separated content here…"
                        />
                    ) : (
                        <div
                            className="overflow-auto rounded-lg border border-slate-200 bg-white cursor-pointer max-h-52"
                            style={{ scrollbarWidth: 'thin' }}
                            onClick={() => setEditingContent(true)}
                        >
                            <table className="w-full text-sm font-mono border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50">
                                        {headers.map((h, i) => (
                                            <th
                                                key={i}
                                                className={`text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide whitespace-nowrap ${COL_COLORS[i % COL_COLORS.length]}`}
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, ri) => (
                                        <tr key={ri} className="hover:bg-slate-50/40 transition-colors">
                                            {headers.map((_, ci) => (
                                                <td
                                                    key={ci}
                                                    className={`px-4 py-1.5 text-[13px] whitespace-nowrap ${row[ci] && row[ci] !== '-' ? COL_COLORS[ci % COL_COLORS.length] : 'text-slate-300'}`}
                                                >
                                                    {row[ci] || '-'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ── REPLACE FROM + Actions ────────────────────────── */}
                <div className="flex items-center justify-between pt-1 gap-4">
                    {/* Replace From — inline label + input */}
                    <div className="flex items-center gap-2.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                            REPLACE FROM
                        </span>
                        <input
                            type="number"
                            className="w-14 h-8 px-2 bg-white border border-slate-200 rounded-md font-mono font-bold text-slate-700 text-sm text-center outline-none focus:border-teal-400/40 transition-all"
                            value={replaceFrom}
                            onChange={(e) => setReplaceFrom(parseInt(e.target.value) || 1)}
                            min={1}
                        />
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                        {/* Save */}
                        <button
                            onClick={handleSave}
                            className="px-5 py-1.5 text-[11px] font-semibold text-teal-600 border border-teal-500/50 rounded-md hover:bg-teal-500 hover:text-white transition-all"
                        >
                            Save
                        </button>

                        {/* Generate */}
                        <button
                            onClick={() => onGenerate(rt.id, entityName, { name, content, extraEntities, replaceFrom, isV2 })}
                            className="px-5 py-1.5 text-[11px] font-semibold text-white bg-teal-500 border border-teal-500 rounded-md hover:bg-teal-600 transition-all"
                        >
                            Generate
                        </button>

                        {/* Delete */}
                        <button
                            onClick={() => onDelete(rt.id)}
                            className="px-5 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-red-400 transition-all"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

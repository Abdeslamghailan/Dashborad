import React from 'react';
import { ChangeHistoryEntry } from './ChangeHistory';
import { Trash2 } from 'lucide-react';
import { Entity } from '../../types';

interface HistoryTableProps {
    history: ChangeHistoryEntry[];
    entities?: Entity[];
    onDelete?: (id: number) => void;
    isAdmin?: boolean;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({ history, entities = [], onDelete, isAdmin }) => {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatField = (field: string | null) => {
        if (!field) return '-';
        // Format drop[0].value -> Drop 1 Value
        return field
            .replace(/drop\[(\d+)\]/g, (_, i) => `Drop ${parseInt(i) + 1}`)
            .replace(/\./g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    };

    const formatEntityId = (id: string | null, entry?: ChangeHistoryEntry) => {
        if (!id) return '-';

        // 0. Primary source: Check the entities list if provided
        const knownEntity = entities.find(e => e.id === id);
        if (knownEntity) return knownEntity.name;

        // Check if it's a UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        if ((isUuid || id.startsWith('ent_')) && entry) {
            // 1. Try to find name in descriptions
            const patterns = [/for "([^"]+)"/, /script "([^"]+)"/, /scenario "([^"]+)"/, /"([^"]+)"/];
            for (const pattern of patterns) {
                const match = entry.description.match(pattern);
                if (match && match[1]) return match[1];
            }

            // 2. Try to find name in categoryName or profileName
            if (entry.categoryName) return entry.categoryName;
            if (entry.profileName) return entry.profileName;

            // 3. Try to parse JSON for 'name' or 'profileName'
            try {
                const data = JSON.parse(entry.newValue || entry.oldValue || '{}');
                if (data.name) return data.name;
                if (data.profileName) return data.profileName;
            } catch (e) { }
        }

        return id.replace(/^ent_/, '').toUpperCase();
    };

    const formatValue = (val: any, entry?: ChangeHistoryEntry) => {
        if (val === null || val === undefined || val === '') return <span className="text-gray-400 italic">empty</span>;

        let data = val;
        if (typeof val === 'string') {
            try {
                data = JSON.parse(val);
            } catch {
                // Not JSON, keep as string
            }
        }

        // Handle specific entity types
        const type = entry?.entityType?.toLowerCase();
        if (type === 'dayplan' || entry?.fieldChanged === 'Day Plan') {
            return renderDayPlanData(data);
        }

        if (type === 'limits' && entry?.fieldChanged?.startsWith('intervals')) {
            const reason = entry.fieldChanged.replace('intervals', '').replace('Paused', ' ');
            return (
                <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-bold border border-orange-200 uppercase">
                        {reason}
                    </span>
                    <span className="font-mono font-bold text-indigo-600">{String(data)}</span>
                </div>
            );
        }

        if (typeof data === 'object' && data !== null) {
            return renderSmartObject(data);
        }

        if (typeof data === 'boolean') {
            return (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${data ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'}`}>
                    {data ? 'True' : 'False'}
                </span>
            );
        }

        const str = String(data);
        if (str.length > 100) return <span title={str}>{str.substring(0, 100)}...</span>;
        return <span className="font-mono text-gray-700">{str}</span>;
    };

    const renderDayPlanData = (data: any) => {
        if (!data) return <span className="text-gray-400 italic">empty</span>;

        // If data is the full DayPlan model, extract sessionData
        let sessionData = data;
        if (data.sessionData) {
            try {
                sessionData = typeof data.sessionData === 'string' ? JSON.parse(data.sessionData) : data.sessionData;
            } catch (e) {
                return <span className="text-rose-500">Error parsing data</span>;
            }
        }

        if (typeof sessionData !== 'object' || sessionData === null) return String(data);

        const sessions = Object.entries(sessionData);
        if (sessions.length === 0) return <span className="text-gray-400 italic">Empty Plan</span>;

        return (
            <div className="flex flex-col gap-1.5 py-1">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <span className="font-bold text-indigo-900 text-[11px]">Day Plan ({sessions.length} sessions)</span>
                </div>
                <div className="grid grid-cols-1 gap-1">
                    {sessions.slice(0, 5).map(([idx, session]: [string, any]) => {
                        const sIdx = parseInt(idx);
                        if (isNaN(sIdx)) return null; // Skip non-numeric keys if any
                        return (
                            <div key={idx} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                <span className="text-gray-500 font-bold text-[9px]">S{sIdx + 1}</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-indigo-600 font-mono font-bold text-[10px]">{session.step ?? '?'}</span>
                                    <span className="text-gray-300">/</span>
                                    <span className="text-amber-600 font-mono font-bold text-[10px]">{session.start ?? '?'}</span>
                                </div>
                            </div>
                        );
                    })}
                    {sessions.length > 5 && (
                        <div className="text-[9px] text-gray-400 italic pl-2">
                            + {sessions.length - 5} more sessions...
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderSmartObject = (obj: any) => {
        if (Array.isArray(obj)) {
            if (obj.length === 0) return <span className="text-gray-400">[]</span>;
            if (typeof obj[0] === 'object') return <span className="text-indigo-600 font-medium">Array({obj.length} items)</span>;
            return <span className="font-mono text-gray-700">[{obj.join(', ')}]</span>;
        }

        // Handle specific object types
        if (obj.status && Object.keys(obj).length < 10) {
            return (
                <div className="flex flex-col gap-1 py-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Status</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${obj.status === 'active' || obj.status === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                            }`}>
                            {obj.status}
                        </span>
                    </div>
                    {obj.name && <div className="text-[10px] font-bold text-gray-800 truncate">Name: {obj.name}</div>}
                    {obj.taskCode && <div className="text-[10px] font-bold text-indigo-600">Task: {obj.taskCode}</div>}
                </div>
            );
        }

        // For complex entity data
        if (obj.reporting || obj.limitsConfiguration) {
            return (
                <div className="flex flex-col gap-1 py-1">
                    <span className="font-bold text-gray-900 text-[11px]">Configuration Update</span>
                    <div className="flex flex-wrap gap-1">
                        {obj.reporting?.parentCategories && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px] font-bold border border-blue-100">
                                {obj.reporting.parentCategories.length} Categories
                            </span>
                        )}
                        {obj.limitsConfiguration && (
                            <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[9px] font-bold border border-purple-100">
                                {obj.limitsConfiguration.length} Limits
                            </span>
                        )}
                    </div>
                </div>
            );
        }

        const keys = Object.keys(obj);
        if (keys.length <= 5) {
            return (
                <div className="flex flex-col gap-1 py-1">
                    {keys.map(k => (
                        <div key={k} className="text-[9px] flex items-center justify-between gap-3 bg-gray-50/50 px-1.5 py-0.5 rounded">
                            <span className="text-gray-400 font-bold uppercase tracking-tighter">{k}</span>
                            <span className="text-gray-800 font-mono font-bold truncate max-w-[80px]">{String(obj[k])}</span>
                        </div>
                    ))}
                </div>
            );
        }

        return <span className="text-gray-500 italic">Object ({keys.length} fields)</span>;
    };

    const getChangeTypeBadge = (type: string) => {
        const base = "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm";
        switch (type.toLowerCase()) {
            case 'create': return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
            case 'delete': return `${base} bg-rose-50 text-rose-700 border-rose-200`;
            case 'update': return `${base} bg-indigo-50 text-indigo-700 border-indigo-200`;
            default: return `${base} bg-gray-50 text-gray-700 border-gray-200`;
        }
    };

    return (
        <div className="overflow-hidden border border-gray-200 rounded-xl bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Context</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Target</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Field</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Old Value</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">New Value</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                            {isAdmin && <th className="px-4 py-3"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {history.map((entry) => (
                            <tr key={entry.id} className="hover:bg-gray-50 transition-colors group">
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-gray-900 font-medium">{new Date(entry.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                                    <div className="text-gray-400 text-[11px]">{new Date(entry.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="font-semibold text-gray-900">{entry.username}</div>
                                    <div className="text-[10px] text-gray-400 uppercase font-medium">{entry.userRole}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-[11px] text-gray-600">
                                        <span className="text-gray-400 font-medium">Name:</span> {formatEntityId(entry.entityId, entry)}
                                    </div>
                                    {entry.methodId && (
                                        <div className="text-[11px] text-indigo-600 font-medium">
                                            <span className="text-gray-400 font-medium">Method:</span> {entry.methodId}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-[11px] font-medium text-gray-700">
                                        {entry.categoryName || entry.categoryId || entry.profileName || entry.profileId || '-'}
                                    </div>
                                    <div className="text-[10px] text-gray-400 uppercase">{entry.entityType}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <span className="text-[11px] font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                                        {formatField(entry.fieldChanged)}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-xs max-w-[200px]">
                                    <div className="line-clamp-3 text-gray-600">
                                        {formatValue(entry.oldValue, entry)}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-xs max-w-[200px]">
                                    <div className="line-clamp-3 text-gray-900 font-medium">
                                        {formatValue(entry.newValue, entry)}
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                    <span className={getChangeTypeBadge(entry.changeType)}>
                                        {entry.changeType}
                                    </span>
                                </td>
                                {isAdmin && (
                                    <td className="px-4 py-3 whitespace-nowrap text-right">
                                        <button
                                            onClick={() => onDelete?.(entry.id)}
                                            className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            title="Delete Entry"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

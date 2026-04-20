
import React from 'react';
import { useCMHWStore } from './useCMHWStore';
import { Plus, Trash2, Box } from 'lucide-react';

interface CMHWSidebarProps {
    onSelect: (id: number) => void;
    selectedId: number | null;
    onAddEntity: () => void;
    onDeleteEntity: (id: number, name: string) => void;
    title?: string;
}

export const CMHWSidebar: React.FC<CMHWSidebarProps> = ({
    onSelect,
    selectedId,
    onAddEntity,
    onDeleteEntity,
    title = "Entities"
}) => {
    const { entities, currentUser } = useCMHWStore();
    const isAdmin = currentUser?.role === 'admin';

    return (
        <aside className="w-64 shrink-0 flex flex-col bg-white border-r border-slate-200 h-full overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Box size={12} /> {title}
                    </span>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        {entities.length}
                    </span>
                </div>
                {isAdmin && (
                    <button
                        onClick={onAddEntity}
                        className="w-full py-2 px-3 flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold border-2 border-dashed border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition-all"
                    >
                        <Plus size={14} /> New Entity
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                {entities.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No entities found</p>
                    </div>
                ) : (
                    entities.map((entity) => (
                        <div
                            key={entity.id}
                            onClick={() => onSelect(entity.id)}
                            className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-l-4 ${selectedId === entity.id
                                    ? 'bg-indigo-50 border-indigo-600'
                                    : 'border-transparent hover:bg-slate-50'
                                }`}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full ${selectedId === entity.id ? 'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]' : 'bg-slate-200'
                                }`} />
                            <span className={`flex-1 text-sm font-bold truncate ${selectedId === entity.id ? 'text-indigo-900' : 'text-slate-600 group-hover:text-slate-900'
                                }`}>
                                {entity.name}
                            </span>
                            {isAdmin && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteEntity(entity.id, entity.name);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                    <Trash2 size={13} />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </aside>
    );
};

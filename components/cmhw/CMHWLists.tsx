
import React, { useState, useEffect, useMemo } from 'react';
import { useCMHWStore } from './useCMHWStore';
import { cmhwApi } from './cmhwApi';
import { CMHWSidebar } from './CMHWSidebar';
import { CMHWReportingTypeCard } from './CMHWReportingTypeCard';
import { CMHWModal } from './CMHWModal';
import { ClipboardList, Plus, Filter, Globe2, RefreshCw } from 'lucide-react';

export const CMHWLists: React.FC = () => {
    const { entities, setEntities, selectedListsEntityId, setSelectedListsEntityId, currentUser, setCurrentUser } = useCMHWStore();
    const [modal, setModal] = useState<any>(null);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    const entity = entities.find(e => e.id === selectedListsEntityId) || null;

    const refreshData = async () => {
        try {
            if (!currentUser) {
                const user = await cmhwApi.me();
                setCurrentUser(user);
            }
            const data = await cmhwApi.getEntities();
            setEntities(data);
        } catch (err) {
            console.error('Failed to load CMHW data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshData();
    }, []);

    const handleAddEntity = () => {
        setModal({
            title: 'New Entity',
            fields: [{ id: 'name', label: 'Entity Name', placeholder: 'e.g. CMH2' }],
            onConfirm: async (vals: any) => {
                if (!vals.name) return;
                await cmhwApi.createEntity(vals.name);
                await refreshData();
            }
        });
    };

    const handleDeleteEntity = async (id: number, name: string) => {
        if (!window.confirm(`Delete entity "${name}" and ALL its data?`)) return;
        await cmhwApi.deleteEntity(id);
        if (selectedListsEntityId === id) {
            setSelectedListsEntityId(null);
        }
        await refreshData();
    };

    const handleAddRT = () => {
        if (!selectedListsEntityId) return;
        setModal({
            title: 'New Reporting Type',
            fields: [{ id: 'name', label: 'Name', placeholder: 'e.g. IP 1 REPORTING' }],
            onConfirm: async (vals: any) => {
                if (!vals.name) return;
                await cmhwApi.createReportingType(selectedListsEntityId, vals.name);
                await refreshData();
            }
        });
    };

    const handleSaveRT = async (id: number, data: any) => {
        await cmhwApi.updateReportingType(id, data);
        await refreshData();
    };

    const handleDeleteRT = async (id: number) => {
        if (!window.confirm('Delete this reporting type?')) return;
        await cmhwApi.deleteReportingType(id);
        await refreshData();
    };

    const handleGenerate = async (rtId: number, entityName: string) => {
        const ent = entities.find((e: any) => e.name === entityName);
        if (!ent) return;
        const rt = ent.reporting_types?.find((r: any) => r.id === rtId);
        if (!rt) return;

        try {
            const data = {
                reportingType: rt.name,
                entity: entityName,
                content: rt.content,
                isV2: rt.is_v2,
                extraEntities: rt.extra_entities || [],
                replaceFrom: rt.replace_from || 1
            };

            const res = await cmhwApi.createSessionToken(data);
            // If the dashboard is on HTTPS (Netlify), browsers may block opening an HTTP URL.
            // We use the IP directly but suggest checking protocol.
            const targetHost = '95.216.72.6:90';
            const url = `http://${targetHost}/seed/email/sessions#CMHW-MANAGER|${res.token}`;
            
            console.log('Opening session URL:', url);
            window.open(url, '_blank');
        } catch (e: any) {
            console.error('Generate failed', e);
            alert('Generate failed: ' + (e.message || 'Unknown error'));
        }
    };

    const filteredRTs = useMemo(() => {
        if (!entity?.reporting_types) return [];
        let rts = entity.reporting_types;
        // Fix for backend returning all plans in every entity
        if (rts.length > 0 && 'entity_id' in rts[0]) {
            rts = rts.filter((r: any) => r.entity_id === entity.id);
        }
        return rts.filter((r: any) => {
            const isV2 = r.is_v2 === true || r.is_v2 === 1 || r.is_v2 === '1';
            if (filter === 'all') return true;
            if (filter === 'v2') return isV2;
            if (filter === 'classic') return !isV2;
            return true;
        });
    }, [entity, filter]);

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-180px)] items-center justify-center bg-white rounded-[32px] border border-slate-200/60 shadow-xl overflow-hidden">
                <div className="flex flex-col items-center gap-5">
                    <div className="w-12 h-12 border-4 border-teal-100 border-t-teal-500 rounded-full animate-spin" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Loading reporting modules…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-180px)] bg-white rounded-[32px] border border-slate-200/60 shadow-xl overflow-hidden animate-in fade-in duration-500">
            <CMHWSidebar
                onSelect={setSelectedListsEntityId}
                selectedId={selectedListsEntityId}
                onAddEntity={handleAddEntity}
                onDeleteEntity={handleDeleteEntity}
                title="CMHW Entities"
            />

            <section className="flex-1 flex flex-col min-w-0 bg-slate-50/10">
                <header className="px-8 py-5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[18px] bg-teal-500 flex items-center justify-center shadow-lg shadow-teal-100">
                            <ClipboardList size={22} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-3">
                                Lists & Reporting
                                {entity && (
                                    <span className="px-3 py-1 bg-teal-50 text-teal-600 rounded-full text-xs font-black border border-teal-100 not-italic tracking-normal normal-case">
                                        {entity.name}
                                    </span>
                                )}
                            </h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Configure session types and reporting logic</p>
                        </div>
                    </div>

                    {entity && (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center bg-slate-100/80 p-1 rounded-[16px] border border-slate-200/50 shadow-inner">
                                <button
                                    onClick={() => setFilter('all')}
                                    className={`px-4 py-2 rounded-[12px] text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setFilter('classic')}
                                    className={`px-4 py-2 rounded-[12px] text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${filter === 'classic' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Classic
                                </button>
                                <button
                                    onClick={() => setFilter('v2')}
                                    className={`px-4 py-2 rounded-[12px] text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${filter === 'v2' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    V2
                                </button>
                            </div>
                            <button
                                onClick={handleAddRT}
                                className="group flex items-center gap-2 px-5 py-3 text-[11px] font-black uppercase tracking-[0.15em] text-white bg-slate-900 hover:bg-teal-500 rounded-[16px] transition-all duration-300 shadow-lg hover:shadow-teal-100 active:scale-95"
                            >
                                <Plus size={15} className="group-hover:rotate-90 transition-transform duration-300" /> New Type
                            </button>
                        </div>
                    )}
                </header>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {!entity ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-20 h-20 bg-white rounded-3xl border-2 border-slate-100 flex items-center justify-center shadow-sm text-slate-200">
                                <Globe2 size={40} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Select Entity</h3>
                                <p className="text-sm text-slate-400 font-medium">Choose a node from the left to view reporting lists.</p>
                            </div>
                        </div>
                    ) : filteredRTs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-20 h-20 bg-white rounded-3xl border-2 border-slate-100 flex items-center justify-center shadow-sm text-slate-200">
                                <Filter size={40} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">No Matching Results</h3>
                                <p className="text-sm text-slate-400 font-medium">Try changing your filter or create a new reporting type.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto">
                            {filteredRTs.map((r: any) => (
                                <CMHWReportingTypeCard
                                    key={r.id}
                                    rt={r}
                                    entityName={entity.name}
                                    onSave={handleSaveRT}
                                    onDelete={handleDeleteRT}
                                    onGenerate={handleGenerate}
                                />
                            ))}
                        </div>
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

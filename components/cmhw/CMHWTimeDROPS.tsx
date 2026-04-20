
import React, { useState, useEffect } from 'react';
import { useCMHWStore } from './useCMHWStore';
import { cmhwApi } from './cmhwApi';
import { CMHWSidebar } from './CMHWSidebar';
import { CMHWPlanCard } from './CMHWPlanCard';
import { CMHWModal } from './CMHWModal';
import { Zap, LayoutGrid, Info } from 'lucide-react';

export const CMHWTimeDROPS: React.FC = () => {
    const { entities, setEntities, selectedTimedropEntityId, setSelectedTimedropEntityId, currentUser, setCurrentUser } = useCMHWStore();
    const [modal, setModal] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const entity = entities.find(e => e.id === selectedTimedropEntityId) || null;

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
        if (selectedTimedropEntityId === id) {
            setSelectedTimedropEntityId(null);
        }
        await refreshData();
    };

    const handleAddPlan = () => {
        if (!selectedTimedropEntityId) return;
        setModal({
            title: 'New Plan',
            fields: [{ id: 'name', label: 'Plan Name', placeholder: 'e.g. Plan-reporting-CMH2 (IP2) [A]' }],
            onConfirm: async (vals: any) => {
                if (!vals.name) return;
                await cmhwApi.createPlan(selectedTimedropEntityId, vals.name);
                await refreshData();
            }
        });
    };

    const handleSavePlan = async (id: number, name: string, timing_rows: string[]) => {
        await cmhwApi.updatePlan(id, name, timing_rows);
        await refreshData();
    };

    const handleDeletePlan = async (id: number) => {
        if (!window.confirm('Delete this plan?')) return;
        await cmhwApi.deletePlan(id);
        await refreshData();
    };

    if (loading) {
        return (
            <div className="flex h-[600px] items-center justify-center bg-white rounded-3xl border-2 border-slate-100">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Initializing CMHW Engine...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-180px)] bg-white rounded-3xl border-2 border-slate-100 shadow-xl overflow-hidden animate-in fade-in duration-500">
            <CMHWSidebar
                onSelect={setSelectedTimedropEntityId}
                selectedId={selectedTimedropEntityId}
                onAddEntity={handleAddEntity}
                onDeleteEntity={handleDeleteEntity}
                title="CMHW Entities"
            />

            <section className="flex-1 flex flex-col min-w-0 bg-slate-50/30">
                <header className="px-8 py-6 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20`}>
                            <Zap size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-3">
                                TimeDROPS Manager
                                {entity && (
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold border border-indigo-100 not-italic tracking-normal normal-case">
                                        {entity.name}
                                    </span>
                                )}
                            </h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Manage timing plans and execution sequences</p>
                        </div>
                    </div>

                    {entity && (
                        <button
                            onClick={handleAddPlan}
                            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:translate-y-0.5"
                        >
                            <LayoutGrid size={16} /> New Plan
                        </button>
                    )}
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {!entity ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-20 h-20 bg-white rounded-3xl border-2 border-slate-100 flex items-center justify-center shadow-sm text-slate-200">
                                <Info size={40} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">No Entity Selected</h3>
                                <p className="text-sm text-slate-400 font-medium">Please select an entity from the sidebar to manage plans.</p>
                            </div>
                        </div>
                    ) : !entity.plans || entity.plans.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-20 h-20 bg-white rounded-3xl border-2 border-slate-100 flex items-center justify-center shadow-sm text-slate-200">
                                <LayoutGrid size={40} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">No Plans Created</h3>
                                <p className="text-sm text-slate-400 font-medium">Click the button above to create your first timing plan.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-7xl">
                            {entity.plans.map(p => (
                                <CMHWPlanCard
                                    key={p.id}
                                    plan={p}
                                    onSave={handleSavePlan}
                                    onDelete={handleDeletePlan}
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

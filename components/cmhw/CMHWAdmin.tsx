
import React, { useState, useEffect } from 'react';
import { useCMHWStore } from './useCMHWStore';
import { cmhwApi } from './cmhwApi';
import { CMHWModal } from './CMHWModal';
import { ShieldCheck, Users, Lock, ChevronRight, UserPlus, ToggleLeft, ToggleRight, Edit3 } from 'lucide-react';

export const CMHWAdmin: React.FC = () => {
    const { entities } = useCMHWStore();
    const [activeTab, setActiveTab] = useState<'users' | 'access'>('users');
    const [users, setUsers] = useState<any[]>([]);
    const [modal, setModal] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Access panel state
    const [selectedUserId, setSelectedUserId] = useState('');
    const [accessData, setAccessData] = useState<any>(null);
    const [selectedEntityIds, setSelectedEntityIds] = useState<number[]>([]);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const data = await cmhwApi.getUsers();
            setUsers(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = () => {
        setModal({
            title: 'Initialize Security Node',
            fields: [
                { id: 'username', label: 'Access Identifier', placeholder: 'e.g. jdoe_01' },
                { id: 'email', label: 'Secure Email', placeholder: 'user@cmhw.internal' },
                { id: 'password', label: 'Node Key (Required)', placeholder: '••••••••' },
                { id: 'role', label: 'Access Tier (user/admin)', placeholder: 'user' }
            ],
            onConfirm: async (vals: any) => {
                if (!vals.username || !vals.email || !vals.password) return;
                await cmhwApi.createUser(vals);
                await loadUsers();
            }
        });
    };

    const handleEditUser = (u: any) => {
        setModal({
            title: `Updating Node: ${u.username}`,
            fields: [
                { id: 'username', label: 'Access Identifier', placeholder: u.username },
                { id: 'email', label: 'Secure Email', placeholder: u.email },
                { id: 'role', label: 'Access Tier', placeholder: u.role },
                { id: 'password', label: 'New Node Key (Optional)', placeholder: '••••••••' }
            ],
            onConfirm: async (vals: any) => {
                const body: any = {
                    username: vals.username || u.username,
                    email: vals.email || u.email,
                    role: vals.role || u.role
                };
                if (vals.password) body.password = vals.password;
                await cmhwApi.updateUser(u.id, body);
                await loadUsers();
            }
        });
    };

    const handleToggleStatus = async (id: number, currentlyActive: boolean) => {
        await cmhwApi.updateUser(id, { is_active: !currentlyActive });
        await loadUsers();
    };

    const handleLoadAccess = async (userId: string) => {
        setSelectedUserId(userId);
        if (!userId) {
            setAccessData(null);
            return;
        }
        try {
            const data = await cmhwApi.getUserAccess(parseInt(userId));
            setAccessData(data);
            setSelectedEntityIds(data.entity_ids || []);
        } catch (e) {
            setAccessData(null);
        }
    };

    const toggleEntityAccess = (entityId: number) => {
        setSelectedEntityIds(prev =>
            prev.includes(entityId)
                ? prev.filter(id => id !== entityId)
                : [...prev, entityId]
        );
    };

    const selectAll = (select: boolean) => {
        if (select) {
            setSelectedEntityIds(entities.map(e => e.id));
        } else {
            setSelectedEntityIds([]);
        }
    };

    const saveAccess = async () => {
        if (!selectedUserId) return;
        await cmhwApi.setUserAccess(parseInt(selectedUserId), selectedEntityIds);
        alert('Access protocol updated');
    };

    if (loading) {
        return <div className="p-10 text-center font-black text-slate-400 uppercase tracking-widest animate-pulse">Synchronizing Admin Privileges...</div>;
    }

    return (
        <div className="bg-white rounded-[32px] border-2 border-slate-100 shadow-xl overflow-hidden flex flex-col min-h-[700px] animate-in slide-in-from-bottom-6 duration-700">
            <header className="px-10 py-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xl shadow-slate-900/20">
                        <ShieldCheck size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none mb-1">CMHW Control Center</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Security tier management & node authorization</p>
                    </div>
                </div>

                <nav className="flex items-center bg-white p-1.5 rounded-2xl border border-slate-200">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Users size={16} /> User Nodes
                    </button>
                    <button
                        onClick={() => setActiveTab('access')}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'access' ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Lock size={16} /> Encryption Access
                    </button>
                </nav>
            </header>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                {activeTab === 'users' ? (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Authorized Backend Personnel</span>
                            <button
                                onClick={handleCreateUser}
                                className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-wider hover:border-slate-900 transition-all shadow-sm"
                            >
                                <UserPlus size={16} /> Node Registration
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">ID / Ident</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Tiers</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Node Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono text-right">Operation</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {users.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-800">{u.username}</span>
                                                    <span className="text-[11px] font-medium text-slate-400">{u.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${u.role === 'admin' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    }`}>
                                                    Tier: {u.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${u.is_active ? 'text-slate-600' : 'text-slate-300'}`}>
                                                        {u.is_active ? 'Synchronized' : 'Offline'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handleEditUser(u)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all"><Edit3 size={16} /></button>
                                                    <button onClick={() => handleToggleStatus(u.id, u.is_active)} className={`p-2 transition-all rounded-xl ${u.is_active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-300 hover:text-rose-500 hover:bg-rose-50'}`}>
                                                        {u.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
                        <div className="bg-slate-50 border-2 border-slate-100 rounded-3xl p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center"><ChevronRight size={18} /></div>
                                <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Authorization Target</span>
                            </div>
                            <select
                                className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-slate-700 focus:border-slate-900 outline-none transition-all uppercase text-sm tracking-widest"
                                value={selectedUserId}
                                onChange={e => handleLoadAccess(e.target.value)}
                            >
                                <option value="">— Initialize Connection —</option>
                                {users.filter(u => u.role !== 'admin').map(u => (
                                    <option key={u.id} value={u.id}>{u.username.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>

                        {!accessData ? (
                            <div className="py-20 text-center space-y-6">
                                <div className="w-20 h-20 bg-slate-50 rounded-[40px] flex items-center justify-center mx-auto text-slate-200 border-2 border-dashed border-slate-100">
                                    <Lock size={32} />
                                </div>
                                <p className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">Awaiting node selection for decryption matrix</p>
                            </div>
                        ) : (
                            <div className="space-y-8 animate-in slide-in-from-top-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Entitlements for node: <span className="text-slate-900">{accessData.username}</span></span>
                                    <div className="flex gap-2">
                                        <button onClick={() => selectAll(true)} className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700">All</button>
                                        <span className="text-slate-200">/</span>
                                        <button onClick={() => selectAll(false)} className="text-[10px] font-black uppercase text-rose-500">None</button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {entities.map(e => (
                                        <div
                                            key={e.id}
                                            onClick={() => toggleEntityAccess(e.id)}
                                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${selectedEntityIds.includes(e.id) ? 'bg-slate-950 border-slate-950 text-white shadow-xl shadow-slate-950/20' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded-lg flex items-center justify-center border ${selectedEntityIds.includes(e.id) ? 'bg-indigo-500 border-indigo-400' : 'bg-slate-50 border-slate-200'}`}>
                                                {selectedEntityIds.includes(e.id) && <ChevronRight size={14} className="text-white" />}
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-widest truncate">{e.name}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-8">
                                    <button
                                        onClick={saveAccess}
                                        className="w-full py-5 bg-slate-950 text-white rounded-[24px] text-xs font-black uppercase tracking-[0.3em] hover:bg-indigo-600 transition-all shadow-2xl active:translate-y-1"
                                    >
                                        Update Access Metadata
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

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

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Users, UserPlus, Hash, Palette, Check, X, Shield, Info, MoreVertical, LayoutGrid, Box } from 'lucide-react';
import { Button } from '../ui/Button';
import { API_URL } from '../../config';
import { apiService } from '../../services/apiService';

interface Team {
    id: string;
    name: string;
    displayName: string;
    order: number;
    color?: string;
    mailers?: Mailer[];
}

interface Mailer {
    id: string;
    name: string;
    teamId: string;
    order: number;
    isActive: boolean;
}

interface PlanningPreset {
    id: string;
    label: string;
    codes: string[];
    color: string;
    order: number;
}

export const TeamsTab: React.FC = () => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [presets, setPresets] = useState<PlanningPreset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeSubTab, setActiveSubTab] = useState<'teams' | 'presets'>('teams');

    // Modal states
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [teamForm, setTeamForm] = useState<Partial<Team>>({ name: '', displayName: '', color: '#3B82F6', order: 0 });

    const [isMailerModalOpen, setIsMailerModalOpen] = useState(false);
    const [editingMailer, setEditingMailer] = useState<Mailer | null>(null);
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [mailerForm, setMailerForm] = useState<Partial<Mailer>>({ name: '', order: 0, isActive: true });

    const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
    const [editingPreset, setEditingPreset] = useState<PlanningPreset | null>(null);
    const [presetForm, setPresetForm] = useState<Partial<PlanningPreset>>({ label: '', codes: [], color: '#10B981', order: 0 });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [teamsData, presetsData] = await Promise.all([
                apiService.getPlanningTeams(),
                apiService.getPlanningPresets()
            ]);

            setTeams(teamsData);
            setPresets(presetsData);
        } catch (error) {
            console.error('Error fetching planning data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSaveTeam = async () => {
        try {
            const teamData = {
                ...teamForm,
                ...(editingTeam ? { id: editingTeam.id } : {})
            };

            await apiService.savePlanningTeam(teamData);
            fetchData();
            setIsTeamModalOpen(false);
            setEditingTeam(null);
        } catch (error) {
            console.error('Error saving team:', error);
        }
    };

    const handleDeleteTeam = async (id: string) => {
        if (!confirm('Delete this team and all its mailers?')) return;
        try {
            await apiService.deletePlanningTeam(id);
            fetchData();
        } catch (error) {
            console.error('Error deleting team:', error);
        }
    };

    const handleSaveMailer = async () => {
        try {
            const mailerData = {
                ...mailerForm,
                teamId: selectedTeamId,
                ...(editingMailer ? { id: editingMailer.id } : {})
            };

            await apiService.savePlanningMailer(mailerData);
            fetchData();
            setIsMailerModalOpen(false);
            setEditingMailer(null);
        } catch (error) {
            console.error('Error saving mailer:', error);
        }
    };

    const handleDeleteMailer = async (id: string) => {
        if (!confirm('Delete this mailer?')) return;
        try {
            await apiService.deletePlanningMailer(id);
            fetchData();
        } catch (error) {
            console.error('Error deleting mailer:', error);
        }
    };

    const handleSavePreset = async () => {
        try {
            const presetData = {
                ...presetForm,
                ...(editingPreset ? { id: editingPreset.id } : {})
            };

            await apiService.savePlanningPreset(presetData);
            fetchData();
            setIsPresetModalOpen(false);
            setEditingPreset(null);
        } catch (error) {
            console.error('Error saving preset:', error);
        }
    };

    const handleDeletePreset = async (id: string) => {
        if (!confirm('Delete this preset?')) return;
        try {
            await apiService.deletePlanningPreset(id);
            fetchData();
        } catch (error) {
            console.error('Error deleting preset:', error);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Team Planning Management</h2>
                    <p className="text-gray-500">Manage teams, mailers, and task presets for scheduling</p>
                </div>
                <div className="flex gap-2 bg-white p-1 rounded-xl border border-gray-200">
                    <button
                        onClick={() => setActiveSubTab('teams')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeSubTab === 'teams' ? 'bg-[#6FC5E8] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        Teams & Mailers
                    </button>
                    <button
                        onClick={() => setActiveSubTab('presets')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeSubTab === 'presets' ? 'bg-[#6FC5E8] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        Task Presets
                    </button>
                </div>
            </div>

            {activeSubTab === 'teams' ? (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <Button onClick={() => { setEditingTeam(null); setTeamForm({ name: '', displayName: '', color: '#3B82F6', order: teams.length }); setIsTeamModalOpen(true); }} leftIcon={<Plus size={18} />}>
                            Add Team
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {teams.map(team => (
                            <motion.div
                                key={team.id}
                                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                            >
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.color }}></div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{team.displayName}</h3>
                                            <p className="text-xs text-gray-500 font-mono uppercase">{team.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => { setSelectedTeamId(team.id); setEditingMailer(null); setMailerForm({ name: '', order: team.mailers?.length || 0, isActive: true }); setIsMailerModalOpen(true); }}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Add Mailer"
                                        >
                                            <UserPlus size={18} />
                                        </button>
                                        <button
                                            onClick={() => { setEditingTeam(team); setTeamForm(team); setIsTeamModalOpen(true); }}
                                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTeam(team.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-2">
                                        {team.mailers?.map(mailer => (
                                            <div key={mailer.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 transition-all group">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${mailer.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                                    <span className={`font-medium ${mailer.isActive ? 'text-gray-900' : 'text-gray-500'}`}>{mailer.name}</span>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => { setEditingMailer(mailer); setMailerForm(mailer); setSelectedTeamId(team.id); setIsMailerModalOpen(true); }}
                                                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteMailer(mailer.id)}
                                                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {(!team.mailers || team.mailers.length === 0) && (
                                            <p className="text-center py-4 text-sm text-gray-500 italic">No mailers in this team</p>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <Button onClick={() => { setEditingPreset(null); setPresetForm({ label: '', codes: [], color: '#10B981', order: presets.length }); setIsPresetModalOpen(true); }} leftIcon={<Plus size={18} />}>
                            Add Preset
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {presets.map(preset => (
                            <motion.div
                                key={preset.id}
                                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: preset.color }}></div>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="px-3 py-1 rounded-lg text-white font-bold text-sm shadow-sm" style={{ backgroundColor: preset.color }}>
                                        {preset.label}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => { setEditingPreset(preset); setPresetForm(preset); setIsPresetModalOpen(true); }} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
                                        <button onClick={() => handleDeletePreset(preset.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {preset.codes.map((code, idx) => (
                                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-md border border-gray-200">
                                            {code}
                                        </span>
                                    ))}
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                    <span>ORDER: {preset.order}</span>
                                    <span>{preset.codes.length} CODES</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modals Implementation (Simplified for brevity, but functional) */}
            <AnimatePresence>
                {(isTeamModalOpen || isMailerModalOpen || isPresetModalOpen) && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                        >
                            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                                <h3 className="font-bold text-gray-900 text-lg">
                                    {isTeamModalOpen ? (editingTeam ? 'Edit Team' : 'Add Team') :
                                        isMailerModalOpen ? (editingMailer ? 'Edit Mailer' : 'Add Mailer') :
                                            (editingPreset ? 'Edit Preset' : 'Add Preset')}
                                </h3>
                                <button onClick={() => { setIsTeamModalOpen(false); setIsMailerModalOpen(false); setIsPresetModalOpen(false); }} className="p-2 hover:bg-gray-200 rounded-lg transition-colors"><X size={20} /></button>
                            </div>

                            <div className="p-6 space-y-4">
                                {isTeamModalOpen && (
                                    <>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">System Name (e.g. HOTMAIL)</label>
                                            <input type="text" value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value.toUpperCase() })} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Display Name</label>
                                            <input type="text" value={teamForm.displayName} onChange={e => setTeamForm({ ...teamForm, displayName: e.target.value })} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Color</label>
                                                <div className="flex gap-2 mt-1">
                                                    <input type="color" value={teamForm.color} onChange={e => setTeamForm({ ...teamForm, color: e.target.value })} className="w-10 h-10 p-1 bg-white border border-gray-200 rounded-lg" />
                                                    <input type="text" value={teamForm.color} onChange={e => setTeamForm({ ...teamForm, color: e.target.value })} className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm" />
                                                </div>
                                            </div>
                                            <div className="w-24">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Order</label>
                                                <input type="number" value={teamForm.order} onChange={e => setTeamForm({ ...teamForm, order: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl" />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {isMailerModalOpen && (
                                    <>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Mailer Name</label>
                                            <input type="text" value={mailerForm.name} onChange={e => setMailerForm({ ...mailerForm, name: e.target.value })} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Order</label>
                                                <input type="number" value={mailerForm.order} onChange={e => setMailerForm({ ...mailerForm, order: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl" />
                                            </div>
                                            <label className="flex items-center gap-3 cursor-pointer mt-6">
                                                <input type="checkbox" checked={mailerForm.isActive} onChange={e => setMailerForm({ ...mailerForm, isActive: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                                <span className="text-sm font-bold text-gray-700">Active</span>
                                            </label>
                                        </div>
                                    </>
                                )}

                                {isPresetModalOpen && (
                                    <>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Label (e.g. CMH3-CMH9)</label>
                                            <input type="text" value={presetForm.label} onChange={e => setPresetForm({ ...presetForm, label: e.target.value })} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Task Codes (comma separated)</label>
                                            <input type="text" value={presetForm.codes?.join(', ')} onChange={e => setPresetForm({ ...presetForm, codes: e.target.value.split(',').map(s => s.trim()).filter(s => s) })} placeholder="CMH1, CMH2" className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Color</label>
                                                <div className="flex gap-2 mt-1">
                                                    <input type="color" value={presetForm.color} onChange={e => setPresetForm({ ...presetForm, color: e.target.value })} className="w-10 h-10 p-1 bg-white border border-gray-200 rounded-lg" />
                                                    <input type="text" value={presetForm.color} onChange={e => setPresetForm({ ...presetForm, color: e.target.value })} className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm" />
                                                </div>
                                            </div>
                                            <div className="w-24">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Order</label>
                                                <input type="number" value={presetForm.order} onChange={e => setPresetForm({ ...presetForm, order: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl" />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                                <Button variant="outline" onClick={() => { setIsTeamModalOpen(false); setIsMailerModalOpen(false); setIsPresetModalOpen(false); }}>Cancel</Button>
                                <Button onClick={isTeamModalOpen ? handleSaveTeam : isMailerModalOpen ? handleSaveMailer : handleSavePreset}>Save Changes</Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

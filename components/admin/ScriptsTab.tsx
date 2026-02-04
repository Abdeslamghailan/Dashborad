import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, FileText, ChevronRight, X, Layout, Activity, List, Hash } from 'lucide-react';
import { Button } from '../ui/Button';
import { API_URL } from '../../config';
import { apiService } from '../../services/apiService';

interface Script {
    id: string;
    name: string;
    description: string | null;
    order: number;
    isActive: boolean;
    scenarios?: Scenario[];
}

interface Scenario {
    id: string;
    name: string;
    scriptId: string;
    description: string | null;
    order: number;
    isActive: boolean;
}

export const ScriptsTab: React.FC = () => {
    const [scripts, setScripts] = useState<Script[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedScriptId, setExpandedScriptId] = useState<string | null>(null);

    // Modal states
    const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
    const [editingScript, setEditingScript] = useState<Script | null>(null);
    const [scriptForm, setScriptForm] = useState<Partial<Script>>({ name: '', description: '', order: 0, isActive: true });

    const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
    const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
    const [selectedScriptId, setSelectedScriptId] = useState<string>('');
    const [scenarioForm, setScenarioForm] = useState<Partial<Scenario>>({ name: '', description: '', order: 0, isActive: true });

    const fetchScripts = async () => {
        setIsLoading(true);
        try {
            const data = await apiService.getScriptsAll();
            setScripts(data);
        } catch (error) {
            console.error('Error fetching scripts:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchScripts();
    }, []);

    const handleSaveScript = async () => {
        try {
            const scriptData = {
                ...scriptForm,
                ...(editingScript ? { id: editingScript.id } : {})
            };

            await apiService.saveScript(scriptData);
            fetchScripts();
            setIsScriptModalOpen(false);
            setEditingScript(null);
        } catch (error) {
            console.error('Error saving script:', error);
        }
    };

    const handleDeleteScript = async (id: string) => {
        if (!confirm('Are you sure you want to delete this script? This will delete all associated scenarios.')) return;
        try {
            await apiService.deleteScript(id);
            fetchScripts();
        } catch (error) {
            console.error('Error deleting script:', error);
        }
    };

    const handleSaveScenario = async () => {
        try {
            const scenarioData = {
                ...scenarioForm,
                scriptId: selectedScriptId || scenarioForm.scriptId,
                ...(editingScenario ? { id: editingScenario.id } : {})
            };

            await apiService.saveScenario(scenarioData);
            fetchScripts();
            setIsScenarioModalOpen(false);
            setEditingScenario(null);
        } catch (error) {
            console.error('Error saving scenario:', error);
        }
    };

    const handleDeleteScenario = async (id: string) => {
        if (!confirm('Are you sure you want to delete this scenario?')) return;
        try {
            await apiService.deleteScenario(id);
            fetchScripts();
        } catch (error) {
            console.error('Error deleting scenario:', error);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Scripts & Scenarios</h2>
                    <p className="text-gray-500">Manage automation scripts and their operational scenarios</p>
                </div>
                <Button onClick={() => { setEditingScript(null); setScriptForm({ name: '', description: '', order: scripts.length, isActive: true }); setIsScriptModalOpen(true); }} leftIcon={<Plus size={18} />}>
                    New Script
                </Button>
            </div>

            <div className="space-y-4">
                {scripts.map(script => (
                    <motion.div
                        key={script.id}
                        layout
                        className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                    >
                        <div
                            className={`px-6 py-5 flex items-center justify-between cursor-pointer transition-colors ${expandedScriptId === script.id ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}
                            onClick={() => setExpandedScriptId(expandedScriptId === script.id ? null : script.id)}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-2.5 rounded-xl ${script.isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-bold text-gray-900 text-lg">{script.name}</h3>
                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full uppercase">Order: {script.order}</span>
                                        {!script.isActive && <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full uppercase">Inactive</span>}
                                    </div>
                                    <p className="text-sm text-gray-500">{script.description || 'No description'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                                    {script.scenarios?.length || 0} Scenarios
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setEditingScript(script); setScriptForm(script); setIsScriptModalOpen(true); }}
                                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteScript(script.id); }}
                                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                                <motion.div animate={{ rotate: expandedScriptId === script.id ? 90 : 0 }}>
                                    <ChevronRight size={20} className="text-gray-400" />
                                </motion.div>
                            </div>
                        </div>

                        <AnimatePresence>
                            {expandedScriptId === script.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-gray-100"
                                >
                                    <div className="p-6 bg-gray-50/50">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <List size={14} />
                                                Scenarios for {script.name}
                                            </h4>
                                            <button
                                                onClick={() => { setSelectedScriptId(script.id); setEditingScenario(null); setScenarioForm({ name: '', description: '', order: script.scenarios?.length || 0, isActive: true }); setIsScenarioModalOpen(true); }}
                                                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 px-3 py-1.5 bg-white border border-blue-100 rounded-lg shadow-sm transition-all"
                                            >
                                                <Plus size={14} /> Add Scenario
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {script.scenarios?.map(scenario => (
                                                <div
                                                    key={scenario.id}
                                                    className="bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between group hover:border-blue-200 hover:shadow-sm transition-all"
                                                >
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-gray-900">{scenario.name}</span>
                                                            {!scenario.isActive && <span className="text-[10px] text-red-500 font-bold uppercase italic border-l border-gray-200 pl-2">Inactive</span>}
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1">{scenario.description || 'No description'}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => { setEditingScenario(scenario); setScenarioForm(scenario); setSelectedScriptId(script.id); setIsScenarioModalOpen(true); }}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteScenario(scenario.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-md"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!script.scenarios || script.scenarios.length === 0) && (
                                                <div className="col-span-full py-8 text-center bg-white rounded-xl border border-dashed border-gray-200">
                                                    <p className="text-sm text-gray-400">No scenarios defined for this script</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </div>

            {/* Script Modal */}
            <AnimatePresence>
                {isScriptModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                                <h3 className="font-bold text-gray-900 text-lg">{editingScript ? 'Edit Script' : 'New Script'}</h3>
                                <button onClick={() => setIsScriptModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-lg"><X size={20} /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Script Name</label>
                                    <input type="text" value={scriptForm.name} onChange={e => setScriptForm({ ...scriptForm, name: e.target.value })} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                                    <textarea value={scriptForm.description || ''} onChange={e => setScriptForm({ ...scriptForm, description: e.target.value })} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]" />
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Display Order</label>
                                        <input type="number" value={scriptForm.order} onChange={e => setScriptForm({ ...scriptForm, order: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <label className="flex items-center gap-3 cursor-pointer mt-6">
                                        <input type="checkbox" checked={scriptForm.isActive} onChange={e => setScriptForm({ ...scriptForm, isActive: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        <span className="text-sm font-bold text-gray-700">Active</span>
                                    </label>
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setIsScriptModalOpen(false)}>Cancel</Button>
                                <Button onClick={handleSaveScript}>Save Script</Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Scenario Modal */}
            <AnimatePresence>
                {isScenarioModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                                <h3 className="font-bold text-gray-900 text-lg">{editingScenario ? 'Edit Scenario' : 'New Scenario'}</h3>
                                <button onClick={() => setIsScenarioModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-lg"><X size={20} /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Scenario Name</label>
                                    <input type="text" value={scenarioForm.name} onChange={e => setScenarioForm({ ...scenarioForm, name: e.target.value })} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                                    <textarea value={scenarioForm.description || ''} onChange={e => setScenarioForm({ ...scenarioForm, description: e.target.value })} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]" />
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Display Order</label>
                                        <input type="number" value={scenarioForm.order} onChange={e => setScenarioForm({ ...scenarioForm, order: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <label className="flex items-center gap-3 cursor-pointer mt-6">
                                        <input type="checkbox" checked={scenarioForm.isActive} onChange={e => setScenarioForm({ ...scenarioForm, isActive: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        <span className="text-sm font-bold text-gray-700">Active</span>
                                    </label>
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setIsScenarioModalOpen(false)}>Cancel</Button>
                                <Button onClick={handleSaveScenario}>Save Scenario</Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

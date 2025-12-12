import React, { useState } from 'react';
import { Entity, ParentCategory, Profile } from '../../types';
import { X, Save, Plus, Trash2, Upload } from 'lucide-react';
import { parseReportingData } from '../../utils/reportingParser';
import { Button } from '../ui/Button';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    entity: Entity;
    onSave: (updatedEntity: Entity) => Promise<void>;
}

export const ReportingEditor: React.FC<Props> = ({ isOpen, onClose, entity, onSave }) => {
    const [categories, setCategories] = useState<ParentCategory[]>(entity.reporting.parentCategories);
    const [activeTab, setActiveTab] = useState<'editor' | 'import'>('editor');
    const [rawData, setRawData] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        const updatedEntity = {
            ...entity,
            reporting: {
                parentCategories: categories
            }
        };
        await onSave(updatedEntity);
        setIsSaving(false);
        onClose();
    };

    // --- Editor Actions ---

    const updateCategoryName = (id: string, name: string) => {
        setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c));
    };

    const addCategory = () => {
        const newCat: ParentCategory = {
            id: `cat_${Date.now()}`,
            name: 'NEW CATEGORY',
            profiles: [],
            planConfiguration: {
                drops: [],
                seeds: 0,
                timeConfig: { startTime: '09:00', endTime: '17:00' },
                scriptName: '',
                scenario: '',
                status: 'active',
                mode: 'auto'
            }
        };
        setCategories([...categories, newCat]);
    };

    const removeCategory = (id: string) => {
        if (confirm('Delete this category and all its sessions?')) {
            setCategories(prev => prev.filter(c => c.id !== id));
        }
    };

    const updateSession = (catId: string, sessionId: string, field: keyof Profile, value: any) => {
        setCategories(prev => prev.map(c => {
            if (c.id !== catId) return c;
            return {
                ...c,
                profiles: c.profiles.map(p => p.id === sessionId ? { ...p, [field]: value } : p)
            };
        }));
    };

    // Get all category IDs that contain a session with the same profileName
    const getCategoriesForSession = (profileName: string): string[] => {
        return categories
            .filter(c => c.profiles.some(p => p.profileName === profileName && !p.isMirror))
            .map(c => c.id);
    };

    // Add session to additional categories (copy, not move)
    const addToCategories = (sourceSession: Profile, targetCatIds: string[]) => {
        setCategories(prev => prev.map(cat => {
            // Check if this category is in the target list
            if (targetCatIds.includes(cat.id)) {
                // Check if session already exists in this category
                const exists = cat.profiles.some(p => p.profileName === sourceSession.profileName && !p.isMirror);
                if (!exists) {
                    // Add a copy of the session with a new ID
                    const newSession: Profile = {
                        ...sourceSession,
                        id: `prof_${Date.now()}_${cat.id}`,
                    };
                    return { ...cat, profiles: [...cat.profiles, newSession] };
                }
            }
            return cat;
        }));
    };

    // Remove session from a specific category
    const removeFromCategory = (catId: string, profileName: string) => {
        setCategories(prev => prev.map(c => {
            if (c.id === catId) {
                return { ...c, profiles: c.profiles.filter(p => p.profileName !== profileName || p.isMirror) };
            }
            return c;
        }));
    };

    // Toggle session presence in a category
    const toggleSessionInCategory = (session: Profile, catId: string, currentCatId: string) => {
        const categoriesWithSession = getCategoriesForSession(session.profileName);
        const isInCategory = categoriesWithSession.includes(catId);

        if (isInCategory) {
            // Don't allow removing from the last category
            if (categoriesWithSession.length > 1) {
                removeFromCategory(catId, session.profileName);
            }
        } else {
            addToCategories(session, [catId]);
        }
    };

    const addSession = (catId: string) => {
        const newSession: Profile = {
            id: `prof_${Date.now()}`,
            profileName: 'New Session',
            type: 'Other',
            mainIp: '',
            sessionCount: 0,
            successCount: 0,
            errorCount: 0,
            connected: false,
            blocked: false
        };
        setCategories(prev => prev.map(c => c.id === catId ? { ...c, profiles: [...c.profiles, newSession] } : c));
    };

    const removeSession = (catId: string, sessionId: string) => {
        setCategories(prev => prev.map(c => c.id === catId ? { ...c, profiles: c.profiles.filter(p => p.id !== sessionId) } : c));
    };

    // --- Import Actions ---

    const handleParse = () => {
        const { categories: parsedCats, sessions: parsedSessions } = parseReportingData(rawData);

        console.log('Parsed categories:', parsedCats);
        console.log('Parsed sessions:', parsedSessions);

        // Start with existing categories or use parsed ones
        let newCategories = [...categories];

        // Add parsed categories if they don't already exist
        parsedCats.forEach(pc => {
            if (!newCategories.find(c => c.name === pc.name)) {
                newCategories.push(pc);
            }
        });

        // If still no categories, create defaults based on session types
        if (newCategories.length === 0 && parsedSessions.length > 0) {
            const hasIP = parsedSessions.some(s => s.type === 'IP 1');
            const hasOffer = parsedSessions.some(s => s.type === 'Offer');

            if (hasIP) {
                newCategories.push({
                    id: `cat_${Date.now()}_ip`,
                    name: 'IP 1 REPORTING',
                    profiles: [],
                    planConfiguration: {
                        drops: [],
                        seeds: 0,
                        timeConfig: { startTime: '09:00', endTime: '17:00' },
                        scriptName: '',
                        scenario: '',
                        status: 'active',
                        mode: 'auto'
                    }
                });
            }

            if (hasOffer) {
                newCategories.push({
                    id: `cat_${Date.now()}_offer`,
                    name: 'Offer Warmup REPORTING',
                    profiles: [],
                    planConfiguration: {
                        drops: [],
                        seeds: 0,
                        timeConfig: { startTime: '09:00', endTime: '17:00' },
                        scriptName: '',
                        scenario: '',
                        status: 'active',
                        mode: 'auto'
                    }
                });
            }
        }

        // Distribute sessions to categories
        parsedSessions.forEach(session => {
            let assigned = false;

            // Try to match by type
            for (const cat of newCategories) {
                const catNameUpper = cat.name.toUpperCase();
                const sessionType = session.type.toUpperCase();

                // Match "IP 1" type to categories containing "IP"
                if (sessionType === 'IP 1' && (catNameUpper.includes('IP 1') || catNameUpper.includes('IP_'))) {
                    cat.profiles.push(session);
                    assigned = true;
                    break;
                }

                // Match "Offer" type to categories containing "OFFER"
                if (sessionType === 'OFFER' && catNameUpper.includes('OFFER')) {
                    cat.profiles.push(session);
                    assigned = true;
                    break;
                }
            }

            // If not assigned, put in first available category
            if (!assigned && newCategories.length > 0) {
                newCategories[0].profiles.push(session);
            }
        });

        console.log('Final categories with sessions:', newCategories);

        setCategories(newCategories);
        setActiveTab('editor');
        setRawData('');
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Reporting Metrics Editor</h3>
                        <p className="text-sm text-gray-500">Manage categories, sessions, and import raw data</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-gray-200/50 p-1 rounded-xl">
                            <button
                                onClick={() => setActiveTab('editor')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'editor' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'}`}
                            >
                                Visual Editor
                            </button>
                            <button
                                onClick={() => setActiveTab('import')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'import' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'}`}
                            >
                                Smart Import
                            </button>
                        </div>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">

                    {activeTab === 'import' && (
                        <div className="space-y-4 max-w-3xl mx-auto">
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
                                <strong>Instructions:</strong> Paste your raw reporting data (Excel/Text) below. The system will automatically extract categories, sessions, and metrics.
                            </div>
                            <textarea
                                value={rawData}
                                onChange={(e) => setRawData(e.target.value)}
                                className="w-full h-96 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xs"
                                placeholder="Paste raw data here..."
                            />
                            <Button
                                onClick={handleParse}
                                disabled={!rawData.trim()}
                                className="w-full"
                                leftIcon={<Upload size={18} />}
                            >
                                Parse & Organize
                            </Button>
                        </div>
                    )}

                    {activeTab === 'editor' && (
                        <div className="space-y-8">
                            {categories.map((cat) => (
                                <div key={cat.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                    {/* Category Header */}
                                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                        <input
                                            type="text"
                                            value={cat.name}
                                            onChange={(e) => updateCategoryName(cat.id, e.target.value)}
                                            className="bg-transparent border-none font-bold text-gray-900 text-lg focus:ring-0 px-0 w-1/2"
                                        />
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => removeCategory(cat.id)} className="text-red-500 hover:bg-red-50 p-2 rounded">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Sessions Table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                                <tr>
                                                    <th className="px-4 py-3 w-48">Session Name</th>
                                                    <th className="px-4 py-3 w-32">Type</th>
                                                    <th className="px-4 py-3 w-32">Main IP</th>
                                                    <th className="px-4 py-3 w-24">Total</th>
                                                    <th className="px-4 py-3 w-24">Connected</th>
                                                    <th className="px-4 py-3 w-24">Blocked</th>
                                                    <th className="px-4 py-3 w-48">Categories</th>
                                                    <th className="px-4 py-3 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {cat.profiles
                                                    .filter(session => !session.isMirror && !session.profileName.includes('_M1_') && !session.profileName.includes('_M2_'))
                                                    .map((session) => (
                                                        <tr key={session.id} className="group hover:bg-gray-50">
                                                            <td className="px-4 py-2">
                                                                <input
                                                                    value={session.profileName}
                                                                    onChange={(e) => updateSession(cat.id, session.id, 'profileName', e.target.value)}
                                                                    className="w-full bg-transparent border border-transparent hover:border-gray-300 focus:border-indigo-500 rounded px-2 py-1 outline-none"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <input
                                                                    value={session.type}
                                                                    onChange={(e) => updateSession(cat.id, session.id, 'type', e.target.value)}
                                                                    className="w-full bg-transparent border border-transparent hover:border-gray-300 focus:border-indigo-500 rounded px-2 py-1 outline-none"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <input
                                                                    value={session.mainIp || ''}
                                                                    onChange={(e) => updateSession(cat.id, session.id, 'mainIp', e.target.value)}
                                                                    className="w-full bg-transparent border border-transparent hover:border-gray-300 focus:border-indigo-500 rounded px-2 py-1 outline-none font-mono text-xs"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <input
                                                                    type="number"
                                                                    value={session.sessionCount}
                                                                    onChange={(e) => updateSession(cat.id, session.id, 'sessionCount', parseInt(e.target.value))}
                                                                    className="w-full bg-transparent border border-transparent hover:border-gray-300 focus:border-indigo-500 rounded px-2 py-1 outline-none font-mono"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <input
                                                                    type="number"
                                                                    value={session.successCount}
                                                                    onChange={(e) => updateSession(cat.id, session.id, 'successCount', parseInt(e.target.value))}
                                                                    className="w-full bg-transparent border border-transparent hover:border-gray-300 focus:border-indigo-500 rounded px-2 py-1 outline-none font-mono text-green-600 font-bold"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <input
                                                                    type="number"
                                                                    value={session.errorCount}
                                                                    onChange={(e) => updateSession(cat.id, session.id, 'errorCount', parseInt(e.target.value))}
                                                                    className="w-full bg-transparent border border-transparent hover:border-gray-300 focus:border-indigo-500 rounded px-2 py-1 outline-none font-mono text-red-600 font-bold"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <div className="flex flex-wrap gap-1">
                                                                    {categories.map(c => {
                                                                        const isInCategory = getCategoriesForSession(session.profileName).includes(c.id);
                                                                        const isCurrentCategory = c.id === cat.id;
                                                                        return (
                                                                            <button
                                                                                key={c.id}
                                                                                onClick={() => toggleSessionInCategory(session, c.id, cat.id)}
                                                                                className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${isInCategory
                                                                                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                                                                                        : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                                                                                    } ${isCurrentCategory ? 'ring-1 ring-indigo-400' : ''}`}
                                                                                title={isInCategory ? `Remove from ${c.name}` : `Add to ${c.name}`}
                                                                            >
                                                                                {c.name.replace(' REPORTING', '').substring(0, 10)}
                                                                                {isInCategory && <span className="ml-1">✓</span>}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2 text-right">
                                                                <button onClick={() => removeSession(cat.id, session.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                        <Button
                                            variant="ghost"
                                            onClick={() => addSession(cat.id)}
                                            className="w-full justify-center border-t border-gray-100 rounded-none"
                                            leftIcon={<Plus size={16} />}
                                        >
                                            Add Session
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            <Button
                                variant="outline"
                                onClick={addCategory}
                                className="w-full border-dashed border-2"
                                leftIcon={<Plus size={20} />}
                            >
                                Add New Category
                            </Button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        isLoading={isSaving}
                        leftIcon={!isSaving && <Save size={18} />}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>

            </div>
        </div >
    );
};

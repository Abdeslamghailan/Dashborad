import React, { useState } from 'react';
import { Team, Mailer } from '../../hooks/usePlanningData';

interface PlanningSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    teams: Team[];
    onSaveTeam: (team: Partial<Team>) => void;
    onDeleteTeam: (id: string) => void;
    onSaveMailer: (mailer: Partial<Mailer>) => void;
    onDeleteMailer: (id: string) => void;
}

export const PlanningSettings: React.FC<PlanningSettingsProps> = ({
    isOpen,
    onClose,
    teams,
    onSaveTeam,
    onDeleteTeam,
    onSaveMailer,
    onDeleteMailer
}) => {
    const [isAddingTeam, setIsAddingTeam] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [addingMailerToTeam, setAddingMailerToTeam] = useState<string | null>(null);
    const [newMailerName, setNewMailerName] = useState('');

    const handleAddTeam = async () => {
        if (!newTeamName.trim()) return;
        try {
            await onSaveTeam({ 
                displayName: newTeamName,
                name: newTeamName.toLowerCase().replace(/\s+/g, '_')
            });
            setNewTeamName('');
            setIsAddingTeam(false);
        } catch (error) {
            alert('Failed to add team');
        }
    };

    const handleAddMailer = async (teamId: string) => {
        if (!newMailerName.trim()) return;
        try {
            await onSaveMailer({
                name: newMailerName,
                teamId: teamId
            });
            setNewMailerName('');
            setAddingMailerToTeam(null);
        } catch (error) {
            alert('Failed to add mailer');
        }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-800 text-white flex-shrink-0">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <span>⚙️</span> Manage Teams & Mailers
                    </h3>
                    <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">✕</button>
                </div>
                <div className="p-6 overflow-y-auto flex-grow">
                    <div className="space-y-6">
                        {teams.map(team => (
                            <div key={team.id} className="border rounded-xl p-4 bg-gray-50">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold text-indigo-600">{team.displayName}</h4>
                                    <div className="flex gap-2">
                                        <button className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100 shadow-sm hover:bg-red-100" onClick={() => {
                                            if (confirm('Delete this team and all its mailers?')) onDeleteTeam(team.id);
                                        }}>Delete</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {team.mailers.map(mailer => (
                                        <div key={mailer.id} className="bg-white p-3 rounded-lg border shadow-sm flex items-center justify-between">
                                            <span className="text-sm font-medium">{mailer.name}</span>
                                            <button className="text-[10px] text-red-500 hover:underline" onClick={() => {
                                                if (confirm('Delete this mailer?')) onDeleteMailer(mailer.id);
                                            }}>Delete</button>
                                        </div>
                                    ))}
                                    
                                    {addingMailerToTeam === team.id ? (
                                        <div className="flex gap-2 bg-white p-2 rounded-lg border border-indigo-200">
                                            <input 
                                                autoFocus
                                                type="text" 
                                                value={newMailerName}
                                                onChange={(e) => setNewMailerName(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddMailer(team.id)}
                                                placeholder="Mailer name..."
                                                className="text-xs flex-grow outline-none"
                                            />
                                            <button onClick={() => handleAddMailer(team.id)} className="text-xs text-indigo-600 font-bold">Add</button>
                                            <button onClick={() => setAddingMailerToTeam(null)} className="text-xs text-gray-400">✕</button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => setAddingMailerToTeam(team.id)}
                                            className="p-3 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-all font-bold"
                                        >
                                            + Add Mailer
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isAddingTeam ? (
                            <div className="border-2 border-indigo-200 rounded-xl p-4 bg-indigo-50/30 flex gap-3">
                                <input 
                                    autoFocus
                                    type="text" 
                                    value={newTeamName}
                                    onChange={(e) => setNewTeamName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddTeam()}
                                    placeholder="Enter new team name..."
                                    className="flex-grow bg-white border border-indigo-200 rounded-lg px-4 py-2 outline-none focus:ring-2 ring-indigo-500/20"
                                />
                                <button onClick={handleAddTeam} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors">Save Team</button>
                                <button onClick={() => setIsAddingTeam(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700">Cancel</button>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setIsAddingTeam(true)}
                                className="w-full py-4 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-500 hover:bg-indigo-50 transition-all font-bold"
                            >
                                + Add New Team
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';
import {
    ChevronDown, ChevronRight, Plus, Edit2, Trash2, Users,
    UserCheck, Briefcase, X, Save, RefreshCw, Search, Link2, Unlink
} from 'lucide-react';

// Types
interface DiagramMailer {
    id: string;
    name: string;
    team: { name: string; displayName: string };
}

interface MailerAssignment {
    id: string;
    mailerId: string;
    role?: string;
    isPrimary: boolean;
    mailer: DiagramMailer;
}

interface DiagramTeamData {
    id: string;
    name: string;
    description?: string;
    color?: string;
    order: number;
    mailerAssignments: MailerAssignment[];
}

interface ManagerLink {
    id: string;
    managerId: string;
    teamLeaderId: string;
    isPrimary: boolean;
    manager?: Manager;
    teamLeader?: TeamLeader;
}

interface DiagramUser {
    id: number;
    username: string;
    firstName?: string;
    lastName?: string;
    photoUrl?: string;
}

interface TeamLeader {
    id: string;
    name: string;
    email?: string;
    avatarColor?: string;
    order: number;
    managerLinks?: ManagerLink[];
    teams: DiagramTeamData[];
    portalId?: string;
    userId?: number;
    user?: DiagramUser;
}

interface Manager {
    id: string;
    name: string;
    email?: string;
    avatarColor?: string;
    order: number;
    teamLeaderLinks?: ManagerLink[];
    portalId?: string;
    userId?: number;
    user?: DiagramUser;
}

interface DiagramData {
    managers: Manager[];
    allTeamLeaders: TeamLeader[];
    allMailers: DiagramMailer[];
    allUsers: DiagramUser[];
}

const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

export const CMHWTeamDiagram: React.FC = () => {
    const { isAdmin } = useAuth();
    const [data, setData] = useState<DiagramData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Layout refs and state
    const containerRef = useRef<HTMLDivElement>(null);
    const managerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const teamLeaderRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const [lines, setLines] = useState<{ x1: number, y1: number, x2: number, y2: number }[]>([]);

    // Modal states
    const [showManagerModal, setShowManagerModal] = useState(false);
    const [showTeamLeaderModal, setShowTeamLeaderModal] = useState(false);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showLinkTeamLeadersModal, setShowLinkTeamLeadersModal] = useState(false);
    const [showAddFromUserModal, setShowAddFromUserModal] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [parentId, setParentId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/diagram/full`, {
                headers: getAuthHeaders()
            });
            if (!response.ok) throw new Error('Failed to fetch diagram data');
            const result = await response.json();
            setData(result);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const calculateLines = useCallback(() => {
        if (!containerRef.current || !data) return;

        requestAnimationFrame(() => {
            if (!containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const newLines: { x1: number, y1: number, x2: number, y2: number }[] = [];

            data.managers.forEach(manager => {
                const mNode = managerRefs.current[manager.id];
                if (!mNode) return;
                const mRect = mNode.getBoundingClientRect();

                const startX = mRect.left - containerRect.left + mRect.width / 2;
                const startY = mRect.top - containerRect.top + mRect.height;

                manager.teamLeaderLinks?.forEach(link => {
                    const tlNode = teamLeaderRefs.current[link.teamLeaderId];
                    if (!tlNode) return;
                    const tlRect = tlNode.getBoundingClientRect();

                    const endX = tlRect.left - containerRect.left + tlRect.width / 2;
                    const endY = tlRect.top - containerRect.top;

                    newLines.push({ x1: startX, y1: startY, x2: endX, y2: endY });
                });
            });
            setLines(newLines);
        });
    }, [data]);

    useLayoutEffect(() => {
        calculateLines();
        window.addEventListener('resize', calculateLines);
        return () => window.removeEventListener('resize', calculateLines);
    }, [calculateLines]);

    // CRUD Operations
    const createManager = async (name: string, email?: string, portalId?: string, userId?: string) => {
        const res = await fetch(`${API_URL}/api/diagram/managers`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ name, email, portalId, userId }) });
        if (!res.ok) throw new Error('Failed to create manager');
        fetchData();
    };

    const updateManager = async (id: string, name: string, email?: string, portalId?: string, userId?: string) => {
        const res = await fetch(`${API_URL}/api/diagram/managers/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ name, email, portalId, userId }) });
        if (!res.ok) throw new Error('Failed to update manager');
        fetchData();
    };

    const deleteManager = async (id: string) => {
        if (!confirm('Delete this manager? Team leader links will be removed.')) return;
        const res = await fetch(`${API_URL}/api/diagram/managers/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Failed to delete manager');
        fetchData();
    };

    const createTeamLeader = async (name: string, email?: string, managerIds?: string[], portalId?: string, userId?: string) => {
        const res = await fetch(`${API_URL}/api/diagram/team-leaders`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ name, email, managerIds, portalId, userId }) });
        if (!res.ok) throw new Error('Failed to create team leader');
        fetchData();
    };

    const updateTeamLeader = async (id: string, name: string, email?: string, portalId?: string, userId?: string) => {
        const res = await fetch(`${API_URL}/api/diagram/team-leaders/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ name, email, portalId, userId }) });
        if (!res.ok) throw new Error('Failed to update team leader');
        fetchData();
    };

    const deleteTeamLeader = async (id: string) => {
        if (!confirm('Delete this team leader and all their teams?')) return;
        const res = await fetch(`${API_URL}/api/diagram/team-leaders/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Failed to delete team leader');
        fetchData();
    };

    const updateManagerTeamLeaders = async (managerId: string, teamLeaderIds: string[]) => {
        const res = await fetch(`${API_URL}/api/diagram/managers/${managerId}/team-leaders`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ teamLeaderIds }) });
        if (!res.ok) throw new Error('Failed to update team leaders');
        fetchData();
    };

    const createTeam = async (name: string, teamLeaderId: string, color?: string) => {
        const res = await fetch(`${API_URL}/api/diagram/teams`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ name, teamLeaderId, color }) });
        if (!res.ok) throw new Error('Failed to create team');
        fetchData();
    };

    const updateTeam = async (id: string, name: string, color?: string) => {
        const res = await fetch(`${API_URL}/api/diagram/teams/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ name, color }) });
        if (!res.ok) throw new Error('Failed to update team');
        fetchData();
    };

    const deleteTeam = async (id: string) => {
        if (!confirm('Delete this team and all mailer assignments?')) return;
        const res = await fetch(`${API_URL}/api/diagram/teams/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Failed to delete team');
        fetchData();
    };

    const assignMailers = async (teamId: string, mailerIds: string[]) => {
        const res = await fetch(`${API_URL}/api/diagram/assignments/bulk`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ teamId, mailerIds }) });
        if (!res.ok) throw new Error('Failed to assign mailers');
        fetchData();
    };

    const removeAssignment = async (assignmentId: string) => {
        if (!confirm('Remove this mailer from the team?')) return;
        const res = await fetch(`${API_URL}/api/diagram/assignments/${assignmentId}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Failed to remove assignment');
        fetchData();
    };

    const removeLink = async (linkId: string) => {
        if (!confirm('Remove this link?')) return;
        const res = await fetch(`${API_URL}/api/diagram/manager-team-leader-links/${linkId}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Failed to remove link');
        fetchData();
    };

    if (loading) return <div className="flex items-center justify-center h-96"><RefreshCw className="w-12 h-12 animate-spin text-indigo-600" /></div>;
    if (error) return <div className="p-6 text-center text-red-600">{error} <button onClick={fetchData} className="underline">Retry</button></div>;

    const filteredManagers = data?.managers.filter(m => !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase())) || [];
    const filteredTeamLeaders = data?.allTeamLeaders.filter(tl => !searchQuery || tl.name.toLowerCase().includes(searchQuery.toLowerCase())) || [];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-slate-800 rounded-xl p-5 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">CMHW Team Diagram</h1>
                        <p className="text-slate-400 text-sm mt-0.5">Organization hierarchy</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 bg-slate-700 px-2.5 py-1 rounded-full">
                            {data?.managers.length || 0} Managers
                        </span>
                        <span className="text-xs text-slate-400 bg-slate-700 px-2.5 py-1 rounded-full">
                            {data?.allTeamLeaders.length || 0} Team Leaders
                        </span>
                        <span className="text-xs text-slate-400 bg-slate-700 px-2.5 py-1 rounded-full">
                            {data?.allMailers.length || 0} Mailers
                        </span>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex-1 max-w-xs relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search..."
                        className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent" />
                </div>
                <button onClick={fetchData} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors" title="Refresh">
                    <RefreshCw className="w-4 h-4" />
                </button>
                {isAdmin && (
                    <button onClick={() => setShowAddFromUserModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white text-sm rounded-md hover:bg-slate-700 transition-colors">
                        <Plus className="w-4 h-4" /> Add Member
                    </button>
                )}
            </div>

            {/* Diagram Container */}
            <div className="bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-200 overflow-x-auto">
                <div ref={containerRef} className="relative min-w-max min-h-[550px] p-10">
                    {/* SVG Connection Lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                        <defs>
                            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#94a3b8" />
                                <stop offset="100%" stopColor="#cbd5e1" />
                            </linearGradient>
                        </defs>
                        {lines.map((line, i) => (
                            <line key={i} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
                                stroke="url(#lineGradient)" strokeWidth="1.5" strokeDasharray="4 2" />
                        ))}
                    </svg>

                    {/* Managers Row */}
                    <div className="flex justify-center gap-10 mb-24 relative z-10">
                        {filteredManagers.map(manager => (
                            <div key={manager.id} ref={el => managerRefs.current[manager.id] = el} className="w-[280px]">
                                <ManagerNode
                                    manager={manager}
                                    isAdmin={isAdmin}
                                    onEdit={() => { setEditingItem(manager); setShowManagerModal(true); }}
                                    onDelete={() => deleteManager(manager.id)}
                                    onLinkTeamLeaders={() => { setEditingItem(manager); setShowLinkTeamLeadersModal(true); }}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Team Leaders Row */}
                    <div className="flex justify-center gap-8 flex-wrap relative z-10">
                        {filteredTeamLeaders.map(tl => (
                            <div key={tl.id} ref={el => teamLeaderRefs.current[tl.id] = el} className="w-[280px]">
                                <TeamLeaderNode
                                    teamLeader={tl}
                                    isAdmin={isAdmin}
                                    onEdit={() => { setEditingItem(tl); setShowTeamLeaderModal(true); }}
                                    onDelete={() => deleteTeamLeader(tl.id)}
                                    onAddTeam={() => { setParentId(tl.id); setEditingItem(null); setShowTeamModal(true); }}
                                    onEditTeam={(t) => { setEditingItem(t); setShowTeamModal(true); }}
                                    onDeleteTeam={deleteTeam}
                                    onManageMailers={(t) => { setEditingItem(t); setShowAssignModal(true); }}
                                    onRemoveAssignment={removeAssignment}
                                    allManagers={data?.managers || []}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showManagerModal && (
                <FormModal
                    title={editingItem ? 'Edit Manager' : 'Add Manager'}
                    onClose={() => setShowManagerModal(false)}
                    onSave={(name, email) => {
                        if (editingItem) updateManager(editingItem.id, name, email);
                        else createManager(name, email);
                        setShowManagerModal(false);
                    }}
                    initialName={editingItem?.name}
                    initialEmail={editingItem?.email}
                />
            )}

            {showTeamLeaderModal && (
                <TeamLeaderFormModal
                    title={editingItem ? 'Edit Team Leader' : 'Add Team Leader'}
                    managers={data?.managers || []}
                    onClose={() => setShowTeamLeaderModal(false)}
                    onSave={(name, email, managerIds) => {
                        if (editingItem) updateTeamLeader(editingItem.id, name, email);
                        else createTeamLeader(name, email, managerIds);
                        setShowTeamLeaderModal(false);
                    }}
                    initialName={editingItem?.name}
                    initialEmail={editingItem?.email}
                    initialManagerIds={editingItem?.managerLinks?.map((l: ManagerLink) => l.managerId) || []}
                    isEditing={!!editingItem}
                />
            )}

            {showTeamModal && (
                <TeamFormModal
                    title={editingItem ? 'Edit Team' : 'Add Team'}
                    onClose={() => setShowTeamModal(false)}
                    onSave={(name, color) => {
                        if (editingItem) updateTeam(editingItem.id, name, color);
                        else if (parentId) createTeam(name, parentId, color);
                        setShowTeamModal(false);
                    }}
                    initialName={editingItem?.name}
                    initialColor={editingItem?.color}
                />
            )}

            {showAssignModal && editingItem && data && (
                <AssignMailersModal
                    team={editingItem}
                    allMailers={data.allMailers}
                    onClose={() => setShowAssignModal(false)}
                    onSave={(mailerIds) => {
                        assignMailers(editingItem.id, mailerIds);
                        setShowAssignModal(false);
                    }}
                />
            )}

            {showLinkTeamLeadersModal && editingItem && data && (
                <LinkTeamLeadersModal
                    manager={editingItem}
                    allTeamLeaders={data.allTeamLeaders}
                    onClose={() => setShowLinkTeamLeadersModal(false)}
                    onSave={(teamLeaderIds) => {
                        updateManagerTeamLeaders(editingItem.id, teamLeaderIds);
                        setShowLinkTeamLeadersModal(false);
                    }}
                />
            )}

            {showAddFromUserModal && data && (
                <AddFromUserModal
                    allUsers={data.allUsers || []}
                    existingManagers={data.managers}
                    existingTeamLeaders={data.allTeamLeaders}
                    existingMailers={data.allMailers}
                    onClose={() => setShowAddFromUserModal(false)}
                    onSave={async (userData) => {
                        if (userData.role === 'manager') {
                            await createManager(userData.name, userData.email, userData.portalId, userData.userId?.toString());
                        } else if (userData.role === 'teamLeader') {
                            await createTeamLeader(userData.name, userData.email, [], userData.portalId, userData.userId?.toString());
                        } else if (userData.role === 'mailer') {
                            // Create mailer via API
                            const res = await fetch(`${API_URL}/api/mailers`, {
                                method: 'POST',
                                headers: getAuthHeaders(),
                                body: JSON.stringify({ name: userData.name, teamId: userData.teamId })
                            });
                            if (!res.ok) throw new Error('Failed to create mailer');
                            fetchData();
                        }
                        setShowAddFromUserModal(false);
                    }}
                />
            )}
        </div>
    );
};

// Manager Node Component - Clean Card
const ManagerNode: React.FC<{
    manager: Manager;
    isAdmin: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onLinkTeamLeaders: () => void;
}> = ({ manager, isAdmin, onEdit, onDelete, onLinkTeamLeaders }) => {
    return (
        <div className="w-full bg-white rounded-lg border border-gray-200 p-4 relative group hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center text-white text-lg font-semibold"
                    style={{ backgroundColor: manager.avatarColor || '#4f46e5' }}>
                    {manager.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{manager.name}</h3>
                    <p className="text-xs text-gray-500">Manager</p>
                </div>
            </div>

            {/* Actions */}
            {isAdmin && (
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={onLinkTeamLeaders} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded" title="Link Team Leaders">
                        <Link2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onEdit} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded" title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onDelete} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
};

// Team Leader Node Component - Clean Card
const TeamLeaderNode: React.FC<{
    teamLeader: TeamLeader;
    isAdmin: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onAddTeam: () => void;
    onEditTeam: (t: DiagramTeamData) => void;
    onDeleteTeam: (id: string) => void;
    onManageMailers: (t: DiagramTeamData) => void;
    onRemoveAssignment: (id: string) => void;
    allManagers: Manager[];
}> = (props) => {
    const { teamLeader, isAdmin, onEdit, onDelete, onAddTeam,
        onEditTeam, onDeleteTeam, onManageMailers, onRemoveAssignment, allManagers } = props;

    const otherManagerNames = (teamLeader.managerLinks || [])
        .map(l => allManagers.find(m => m.id === l.managerId)?.name)
        .filter(Boolean);

    return (
        <div className="w-full flex flex-col">
            <div className="w-full bg-white rounded-lg border border-gray-200 p-3 relative group hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-semibold"
                        style={{ backgroundColor: teamLeader.avatarColor || '#7c3aed' }}>
                        {teamLeader.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900 truncate text-sm">{teamLeader.name}</h4>
                            {otherManagerNames.length > 1 && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                                    title={`Reports to: ${otherManagerNames.join(', ')}`}>
                                    +{otherManagerNames.length - 1}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500">Team Leader</p>
                    </div>
                </div>

                {/* Actions */}
                {isAdmin && (
                    <div className="absolute top-2.5 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={onAddTeam} className="p-1 text-slate-500 hover:bg-slate-100 rounded" title="Add Team">
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={onEdit} className="p-1 text-slate-500 hover:bg-slate-100 rounded" title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={onDelete} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Teams List */}
            {(teamLeader.teams?.length || 0) > 0 && (
                <div className="flex flex-col w-full pl-4 mt-1.5 ml-4 border-l border-gray-200 gap-1.5">
                    {teamLeader.teams.map((team) => (
                        <TeamNode
                            key={team.id}
                            team={team}
                            isAdmin={isAdmin}
                            onEdit={() => onEditTeam(team)}
                            onDelete={() => onDeleteTeam(team.id)}
                            onManageMailers={() => onManageMailers(team)}
                            onRemoveAssignment={onRemoveAssignment}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// Team Node Component - Minimal
const TeamNode: React.FC<{
    team: DiagramTeamData;
    isAdmin: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onManageMailers: () => void;
    onRemoveAssignment: (id: string) => void;
}> = ({ team, isAdmin, onEdit, onDelete, onManageMailers, onRemoveAssignment }) => {
    const mailerCount = team.mailerAssignments?.length || 0;

    return (
        <div className="bg-gray-50 rounded-md px-3 py-2 group hover:bg-gray-100 transition-colors">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: team.color || '#9ca3af' }}></div>
                    <span className="text-sm text-gray-700 truncate">{team.name}</span>
                    <span className="text-[10px] text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                        {mailerCount}
                    </span>
                </div>

                {isAdmin && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={onManageMailers} className="p-1 text-slate-500 hover:bg-white rounded" title="Manage Mailers">
                            <UserCheck className="w-3 h-3" />
                        </button>
                        <button onClick={onEdit} className="p-1 text-slate-500 hover:bg-white rounded" title="Edit">
                            <Edit2 className="w-3 h-3" />
                        </button>
                        <button onClick={onDelete} className="p-1 text-red-500 hover:bg-white rounded" title="Delete">
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </div>

            {/* Mailers */}
            {mailerCount > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                    {team.mailerAssignments.map((assignment) => (
                        <span key={assignment.id} className="text-[10px] px-1.5 py-0.5 bg-white text-gray-600 rounded border border-gray-200 truncate max-w-[90px]">
                            {assignment.mailer.name}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

// Form Modal for Manager
const FormModal: React.FC<{
    title: string;
    onClose: () => void;
    onSave: (name: string, email?: string) => void;
    initialName?: string;
    initialEmail?: string;
}> = ({ title, onClose, onSave, initialName, initialEmail }) => {
    const [name, setName] = useState(initialName || '');
    const [email, setEmail] = useState(initialEmail || '');

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Enter name" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Enter email (optional)" />
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                    <button onClick={() => name && onSave(name, email)} disabled={!name}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                        <Save className="w-4 h-4" /> Save
                    </button>
                </div>
            </div>
        </div>
    );
};

// Team Leader Form Modal (with manager selection for new team leaders)
const TeamLeaderFormModal: React.FC<{
    title: string;
    managers: Manager[];
    onClose: () => void;
    onSave: (name: string, email?: string, managerIds?: string[]) => void;
    initialName?: string;
    initialEmail?: string;
    initialManagerIds?: string[];
    isEditing: boolean;
}> = ({ title, managers, onClose, onSave, initialName, initialEmail, initialManagerIds, isEditing }) => {
    const [name, setName] = useState(initialName || '');
    const [email, setEmail] = useState(initialEmail || '');
    const [selectedManagerIds, setSelectedManagerIds] = useState<Set<string>>(new Set(initialManagerIds || []));

    const toggleManager = (id: string) => {
        const newSet = new Set(selectedManagerIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedManagerIds(newSet);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4 flex-1 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Enter name" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Enter email (optional)" />
                    </div>
                    {!isEditing && managers.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Link to Managers</label>
                            <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                                {managers.map((manager) => (
                                    <label key={manager.id} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedManagerIds.has(manager.id)}
                                            onChange={() => toggleManager(manager.id)}
                                            className="w-4 h-4 text-indigo-600 rounded"
                                        />
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                            style={{ backgroundColor: manager.avatarColor || '#6366F1' }}>
                                            {manager.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-medium text-gray-800">{manager.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                    <button onClick={() => name && onSave(name, email, Array.from(selectedManagerIds))} disabled={!name}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">
                        <Save className="w-4 h-4" /> Save
                    </button>
                </div>
            </div>
        </div>
    );
};

// Team Form Modal
const TeamFormModal: React.FC<{
    title: string;
    onClose: () => void;
    onSave: (name: string, color?: string) => void;
    initialName?: string;
    initialColor?: string;
}> = ({ title, onClose, onSave, initialName, initialColor }) => {
    const [name, setName] = useState(initialName || '');
    const [color, setColor] = useState(initialColor || '#E0E7FF');
    const colors = ['#E0E7FF', '#EDE9FE', '#FCE7F3', '#FEE2E2', '#FFEDD5', '#FEF3C7', '#DCFCE7', '#CCFBF1', '#CFFAFE', '#DBEAFE'];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Team Name *</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Enter team name" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Team Color</label>
                        <div className="flex flex-wrap gap-2">
                            {colors.map((c) => (
                                <button key={c} onClick={() => setColor(c)}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                    <button onClick={() => name && onSave(name, color)} disabled={!name}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                        <Save className="w-4 h-4" /> Save
                    </button>
                </div>
            </div>
        </div>
    );
};

// Assign Mailers Modal
const AssignMailersModal: React.FC<{
    team: DiagramTeamData;
    allMailers: DiagramMailer[];
    onClose: () => void;
    onSave: (mailerIds: string[]) => void;
}> = ({ team, allMailers, onClose, onSave }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(
        new Set(team.mailerAssignments.map(a => a.mailerId))
    );
    const [search, setSearch] = useState('');

    const filteredMailers = allMailers.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase())
    );

    const toggle = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Assign Mailers to "{team.name}"</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
                </div>

                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Search mailers..." />
                </div>

                <div className="flex-1 overflow-y-auto border rounded-lg divide-y">
                    {filteredMailers.map((mailer) => (
                        <label key={mailer.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" checked={selectedIds.has(mailer.id)} onChange={() => toggle(mailer.id)}
                                className="w-4 h-4 text-indigo-600 rounded" />
                            <div className="flex-1">
                                <p className="font-medium text-gray-800">{mailer.name}</p>
                                <p className="text-xs text-gray-500">{mailer.team.displayName}</p>
                            </div>
                        </label>
                    ))}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <span className="text-sm text-gray-500">{selectedIds.size} selected</span>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button onClick={() => onSave(Array.from(selectedIds))}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                            <Save className="w-4 h-4" /> Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Link Team Leaders Modal
const LinkTeamLeadersModal: React.FC<{
    manager: Manager;
    allTeamLeaders: TeamLeader[];
    onClose: () => void;
    onSave: (teamLeaderIds: string[]) => void;
}> = ({ manager, allTeamLeaders, onClose, onSave }) => {
    const currentLinks = (manager.teamLeaderLinks || []).map(l => l.teamLeaderId);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(currentLinks));
    const [search, setSearch] = useState('');

    const filteredTeamLeaders = allTeamLeaders.filter(tl =>
        tl.name.toLowerCase().includes(search.toLowerCase())
    );

    const toggle = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Link Team Leaders to "{manager.name}"</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
                </div>

                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Search team leaders..." />
                </div>

                <div className="flex-1 overflow-y-auto border rounded-lg divide-y">
                    {filteredTeamLeaders.map((tl) => (
                        <label key={tl.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" checked={selectedIds.has(tl.id)} onChange={() => toggle(tl.id)}
                                className="w-4 h-4 text-purple-600 rounded" />
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                style={{ backgroundColor: tl.avatarColor || '#8B5CF6' }}>
                                {tl.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-gray-800">{tl.name}</p>
                                <p className="text-xs text-gray-500">{tl.teams?.length || 0} teams</p>
                            </div>
                        </label>
                    ))}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <span className="text-sm text-gray-500">{selectedIds.size} selected</span>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button onClick={() => onSave(Array.from(selectedIds))}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
                            <Link2 className="w-4 h-4" /> Link
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Add From User Modal - Select existing user to create Manager/Team Leader/Mailer
const AddFromUserModal: React.FC<{
    allUsers: DiagramUser[];
    existingManagers: Manager[];
    existingTeamLeaders: TeamLeader[];
    existingMailers: DiagramMailer[];
    onClose: () => void;
    onSave: (data: { name: string; email?: string; portalId?: string; userId?: number; role: 'manager' | 'teamLeader' | 'mailer'; teamId?: string }) => void;
}> = ({ allUsers, existingManagers, existingTeamLeaders, existingMailers, onClose, onSave }) => {
    const [selectedUser, setSelectedUser] = useState<DiagramUser | null>(null);
    const [search, setSearch] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [portalId, setPortalId] = useState('');
    const [role, setRole] = useState<'manager' | 'teamLeader' | 'mailer'>('manager');
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');

    const filteredUsers = allUsers.filter(u =>
    (u.username?.toLowerCase().includes(search.toLowerCase()) ||
        u.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        u.lastName?.toLowerCase().includes(search.toLowerCase()) ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()))
    );

    // Check if user already exists as manager, team leader, or mailer
    const checkExisting = (user: DiagramUser) => {
        const fullName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username || '';
        const asManager = existingManagers.find(m => m.userId === user.id || m.name.toLowerCase() === fullName.toLowerCase());
        const asTeamLeader = existingTeamLeaders.find(tl => tl.userId === user.id || tl.name.toLowerCase() === fullName.toLowerCase());
        const asMailer = existingMailers.find(m => m.name.toLowerCase() === fullName.toLowerCase());
        return { asManager, asTeamLeader, asMailer };
    };

    const handleSelectUser = (user: DiagramUser) => {
        setSelectedUser(user);
        const fullName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username || '';
        setName(fullName);
        setEmail(''); // Users don't have email in the model, leave blank

        // Check if already exists
        const existing = checkExisting(user);
        if (existing.asManager) {
            setPortalId(existing.asManager.portalId || '');
        } else if (existing.asTeamLeader) {
            setPortalId(existing.asTeamLeader.portalId || '');
        }
    };

    const existingStatus = selectedUser ? checkExisting(selectedUser) : null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Add from User</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
                </div>

                {/* User Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="Search users..." />
                </div>

                {/* User List */}
                {!selectedUser && (
                    <div className="flex-1 overflow-y-auto border rounded-lg divide-y mb-4 max-h-48">
                        {filteredUsers.length === 0 ? (
                            <p className="p-4 text-center text-gray-500">No users found</p>
                        ) : (
                            filteredUsers.map((user) => {
                                const existing = checkExisting(user);
                                return (
                                    <button key={user.id} onClick={() => handleSelectUser(user)}
                                        className="flex items-center gap-3 p-3 hover:bg-gray-50 w-full text-left">
                                        {user.photoUrl ? (
                                            <img src={user.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold">
                                                {(user.firstName?.[0] || user.username?.[0] || '?').toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-800">
                                                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
                                            </p>
                                            <p className="text-xs text-gray-500">@{user.username || 'No username'}</p>
                                        </div>
                                        {existing.asManager && (
                                            <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">Manager</span>
                                        )}
                                        {existing.asTeamLeader && (
                                            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">Team Leader</span>
                                        )}
                                        {existing.asMailer && (
                                            <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">Mailer</span>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Selected User Details */}
                {selectedUser && (
                    <div className="space-y-4 flex-1 overflow-y-auto">
                        {/* User Card */}
                        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-100">
                            {selectedUser.photoUrl ? (
                                <img src={selectedUser.photoUrl} alt="" className="w-16 h-16 rounded-full object-cover ring-4 ring-white shadow-md" />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center text-white text-2xl font-bold ring-4 ring-white shadow-md">
                                    {(selectedUser.firstName?.[0] || selectedUser.username?.[0] || '?').toUpperCase()}
                                </div>
                            )}
                            <div className="flex-1">
                                <p className="font-bold text-gray-900 text-lg">{selectedUser.firstName} {selectedUser.lastName}</p>
                                <p className="text-sm text-gray-500">@{selectedUser.username || 'No username'}</p>
                            </div>
                            <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Existing Status */}
                        {existingStatus && (existingStatus.asManager || existingStatus.asTeamLeader) && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-sm text-amber-800 font-medium">⚠️ This user already exists as:</p>
                                <ul className="text-sm text-amber-700 mt-1">
                                    {existingStatus.asManager && <li>• Manager: {existingStatus.asManager.name}</li>}
                                    {existingStatus.asTeamLeader && <li>• Team Leader: {existingStatus.asTeamLeader.name}</li>}
                                </ul>
                            </div>
                        )}

                        {/* Form Fields */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="Enter full name" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="Enter email (optional)" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Portal ID</label>
                            <input type="text" value={portalId} onChange={(e) => setPortalId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="Enter portal ID (optional)" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Role / Type *</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button onClick={() => setRole('manager')}
                                    className={`py-2 px-3 rounded-lg border-2 transition-all text-center ${role === 'manager'
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                        : 'border-gray-200 hover:border-gray-300'}`}>
                                    <div className="font-semibold text-sm">Manager</div>
                                </button>
                                <button onClick={() => setRole('teamLeader')}
                                    className={`py-2 px-3 rounded-lg border-2 transition-all text-center ${role === 'teamLeader'
                                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                                        : 'border-gray-200 hover:border-gray-300'}`}>
                                    <div className="font-semibold text-sm">Team Leader</div>
                                </button>
                                <button onClick={() => setRole('mailer')}
                                    className={`py-2 px-3 rounded-lg border-2 transition-all text-center ${role === 'mailer'
                                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                                        : 'border-gray-200 hover:border-gray-300'}`}>
                                    <div className="font-semibold text-sm">Mailer</div>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                    <button
                        onClick={() => selectedUser && name && onSave({ name, email: email || undefined, portalId: portalId || undefined, userId: selectedUser.id, role })}
                        disabled={!selectedUser || !name}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 flex items-center gap-2 shadow-md">
                        <Save className="w-4 h-4" /> Create {role === 'manager' ? 'Manager' : role === 'teamLeader' ? 'Team Leader' : 'Mailer'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CMHWTeamDiagram;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    Shield, Check, X, Trash2, Edit, User as UserIcon, Database, Plus,
    LayoutGrid, Search, Filter, MoreVertical, Activity, Users, Box,
    TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../config';
import { EntityFormModal } from './EntityFormModal';
import { Button } from './ui/Button';
import { Entity } from '../types';

interface User {
    id: number;
    telegramId: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    photoUrl: string | null;
    role: string;
    isApproved: boolean;
    createdAt: string;
    accessibleEntities: {
        entity: {
            id: string;
            name: string;
        };
    }[];
}

interface Toast {
    id: number;
    type: 'success' | 'error' | 'info';
    message: string;
}

export const AdminPanel: React.FC = () => {
    const { token } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [entities, setEntities] = useState<Entity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'entities' | 'users'>('overview');

    // Entity Modal State
    const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
    const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
    const [entitySearchQuery, setEntitySearchQuery] = useState('');

    useEffect(() => {
        if (!selectedUser) setEntitySearchQuery('');
    }, [selectedUser]);

    useEffect(() => {
        fetchUsers();
        fetchEntities();
    }, []);

    const showToast = (type: Toast['type'], message: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/api/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
            showToast('error', 'Failed to load users');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchEntities = async () => {
        try {
            const response = await fetch(`${API_URL}/api/entities`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setEntities(data);
            }
        } catch (error) {
            console.error('Failed to fetch entities:', error);
            showToast('error', 'Failed to load entities');
        }
    };

    const handleApprove = async (userId: number, isApproved: boolean) => {
        try {
            await fetch(`${API_URL}/api/admin/users/${userId}/approve`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ isApproved })
            });
            fetchUsers();
            showToast('success', isApproved ? 'User approved successfully' : 'Approval revoked');
        } catch (error) {
            console.error('Failed to update approval:', error);
            showToast('error', 'Failed to update approval status');
        }
    };

    const handleDeleteUser = async (userId: number) => {
        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            await fetch(`${API_URL}/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            fetchUsers();
            showToast('success', 'User deleted successfully');
        } catch (error) {
            console.error('Failed to delete user:', error);
            showToast('error', 'Failed to delete user');
        }
    };

    const handleRoleUpdate = async (userId: number, role: string) => {
        try {
            await fetch(`${API_URL}/api/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role })
            });
            fetchUsers();
            showToast('success', 'Role updated successfully');
        } catch (error) {
            console.error('Failed to update role:', error);
            showToast('error', 'Failed to update role');
        }
    };

    const toggleAccess = async (userId: number, entityId: string, hasAccess: boolean) => {
        // Optimistic UI Update
        if (selectedUser && selectedUser.id === userId) {
            const updatedUser = { ...selectedUser };
            if (hasAccess) {
                updatedUser.accessibleEntities = updatedUser.accessibleEntities.filter(e => e.entity.id !== entityId);
            } else {
                const entity = entities.find(e => e.id === entityId);
                if (entity) {
                    updatedUser.accessibleEntities = [
                        ...updatedUser.accessibleEntities,
                        { entity: { id: entity.id, name: entity.name } }
                    ];
                }
            }
            setSelectedUser(updatedUser);
        }

        const endpoint = hasAccess ? 'revoke' : 'assign';
        try {
            await fetch(`${API_URL}/api/admin/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userId, entityId })
            });
            fetchUsers();
            showToast('success', hasAccess ? 'Access revoked' : 'Access granted');
        } catch (error) {
            console.error('Failed to toggle access:', error);
            showToast('error', 'Failed to update access');
            fetchUsers(); // Revert state on error
        }
    };

    const handleSaveEntity = async (entity: Entity) => {
        try {
            const isEdit = entities.some(e => e.id === entity.id);
            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit ? `${API_URL}/api/entities/${entity.id}` : `${API_URL}/api/entities`;

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(entity)
            });

            if (response.ok) {
                fetchEntities();
                setIsEntityModalOpen(false);
                setEditingEntity(null);
                showToast('success', isEdit ? 'Entity updated successfully' : 'Entity created successfully');
            } else {
                const error = await response.json();
                showToast('error', error.error || 'Failed to save entity');
            }
        } catch (error) {
            console.error('Error saving entity:', error);
            showToast('error', 'Failed to save entity');
        }
    };

    const handleDeleteEntity = async (entityId: string) => {
        if (!confirm('Are you sure you want to delete this entity? This action cannot be undone.')) return;

        try {
            await fetch(`${API_URL}/api/entities/${entityId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            fetchEntities();
            showToast('success', 'Entity deleted successfully');
        } catch (error) {
            console.error('Failed to delete entity:', error);
            showToast('error', 'Failed to delete entity');
        }
    };

    const openAddEntityModal = () => {
        setEditingEntity(null);
        setIsEntityModalOpen(true);
    };

    const openEditEntityModal = (entity: Entity) => {
        setEditingEntity(entity);
        setIsEntityModalOpen(true);
    };

    // Filter users
    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.username?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'approved' && user.isApproved) ||
            (statusFilter === 'pending' && !user.isApproved);

        return matchesSearch && matchesRole && matchesStatus;
    });

    // Calculate stats
    const stats = {
        totalUsers: users.length,
        totalEntities: entities.length,
        approvedUsers: users.filter(u => u.isApproved).length,
        pendingUsers: users.filter(u => !u.isApproved).length,
        activeEntities: entities.filter(e => e.status !== 'inactive').length
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-[#E8F6FC] to-slate-50">
            {/* Toast Notifications */}
            <div className="fixed top-4 right-4 z-50 space-y-2">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 100, scale: 0.95 }}
                            className={`px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm border flex items-center gap-3 min-w-[300px] ${toast.type === 'success' ? 'bg-green-50/90 border-green-200 text-green-800' :
                                toast.type === 'error' ? 'bg-red-50/90 border-red-200 text-red-800' :
                                    'bg-blue-50/90 border-blue-200 text-blue-800'
                                }`}
                        >
                            {toast.type === 'success' && <CheckCircle size={20} />}
                            {toast.type === 'error' && <XCircle size={20} />}
                            {toast.type === 'info' && <AlertCircle size={20} />}
                            <span className="text-sm font-medium">{toast.message}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <div className="max-w-[1600px] mx-auto p-8 space-y-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between"
                >
                    <div>
                        <h1 className="text-4xl font-bold" style={{ background: 'linear-gradient(to right, #5FB8E5, #87CEEB, #6FC5E8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                            Admin Dashboard
                        </h1>
                        <p className="text-gray-600 mt-1 font-medium">Manage your system, users, and entities</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-5 py-2.5 text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg" style={{ background: 'linear-gradient(to right, #6FC5E8, #87CEEB)', boxShadow: '0 10px 25px -5px rgba(135, 206, 235, 0.4)' }}>
                            <Shield size={18} />
                            Admin Access
                        </div>
                    </div>
                </motion.div>

                {/* Stats Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6"
                >
                    <StatCard
                        icon={<Users style={{ color: '#87CEEB' }} size={24} />}
                        label="Total Users"
                        value={stats.totalUsers}
                        trend="+12%"
                        color="blue"
                    />
                    <StatCard
                        icon={<Box style={{ color: '#87CEEB' }} size={24} />}
                        label="Total Entities"
                        value={stats.totalEntities}
                        trend="+5%"
                        color="blue"
                    />
                    <StatCard
                        icon={<CheckCircle className="text-green-600" size={24} />}
                        label="Approved"
                        value={stats.approvedUsers}
                        color="green"
                    />
                    <StatCard
                        icon={<Clock className="text-amber-600" size={24} />}
                        label="Pending"
                        value={stats.pendingUsers}
                        color="amber"
                    />
                    <StatCard
                        icon={<Activity className="text-emerald-600" size={24} />}
                        label="Active Entities"
                        value={stats.activeEntities}
                        color="emerald"
                    />
                </motion.div>

                {/* Tab Navigation */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white p-1.5 rounded-full border border-gray-200 shadow-sm inline-flex"
                >
                    {(['overview', 'entities', 'users'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all duration-200 capitalize ${activeTab === tab
                                ? 'bg-[#6FC5E8] text-white shadow-md'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </motion.div>

                {/* Content based on active tab */}
                <AnimatePresence mode="wait">
                    {activeTab === 'overview' && (
                        <OverviewTab key="overview" users={users} entities={entities} />
                    )}

                    {activeTab === 'entities' && (
                        <EntitiesTab
                            key="entities"
                            entities={entities}
                            onAdd={openAddEntityModal}
                            onEdit={openEditEntityModal}
                            onDelete={handleDeleteEntity}
                        />
                    )}

                    {activeTab === 'users' && (
                        <UsersTab
                            key="users"
                            users={filteredUsers}
                            entities={entities}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            roleFilter={roleFilter}
                            setRoleFilter={setRoleFilter}
                            statusFilter={statusFilter}
                            setStatusFilter={setStatusFilter}
                            onApprove={handleApprove}
                            onDelete={handleDeleteUser}
                            onRoleUpdate={handleRoleUpdate}
                            onManageAccess={setSelectedUser}
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Access Management Modal */}
            <AnimatePresence>
                {selectedUser && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setSelectedUser(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                        >
                            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                                <h3 className="font-semibold text-gray-900 text-lg">Manage Access</h3>
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-gray-600 mb-4">
                                    Select entities that <strong className="text-gray-900">{selectedUser.firstName}</strong> can access:
                                </p>

                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search entities..."
                                        value={entitySearchQuery}
                                        onChange={(e) => setEntitySearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                    {entities
                                        .filter(entity =>
                                            entity.name.toLowerCase().includes(entitySearchQuery.toLowerCase()) ||
                                            entity.id.toLowerCase().includes(entitySearchQuery.toLowerCase())
                                        )
                                        .map((entity) => {
                                            const hasAccess = selectedUser.accessibleEntities.some(e => e.entity.id === entity.id);
                                            return (
                                                <label
                                                    key={entity.id}
                                                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${hasAccess
                                                        ? 'border-blue-400 bg-blue-50/50 shadow-sm'
                                                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                                                        }`}
                                                >
                                                    {/* Custom Checkbox */}
                                                    <div className="relative flex-shrink-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={hasAccess}
                                                            onChange={() => toggleAccess(selectedUser.id, entity.id, hasAccess)}
                                                            className="sr-only peer"
                                                        />
                                                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${hasAccess
                                                            ? 'bg-blue-500 border-blue-500'
                                                            : 'bg-white border-gray-300 peer-focus:border-blue-400'
                                                            }`}>
                                                            {hasAccess && (
                                                                <svg
                                                                    className="w-4 h-4 text-white"
                                                                    fill="none"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth="3"
                                                                    viewBox="0 0 24 24"
                                                                    stroke="currentColor"
                                                                >
                                                                    <path d="M5 13l4 4L19 7"></path>
                                                                </svg>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Entity Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-sm font-semibold truncate ${hasAccess ? 'text-blue-900' : 'text-gray-900'
                                                                }`}>
                                                                {entity.name}
                                                            </span>
                                                            <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${entity.status === 'active'
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-gray-100 text-gray-700'
                                                                }`}>
                                                                {entity.status || 'active'}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 font-mono mt-1 truncate">{entity.id}</p>
                                                    </div>

                                                    {/* Status Icon */}
                                                    {hasAccess && (
                                                        <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
                                                    )}
                                                </label>
                                            );
                                        })}
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                                <Button
                                    onClick={() => setSelectedUser(null)}
                                    size="sm"
                                >
                                    Done
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Entity Form Modal */}
            <EntityFormModal
                isOpen={isEntityModalOpen}
                onClose={() => setIsEntityModalOpen(false)}
                onSave={handleSaveEntity}
                initialEntity={editingEntity}
            />

        </div>
    );
};

// Stat Card Component
const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: number;
    trend?: string;
    color: string;
}> = ({ icon, label, value, trend, color }) => (
    <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        className="bg-white rounded-2xl p-6 border border-gray-200/50 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
    >
        <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl bg-${color}-50 group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            {trend && (
                <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                    <TrendingUp size={12} />
                    {trend}
                </span>
            )}
        </div>
        <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
        <div className="text-sm text-gray-500 font-medium">{label}</div>
    </motion.div>
);

// Overview Tab
const OverviewTab: React.FC<{ users: User[]; entities: Entity[] }> = ({ users, entities }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6"
    >
        <div className="bg-white rounded-2xl p-8 border border-gray-200/50 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">System Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="font-semibold text-gray-700">Recent Activity</h3>
                    <div className="space-y-3">
                        {users.slice(0, 5).map((user, idx) => (
                            <motion.div
                                key={user.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                                {user.photoUrl ? (
                                    <img src={user.photoUrl} alt="" className="w-10 h-10 rounded-full" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                                        {user.firstName?.[0]}{user.lastName?.[0]}
                                    </div>
                                )}
                                <div className="flex-1">
                                    <div className="font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                                    <div className="text-xs text-gray-500">Joined recently</div>
                                </div>
                                {user.isApproved ? (
                                    <CheckCircle size={16} className="text-green-500" />
                                ) : (
                                    <Clock size={16} className="text-amber-500" />
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="font-semibold text-gray-700">Entity Status</h3>
                    <div className="space-y-3">
                        {entities.slice(0, 5).map((entity, idx) => (
                            <motion.div
                                key={entity.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                                <div>
                                    <div className="font-medium text-gray-900">{entity.name}</div>
                                    <div className="text-xs text-gray-500 font-mono">{entity.id}</div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${entity.status === 'active'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-700'
                                    }`}>
                                    {entity.status || 'active'}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </motion.div>
);

// Entities Tab
const EntitiesTab: React.FC<{
    entities: Entity[];
    onAdd: () => void;
    onEdit: (entity: Entity) => void;
    onDelete: (id: string) => void;
}> = ({ entities, onAdd, onEdit, onDelete }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6"
    >
        <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Entities</h2>
            <Button onClick={onAdd} leftIcon={<Plus size={20} />}>
                Add Entity
            </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {entities.map((entity, idx) => (
                <motion.div
                    key={entity.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="group bg-white border border-gray-200/50 rounded-2xl p-6 hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
                    style={{ borderColor: '#e5e7eb' }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#87CEEB'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-bold text-gray-900 text-xl">{entity.name}</h3>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${entity.status === 'active'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-700'
                                    }`}>
                                    {entity.status || 'active'}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 font-mono mb-3">{entity.id}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => onEdit(entity)}
                                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg transition-colors"
                                style={{ backgroundColor: 'transparent' }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(135, 206, 235, 0.1)'; e.currentTarget.style.color = '#87CEEB'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6b7280'; }}
                            >
                                <Edit size={16} />
                            </button>
                            <button
                                onClick={() => onDelete(entity.id)}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-gradient-to-br from-gray-50 to-white p-3 rounded-xl border border-gray-100">
                            <div className="text-xs text-gray-500 mb-1 font-medium">Categories</div>
                            <div className="text-2xl font-bold text-gray-900">
                                {entity.reporting?.parentCategories?.length || 0}
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-gray-50 to-white p-3 rounded-xl border border-gray-100">
                            <div className="text-xs text-gray-500 mb-1 font-medium">Total Sessions</div>
                            <div className="text-2xl font-bold text-gray-900">
                                {entity.reporting?.parentCategories?.reduce((total, cat) =>
                                    total + (cat.profiles?.length || 0), 0) || 0}
                            </div>
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div className="space-y-2 pt-3 border-t border-gray-100">
                        {entity.contactPerson && (
                            <div className="flex items-center gap-2 text-sm">
                                <UserIcon size={14} className="text-gray-400" />
                                <span className="text-gray-600">{entity.contactPerson}</span>
                            </div>
                        )}
                        {entity.email && (
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-400">✉</span>
                                <span className="text-gray-600 truncate">{entity.email}</span>
                            </div>
                        )}
                        {!entity.contactPerson && !entity.email && (
                            <div className="text-xs text-gray-400 italic">No contact information</div>
                        )}
                    </div>

                    {/* Hover Accent */}
                    <div
                        className="absolute top-0 left-0 w-1 h-full transition-all duration-300 opacity-0 group-hover:opacity-100"
                        style={{ background: 'linear-gradient(to bottom, #87CEEB, #6FC5E8)' }}
                    />
                </motion.div>
            ))}
        </div>

        {entities.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200/50">
                <Database className="mx-auto text-gray-300 mb-4" size={64} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No entities yet</h3>
                <p className="text-gray-500 mb-6">Create your first entity to get started</p>
                <Button onClick={onAdd} leftIcon={<Plus size={20} />}>
                    Add Entity
                </Button>
            </div>
        )}
    </motion.div>
);

// Users Tab
const UsersTab: React.FC<{
    users: User[];
    entities: Entity[];
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    roleFilter: string;
    setRoleFilter: (r: string) => void;
    statusFilter: string;
    setStatusFilter: (s: string) => void;
    onApprove: (id: number, approved: boolean) => void;
    onDelete: (id: number) => void;
    onRoleUpdate: (id: number, role: string) => void;
    onManageAccess: (user: User) => void;
}> = ({
    users,
    entities,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    onApprove,
    onDelete,
    onRoleUpdate,
    onManageAccess
}) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            {/* Search and Filters */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200/50 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search users by name, role, status..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                        <option value="all">All Roles</option>
                        <option value="ADMIN">Admin</option>
                        <option value="MAILER">Mailer</option>
                        <option value="USER">User</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                        <option value="all">All Status</option>
                        <option value="approved">Approved</option>
                        <option value="pending">Pending</option>
                    </select>
                </div>
            </div>

            {/* Users List */}
            <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                                <th className="px-6 py-4 text-left font-semibold text-gray-700 text-sm">User</th>
                                <th className="px-6 py-4 text-left font-semibold text-gray-700 text-sm">Role</th>
                                <th className="px-6 py-4 text-left font-semibold text-gray-700 text-sm">Status</th>
                                <th className="px-6 py-4 text-left font-semibold text-gray-700 text-sm">Access</th>
                                <th className="px-6 py-4 text-right font-semibold text-gray-700 text-sm">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map((user, idx) => (
                                <motion.tr
                                    key={user.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="hover:bg-gray-50/50 transition-colors group"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {user.photoUrl ? (
                                                <img
                                                    src={user.photoUrl}
                                                    alt=""
                                                    className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                                                    {user.firstName?.[0]}{user.lastName?.[0]}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-semibold text-gray-900">{user.firstName} {user.lastName}</div>
                                                <div className="text-sm text-gray-500">@{user.username || 'No username'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={user.role}
                                            onChange={(e) => onRoleUpdate(user.id, e.target.value)}
                                            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none hover:border-blue-300 transition-colors"
                                        >
                                            <option value="USER">User</option>
                                            <option value="MAILER">Mailer</option>
                                            <option value="ADMIN">Admin</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.isApproved ? (
                                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                                <CheckCircle size={14} />
                                                Approved
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                                                <Clock size={14} />
                                                Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                            {user.accessibleEntities.length > 0 ? (
                                                user.accessibleEntities.slice(0, 2).map(({ entity }) => (
                                                    <span key={entity.id} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-100">
                                                        {entity.name}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-sm text-gray-400 italic">No access</span>
                                            )}
                                            {user.accessibleEntities.length > 2 && (
                                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
                                                    +{user.accessibleEntities.length - 2}
                                                </span>
                                            )}
                                            <button
                                                onClick={() => onManageAccess(user)}
                                                className="ml-1 p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Manage Access"
                                            >
                                                <Edit size={14} />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            {!user.isApproved && (
                                                <button
                                                    onClick={() => onApprove(user.id, true)}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Approve User"
                                                >
                                                    <Check size={18} />
                                                </button>
                                            )}
                                            {user.isApproved && (
                                                <button
                                                    onClick={() => onApprove(user.id, false)}
                                                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                    title="Revoke Approval"
                                                >
                                                    <X size={18} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onDelete(user.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete User"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {users.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200/50">
                    <Users className="mx-auto text-gray-300 mb-4" size={64} />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No users found</h3>
                    <p className="text-gray-500">Try adjusting your search or filters</p>
                </div>
            )}
        </motion.div>
    );

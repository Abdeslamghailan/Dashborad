import React from 'react';
import { motion } from 'framer-motion';
import { Search, CheckCircle, Clock, Edit, Trash2, Check, X, Users, Shield } from 'lucide-react';
import { User, AdminStats } from './types';
import { Entity } from '../../types';

interface UsersTabProps {
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
}

export const UsersTab: React.FC<UsersTabProps> = ({
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
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search users by name, role, status..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-bold text-gray-700"
                >
                    <option value="all">All Roles</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MAILER">Mailer</option>
                    <option value="USER">User</option>
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-bold text-gray-700"
                >
                    <option value="all">All Status</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                </select>
            </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-6 py-4 text-left font-bold text-gray-500 text-xs uppercase tracking-wider">User</th>
                            <th className="px-6 py-4 text-left font-bold text-gray-500 text-xs uppercase tracking-wider">Role</th>
                            <th className="px-6 py-4 text-left font-bold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left font-bold text-gray-500 text-xs uppercase tracking-wider">Access</th>
                            <th className="px-6 py-4 text-right font-bold text-gray-500 text-xs uppercase tracking-wider">Actions</th>
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
                                                className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100 shadow-sm"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6FC5E8] to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                                                {user.firstName?.[0]}{user.lastName?.[0]}
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-bold text-gray-900">{user.firstName} {user.lastName}</div>
                                            <div className="text-sm text-gray-500 font-medium">@{user.username || 'No username'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="relative">
                                        <select
                                            value={user.role}
                                            onChange={(e) => onRoleUpdate(user.id, e.target.value)}
                                            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none hover:border-blue-300 transition-colors appearance-none pr-8 cursor-pointer"
                                        >
                                            <option value="USER">User</option>
                                            <option value="MAILER">Mailer</option>
                                            <option value="ADMIN">Admin</option>
                                        </select>
                                        <Shield size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {user.isApproved ? (
                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                                            <CheckCircle size={14} />
                                            Approved
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                            <Clock size={14} />
                                            Pending
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1.5 items-center">
                                        {user.accessibleEntities.length > 0 ? (
                                            user.accessibleEntities.slice(0, 2).map(({ entity }) => (
                                                <span key={entity.id} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold border border-blue-100 uppercase">
                                                    {entity.name}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-gray-400 font-medium italic">No access</span>
                                        )}
                                        {user.accessibleEntities.length > 2 && (
                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold border border-gray-200 uppercase">
                                                +{user.accessibleEntities.length - 2}
                                            </span>
                                        )}
                                        <button
                                            onClick={() => onManageAccess(user)}
                                            className="ml-1 p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                            title="Manage Access"
                                        >
                                            <Edit size={14} />
                                        </button>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                        {!user.isApproved ? (
                                            <button
                                                onClick={() => onApprove(user.id, true)}
                                                className="p-2.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-xl transition-all shadow-sm"
                                                title="Approve User"
                                            >
                                                <Check size={18} />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => onApprove(user.id, false)}
                                                className="p-2.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl transition-all shadow-sm"
                                                title="Revoke Approval"
                                            >
                                                <X size={18} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => onDelete(user.id)}
                                            className="p-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all shadow-sm"
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
            <div className="text-center py-24 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <Users className="mx-auto text-gray-200 mb-4" size={64} />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No users found</h3>
                <p className="text-gray-500 font-medium">Try adjusting your search or filters to find what you're looking for.</p>
            </div>
        )}
    </motion.div>
);

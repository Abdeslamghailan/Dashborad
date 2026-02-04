import React from 'react';
import { motion } from 'framer-motion';
import { Users, Box, CheckCircle, Clock, Activity, TrendingUp, Shield, AlertCircle, Calendar, FileText, Database } from 'lucide-react';
import { User, AdminStats } from './types';
import { Entity } from '../../types';

interface OverviewTabProps {
    users: User[];
    entities: Entity[];
    stats: AdminStats;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ users, entities, stats }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6"
    >
        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
                icon={<Users size={24} />}
                label="Registered Users"
                value={stats.totalUsers}
                trend="+8% this month"
                color="blue"
            />
            <StatCard
                icon={<Database size={24} />}
                label="System Entities"
                value={stats.totalEntities}
                trend="+2 since last week"
                color="indigo"
            />
            <StatCard
                icon={<Shield size={24} />}
                label="Access Requests"
                value={stats.pendingUsers}
                trend={stats.pendingUsers > 0 ? "Requires attention" : "All clear"}
                color={stats.pendingUsers > 0 ? "amber" : "emerald"}
                isAlert={stats.pendingUsers > 0}
            />
            <StatCard
                icon={<Activity size={24} />}
                label="Active Status"
                value={stats.activeEntities}
                trend="All systems nominal"
                color="emerald"
            />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions & Navigation */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-black text-gray-900 mb-6 uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={20} className="text-[#6FC5E8]" />
                        System Health
                    </h3>
                    <div className="space-y-6">
                        <HealthItem label="User Approval Rate" value="94%" color="bg-emerald-500" />
                        <HealthItem label="Entity Up-time" value="99.9%" color="bg-[#6FC5E8]" />
                        <HealthItem label="API Response Time" value="240ms" color="bg-indigo-500" />
                        <HealthItem label="Data Synchronization" value="Optimal" color="bg-emerald-500" isText />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-[#6FC5E8] to-blue-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
                    <div className="relative z-10">
                        <h3 className="text-xl font-black mb-2 uppercase tracking-wider">Quick Note</h3>
                        <p className="text-blue-50/80 text-sm font-medium leading-relaxed mb-6">
                            Maintain entity configurations regularly to ensure reporting accuracy across all methods.
                        </p>
                        <button className="px-6 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
                            Review Policy
                        </button>
                    </div>
                    <Shield size={120} className="absolute -bottom-8 -right-8 text-white/10 group-hover:scale-110 transition-transform duration-700" />
                </div>
            </div>

            {/* Recent Activity Unified */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                        <Clock size={20} className="text-[#6FC5E8]" />
                        Recent System Events
                    </h3>
                    <button className="text-xs font-bold text-[#6FC5E8] hover:underline uppercase tracking-widest">View All</button>
                </div>

                <div className="space-y-4">
                    {users.slice(0, 5).map((user, idx) => (
                        <motion.div
                            key={user.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50/50 hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all group"
                        >
                            <div className="relative">
                                {user.photoUrl ? (
                                    <img src={user.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover shadow-sm ring-2 ring-white" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6FC5E8] to-blue-500 flex items-center justify-center text-white font-black">
                                        {user.firstName?.[0]}{user.lastName?.[0]}
                                    </div>
                                )}
                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${user.isApproved ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-black text-gray-900">{user.firstName} {user.lastName}</span>
                                    <span className="text-[10px] font-black uppercase text-gray-400">@{user.username || 'user'}</span>
                                </div>
                                <div className="text-xs text-gray-500 font-medium">
                                    {user.isApproved ? 'Successfully joined the platform' : 'Waiting for administrative approval'}
                                </div>
                            </div>
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap bg-white px-3 py-1 rounded-full border border-gray-100">
                                {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                        </motion.div>
                    ))}

                    {entities.length > 0 && (
                        <div className="mt-8 pt-8 border-t border-gray-100">
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#6FC5E8]/5 border border-[#6FC5E8]/20">
                                <div className="p-3 bg-[#6FC5E8] text-white rounded-xl shadow-lg">
                                    <Box size={24} />
                                </div>
                                <div className="flex-1">
                                    <div className="font-black text-gray-900 uppercase text-xs tracking-wider">Top Performing Entity</div>
                                    <div className="text-lg font-black text-[#6FC5E8]">{entities[0].name}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-black text-gray-900">100%</div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Session Logic</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </motion.div>
);

const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: number;
    trend: string;
    color: 'blue' | 'emerald' | 'amber' | 'indigo';
    isAlert?: boolean;
}> = ({ icon, label, value, trend, color, isAlert }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    };

    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative"
        >
            <div className={`p-4 rounded-2xl ${colors[color]} border inline-flex mb-6 group-hover:scale-110 transition-transform duration-500`}>
                {icon}
            </div>
            <div className="flex items-baseline gap-2 mb-2">
                <div className="text-4xl font-black text-gray-900 tracking-tight">{value}</div>
                {isAlert && <AlertCircle size={16} className="text-amber-500 animate-pulse" />}
            </div>
            <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{label}</div>
            <div className={`text-[10px] font-bold uppercase tracking-widest ${isAlert ? 'text-amber-600' : 'text-emerald-500'}`}>{trend}</div>

            {/* Background pattern */}
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-black">
                {icon}
            </div>
        </motion.div>
    );
};

const HealthItem: React.FC<{ label: string; value: string; color: string; isText?: boolean }> = ({ label, value, color, isText }) => (
    <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
            <span className="text-gray-400">{label}</span>
            <span className="text-gray-900 font-black">{value}</span>
        </div>
        {!isText && (
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: value }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full ${color} rounded-full`}
                />
            </div>
        )}
    </div>
);

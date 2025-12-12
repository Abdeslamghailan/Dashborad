import React from 'react';
import { Entity } from '../../types';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import { AlignLeft, CheckCircle2, XCircle, Users, Server } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  entity: Entity;
}

export const EntityOverview: React.FC<Props> = ({ entity }) => {

  // --- Calculations ---

  // Helper: Parse ranges like "1-14000" or "500"
  const getLimitValue = (str: string): number => {
    if (!str || str.toUpperCase() === 'NO') return 0;
    const parts = str.split(',');
    let total = 0;
    parts.forEach(p => {
      const trimmed = p.trim();
      if (!trimmed || trimmed.toUpperCase() === 'NO') return;
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) total += (end - start + 1);
      } else {
        const val = parseInt(trimmed);
        if (!isNaN(val)) total += val;
      }
    });
    return total;
  };

  // 1. Calculate stats per Category from actual session data
  const categoryStats = entity.reporting.parentCategories.map(cat => {
    // Only count non-mirror profiles
    const principalProfiles = cat.profiles.filter(p => !p.isMirror);

    // Sum actual values from profiles (Report Seeds by Type table)
    const totalCount = principalProfiles.reduce((sum, p) => sum + (p.sessionCount || 0), 0);
    const connectedCount = principalProfiles.reduce((sum, p) => sum + (p.successCount || 0), 0);
    const blockedCount = principalProfiles.reduce((sum, p) => sum + (p.errorCount || 0), 0);

    return {
      name: cat.name,
      totalCount,
      connectedCount,
      blockedCount,
      profileCount: principalProfiles.length
    };
  });

  // 2. Aggregate Globals - Deduplicate by profileName to avoid counting same session multiple times
  // Get all unique sessions across all categories (by profileName)
  const allProfiles = entity.reporting.parentCategories.flatMap(cat =>
    cat.profiles.filter(p => !p.isMirror)
  );

  // Deduplicate by profileName - keep the first occurrence
  const uniqueProfileMap = new Map<string, typeof allProfiles[0]>();
  allProfiles.forEach(profile => {
    if (!uniqueProfileMap.has(profile.profileName)) {
      uniqueProfileMap.set(profile.profileName, profile);
    }
  });
  const uniqueProfiles = Array.from(uniqueProfileMap.values());

  const totalSeeds = uniqueProfiles.reduce((sum, p) => sum + (p.sessionCount || 0), 0);
  const totalConnected = uniqueProfiles.reduce((sum, p) => sum + (p.successCount || 0), 0);
  const totalBlocked = uniqueProfiles.reduce((sum, p) => sum + (p.errorCount || 0), 0);
  const sessionCount = uniqueProfiles.length;

  const connectedRate = totalSeeds > 0 ? ((totalConnected / totalSeeds) * 100).toFixed(2) : '0.00';
  const blockedRate = totalSeeds > 0 ? ((totalBlocked / totalSeeds) * 100).toFixed(2) : '0.00';

  // 3. Chart Data
  const connectedVsBlockedData = [
    { name: 'Connected', value: totalConnected },
    { name: 'Blocked', value: totalBlocked }
  ];

  // Connected by Type (Category)
  const connectedByTypeData = categoryStats.map(cat => ({
    name: cat.name.replace(' REPORTING', ''), // Clean up name for chart
    value: cat.connectedCount
  })).filter(d => d.value > 0);

  const COLORS = {
    connected: '#22c55e', // Green
    blocked: '#ef4444',   // Red
    types: ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6'] // Green, Blue, Amber, Purple
  };

  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="TOTAL SEEDS"
          value={totalSeeds.toLocaleString()}
          icon={<Users className="text-blue-600" size={24} />}
          bgIcon="bg-blue-100"
        />
        <StatCard
          label="TOTAL CONNECTED"
          value={totalConnected.toLocaleString()}
          subValue={`${connectedRate}% Connected Rate`}
          icon={<CheckCircle2 className="text-green-600" size={24} />}
          bgIcon="bg-green-100"
        />
        <StatCard
          label="TOTAL BLOCKED"
          value={totalBlocked.toLocaleString()}
          subValue={`${blockedRate}% Blocked Rate`}
          icon={<XCircle className="text-red-600" size={24} />}
          bgIcon="bg-red-100"
        />
        <StatCard
          label="TOTAL SESSIONS"
          value={sessionCount.toString()}
          icon={<Server className="text-indigo-600" size={24} />}
          bgIcon="bg-indigo-100"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Connected vs Blocked Donut */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <h3 className="font-semibold text-gray-800 mb-4">Connected vs Blocked</h3>
          <div className="h-[240px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={connectedVsBlockedData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  cornerRadius={10}
                >
                  <Cell fill={COLORS.connected} />
                  <Cell fill={COLORS.blocked} />
                </Pie>

                <Tooltip
                  formatter={(value: number) => value.toLocaleString()}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-gray-800">{totalSeeds.toLocaleString()}</span>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">SEEDS</span>
            </div>
          </div>

          <div className="flex justify-center items-center gap-12 mt-2">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-600 font-medium">Blocked</span>
              </div>
              <span className="text-xl font-bold text-red-500">{totalBlocked.toLocaleString()}</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600 font-medium">Connected</span>
              </div>
              <span className="text-xl font-bold text-green-600">{totalConnected.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>

        {/* Connected by Type Donut */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <h3 className="font-semibold text-gray-800 mb-4">Connected by Type</h3>
          <div className="h-[240px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={connectedByTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  cornerRadius={10}
                >
                  {connectedByTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS.types[index % COLORS.types.length]} />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(value: number) => value.toLocaleString()}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-gray-800">{totalConnected.toLocaleString()}</span>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Connected</span>
            </div>
          </div>

          <div className="flex justify-center items-center gap-8 mt-2 flex-wrap">
            {connectedByTypeData.map((item, index) => (
              <div key={item.name} className="flex flex-col items-center">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.types[index % COLORS.types.length] }}></div>
                  <span className="text-sm text-gray-600 font-medium">{item.name}</span>
                </div>
                <span className="text-xl font-bold text-gray-800">{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
};

const StatCard = ({ label, value, subValue, icon, bgIcon }: { label: string, value: string, subValue?: string, icon: React.ReactNode, bgIcon: string }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-start gap-4">
    <div className={`p-3 rounded-lg ${bgIcon} shrink-0`}>
      {icon}
    </div>
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <h3 className="text-2xl font-bold text-gray-900 leading-none">{value}</h3>
      {subValue && <p className="text-xs text-gray-500 mt-2 font-medium">{subValue}</p>}
    </div>
  </div>
);
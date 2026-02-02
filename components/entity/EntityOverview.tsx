import React from 'react';
import { Entity } from '../../types';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
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
  const allProfiles = entity.reporting.parentCategories.flatMap(cat =>
    cat.profiles.filter(p => !p.isMirror)
  );

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
  const COLORS = {
    connected: '#22c55e', // Green
    blocked: '#ef4444',   // Red
    total: '#3b82f6',     // Blue
    types: ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6'] // Green, Blue, Amber, Purple
  };

  const pendingCount = Math.max(0, totalSeeds - totalConnected - totalBlocked);
  const overallPieData = [
    { name: 'Blocked', value: totalBlocked },
    { name: 'Connected', value: totalConnected },
    { name: 'Pending', value: pendingCount }
  ].filter(d => d.value > 0);

  const isPieEmpty = overallPieData.length === 0;
  const pieChartData = isPieEmpty ? [{ name: 'Empty', value: 1 }] : overallPieData;

  // Performance by Category
  const performanceByCategoryData = categoryStats.map(cat => ({
    name: cat.name.replace(' REPORTING', '').replace(' Configuration', ''),
    Count: cat.totalCount,
    Connected: cat.connectedCount,
    Blocked: cat.blockedCount
  }));

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

        {/* Overall Seeds Donut */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col"
          style={{ minHeight: '500px' }}
        >
          <h3 className="font-bold text-gray-800 mb-8 text-lg">Connected vs Blocked</h3>
          <div className="relative flex-1 flex justify-center items-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={85}
                  outerRadius={115}
                  paddingAngle={pieChartData.length > 1 ? 4 : 0}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  cornerRadius={10}
                  stroke="none"
                  isAnimationActive={true}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.name === 'Connected' ? COLORS.connected :
                          entry.name === 'Blocked' ? COLORS.blocked :
                            'transparent' // Match background for Pending/Empty
                      }
                    />
                  ))}
                </Pie>
                {!isPieEmpty && (
                  <Tooltip
                    formatter={(value: number, name: string) => name === 'Pending' ? null : value.toLocaleString()}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-bold text-gray-800 tracking-tight">{totalSeeds.toLocaleString().replace(/,/g, ' ')}</span>
              <span className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">TOTAL SEEDS</span>
            </div>
          </div>

          <div className="flex justify-center items-center gap-16 mt-8 pb-4">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-500 font-bold">Blocked</span>
              </div>
              <span className="text-2xl font-bold text-red-500">{totalBlocked.toLocaleString()}</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-500 font-bold">Connected</span>
              </div>
              <span className="text-2xl font-bold text-green-500">{totalConnected.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>

        {/* Performance by Category Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col"
          style={{ minHeight: '500px' }}
        >
          <h3 className="font-bold text-gray-800 mb-8 text-lg">Performance by Category</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={performanceByCategoryData}
                margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                barGap={8}
                barCategoryGap="25%"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => value.toLocaleString()}
                />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  iconType="rect"
                  iconSize={14}
                  wrapperStyle={{ paddingTop: '30px' }}
                  payload={[
                    { value: 'Blocked', type: 'rect', id: 'Blocked', color: COLORS.blocked },
                    { value: 'Connected', type: 'rect', id: 'Connected', color: COLORS.connected },
                    { value: 'Count', type: 'rect', id: 'Count', color: COLORS.total },
                  ]}
                  formatter={(value) => <span className="text-gray-600 font-bold text-sm ml-2">{value}</span>}
                />
                <Bar dataKey="Count" fill={COLORS.total} radius={[4, 4, 0, 0]} barSize={35} />
                <Bar dataKey="Blocked" fill={COLORS.blocked} radius={[4, 4, 0, 0]} barSize={35} />
                <Bar dataKey="Connected" fill={COLORS.connected} radius={[4, 4, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
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
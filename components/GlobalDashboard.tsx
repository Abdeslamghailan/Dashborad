import React, { useEffect, useState } from 'react';
import { service } from '../services';
import { Entity } from '../types';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  CartesianGrid
} from 'recharts';
import { motion } from 'framer-motion';
import { Building2, AlignLeft, CheckCircle2, XCircle } from 'lucide-react';

export const GlobalDashboard: React.FC = () => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const data = await service.getEntities();
      // Sort entities in ascending alphanumeric order (natural sort)
      const sortedData = data.sort((a, b) => {
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      });
      setEntities(sortedData);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-10 text-center text-gray-500">Loading metrics...</div>;

  // --- Calculations ---

  // Helper: Get actual metrics from reporting data
  const getEntityMetrics = (ent: Entity) => {
    let totalCount = 0;
    let totalConnected = 0;
    let totalBlocked = 0;

    ent.reporting.parentCategories.forEach(cat => {
      cat.profiles.forEach(p => {
        totalCount += p.sessionCount || 0;
        totalConnected += p.successCount || 0;
        totalBlocked += p.errorCount || 0;
      });
    });

    return { totalCount, totalConnected, totalBlocked };
  };

  // Aggregation
  let grandTotalSeeds = 0;
  let grandTotalConnected = 0;
  let grandTotalBlocked = 0;

  const entityPerformanceData = entities.map(ent => {
    const { totalCount, totalConnected, totalBlocked } = getEntityMetrics(ent);

    grandTotalSeeds += totalCount;
    grandTotalConnected += totalConnected;
    grandTotalBlocked += totalBlocked;

    const connectedRate = totalCount > 0 ? (totalConnected / totalCount) * 100 : 0;

    return {
      name: ent.name.split(' ')[0], // Short name
      fullName: ent.name,
      Count: totalCount,
      Connected: totalConnected,
      Blocked: totalBlocked,
      connectedRate: connectedRate.toFixed(1)
    };
  });

  const overallConnectedRate = grandTotalSeeds > 0 ? ((grandTotalConnected / grandTotalSeeds) * 100).toFixed(2) : '0.00';
  const overallBlockedRate = grandTotalSeeds > 0 ? ((grandTotalBlocked / grandTotalSeeds) * 100).toFixed(2) : '0.00';

  const overallPieData = [
    { name: 'Connected', value: grandTotalConnected },
    { name: 'Blocked', value: grandTotalBlocked },
  ];

  const PIE_COLORS = ['#22c55e', '#ef4444']; // Green-500, Red-500
  const BAR_COLORS = { count: '#3b82f6', connected: '#22c55e', blocked: '#ef4444' };

  return (
    <div className="space-y-6 pb-10">

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Global Dashboard</h1>
        <p className="text-gray-500">Aggregated overview of all CMH entities.</p>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="TOTAL ENTITIES"
          value={entities.length.toString()}
          icon={<Building2 className="text-indigo-600" size={24} />}
          bgIcon="bg-indigo-100"
        />
        <StatCard
          label="TOTAL SEEDS"
          value={grandTotalSeeds.toLocaleString()}
          icon={<AlignLeft className="text-blue-600" size={24} />}
          bgIcon="bg-blue-100"
        />
        <StatCard
          label="OVERALL CONNECTED"
          value={grandTotalConnected.toLocaleString()}
          subValue={`${overallConnectedRate}% Connected Rate`}
          icon={<CheckCircle2 className="text-green-600" size={24} />}
          bgIcon="bg-green-100"
        />
        <StatCard
          label="OVERALL BLOCKED"
          value={grandTotalBlocked.toLocaleString()}
          subValue={`${overallBlockedRate}% Blocked Rate`}
          icon={<XCircle className="text-red-600" size={24} />}
          bgIcon="bg-red-100"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Overall Seeds Donut */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <h3 className="font-semibold text-gray-800 mb-4">Overall seeds</h3>
          <div className="h-[240px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={overallPieData}
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
                  {overallPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} strokeWidth={0} />
                  ))}
                </Pie>

                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-gray-800">{grandTotalSeeds.toLocaleString()}</span>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total SEEDS</span>
            </div>
          </div>

          <div className="flex justify-center items-center gap-12 mt-2">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-600 font-medium">Blocked</span>
              </div>
              <span className="text-xl font-bold text-red-500">{grandTotalBlocked.toLocaleString()}</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600 font-medium">Connected</span>
              </div>
              <span className="text-xl font-bold text-green-600">{grandTotalConnected.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>

        {/* Performance by Entity Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <h3 className="font-semibold text-gray-800 mb-4">Performance by Entity</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={entityPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="rect" verticalAlign="bottom" height={36} formatter={(val) => <span className="text-gray-600 ml-1">{val}</span>} />
                <Bar dataKey="Count" fill={BAR_COLORS.count} radius={[4, 4, 0, 0]} barSize={40} />
                <Bar dataKey="Blocked" fill={BAR_COLORS.blocked} radius={[4, 4, 0, 0]} barSize={40} />
                <Bar dataKey="Connected" fill={BAR_COLORS.connected} radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Seeds by Entity List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Seeds by Entity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {entityPerformanceData.map((ent, idx) => (
            <motion.div
              key={ent.fullName}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + (idx * 0.05) }}
              className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center relative overflow-hidden"
            >
              <div className="h-24 w-24 relative mb-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Connected', value: ent.Connected },
                        { name: 'Rest', value: ent.Count - ent.Connected },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={45}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill="#22c55e" />
                      <Cell fill="#ef4444" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center w-full mt-0">
                <h4 className="font-bold text-gray-800 text-lg mb-0">{ent.name}</h4>

                <div className="flex justify-between items-center px-2 text-sm border-t border-gray-100 pt-1 w-full">
                  <div className="flex flex-col items-center flex-1">
                    <span className="font-bold text-red-500 text-base">{ent.Blocked.toLocaleString()}</span>
                  </div>
                  <div className="w-px h-8 bg-gray-100 mx-1"></div>
                  <div className="flex flex-col items-center flex-1">
                    <span className="font-bold text-green-600 text-base">{ent.Connected.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
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
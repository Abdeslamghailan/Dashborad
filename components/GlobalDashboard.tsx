import React, { useEffect, useState, useMemo } from 'react';
import { service } from '../services';
import { Entity, MethodType, MethodData } from '../types';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  CartesianGrid
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, AlignLeft, CheckCircle2, XCircle, LayoutGrid, RefreshCw,
  Monitor, Bot, Smartphone, Globe, Cpu, Zap, Terminal, MousePointer2,
  Laptop, Tablet, AppWindow, Box, Activity
} from 'lucide-react';
import { AVAILABLE_METHODS, getMethodConfig } from '../config/methods';
import { API_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';

// Helper to get method-specific data with fallback to legacy data
const getMethodData = (entity: Entity, methodType: MethodType): MethodData => {
  // First try to get from methodsData
  if (entity.methodsData && entity.methodsData[methodType]) {
    return entity.methodsData[methodType];
  }

  // For desktop method, fallback to legacy data for backward compatibility
  if (methodType === 'desktop') {
    return {
      parentCategories: entity.reporting?.parentCategories || [],
      limitsConfiguration: entity.limitsConfiguration || []
    };
  }

  // For other methods, return empty data
  return {
    parentCategories: [],
    limitsConfiguration: []
  };
};

export const GlobalDashboard: React.FC = () => {
  const { token } = useAuth();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMethod, setActiveMethod] = useState<MethodType | 'all'>('all');
  const [availableMethods, setAvailableMethods] = useState<any[]>(AVAILABLE_METHODS);

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

    const fetchMethods = async () => {
      try {
        const data = await service.getReportingMethods();
        // If the API returns methods, use them; otherwise, keep the defaults from AVAILABLE_METHODS
        if (data && data.length > 0) {
          setAvailableMethods(data);
        } else {
          setAvailableMethods(AVAILABLE_METHODS);
        }
      } catch (error) {
        console.error('Failed to fetch methods:', error);
        setAvailableMethods(AVAILABLE_METHODS);
      }
    };

    fetchData();
    if (token) fetchMethods();
  }, [token]);

  const getDynamicMethodConfig = (methodId: string) => {
    const dynamic = availableMethods.find(m => m.id === methodId);
    if (dynamic) return dynamic;
    return getMethodConfig(methodId as MethodType);
  };

  // Filter methods to only show those that are actually used by at least one entity
  const filteredMethods = useMemo(() => {
    const usedMethodIds = new Set<string>();
    entities.forEach(ent => {
      if (ent.enabledMethods && ent.enabledMethods.length > 0) {
        ent.enabledMethods.forEach(m => usedMethodIds.add(m));
      } else {
        usedMethodIds.add('desktop'); // Default method
      }
    });

    return availableMethods.filter(m =>
      usedMethodIds.has(m.id) &&
      (m.isActive === undefined || m.isActive === true)
    );
  }, [entities, availableMethods]);

  if (loading) return <div className="p-10 text-center text-gray-500">Loading metrics...</div>;

  // --- Calculations ---

  // Helper: Get actual metrics from reporting data
  const getEntityMetrics = (ent: Entity, method: MethodType | 'all') => {
    let totalCount = 0;
    let totalConnected = 0;
    let totalBlocked = 0;

    const methodsToProcess: MethodType[] = method === 'all'
      ? (ent.enabledMethods && ent.enabledMethods.length > 0 ? ent.enabledMethods : ['desktop'])
      : [method];

    methodsToProcess.forEach(m => {
      const methodData = getMethodData(ent, m);
      methodData.parentCategories.forEach(cat => {
        cat.profiles.forEach(p => {
          totalCount += p.sessionCount || 0;
          totalConnected += p.successCount || 0;
          totalBlocked += p.errorCount || 0;
        });
      });
    });

    return { totalCount, totalConnected, totalBlocked };
  };

  // Aggregation
  let grandTotalSeeds = 0;
  let grandTotalConnected = 0;
  let grandTotalBlocked = 0;

  const entityPerformanceData = entities.map(ent => {
    const { totalCount, totalConnected, totalBlocked } = getEntityMetrics(ent, activeMethod);

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

  const currentMethodConfig = activeMethod === 'all' ? null : getDynamicMethodConfig(activeMethod);

  return (
    <div className="space-y-6 pb-10">

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Global Dashboard</h1>
          <p className="text-gray-500">Aggregated overview of all CMH entities.</p>
        </div>

        {/* Method Switcher */}
        <div className="bg-white rounded-2xl border border-gray-200 p-1.5 shadow-sm flex items-center gap-1 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveMethod('all')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap ${activeMethod === 'all'
              ? 'bg-gray-900 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            <LayoutGrid size={18} />
            <span>All Methods</span>
          </button>

          <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block"></div>

          {filteredMethods.map(method => {
            const IconMap: Record<string, any> = {
              Monitor, Bot, Smartphone, Globe, Cpu, Zap, Terminal,
              MousePointer2, Laptop, Tablet, AppWindow, Box, Activity,
              LayoutGrid, RefreshCw
            };

            let Icon = RefreshCw;
            if (method.icon) {
              if (typeof method.icon === 'string') {
                Icon = IconMap[method.icon] || RefreshCw;
              } else {
                Icon = method.icon;
              }
            }
            const isActive = activeMethod === method.id;

            return (
              <button
                key={method.id}
                onClick={() => setActiveMethod(method.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap ${isActive
                  ? `bg-gradient-to-r ${method.gradient} text-white shadow-lg`
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <Icon size={18} />
                <span>{method.name}</span>
              </button>
            );
          })}
        </div>
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
          key={`pie-${activeMethod}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <h3 className="font-semibold text-gray-800 mb-4">
            Overall seeds {activeMethod !== 'all' && `(${currentMethodConfig?.name})`}
          </h3>
          <div className="h-[200px] sm:h-[240px] relative">
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

          <div className="flex justify-center items-center gap-6 sm:gap-12 mt-2">
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
          key={`bar-${activeMethod}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <h3 className="font-semibold text-gray-800 mb-4">
            Performance by Entity {activeMethod !== 'all' && `(${currentMethodConfig?.name})`}
          </h3>
          <div className="h-[250px] sm:h-[300px]">
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

      {/* Methods Comparison - Only show when 'all' is selected */}
      {activeMethod === 'all' && (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
          >
            <h3 className="font-semibold text-gray-800 mb-4">Methods Performance Comparison</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredMethods.map(m => {
                    let totalCount = 0;
                    let totalConnected = 0;
                    let totalBlocked = 0;

                    entities.forEach(ent => {
                      const isEnabled = ent.enabledMethods?.includes(m.id as MethodType) ||
                        (m.id === 'desktop' && (!ent.enabledMethods || ent.enabledMethods.length === 0));

                      if (isEnabled) {
                        const metrics = getEntityMetrics(ent, m.id as MethodType);
                        totalCount += metrics.totalCount;
                        totalConnected += metrics.totalConnected;
                        totalBlocked += metrics.totalBlocked;
                      }
                    });

                    return {
                      name: m.name,
                      Count: totalCount,
                      Connected: totalConnected,
                      Blocked: totalBlocked,
                      gradient: m.gradient
                    };
                  })}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="rect" verticalAlign="bottom" height={36} formatter={(val) => <span className="text-gray-600 ml-1">{val}</span>} />
                  <Bar dataKey="Count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={60} />
                  <Bar dataKey="Connected" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={60} />
                  <Bar dataKey="Blocked" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Methods Breakdown</h3>
            </div>
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 font-bold">Method</th>
                    <th className="px-6 py-3 font-bold text-center">Total Seeds</th>
                    <th className="px-6 py-3 font-bold text-center">Connected</th>
                    <th className="px-6 py-3 font-bold text-center">Blocked</th>
                    <th className="px-6 py-3 font-bold text-center">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMethods.map(m => {
                    let totalCount = 0;
                    let totalConnected = 0;
                    let totalBlocked = 0;

                    entities.forEach(ent => {
                      const isEnabled = ent.enabledMethods?.includes(m.id as MethodType) ||
                        (m.id === 'desktop' && (!ent.enabledMethods || ent.enabledMethods.length === 0));

                      if (isEnabled) {
                        const metrics = getEntityMetrics(ent, m.id as MethodType);
                        totalCount += metrics.totalCount;
                        totalConnected += metrics.totalConnected;
                        totalBlocked += metrics.totalBlocked;
                      }
                    });

                    const successRate = totalCount > 0 ? ((totalConnected / totalCount) * 100).toFixed(1) : '0.0';

                    return (
                      <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-gradient-to-r ${m.gradient} text-white`}>
                              {(() => {
                                const IconMap: Record<string, any> = {
                                  Monitor, Bot, Smartphone, Globe, Cpu, Zap, Terminal,
                                  MousePointer2, Laptop, Tablet, AppWindow, Box, Activity,
                                  LayoutGrid, RefreshCw
                                };
                                let Icon = RefreshCw;
                                if (m.icon) {
                                  if (typeof m.icon === 'string') {
                                    Icon = IconMap[m.icon] || RefreshCw;
                                  } else {
                                    Icon = m.icon;
                                  }
                                }
                                return <Icon size={16} />;
                              })()}
                            </div>
                            <span className="font-bold text-gray-900">{m.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-semibold text-gray-700">{totalCount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-center font-semibold text-green-600">{totalConnected.toLocaleString()}</td>
                        <td className="px-6 py-4 text-center font-semibold text-red-500">{totalBlocked.toLocaleString()}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${parseFloat(successRate) > 80 ? 'bg-green-100 text-green-700' :
                            parseFloat(successRate) > 50 ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                            {successRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}

      {/* Seeds by Entity List */}
      <div className="space-y-4">
        <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-800">
          Seeds by Entity {activeMethod !== 'all' && `(${currentMethodConfig?.name})`}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {entityPerformanceData.map((ent, idx) => (
            <motion.div
              key={`${ent.fullName}-${activeMethod}`}
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
      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 leading-none">{value}</h3>
      {subValue && <p className="text-xs text-gray-500 mt-2 font-medium">{subValue}</p>}
    </div>
  </div>
);
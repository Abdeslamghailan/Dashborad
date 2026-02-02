import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { service } from '../services';
import { Entity, ParentCategory, MethodType, MethodData, LimitConfig } from '../types';
import { EntityOverview } from './entity/EntityOverview';
import { ReportingView } from './entity/ReportingView';
import { PlanConfigWithHistory } from './entity/PlanConfigWithHistory';
import { LimitsConfig } from './entity/LimitsConfig';
import { GlobalLimitsConfig } from './entity/GlobalLimitsConfig';
import {
  RefreshCw, BarChart3, Settings, TableProperties, Server, FileText,
  CalendarDays, LayoutGrid, Monitor, Bot, Smartphone, Globe, Cpu,
  Zap, Terminal, MousePointer2, Laptop, Tablet, AppWindow, Box, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { ReportingEditor } from './entity/ReportingEditor';
import { ProxyManager } from './ProxyManager';
import { EntityNotes } from './entity/EntityNotes';
import { useAuth } from '../contexts/AuthContext';
import { DayPlan } from './entity/DayPlan';
import { Button } from './ui/Button';
import { AVAILABLE_METHODS, getMethodConfig } from '../config/methods';
import { API_URL } from '../config';

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

// Create a "virtual" entity with method-specific data for child components
const createMethodEntity = (entity: Entity, methodType: MethodType | 'all'): Entity => {
  if (methodType === 'all') {
    const enabledMethods = entity.enabledMethods || ['desktop'];
    const allCategories: ParentCategory[] = [];
    const allLimits: LimitConfig[] = [];

    enabledMethods.forEach(m => {
      const data = getMethodData(entity, m);
      allCategories.push(...data.parentCategories);
      allLimits.push(...data.limitsConfiguration);
    });

    return {
      ...entity,
      reporting: {
        parentCategories: allCategories
      },
      limitsConfiguration: allLimits
    };
  }

  const methodData = getMethodData(entity, methodType);
  return {
    ...entity,
    reporting: {
      parentCategories: methodData.parentCategories
    },
    limitsConfiguration: methodData.limitsConfiguration
  };
};

export const EntityDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [activeMethod, setActiveMethod] = useState<MethodType | 'all'>('desktop');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [availableMethods, setAvailableMethods] = useState<any[]>([]);

  useEffect(() => {
    const fetchMethods = async () => {
      try {
        const response = await fetch(`${API_URL}/api/methods`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setAvailableMethods(data);
        } else {
          setAvailableMethods(AVAILABLE_METHODS);
        }
      } catch (error) {
        console.error('Failed to fetch methods:', error);
        setAvailableMethods(AVAILABLE_METHODS);
      }
    };
    if (token) fetchMethods();
  }, [token]);

  const getDynamicMethodConfig = (methodId: string) => {
    const dynamic = availableMethods.find(m => m.id === methodId);
    if (dynamic) return dynamic;
    return getMethodConfig(methodId as MethodType);
  };

  const fetchEntity = async () => {
    if (!id) return;
    setLoading(true);
    const data = await service.getEntity(id);
    setEntity(data || null);

    // Set default active method to first enabled method if current is not enabled
    if (data?.enabledMethods && data.enabledMethods.length > 0) {
      if (activeMethod !== 'all' && !data.enabledMethods.includes(activeMethod as MethodType)) {
        setActiveMethod(data.enabledMethods[0]);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchEntity();

    const handleEntityUpdate = () => {
      fetchEntity();
    };

    window.addEventListener('entity-updated', handleEntityUpdate);

    return () => {
      window.removeEventListener('entity-updated', handleEntityUpdate);
    };
  }, [id]);

  // Create method-specific entity for child components
  const methodEntity = useMemo(() => {
    if (!entity) return null;
    return createMethodEntity(entity, activeMethod);
  }, [entity, activeMethod]);

  const handleSaveReporting = async (updatedEntity: Entity) => {
    if (!entity || activeMethod === 'all') return;

    // Get the updated categories and create limit configs
    const updatedCategories = updatedEntity.reporting.parentCategories;
    const allSessionNames = new Set<string>();
    const sessionCounts = new Map<string, number>();

    updatedCategories.forEach(cat => {
      cat.profiles.forEach(profile => {
        allSessionNames.add(profile.profileName);
        sessionCounts.set(profile.profileName, profile.sessionCount || 0);
      });
    });

    // Get existing method data
    const existingMethodData = getMethodData(entity, activeMethod as MethodType);

    // Keep existing limits that still have a corresponding session
    const validExistingLimits = existingMethodData.limitsConfiguration.filter(l =>
      allSessionNames.has(l.profileName)
    );

    // Find sessions that have NO limit configuration at all
    const sessionsWithLimits = new Set(validExistingLimits.map(l => l.profileName));
    const missingSessionNames = Array.from(allSessionNames).filter(name => !sessionsWithLimits.has(name));

    // Create default limits for new sessions
    const newLimits: LimitConfig[] = missingSessionNames.map(sessionName => {
      const total = sessionCounts.get(sessionName) || 14000;
      return {
        id: `limit_${Date.now()}_${Math.random()}`,
        profileName: sessionName,
        limitActiveSession: `1-${total}`,
        intervalsInRepo: '',
        intervalsQuality: 'NO',
        intervalsPausedSearch: 'NO',
        intervalsToxic: 'NO',
        intervalsOther: 'NO',
        totalPaused: 0
      };
    });

    const updatedLimits = [...validExistingLimits, ...newLimits];

    // Update methodsData for the current method
    const updatedMethodsData = {
      ...entity.methodsData,
      [activeMethod as MethodType]: {
        parentCategories: updatedCategories,
        limitsConfiguration: updatedLimits
      }
    };

    // Save to backend
    const entityToSave = {
      ...entity,
      methodsData: updatedMethodsData,
      // Also update legacy fields if this is desktop method (for backward compatibility)
      ...(activeMethod === 'desktop' ? {
        reporting: { parentCategories: updatedCategories },
        limitsConfiguration: updatedLimits
      } : {})
    };

    await service.saveEntity(entityToSave);
    await fetchEntity();
  };

  if (loading) return <div className="flex h-full items-center justify-center text-gray-500"><RefreshCw className="animate-spin mr-2" /> Loading entity...</div>;
  if (!entity || !methodEntity) return <div className="p-10 text-center text-red-500">Entity not found</div>;

  const isAdmin = user?.role === 'ADMIN';
  const canAccessNotes = user?.role === 'ADMIN' || user?.role === 'MAILER';

  // Get enabled methods for this entity
  const enabledMethods = entity.enabledMethods || ['desktop'];
  const currentMethodConfig = activeMethod === 'all' ? null : getMethodConfig(activeMethod as MethodType);

  // Get method-specific data
  const methodData = getMethodData(entity, activeMethod === 'all' ? 'desktop' : activeMethod as MethodType);

  interface TabItem {
    id: string;
    label: string;
    icon: React.ElementType;
    isCategory?: boolean;
    category?: ParentCategory;
  }

  // Define tabs dynamically based on current method's data
  const getTabs = (): TabItem[] => {
    const baseTabs: TabItem[] = [
      { id: 'overview', label: 'Overview', icon: BarChart3 },
      { id: 'reporting', label: 'Reporting Metrics', icon: TableProperties },
    ];

    // If "All Methods" is selected, only show base tabs and notes
    if (activeMethod === 'all') {
      const notesTabs = canAccessNotes ? [{ id: 'notes', label: 'Notes', icon: FileText }] : [];
      return [...baseTabs, ...notesTabs];
    }

    // Add category tabs from METHOD-SPECIFIC data
    const categoryTabs = methodData.parentCategories.map(cat => ({
      id: cat.id,
      label: cat.name.replace(' REPORTING', '').replace(' Configuration', ''),
      icon: Settings,
      isCategory: true,
      category: cat
    }));

    const additionalTabs: TabItem[] = [
      { id: 'day-plan', label: 'DAY PLAN', icon: CalendarDays },
      { id: 'proxy-servers', label: 'Proxy Servers', icon: Server },
    ];

    const notesTabs = canAccessNotes ? [{ id: 'notes', label: 'Notes', icon: FileText }] : [];

    return [...baseTabs, ...categoryTabs, ...additionalTabs, ...notesTabs];
  };

  const tabs = getTabs();

  // Reset tab when switching methods if current tab doesn't exist in new method
  const handleMethodChange = (newMethod: MethodType | 'all') => {
    setActiveMethod(newMethod);
    // Reset to overview when switching methods to avoid confusion
    setActiveTab('overview');
  };

  return (
    <div className={`mx-auto space-y-6 pb-20 ${activeTab === 'day-plan' ? 'max-w-full px-4' : 'max-w-7xl'}`}>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{entity.name}</h1>
          <p className="text-sm text-gray-500">Manage reporting statistics and configurations.</p>
        </div>
      </div>

      {/* Method Switcher - Always show to indicate current method */}
      <div className="bg-white rounded-2xl border border-gray-200 p-2 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3">METHOD:</span>
          <div className="flex gap-2 flex-1 overflow-x-auto scrollbar-hide">
            {/* All Methods Button */}
            <button
              onClick={() => handleMethodChange('all')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 whitespace-nowrap ${activeMethod === 'all'
                ? 'bg-gray-900 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <LayoutGrid size={18} />
              <span>All Methods</span>
            </button>

            <div className="w-px h-6 bg-gray-200 mx-1"></div>

            {enabledMethods.map(methodId => {
              const methodConfig = getDynamicMethodConfig(methodId);
              if (!methodConfig) return null;

              // Map icon string to component if needed
              const IconMap: Record<string, any> = {
                Monitor, Bot, Smartphone, Globe, Cpu, Zap, Terminal,
                MousePointer2, Laptop, Tablet, AppWindow, Box, Activity,
                LayoutGrid, RefreshCw
              };

              let Icon = RefreshCw;
              if (methodConfig.icon) {
                if (typeof methodConfig.icon === 'string') {
                  Icon = IconMap[methodConfig.icon] || RefreshCw;
                } else {
                  Icon = methodConfig.icon;
                }
              }

              const isActive = activeMethod === methodId;
              const methodSpecificData = getMethodData(entity, methodId);
              const categoryCount = methodSpecificData.parentCategories.length;

              return (
                <button
                  key={methodId}
                  onClick={() => handleMethodChange(methodId)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 whitespace-nowrap ${isActive
                    ? `bg-gradient-to-r ${methodConfig.gradient} text-white shadow-lg`
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <Icon size={18} />
                  <span>{methodConfig.name}</span>
                  {categoryCount > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${isActive ? 'bg-white/20' : 'bg-gray-200'}`}>
                      {categoryCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {/* Navigation Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div
          className="bg-white p-1.5 rounded-xl border shadow-sm flex overflow-x-auto scrollbar-hide max-w-full"
          style={{ borderColor: currentMethodConfig?.color || '#e5e7eb' }}
        >
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${isActive
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                style={isActive ? {
                  backgroundColor: `${currentMethodConfig?.color}15`,
                  color: currentMethodConfig?.color,
                  boxShadow: `0 0 0 1px ${currentMethodConfig?.color}40`
                } : {}}
              >
                <tab.icon size={16} className={isActive ? '' : 'text-gray-400'} style={isActive ? { color: currentMethodConfig?.color } : {}} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'reporting' && activeMethod !== 'all' && (
          <button
            onClick={() => setIsEditorOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-white rounded-xl shadow-lg transition-all duration-200 font-medium text-sm"
            style={{
              background: `linear-gradient(to right, ${currentMethodConfig?.color || '#4F46E5'}, ${currentMethodConfig?.color || '#4338CA'}dd)`,
              boxShadow: `0 4px 14px ${currentMethodConfig?.color}50`
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
            EDIT {currentMethodConfig?.name.toUpperCase()} REPORTING
          </button>
        )}
      </div>

      {/* Content Area - Uses method-specific entity */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeMethod}-${activeTab}`}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <EntityOverview entity={methodEntity} />
            </div>
          )}

          {activeTab === 'reporting' && <ReportingView entity={methodEntity} />}

          {activeTab === 'notes' && <EntityNotes entity={entity} onUpdate={fetchEntity} />}

          {activeTab === 'proxy-servers' && <ProxyManager entityId={entity.id} isAdmin={isAdmin || user?.role === 'MAILER'} />}

          {activeTab === 'day-plan' && <DayPlan entity={methodEntity} />}

          {tabs.map(tab => {
            if (!tab.isCategory || tab.id !== activeTab || !tab.category) return null;
            return (
              <div key={tab.id} className="space-y-6">
                <LimitsConfig
                  entity={methodEntity}
                  category={tab.category}
                  onUpdate={fetchEntity}
                  onSave={async (newLimits) => {
                    if (!entity || activeMethod === 'all') return;

                    // Get existing method data
                    const existingMethodData = getMethodData(entity, activeMethod as MethodType);

                    // Update methodsData for the current method
                    const updatedMethodsData = {
                      ...entity.methodsData,
                      [activeMethod as MethodType]: {
                        ...existingMethodData,
                        limitsConfiguration: newLimits
                      }
                    };

                    // Save to backend
                    const entityToSave = {
                      ...entity,
                      methodsData: updatedMethodsData,
                      // Also update legacy fields if this is desktop method (for backward compatibility)
                      ...(activeMethod === 'desktop' ? {
                        limitsConfiguration: newLimits
                      } : {})
                    };

                    await service.saveEntity(entityToSave);
                    await fetchEntity();
                  }}
                />
                <PlanConfigWithHistory
                  entity={methodEntity}
                  category={tab.category}
                  onUpdate={fetchEntity}
                  onSave={async (newConfig) => {
                    if (!entity || activeMethod === 'all') return;

                    // Get existing method data
                    const existingMethodData = getMethodData(entity, activeMethod as MethodType);

                    // Update the specific category in the list
                    const updatedCategories = existingMethodData.parentCategories.map(c =>
                      c.id === tab.category!.id
                        ? { ...c, planConfiguration: newConfig }
                        : c
                    );

                    // Update methodsData
                    const updatedMethodsData = {
                      ...entity.methodsData,
                      [activeMethod as MethodType]: {
                        ...existingMethodData,
                        parentCategories: updatedCategories
                      }
                    };

                    const entityToSave = {
                      ...entity,
                      methodsData: updatedMethodsData,
                      // Legacy fallback for desktop
                      ...(activeMethod === 'desktop' ? {
                        reporting: { parentCategories: updatedCategories }
                      } : {})
                    };

                    await service.saveEntity(entityToSave);

                    // Delete the day plan for today to reset overrides and ensure consistency
                    const today = new Date().toISOString().split('T')[0];
                    try {
                      await service.deleteDayPlan(entity.id, tab.category!.id, today);
                    } catch (e) {
                      console.warn("Failed to delete day plan (might not exist)", e);
                    }

                    await fetchEntity();
                  }}
                />
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      <ReportingEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        entity={methodEntity}
        onSave={handleSaveReporting}
        currentMethod={activeMethod === 'all' ? 'desktop' : activeMethod as MethodType}
      />
    </div>
  );
};

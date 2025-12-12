import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { service } from '../services';
import { Entity, ParentCategory } from '../types';
import { EntityOverview } from './entity/EntityOverview';
import { ReportingView } from './entity/ReportingView';
import { PlanConfig } from './entity/PlanConfig';
import { LimitsConfig } from './entity/LimitsConfig';
import { GlobalLimitsConfig } from './entity/GlobalLimitsConfig';
import { RefreshCw, BarChart3, Settings, TableProperties, Server, FileText, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';

import { ReportingEditor } from './entity/ReportingEditor';
import { ProxyManager } from './ProxyManager';
import { EntityNotes } from './entity/EntityNotes';
import { ChangeHistory } from './history/ChangeHistory';
import { useAuth } from '../contexts/AuthContext';
import { DayPlan } from './entity/DayPlan';
import { Button } from './ui/Button';

export const EntityDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const fetchEntity = async () => {
    if (!id) return;
    setLoading(true);
    const data = await service.getEntity(id);
    setEntity(data || null);
    setLoading(false);
  };

  useEffect(() => {
    fetchEntity();
  }, [id]);

  const handleSaveReporting = async (updatedEntity: Entity) => {
    // Ensure limitsConfiguration has entries for all sessions
    const allSessionNames = new Set<string>();
    updatedEntity.reporting.parentCategories.forEach(cat => {
      cat.profiles.forEach(profile => {
        allSessionNames.add(profile.profileName);
      });
    });

    // 1. Keep existing limits that still have a corresponding session
    const validExistingLimits = updatedEntity.limitsConfiguration.filter(l =>
      allSessionNames.has(l.profileName)
    );

    // 2. Find sessions that have NO limit configuration at all
    const sessionsWithLimits = new Set(validExistingLimits.map(l => l.profileName));
    const missingSessionNames = Array.from(allSessionNames).filter(name => !sessionsWithLimits.has(name));

    // 3. Create default global limits for new sessions
    const newLimits = missingSessionNames.map(sessionName => ({
      id: `limit_${Date.now()}_${Math.random()}`,
      profileName: sessionName,
      limitActiveSession: '1-14000',
      intervalsInRepo: '',
      intervalsQuality: 'NO',
      intervalsPausedSearch: 'NO',
      intervalsToxic: 'NO',
      intervalsOther: 'NO',
      totalPaused: 0
    }));

    // Update entity with merged limits
    const syncedEntity = {
      ...updatedEntity,
      limitsConfiguration: [...validExistingLimits, ...newLimits]
    };

    await service.saveEntity(syncedEntity);
    await fetchEntity();
  };

  if (loading) return <div className="flex h-full items-center justify-center text-gray-500"><RefreshCw className="animate-spin mr-2" /> Loading entity...</div>;
  if (!entity) return <div className="p-10 text-center text-red-500">Entity not found</div>;

  const isAdmin = user?.role === 'ADMIN';

  interface TabItem {
    id: string;
    label: string;
    icon: React.ElementType;
    isCategory?: boolean;
    category?: ParentCategory;
  }

  // Define tabs dynamically based on entity data
  const canAccessNotes = user?.role === 'ADMIN' || user?.role === 'MAILER';

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'reporting', label: 'Reporting Metrics', icon: TableProperties },
    ...entity.reporting.parentCategories.map(cat => ({
      id: cat.id,
      label: cat.name.replace(' REPORTING', '').replace(' Configuration', ''), // Clean label
      icon: Settings,
      isCategory: true,
      category: cat
    })),
    { id: 'day-plan', label: 'DAY PLAN', icon: CalendarDays },
    { id: 'proxy-servers', label: 'Proxy Servers', icon: Server },
    ...(canAccessNotes ? [{ id: 'notes', label: 'Notes', icon: FileText }] : [])
  ];

  return (
    <div className={`mx-auto space-y-8 pb-20 ${activeTab === 'day-plan' ? 'max-w-full px-4' : 'max-w-7xl'}`}>

      {/* Header & Tab Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{entity.name}</h1>
          <p className="text-sm text-gray-500">Manage reporting statistics and configurations.</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Segmented Control Switcher */}
          <div className="bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm flex overflow-x-auto scrollbar-hide max-w-full">
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
                >
                  <tab.icon size={16} className={isActive ? 'text-indigo-600' : 'text-gray-400'} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'reporting' && (
            <button
              onClick={() => setIsEditorOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl shadow-lg shadow-indigo-500/30 transition-all duration-200 font-medium text-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
              Edit Reporting
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <EntityOverview entity={entity} />
            <ChangeHistory entityId={entity.id} limit={5} showExpanded={false} />
          </div>
        )}

        {activeTab === 'reporting' && <ReportingView entity={entity} />}

        {activeTab === 'notes' && <EntityNotes entity={entity} onUpdate={fetchEntity} />}

        {activeTab === 'proxy-servers' && <ProxyManager entityId={entity.id} isAdmin={isAdmin || user?.role === 'MAILER'} />}

        {activeTab === 'day-plan' && <DayPlan entity={entity} />}

        {tabs.map(tab => {
          if (!tab.isCategory || tab.id !== activeTab || !tab.category) return null;
          return (
            <div key={tab.id} className="space-y-6">
              <LimitsConfig entity={entity} category={tab.category} onUpdate={fetchEntity} />
              <PlanConfig entity={entity} category={tab.category} onUpdate={fetchEntity} />
            </div>
          );
        })}
      </motion.div>

      <ReportingEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        entity={entity}
        onSave={handleSaveReporting}
      />
    </div>
  );
};

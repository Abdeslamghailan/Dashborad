export type ProfileType = 'IP 1' | 'Offer' | 'Other';

export interface Profile {
  id: string;
  profileName: string;
  connected: boolean;
  blocked: boolean;
  type: ProfileType;
  // New detailed reporting fields
  mainIp?: string;
  user?: string;
  password?: string;
  sessionCount?: number;
  successCount?: number;
  errorCount?: number;
  isMirror?: boolean;
  mirrorNumber?: number;
  isNew?: boolean;
}

export interface Drop {
  id: string;
  value: number;
  time?: string;
}

export interface TimeConfig {
  startTime: string;
  endTime: string;
}

export interface PlanConfiguration {
  drops: Drop[];
  seeds: number;
  timeConfig: TimeConfig;
  scriptName: string;
  scenario: string;
  status: 'active' | 'stopped';
  mode?: 'auto' | 'request';
  customStepValues?: Record<string, number>; // profileName -> step value
}

export interface ParentCategory {
  id: string;
  name: string;
  profiles: Profile[];
  planConfiguration: PlanConfiguration;
  mirrorNames?: Record<number, string>;
}

export interface LimitConfig {
  id: string;
  profileName: string;
  categoryId?: string; // Optional: if present, this limit applies only to this category
  limitActiveSession: string;
  intervalsInRepo: string;
  intervalsQuality: string;
  intervalsPausedSearch: string;
  intervalsToxic: string;
  intervalsOther: string;
  totalPaused: number;
}

export interface NoteCard {
  id: string;
  title: string;
  content: string;
}

// Method types available in the system
export type MethodType = 'desktop' | 'webautomate' | 'mobile' | 'api';

// Data stored for each method (fully independent)
export interface MethodData {
  parentCategories: ParentCategory[];
  limitsConfiguration: LimitConfig[];
  noteCards?: NoteCard[];
}

export interface Entity {
  id: string;
  name: string;
  status?: 'active' | 'inactive';
  contactPerson?: string;
  email?: string;
  notes?: string;
  noteCards?: NoteCard[]; // Global notes (shared)
  // Methods assigned to this entity (e.g., ['desktop', 'webautomate'])
  enabledMethods?: MethodType[];
  // Method-specific data - FULLY SEPARATED
  methodsData?: Partial<Record<MethodType, MethodData>>;
  botConfig?: {
    token: string;
    chatId: string;
  };
  // Legacy: kept for backward compatibility (will be migrated to methodsData.desktop)
  reporting: {
    parentCategories: ParentCategory[];
  };
  limitsConfiguration: LimitConfig[];
}

export interface DataService {
  getEntities: () => Promise<Entity[]>;
  getEntity: (id: string) => Promise<Entity | undefined>;
  saveEntity: (entity: Entity, options?: { isUpdate?: boolean; skipEvent?: boolean }) => Promise<void>;
  deleteEntity: (id: string) => Promise<void>;
  resetDatabase: () => Promise<void>;
  getEntityHistory: (entityId: string, limit?: number) => Promise<any[]>;
  getHistoryByType: (entityType: string, limit?: number) => Promise<any[]>;
  getRecentChanges: (limit?: number) => Promise<any[]>;
  getAllHistory: (filters?: {
    entityId?: string;
    entityType?: string;
    username?: string;
    changeType?: string;
    methodId?: string;
    categoryId?: string;
    fieldChanged?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) => Promise<any[]>;
  deleteHistoryEntry: (id: number) => Promise<void>;
  deleteAllHistory: () => Promise<void>;
  // Day Plan methods
  getDayPlan: (entityId: string, date: string) => Promise<Record<string, Record<number, { step: string | number; start: string | number }>>>;
  saveDayPlan: (entityId: string, date: string, categoryId: string, sessionData: Record<number, { step: string | number; start: string | number }>) => Promise<void>;
  saveDayPlanBulk: (entityId: string, date: string, plans: Record<string, Record<number, { step: string | number; start: string | number }>>) => Promise<void>;
  deleteDayPlan: (entityId: string, categoryId: string, date: string) => Promise<void>;
  getIntervalPauseHistory: (filters?: {
    entityId?: string;
    methodId?: string;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) => Promise<any[]>;
  // Admin & Methods
  getAdminUsers: () => Promise<any[]>;
  updateUserRole: (id: number, role: string) => Promise<any>;
  approveUser: (id: number, isApproved?: boolean) => Promise<any>;
  rejectUser: (id: number) => Promise<any>;
  deleteUser: (id: number) => Promise<any>;
  grantEntityAccess: (userId: number, entityId: string) => Promise<any>;
  revokeEntityAccess: (userId: number, entityId: string) => Promise<any>;
  getReportingMethods: () => Promise<any[]>;
  saveReportingMethod: (method: any) => Promise<any>;
  deleteReportingMethod: (id: string) => Promise<any>;
  seedReportingMethods: () => Promise<any>;
  getDashboardData: (queryParams: string) => Promise<any>;
  // Planning
  getPlanningPresets: () => Promise<any[]>;
  savePlanningPreset: (preset: any) => Promise<any>;
  deletePlanningPreset: (id: string) => Promise<any>;
  getPlanningData: () => Promise<any>;
  savePlanningTeam: (team: any) => Promise<any>;
  deletePlanningTeam: (id: string) => Promise<any>;
  savePlanningMailer: (mailer: any) => Promise<any>;
  deletePlanningMailer: (id: string) => Promise<any>;
  savePlanningAssignment: (assignment: any) => Promise<any>;
  deletePlanningAssignment: (id: string) => Promise<any>;
  savePlanningAssignmentsBulk: (assignments: any[]) => Promise<any>;
  getPlanningAiSuggest: (scheduleId: string) => Promise<any>;
  getPlanningTeams: () => Promise<any[]>;
  getPlanningSchedulesCurrent: () => Promise<any[]>;
  getPlanningSchedulesHistory: () => Promise<any[]>;
  initializePlanningSchedules: () => Promise<any>;
  // Proxies
  getProxies: (entityId: string) => Promise<any[]>;
  saveProxy: (entityId: string, proxy: any) => Promise<any>;
  updateProxy: (entityId: string, proxyId: string, proxy: any) => Promise<any>;
  toggleProxyStatus: (entityId: string, proxyId: string) => Promise<any>;
  deleteProxy: (entityId: string, proxyId: string) => Promise<any>;
  // Proxy Partition
  getProxyPartition: () => Promise<any>;
  saveProxyPartition: (data: any) => Promise<any>;
  dnsLookup: (domains: string[]) => Promise<any>;
  // Scripts & Scenarios
  getScriptsAll: () => Promise<any[]>;
  saveScript: (script: any) => Promise<any>;
  deleteScript: (id: string) => Promise<any>;
  saveScenario: (scenario: any) => Promise<any>;
  deleteScenario: (id: string) => Promise<any>;
  checkHealth: () => Promise<any>;
  sendToBot: (data: any) => Promise<any>;
}
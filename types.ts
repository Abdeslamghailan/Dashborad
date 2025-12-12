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

export interface Entity {
  id: string;
  name: string;
  status?: 'active' | 'inactive';
  contactPerson?: string;
  email?: string;
  notes?: string;
  reporting: {
    parentCategories: ParentCategory[];
  };
  limitsConfiguration: LimitConfig[];
}

export interface DataService {
  getEntities: () => Promise<Entity[]>;
  getEntity: (id: string) => Promise<Entity | undefined>;
  saveEntity: (entity: Entity) => Promise<void>;
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
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) => Promise<any[]>;
  deleteHistoryEntry: (id: number) => Promise<void>;
  deleteAllHistory: () => Promise<void>;
  // Day Plan methods
  getDayPlan: (entityId: string, date: string) => Promise<Record<string, Record<number, { step: number; start: number }>>>;
  saveDayPlan: (entityId: string, date: string, categoryId: string, sessionData: Record<number, { step: number; start: number }>) => Promise<void>;
  saveDayPlanBulk: (entityId: string, date: string, plans: Record<string, Record<number, { step: number; start: number }>>) => Promise<void>;
}
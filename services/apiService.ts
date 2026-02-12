import { Entity, DataService } from '../types';
import { API_URL, REPORTING_API_URL } from '../config';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

// Helper function to make authenticated API calls
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...options.headers,
  };

  const url = `${API_URL}/api${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
};

export const apiService: DataService = {
  // Entity management
  getEntities: async () => {
    try {
      return await apiCall('/entities');
    } catch (error) {
      console.error('API: getEntities error:', error);
      return [];
    }
  },

  getEntity: async (id: string) => {
    try {
      return await apiCall(`/entities/${id}`);
    } catch (error) {
      console.error(`API: getEntity ${id} error:`, error);
      return undefined;
    }
  },

  saveEntity: async (entity: Entity) => {
    try {
      await apiCall(`/entities/${entity.id}`, {
        method: 'PUT',
        body: JSON.stringify(entity),
      });
    } catch (error) {
      console.error(`API: saveEntity ${entity.id} error:`, error);
      throw error;
    }
  },

  deleteEntity: async (id: string) => {
    try {
      await apiCall(`/entities/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error(`API: deleteEntity ${id} error:`, error);
      throw error;
    }
  },

  resetDatabase: async () => {
    try {
      await apiCall('/admin/reset', {
        method: 'POST',
      });
    } catch (error) {
      console.error('API: resetDatabase error:', error);
      throw error;
    }
  },

  // History management
  getEntityHistory: async (entityId: string, limit?: number) => {
    try {
      const params = new URLSearchParams();
      params.append('entityId', entityId);
      if (limit) params.append('limit', limit.toString());
      
      return await apiCall(`/history?${params.toString()}`);
    } catch (error) {
      console.error(`API: getEntityHistory ${entityId} error:`, error);
      return [];
    }
  },

  getHistoryByType: async (entityType: string, limit?: number) => {
    try {
      const params = new URLSearchParams();
      params.append('entityType', entityType);
      if (limit) params.append('limit', limit.toString());
      
      return await apiCall(`/history?${params.toString()}`);
    } catch (error) {
      console.error(`API: getHistoryByType ${entityType} error:`, error);
      return [];
    }
  },

  getRecentChanges: async (limit?: number) => {
    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      
      return await apiCall(`/history/recent?${params.toString()}`);
    } catch (error) {
      console.error('API: getRecentChanges error:', error);
      return [];
    }
  },

  getAllHistory: async (filters?: any) => {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value));
          }
        });
      }
      
      return await apiCall(`/history?${params.toString()}`);
    } catch (error) {
      console.error('API: getAllHistory error:', error);
      return [];
    }
  },

  getIntervalPauseHistory: async (filters?: any) => {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value));
          }
        });
      }
      
      return await apiCall(`/history/interval-pause?${params.toString()}`);
    } catch (error) {
      console.error('API: getIntervalPauseHistory error:', error);
      return [];
    }
  },

  deleteHistoryEntry: async (id: number) => {
    try {
      await apiCall(`/history/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error(`API: deleteHistoryEntry ${id} error:`, error);
      throw error;
    }
  },

  deleteAllHistory: async () => {
    try {
      await apiCall('/history', {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('API: deleteAllHistory error:', error);
      throw error;
    }
  },

  // Day plan management
  getDayPlan: async (entityId: string, date: string) => {
    try {
      return await apiCall(`/dayplan/${entityId}/${date}`);
    } catch (error) {
      console.error(`API: getDayPlan ${entityId} ${date} error:`, error);
      return {};
    }
  },

  saveDayPlan: async (entityId: string, date: string, categoryId: string, sessionData: any) => {
    try {
      await apiCall(`/dayplan/${entityId}`, {
        method: 'POST',
        body: JSON.stringify({ date, categoryId, sessionData }),
      });
    } catch (error) {
      console.error(`API: saveDayPlan ${entityId} error:`, error);
      throw error;
    }
  },

  saveDayPlanBulk: async (entityId: string, date: string, plans: any) => {
    try {
      await apiCall(`/dayplan/${entityId}/bulk`, {
        method: 'POST',
        body: JSON.stringify({ date, plans }),
      });
    } catch (error) {
      console.error(`API: saveDayPlanBulk ${entityId} error:`, error);
      throw error;
    }
  },

  deleteDayPlan: async (entityId: string, categoryId: string, date: string) => {
    try {
      await apiCall(`/dayplan/${entityId}/${categoryId}/${date}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error(`API: deleteDayPlan ${entityId} ${categoryId} ${date} error:`, error);
      throw error;
    }
  },

  // Admin: User management
  getAdminUsers: async () => {
    return await apiCall('/admin/users');
  },

  updateUserRole: async (id: number, role: string) => {
    return await apiCall(`/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    });
  },

  approveUser: async (id: number, isApproved: boolean = true) => {
    return await apiCall(`/admin/users/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ isApproved })
    });
  },

  rejectUser: async (id: number) => {
    return await apiCall(`/admin/users/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ isApproved: false })
    });
  },

  deleteUser: async (id: number) => {
    return await apiCall(`/admin/users/${id}`, {
      method: 'DELETE'
    });
  },

  grantEntityAccess: async (userId: number, entityId: string) => {
    return await apiCall('/admin/assign', {
      method: 'POST',
      body: JSON.stringify({ userId, entityId })
    });
  },

  revokeEntityAccess: async (userId: number, entityId: string) => {
    return await apiCall('/admin/revoke', {
      method: 'POST',
      body: JSON.stringify({ userId, entityId })
    });
  },

  // Methods management
  getReportingMethods: async () => {
    return await apiCall('/methods');
  },

  saveReportingMethod: async (method: any) => {
    const isUpdate = !!method.id;
    const url = isUpdate ? `/methods/${method.id}` : '/methods';
    return await apiCall(url, {
      method: isUpdate ? 'PUT' : 'POST',
      body: JSON.stringify(method)
    });
  },

  deleteReportingMethod: async (id: string) => {
    return await apiCall(`/methods/${id}`, {
      method: 'DELETE'
    });
  },

  seedReportingMethods: async () => {
    return await apiCall('/methods/seed', {
      method: 'POST'
    });
  },

  // Dashboard
  getDashboardData: async (queryParams: string) => {
    return await apiCall(`/dashboard/all-data?${queryParams}`);
  },

  // Planning
  getPlanningPresets: async () => {
    return await apiCall('/planning/presets');
  },

  savePlanningPreset: async (preset: any) => {
    const isUpdate = !!preset.id;
    const url = isUpdate ? `/planning/presets/${preset.id}` : '/planning/presets';
    return await apiCall(url, {
      method: isUpdate ? 'PUT' : 'POST',
      body: JSON.stringify(preset)
    });
  },

  deletePlanningPreset: async (id: string) => {
    return await apiCall(`/planning/presets/${id}`, {
      method: 'DELETE'
    });
  },

  getPlanningData: async () => {
    return await apiCall('/planning/data');
  },

  savePlanningTeam: async (team: any) => {
    const isUpdate = !!team.id;
    const url = isUpdate ? `/planning/teams/${team.id}` : '/planning/teams';
    return await apiCall(url, {
      method: isUpdate ? 'PUT' : 'POST',
      body: JSON.stringify(team)
    });
  },

  deletePlanningTeam: async (id: string) => {
    return await apiCall(`/planning/teams/${id}`, {
      method: 'DELETE'
    });
  },

  savePlanningMailer: async (mailer: any) => {
    const isUpdate = !!mailer.id;
    const url = isUpdate ? `/planning/mailers/${mailer.id}` : '/planning/mailers';
    return await apiCall(url, {
      method: isUpdate ? 'PUT' : 'POST',
      body: JSON.stringify(mailer)
    });
  },

  deletePlanningMailer: async (id: string) => {
    return await apiCall(`/planning/mailers/${id}`, {
      method: 'DELETE'
    });
  },

  savePlanningAssignment: async (assignment: any) => {
    return await apiCall('/planning/assignments', {
      method: 'POST',
      body: JSON.stringify(assignment)
    });
  },

  deletePlanningAssignment: async (id: string) => {
    return await apiCall(`/planning/assignments/${id}`, {
      method: 'DELETE'
    });
  },

  savePlanningAssignmentsBulk: async (assignments: any[]) => {
    return await apiCall('/planning/assignments/bulk', {
      method: 'POST',
      body: JSON.stringify({ assignments })
    });
  },

  getPlanningAiSuggest: async (scheduleId: string) => {
    return await apiCall('/planning/ai/suggest', {
      method: 'POST',
      body: JSON.stringify({ scheduleId })
    });
  },

  getPlanningTeams: async () => {
    return await apiCall('/planning/teams');
  },

  getPlanningSchedulesCurrent: async () => {
    return await apiCall('/planning/schedules/current');
  },

  getPlanningSchedulesHistory: async () => {
    return await apiCall('/planning/schedules/history');
  },

  initializePlanningSchedules: async () => {
    return await apiCall('/planning/schedules/initialize', {
      method: 'POST'
    });
  },

  // Proxies
  getProxies: async (entityId: string) => {
    return await apiCall(`/proxies/${entityId}`);
  },

  saveProxy: async (entityId: string, proxy: any) => {
    return await apiCall(`/proxies/${entityId}`, {
      method: 'POST',
      body: JSON.stringify(proxy)
    });
  },

  updateProxy: async (entityId: string, proxyId: string, proxy: any) => {
    return await apiCall(`/proxies/${entityId}/${proxyId}`, {
      method: 'PUT',
      body: JSON.stringify(proxy)
    });
  },

  toggleProxyStatus: async (entityId: string, proxyId: string) => {
    return await apiCall(`/proxies/${entityId}/${proxyId}/status`, {
      method: 'PATCH'
    });
  },

  deleteProxy: async (entityId: string, proxyId: string) => {
    return await apiCall(`/proxies/${entityId}/${proxyId}`, {
      method: 'DELETE'
    });
  },

  // Proxy Partition
  getProxyPartition: async () => {
    return await apiCall('/proxy-partition');
  },

  saveProxyPartition: async (data: any) => {
    return await apiCall('/proxy-partition', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  dnsLookup: async (domains: string[]) => {
    return await apiCall('/dashboard/dns-lookup', {
      method: 'POST',
      body: JSON.stringify({ domains })
    });
  },

  // Scripts & Scenarios
  getScriptsAll: async () => {
    return await apiCall('/scripts/all');
  },

  saveScript: async (script: any) => {
    const isUpdate = !!script.id;
    const url = isUpdate ? `/scripts/${script.id}` : '/scripts';
    return await apiCall(url, {
      method: isUpdate ? 'PUT' : 'POST',
      body: JSON.stringify(script)
    });
  },

  deleteScript: async (id: string) => {
    return await apiCall(`/scripts/${id}`, {
      method: 'DELETE'
    });
  },

  saveScenario: async (scenario: any) => {
    const isUpdate = !!scenario.id;
    const url = isUpdate ? `/scenarios/${scenario.id}` : '/scenarios';
    return await apiCall(url, {
      method: isUpdate ? 'PUT' : 'POST',
      body: JSON.stringify(scenario)
    });
  },

  deleteScenario: async (id: string) => {
    return await apiCall(`/scenarios/${id}`, {
      method: 'DELETE'
    });
  },

  checkHealth: async () => {
    return await apiCall('/test');
  },

  sendToBot: async (data: any) => {
    return await apiCall('/reporter/send-to-bot', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

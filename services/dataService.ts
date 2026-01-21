import { Entity, DataService } from '../types';
import { API_URL } from '../config';


const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

export const dataService: DataService = {
  getEntities: async () => {
    try {
      const response = await fetch(`${API_URL}/api/entities`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch entities');
      }

      return await response.json();
    } catch (error) {
      console.error('Get entities error:', error);
      throw error;
    }
  },

  getEntity: async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/entities/${id}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          return undefined;
        }
        throw new Error('Failed to fetch entity');
      }

      return await response.json();
    } catch (error) {
      console.error('Get entity error:', error);
      throw error;
    }
  },

  saveEntity: async (entity: Entity, options?: { skipEvent?: boolean }) => {
    try {
      const { id, name, status, reporting, limitsConfiguration, notes, noteCards, enabledMethods, methodsData } = entity;
      
      // Log what we're about to send
      console.log('[dataService] Saving entity:', id);
      console.log('[dataService] Enabled methods:', enabledMethods);
      console.log('[dataService] Methods data keys:', methodsData ? Object.keys(methodsData) : 'none');
      console.log('[dataService] Reporting categories:', reporting.parentCategories.map(c => ({
        name: c.name,
        status: c.planConfiguration.status
      })));
      
      const response = await fetch(`${API_URL}/api/entities/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name,
          status,
          reporting,
          limitsConfiguration,
          notes,
          noteCards,
          enabledMethods,
          methodsData
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[dataService] Save failed:', errorData);
        throw new Error(errorData.error || 'Failed to save entity');
      }

      // Dispatch event to notify other components (unless skipped)
      if (!options?.skipEvent) {
        window.dispatchEvent(new Event('entity-updated'));
      }
    } catch (error) {
      console.error('Save entity error:', error);
      throw error;
    }
  },

  deleteEntity: async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/entities/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to delete entity');
      }

      // Dispatch event to notify other components
      window.dispatchEvent(new Event('entity-updated'));
    } catch (error) {
      console.error('Delete entity error:', error);
      throw error;
    }
  },

  resetDatabase: async () => {
    // This functionality is not needed with backend
    // Data is managed through the admin panel
    console.warn('resetDatabase is deprecated with backend');
  },

  // History tracking methods
  getEntityHistory: async (entityId: string, limit: number = 5) => {
    try {
      const response = await fetch(`${API_URL}/api/history/entity/${entityId}?limit=${limit}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch entity history');
      }

      return await response.json();
    } catch (error) {
      console.error('Get entity history error:', error);
      return [];
    }
  },

  getHistoryByType: async (entityType: string, limit: number = 5) => {
    try {
      const response = await fetch(`${API_URL}/api/history/type/${entityType}?limit=${limit}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch history by type');
      }

      return await response.json();
    } catch (error) {
      console.error('Get history by type error:', error);
      return [];
    }
  },

  getRecentChanges: async (limit: number = 20) => {
    try {
      const response = await fetch(`${API_URL}/api/history/recent?limit=${limit}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recent changes');
      }

      return await response.json();
    } catch (error) {
      console.error('Get recent changes error:', error);
      return [];
    }
  },

  getAllHistory: async (filters?: {
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
  }): Promise<any[]> => {
    const queryParams = new URLSearchParams();
    if (filters) {
      if (filters.entityId) queryParams.append('entityId', filters.entityId);
      if (filters.entityType) queryParams.append('entityType', filters.entityType);
      if (filters.username) queryParams.append('username', filters.username);
      if (filters.changeType) queryParams.append('changeType', filters.changeType);
      if (filters.methodId) queryParams.append('methodId', filters.methodId);
      if (filters.categoryId) queryParams.append('categoryId', filters.categoryId);
      if (filters.fieldChanged) queryParams.append('fieldChanged', filters.fieldChanged);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
    }

    try {
      const response = await fetch(`${API_URL}/api/history?${queryParams.toString()}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      return await response.json();
    } catch (error) {
      console.error('Get all history error:', error);
      return [];
    }
  },

  deleteHistoryEntry: async (id: number): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/api/history/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to delete history entry');
      }
    } catch (error) {
      console.error('Delete history entry error:', error);
      throw error;
    }
  },

  deleteAllHistory: async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/api/history`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to delete all history');
      }
    } catch (error) {
      console.error('Delete all history error:', error);
      throw error;
    }
  },

  // Day Plan methods
  getDayPlan: async (entityId: string, date: string): Promise<Record<string, Record<number, { step: string | number; start: string | number }>>> => {
    try {
      const response = await fetch(`${API_URL}/api/dayplan/${entityId}/${date}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to fetch day plan');
      }
      return await response.json();
    } catch (error) {
      console.error('Get day plan error:', error);
      return {};
    }
  },

  saveDayPlan: async (entityId: string, date: string, categoryId: string, sessionData: Record<number, { step: string | number; start: string | number }>): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/api/dayplan/${entityId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ date, categoryId, sessionData })
      });
      if (!response.ok) {
        throw new Error('Failed to save day plan');
      }
    } catch (error) {
      console.error('Save day plan error:', error);
      throw error;
    }
  },

  saveDayPlanBulk: async (entityId: string, date: string, plans: Record<string, Record<number, { step: string | number; start: string | number }>>): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/api/dayplan/${entityId}/bulk`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ date, plans })
      });
      if (!response.ok) {
        throw new Error('Failed to save day plans');
      }
    } catch (error) {
      console.error('Save day plans error:', error);
      throw error;
    }
  },

  deleteDayPlan: async (entityId: string, categoryId: string, date: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/api/dayplan/${entityId}/${categoryId}/${date}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to delete day plan');
      }
    } catch (error) {
      console.error('Delete day plan error:', error);
      throw error;
    }
  }
};
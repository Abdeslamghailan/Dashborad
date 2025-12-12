import { API_URL } from '../config';

// Types for Script and Scenario
export interface Script {
  id: string;
  name: string;
  description?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  scenarios: Scenario[];
}

export interface Scenario {
  id: string;
  name: string;
  scriptId: string;
  description?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  script?: Script;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

export const scriptsService = {
  // =====================
  // SCRIPTS
  // =====================
  
  getScripts: async (): Promise<Script[]> => {
    try {
      const response = await fetch(`${API_URL}/api/scripts/scripts`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch scripts');
      }

      return await response.json();
    } catch (error) {
      console.error('Get scripts error:', error);
      throw error;
    }
  },

  getAllScripts: async (): Promise<Script[]> => {
    try {
      const response = await fetch(`${API_URL}/api/scripts/scripts/all`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch all scripts');
      }

      return await response.json();
    } catch (error) {
      console.error('Get all scripts error:', error);
      throw error;
    }
  },

  getScript: async (id: string): Promise<Script> => {
    try {
      const response = await fetch(`${API_URL}/api/scripts/scripts/${id}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch script');
      }

      return await response.json();
    } catch (error) {
      console.error('Get script error:', error);
      throw error;
    }
  },

  createScript: async (data: { name: string; description?: string; order?: number }): Promise<Script> => {
    try {
      const response = await fetch(`${API_URL}/api/scripts/scripts`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create script');
      }

      return await response.json();
    } catch (error) {
      console.error('Create script error:', error);
      throw error;
    }
  },

  updateScript: async (id: string, data: { name?: string; description?: string; order?: number; isActive?: boolean }): Promise<Script> => {
    try {
      const response = await fetch(`${API_URL}/api/scripts/scripts/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update script');
      }

      return await response.json();
    } catch (error) {
      console.error('Update script error:', error);
      throw error;
    }
  },

  deleteScript: async (id: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/api/scripts/scripts/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to delete script');
      }
    } catch (error) {
      console.error('Delete script error:', error);
      throw error;
    }
  },

  // =====================
  // SCENARIOS
  // =====================

  getScenarios: async (): Promise<Scenario[]> => {
    try {
      const response = await fetch(`${API_URL}/api/scripts/scenarios`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch scenarios');
      }

      return await response.json();
    } catch (error) {
      console.error('Get scenarios error:', error);
      throw error;
    }
  },

  getScenariosByScript: async (scriptId: string): Promise<Scenario[]> => {
    try {
      const response = await fetch(`${API_URL}/api/scripts/scenarios/by-script/${scriptId}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch scenarios');
      }

      return await response.json();
    } catch (error) {
      console.error('Get scenarios by script error:', error);
      throw error;
    }
  },

  getScenario: async (id: string): Promise<Scenario> => {
    try {
      const response = await fetch(`${API_URL}/api/scripts/scenarios/${id}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch scenario');
      }

      return await response.json();
    } catch (error) {
      console.error('Get scenario error:', error);
      throw error;
    }
  },

  createScenario: async (data: { name: string; scriptId: string; description?: string; order?: number }): Promise<Scenario> => {
    try {
      const response = await fetch(`${API_URL}/api/scripts/scenarios`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create scenario');
      }

      return await response.json();
    } catch (error) {
      console.error('Create scenario error:', error);
      throw error;
    }
  },

  updateScenario: async (id: string, data: { name?: string; scriptId?: string; description?: string; order?: number; isActive?: boolean }): Promise<Scenario> => {
    try {
      const response = await fetch(`${API_URL}/api/scripts/scenarios/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update scenario');
      }

      return await response.json();
    } catch (error) {
      console.error('Update scenario error:', error);
      throw error;
    }
  },

  deleteScenario: async (id: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/api/scripts/scenarios/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to delete scenario');
      }
    } catch (error) {
      console.error('Delete scenario error:', error);
      throw error;
    }
  },

  findScenarioByName: async (name: string): Promise<Scenario | null> => {
    try {
      const response = await fetch(`${API_URL}/api/scripts/scenarios/find-by-name/${encodeURIComponent(name)}`, {
        headers: getAuthHeaders()
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error('Failed to find scenario');
      }

      return await response.json();
    } catch (error) {
      console.error('Find scenario by name error:', error);
      return null;
    }
  }
};

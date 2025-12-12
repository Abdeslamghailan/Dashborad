import { Entity, DataService } from '../types';

// This is a stub for future MySQL API integration
export const apiService: DataService = {
  getEntities: async () => {
    console.log('API: getEntities called');
    return [];
  },
  getEntity: async (id: string) => {
    console.log(`API: getEntity ${id} called`);
    return undefined;
  },
  saveEntity: async (entity: Entity) => {
    console.log(`API: saveEntity ${entity.id} called`);
  },
  deleteEntity: async (id: string) => {
    console.log(`API: deleteEntity ${id} called`);
  },
  resetDatabase: async () => {
    console.log('API: resetDatabase called');
  },
  getEntityHistory: async (entityId: string, limit?: number) => {
    console.log(`API: getEntityHistory ${entityId} called`);
    return [];
  },
  getHistoryByType: async (entityType: string, limit?: number) => {
    console.log(`API: getHistoryByType ${entityType} called`);
    return [];
  },
  getRecentChanges: async (limit?: number) => {
    console.log('API: getRecentChanges called');
    return [];
  },
  getAllHistory: async (filters?: any) => {
    console.log('API: getAllHistory called', filters);
    return [];
  }
};

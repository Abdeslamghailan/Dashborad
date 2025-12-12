import { dataService } from './dataService';
import { apiService } from './apiService';

// Toggle this to switch between LocalStorage and API
const USE_API = false;

export const service = USE_API ? apiService : dataService;

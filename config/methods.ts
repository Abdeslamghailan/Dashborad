import { MethodType } from '../types';
import { 
  Monitor, 
  Bot, 
  Smartphone, 
  Code,
  BarChart3,
  TableProperties,
  Settings,
  CalendarDays,
  Server,
  FileText,
  LucideIcon
} from 'lucide-react';

export interface MethodConfig {
  id: MethodType;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  gradient: string;
  // Tabs available for this method
  tabs: {
    id: string;
    label: string;
    icon: LucideIcon;
    requiresAdmin?: boolean;
    requiresMailer?: boolean;
  }[];
}

// Available methods configuration
export const AVAILABLE_METHODS: MethodConfig[] = [
  {
    id: 'desktop',
    name: 'Desktop',
    description: 'Desktop automation and reporting',
    icon: Monitor,
    color: '#6366F1', // Indigo
    gradient: 'from-indigo-500 to-purple-600',
    tabs: [
      { id: 'overview', label: 'Overview', icon: BarChart3 },
      { id: 'reporting', label: 'Reporting Metrics', icon: TableProperties },
      // Categories will be dynamically added
      { id: 'day-plan', label: 'DAY PLAN', icon: CalendarDays },
      { id: 'proxy-servers', label: 'Proxy Servers', icon: Server },
      { id: 'notes', label: 'Notes', icon: FileText, requiresMailer: true }
    ]
  },
  {
    id: 'webautomate',
    name: 'Webautomate',
    description: 'Web automation and browser control',
    icon: Bot,
    color: '#10B981', // Emerald
    gradient: 'from-emerald-500 to-teal-600',
    tabs: [
      { id: 'overview', label: 'Overview', icon: BarChart3 },
      { id: 'reporting', label: 'Reporting Metrics', icon: TableProperties },
      // Categories will be dynamically added
      { id: 'day-plan', label: 'DAY PLAN', icon: CalendarDays },
      { id: 'proxy-servers', label: 'Proxy Servers', icon: Server },
      { id: 'notes', label: 'Notes', icon: FileText, requiresMailer: true }
    ]
  }
];

// Helper function to get method config by ID
export const getMethodConfig = (methodId: MethodType): MethodConfig | undefined => {
  return AVAILABLE_METHODS.find(m => m.id === methodId);
};

// Helper function to get all available method IDs
export const getAvailableMethodIds = (): MethodType[] => {
  return AVAILABLE_METHODS.map(m => m.id);
};

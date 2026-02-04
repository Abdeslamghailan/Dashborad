import { Entity } from '../../types';

export interface User {
    id: number;
    telegramId: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    photoUrl: string | null;
    role: string;
    isApproved: boolean;
    createdAt: string;
    accessibleEntities: {
        entity: {
            id: string;
            name: string;
        };
    }[];
}

export interface ReportingMethod {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    color: string;
    gradient: string;
    order: number;
    isActive: boolean;
}

export interface Toast {
    id: number;
    type: 'success' | 'error' | 'info';
    message: string;
}

export interface AdminStats {
    totalUsers: number;
    totalEntities: number;
    approvedUsers: number;
    pendingUsers: number;
    activeEntities: number;
}

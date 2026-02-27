import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';

export interface Mailer {
    id: string;
    name: string;
    teamId: string;
    order: number;
    isActive: boolean;
    team?: Team;
}

export interface Team {
    id: string;
    name: string;
    displayName: string;
    order: number;
    color?: string;
    mailers: Mailer[];
}

export interface PlanningAssignment {
    id: string;
    scheduleId: string;
    mailerId: string;
    dayOfWeek: number;
    taskCode: string;
    taskColor?: string;
    notes?: string;
    mailer?: Mailer;
}

export interface PlanningSchedule {
    id: string;
    weekStart: string;
    weekEnd: string;
    weekNumber: number;
    year: number;
    isCurrent: boolean;
    isNext: boolean;
    assignments: PlanningAssignment[];
}

export interface EntityPreset {
    id?: string;
    label: string;
    codes: string[];
    color: string;
    order?: number;
}

export const usePlanningData = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    const [teams, setTeams] = useState<Team[]>([]);
    const [schedules, setSchedules] = useState<PlanningSchedule[]>([]);
    const [presets, setPresets] = useState<EntityPreset[]>([]);
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<PlanningSchedule[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [teamsData, schedulesData, presetsData] = await Promise.all([
                apiService.getTeams(),
                apiService.getSchedules(),
                apiService.getEntityPresets()
            ]);
            setTeams(teamsData || []);
            setSchedules(schedulesData || []);
            setPresets(presetsData || []);
        } catch (error) {
            console.error('Failed to fetch planning data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const historyData = await apiService.getPlanningHistory();
            setHistory(historyData || []);
        } catch (error) {
            console.error('Failed to fetch history:', error);
        }
    };

    const fetchPresets = async () => {
        try {
            const presetsData = await apiService.getEntityPresets();
            setPresets(presetsData || []);
        } catch (error) {
            console.error('Failed to fetch presets:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return {
        teams,
        setTeams,
        schedules,
        setSchedules,
        presets,
        setPresets,
        loading,
        setLoading,
        history,
        setHistory,
        showHistory,
        setShowHistory,
        isAdmin,
        fetchData,
        fetchHistory,
        fetchPresets
    };
};

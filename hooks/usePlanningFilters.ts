import { useState } from 'react';
import { Team, PlanningSchedule } from '../hooks/usePlanningData';

export const usePlanningFilters = (teams: Team[], schedules: PlanningSchedule[]) => {
    const [currentWeekSearch, setCurrentWeekSearch] = useState('');
    const [nextWeekSearch, setNextWeekSearch] = useState('');
    const [currentWeekTeamFilter, setCurrentWeekTeamFilter] = useState('');
    const [nextWeekTeamFilter, setNextWeekTeamFilter] = useState('');
    const [currentWeekStatusFilter, setCurrentWeekStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [nextWeekStatusFilter, setNextWeekStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [currentWeekTaskFilter, setCurrentWeekTaskFilter] = useState('');
    const [nextWeekTaskFilter, setNextWeekTaskFilter] = useState('');

    const getFilteredTeams = (schedule: PlanningSchedule, searchValue: string, teamId: string, status: string, taskCode: string) => {
        return teams.map(team => {
            if (teamId && team.id !== teamId) return { ...team, mailers: [] };

            const filteredMailers = team.mailers.filter(mailer => {
                const matchesSearch = !searchValue || mailer.name.toLowerCase().includes(searchValue.toLowerCase());
                const matchesStatus = status === 'all' || (status === 'active' ? mailer.isActive : !mailer.isActive);
                const matchesTask = !taskCode || schedule.assignments.some(
                    a => a.mailerId === mailer.id && a.taskCode && a.taskCode.toLowerCase().includes(taskCode.toLowerCase())
                );
                return matchesSearch && matchesStatus && matchesTask;
            });

            return { ...team, mailers: filteredMailers };
        }).filter(team => team.mailers.length > 0);
    };

    const getAllTaskCodes = (): string[] => {
        const taskCodes = new Set<string>();
        schedules.forEach(schedule => {
            schedule.assignments.forEach(a => {
                if (a.taskCode) taskCodes.add(a.taskCode);
            });
        });
        return Array.from(taskCodes).sort();
    };

    return {
        filters: {
            currentWeek: { search: currentWeekSearch, team: currentWeekTeamFilter, status: currentWeekStatusFilter, task: currentWeekTaskFilter },
            nextWeek: { search: nextWeekSearch, team: nextWeekTeamFilter, status: nextWeekStatusFilter, task: nextWeekTaskFilter }
        },
        setFilters: {
            currentWeek: { search: setCurrentWeekSearch, team: setCurrentWeekTeamFilter, status: setCurrentWeekStatusFilter, task: setCurrentWeekTaskFilter },
            nextWeek: { search: setNextWeekSearch, team: setNextWeekTeamFilter, status: setNextWeekStatusFilter, task: setNextWeekTaskFilter }
        },
        getFilteredTeams,
        getAllTaskCodes
    };
};

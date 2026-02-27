import * as XLSX from 'xlsx';
import { PlanningSchedule, Team } from '../hooks/usePlanningData';
import { DAYS } from '../constants/planning';

export const exportPlanningToXLSX = (schedule: PlanningSchedule, filteredTeams: Team[], weekLabel: string) => {
    const wb = XLSX.utils.book_new();
    const wsData: (string | undefined)[][] = [];

    // Header row
    wsData.push(['Team', 'Mailer', ...DAYS]);

    // Data rows
    filteredTeams.forEach(team => {
        team.mailers.forEach((mailer, idx) => {
            const row: (string | undefined)[] = [];
            
            // Team name (only on first mailer of team)
            row.push(idx === 0 ? team.displayName : '');
            
            // Mailer name
            row.push(mailer.name);

            // Days
            DAYS.forEach((_, dayIdx) => {
                const assignment = schedule.assignments.find(
                    a => a.mailerId === mailer.id && a.dayOfWeek === dayIdx
                );
                row.push(assignment?.taskCode || '');
            });

            wsData.push(row);
        });
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
        { wch: 20 }, // Team
        { wch: 25 }, // Mailer
        ...DAYS.map(() => ({ wch: 15 })) // Days
    ];

    XLSX.utils.book_append_sheet(wb, ws, weekLabel);

    const formatDateRange = (start: string, end: string) => {
        const s = new Date(start).toLocaleDateString();
        const e = new Date(end).toLocaleDateString();
        return `${s} - ${e}`.replace(/\//g, '-');
    };

    const dateStr = formatDateRange(schedule.weekStart, schedule.weekEnd);
    const filename = `TeamPlanning_${weekLabel.replace(' ', '_')}_${dateStr}.xlsx`;

    XLSX.writeFile(wb, filename);
};

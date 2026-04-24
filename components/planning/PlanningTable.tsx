import React from 'react';
import { PlanningSchedule, Team, Mailer } from '../../hooks/usePlanningData';
import { PlanningCell } from './PlanningCell';
import { DAYS } from '../../constants/planning';

interface PlanningTableProps {
    schedule: PlanningSchedule;
    teams: Team[];
    isAdmin: boolean;
    selectedCells: Set<string>;
    onCellMouseDown: (mailerId: string, dayOfWeek: number, e: React.MouseEvent) => void;
    onCellMouseEnter: (mailerId: string, dayOfWeek: number) => void;
    onCellClick: (mailerId: string, dayOfWeek: number, e: React.MouseEvent) => void;
    onCellDoubleClick: (mailerId: string, dayOfWeek: number) => void;
    onDrop: (mailerId: string, dayOfWeek: number, e: React.DragEvent) => void;
}

const TEAM_COLORS: Record<string, string> = {
    'DESKTOP': 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', // Indigo
    'WEBAUTOMAT': 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)', // Sky Blue
    'YAHOO': 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', // Violet
    'HOTMAIL': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', // Amber
};

export const PlanningTable: React.FC<PlanningTableProps> = ({
    schedule,
    teams,
    isAdmin,
    selectedCells,
    onCellMouseDown,
    onCellMouseEnter,
    onCellClick,
    onCellDoubleClick,
    onDrop
}) => {
    return (
        <div className="overflow-x-auto border rounded-xl shadow-sm bg-white">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-300">
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 border-r border-gray-300 shadow-sm w-40">Team</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider sticky left-[160px] bg-gray-50 z-20 border-r border-gray-300 shadow-sm whitespace-nowrap w-64">Mailer</th>
                        {DAYS.map((day) => (
                            <th key={day} className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                                {day}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {teams.map((team) => (
                        <React.Fragment key={team.id}>
                            {team.mailers.map((mailer, mIdx) => (
                                <tr key={mailer.id} className="hover:bg-gray-50 transition-colors">
                                    {mIdx === 0 && (
                                        <td
                                            rowSpan={team.mailers.length}
                                            className="px-4 py-8 text-center sticky left-0 z-10 border-r border-gray-300 align-middle shadow-sm"
                                            style={{
                                                background: TEAM_COLORS[team.name] || TEAM_COLORS[team.displayName] || (team.color ? `linear-gradient(135deg, ${team.color} 0%, ${team.color}dd 100%)` : '#4f46e5'),
                                            }}
                                        >
                                            <span className="text-[15px] font-black text-white uppercase tracking-[0.2em] block leading-tight">
                                                {team.displayName}
                                            </span>
                                        </td>
                                    )}
                                    <td className="px-4 py-3 text-xs font-semibold text-gray-700 sticky left-[160px] bg-white z-10 border-r border-gray-300 shadow-sm whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${mailer.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                            {mailer.name}
                                        </div>
                                    </td>
                                    {DAYS.map((_, dIdx) => {
                                        const assignment = schedule.assignments.find(a =>
                                            a.mailerId === mailer.id && a.dayOfWeek === dIdx
                                        );
                                        const isSelected = selectedCells.has(`${schedule.id}|${mailer.id}|${dIdx}`);
                                        return (
                                            <PlanningCell
                                                key={dIdx}
                                                scheduleId={schedule.id}
                                                mailerId={mailer.id}
                                                dayOfWeek={dIdx}
                                                assignment={assignment}
                                                isSelected={isSelected}
                                                isAdmin={isAdmin}
                                                onMouseDown={(e) => onCellMouseDown(mailer.id, dIdx, e)}
                                                onMouseEnter={() => onCellMouseEnter(mailer.id, dIdx)}
                                                onClick={(e) => onCellClick(mailer.id, dIdx, e)}
                                                onDoubleClick={() => onCellDoubleClick(mailer.id, dIdx)}
                                                onDrop={(e) => onDrop(mailer.id, dIdx, e)}
                                            />
                                        );
                                    })}
                                </tr>
                            ))}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

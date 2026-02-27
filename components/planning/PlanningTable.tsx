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
                                            className="px-4 py-3 text-xs font-black text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-300 align-top shadow-sm"
                                            style={{ color: team.color || 'inherit' }}
                                        >
                                            {team.displayName}
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

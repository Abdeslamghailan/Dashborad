import React, { useState } from 'react';
import { PlanningAssignment } from '../hooks/usePlanningData';

interface PlanningCellProps {
    scheduleId: string;
    mailerId: string;
    dayOfWeek: number;
    assignment?: PlanningAssignment;
    isSelected: boolean;
    isAdmin: boolean;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseEnter: () => void;
    onClick: (e: React.MouseEvent) => void;
    onDoubleClick: () => void;
    onDrop: (e: React.DragEvent) => void;
}

export const PlanningCell: React.FC<PlanningCellProps> = ({
    assignment,
    isSelected,
    isAdmin,
    onMouseDown,
    onMouseEnter,
    onClick,
    onDoubleClick,
    onDrop
}) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <td
            onMouseDown={onMouseDown}
            onMouseEnter={() => {
                setIsHovered(true);
                onMouseEnter();
            }}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className={`px-3 py-4 text-center border border-gray-300 relative transition-all duration-150 select-none group h-16 w-32 ${isSelected ? 'ring-2 ring-indigo-500 ring-inset bg-indigo-50/50 z-10' :
                    isHovered ? 'bg-gray-50' : ''
                }`}
        >
            {assignment?.taskCode ? (
                <div
                    className="w-full h-full flex flex-col items-center justify-center p-1 rounded shadow-sm border border-black/5"
                    style={{ backgroundColor: assignment.taskColor || '#f3f4f6' }}
                >
                    <span className="text-[10px] font-bold text-gray-800 line-clamp-2 leading-tight">
                        {assignment.taskCode}
                    </span>
                    {assignment.notes && (
                        <span className="absolute bottom-0.5 right-0.5 text-[8px] text-gray-400">📝</span>
                    )}
                </div>
            ) : (
                isAdmin && isHovered && <span className="text-[10px] text-gray-300 font-medium italic">Empty</span>
            )}

            {isSelected && (
                <div className="absolute top-0 right-0 w-2 h-2 bg-indigo-500 rounded-bl shadow-sm"></div>
            )}
        </td>
    );
};

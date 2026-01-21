import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';
import * as XLSX from 'xlsx';

interface Team {
    id: string;
    name: string;
    displayName: string;
    order: number;
    color?: string;
    mailers: Mailer[];
}

interface Mailer {
    id: string;
    name: string;
    teamId: string;
    order: number;
    isActive: boolean;
    team?: Team;
}

interface PlanningSchedule {
    id: string;
    weekStart: string;
    weekEnd: string;
    weekNumber: number;
    year: number;
    isCurrent: boolean;
    isNext: boolean;
    assignments: PlanningAssignment[];
}

interface PlanningAssignment {
    id: string;
    scheduleId: string;
    mailerId: string;
    dayOfWeek: number;
    taskCode: string;
    taskColor?: string;
    notes?: string;
    mailer?: Mailer;
}

interface EntityPreset {
    id?: string;
    label: string;
    codes: string[];
    color: string;
    order?: number;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TASK_COLORS: Record<string, string> = {
    'CMH3': '#90EE90',
    'CMH9': '#90EE90',
    'CMH12': '#FFFFE0',
    'CMH5': '#FFFFE0',
    'CMH16': '#FFFFE0',
    'HOTMAIL': '#FFD700',
    'Gmail': '#FFD700',
    'Desktop': '#FFA500',
    'Webautomat': '#FFA500',
    'Night Desktop': '#FFA500',
    'Night tool it': '#FFA500',
    'congé': '#FFB6C1',
    'default': '#E0E0E0'
};

const ENTITY_PRESETS: EntityPreset[] = [
    { label: 'CMH3-CMH9', codes: ['CMH3', 'CMH9'], color: '#90EE90' },
    { label: 'CMH12-CMH5-CMH16', codes: ['CMH12', 'CMH5', 'CMH16'], color: '#FFFFE0' },
    { label: 'HOTMAIL-Gmail', codes: ['HOTMAIL', 'Gmail'], color: '#FFD700' },
    { label: 'Desktop-Webautomat', codes: ['Desktop', 'Webautomat'], color: '#FFA500' },
    { label: 'Night Desktop-Night tool it', codes: ['Night Desktop', 'Night tool it'], color: '#FFA500' },
    { label: 'congé', codes: ['congé'], color: '#FFB6C1' }
];

export const TeamPlanning: React.FC = () => {
    const { user, isAdmin } = useAuth();
    const [teams, setTeams] = useState<Team[]>([]);
    const [schedules, setSchedules] = useState<PlanningSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
    const [draggedEntity, setDraggedEntity] = useState<EntityPreset | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    // Quick Assign - Click Mode: when a preset is selected, clicking fills that cell
    const [selectedPreset, setSelectedPreset] = useState<EntityPreset | null>(null);

    // Copy/Paste functionality
    const [copiedCell, setCopiedCell] = useState<{ taskCode: string; taskColor: string } | null>(null);

    // Last clicked cell for shift-click range selection
    const [lastClickedCell, setLastClickedCell] = useState<{ scheduleId: string; mailerId: string; dayOfWeek: number } | null>(null);
    const [historicalSchedules, setHistoricalSchedules] = useState<PlanningSchedule[]>([]);
    const [showManageModal, setShowManageModal] = useState(false);
    const [managementTab, setManagementTab] = useState<'teams' | 'mailers'>('teams');

    // Drag selection state
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartCell, setDragStartCell] = useState<{ scheduleId: string; mailerId: string; dayOfWeek: number } | null>(null);
    const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
    const [bulkTaskInput, setBulkTaskInput] = useState('');
    const [editingCell, setEditingCell] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    // Table visibility state
    const [showCurrentWeek, setShowCurrentWeek] = useState(true);
    const [showNextWeek, setShowNextWeek] = useState(true);

    // Management State
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [isAddingTeam, setIsAddingTeam] = useState(false);
    const [teamForm, setTeamForm] = useState({ name: '', displayName: '', color: '#000000', order: 0 });

    const [editingMailer, setEditingMailer] = useState<Mailer | null>(null);
    const [isAddingMailer, setIsAddingMailer] = useState(false);
    const [mailerForm, setMailerForm] = useState({ name: '', teamId: '', order: 0, isActive: true });

    // Preset Management State
    const [presets, setPresets] = useState<EntityPreset[]>([]);
    const [showPresetModal, setShowPresetModal] = useState(false);
    const [editingPreset, setEditingPreset] = useState<EntityPreset | null>(null);
    const [isAddingPreset, setIsAddingPreset] = useState(false);
    const [presetForm, setPresetForm] = useState({ label: '', codes: '', color: '#000000' });

    // Filter States - separate for each table
    const [currentWeekSearch, setCurrentWeekSearch] = useState('');
    const [currentWeekTeamFilter, setCurrentWeekTeamFilter] = useState('');
    const [currentWeekStatusFilter, setCurrentWeekStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [currentWeekTaskFilter, setCurrentWeekTaskFilter] = useState('');

    const [nextWeekSearch, setNextWeekSearch] = useState('');
    const [nextWeekTeamFilter, setNextWeekTeamFilter] = useState('');
    const [nextWeekStatusFilter, setNextWeekStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [nextWeekTaskFilter, setNextWeekTaskFilter] = useState('');

    // Fetch presets from database
    const fetchPresets = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${API_URL}/api/planning/presets`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPresets(data);
            }
        } catch (error) {
            console.error('Error fetching presets:', error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchData();
            fetchPresets();
        }
    }, [user]);

    // Keyboard shortcuts for Quick Assign
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (e.key === 'Enter' && selectedPreset && selectedCells.size > 0 && !editingCell) {
                e.preventDefault();
                applyPresetToSelectedCells();
            }

            if (e.key === 'Escape') {
                if (editingCell) {
                    setEditingCell(null);
                    setEditValue('');
                } else if (selectedCells.size > 0) {
                    setSelectedCells(new Set());
                } else if (selectedPreset) {
                    setSelectedPreset(null);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedPreset, selectedCells, editingCell, isAdmin]);

    // Global mouseup listener to stop dragging
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            setIsDragging(false);
            setDragStartCell(null);
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    // Preset Management Functions
    const handleSavePreset = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const codes = presetForm.codes.split(',').map(c => c.trim()).filter(c => c);

            if (editingPreset) {
                // Update existing preset
                const res = await fetch(`${API_URL}/api/planning/presets/${(editingPreset as any).id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        label: presetForm.label,
                        codes,
                        color: presetForm.color
                    })
                });
                if (res.ok) {
                    fetchPresets();
                    setEditingPreset(null);
                }
            } else {
                // Create new preset
                const res = await fetch(`${API_URL}/api/planning/presets`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        label: presetForm.label,
                        codes,
                        color: presetForm.color
                    })
                });
                if (res.ok) {
                    fetchPresets();
                    setIsAddingPreset(false);
                }
            }
            setPresetForm({ label: '', codes: '', color: '#000000' });
        } catch (error) {
            console.error('Error saving preset:', error);
        }
    };

    const handleDeletePreset = async (presetId: string) => {
        if (!confirm('Are you sure you want to delete this preset?')) return;
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${API_URL}/api/planning/presets/${presetId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchPresets();
            }
        } catch (error) {
            console.error('Error deleting preset:', error);
        }
    };

    // Team Management Functions
    const handleSaveTeam = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const url = editingTeam
                ? `${API_URL}/api/planning/teams/${editingTeam.id}`
                : `${API_URL}/api/planning/teams`;

            const method = editingTeam ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(teamForm)
            });

            if (res.ok) {
                fetchData();
                setEditingTeam(null);
                setIsAddingTeam(false);
                setTeamForm({ name: '', displayName: '', color: '#000000', order: 0 });
            }
        } catch (error) {
            console.error('Error saving team:', error);
        }
    };

    const handleDeleteTeam = async (id: string) => {
        if (!confirm('Are you sure? This will delete all mailers in this team!')) return;
        try {
            const token = localStorage.getItem('auth_token');
            await fetch(`${API_URL}/api/planning/teams/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchData();
        } catch (error) {
            console.error('Error deleting team:', error);
        }
    };

    // Mailer Management Functions
    const handleSaveMailer = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const url = editingMailer
                ? `${API_URL}/api/planning/mailers/${editingMailer.id}`
                : `${API_URL}/api/planning/mailers`;

            const method = editingMailer ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(mailerForm)
            });

            if (res.ok) {
                fetchData();
                setEditingMailer(null);
                setIsAddingMailer(false);
                setMailerForm({ name: '', teamId: '', order: 0, isActive: true });
            }
        } catch (error) {
            console.error('Error saving mailer:', error);
        }
    };

    const handleDeleteMailer = async (id: string) => {
        if (!confirm('Are you sure you want to delete this mailer?')) return;
        try {
            const token = localStorage.getItem('auth_token');
            await fetch(`${API_URL}/api/planning/mailers/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchData();
        } catch (error) {
            console.error('Error deleting mailer:', error);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('auth_token');

            const teamsRes = await fetch(`${API_URL}/api/planning/teams`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const teamsData = await teamsRes.json();
            setTeams(teamsData);

            const schedulesRes = await fetch(`${API_URL}/api/planning/schedules/current`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const schedulesData = await schedulesRes.json();
            setSchedules(schedulesData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        if (!isAdmin) return;
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${API_URL}/api/planning/schedules/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setHistoricalSchedules(data);
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    const initializeWeeks = async () => {
        if (!isAdmin) return;
        try {
            const token = localStorage.getItem('auth_token');
            await fetch(`${API_URL}/api/planning/schedules/initialize`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchData();
        } catch (error) {
            console.error('Error initializing weeks:', error);
        }
    };

    const getAssignment = (scheduleId: string, mailerId: string, dayOfWeek: number): PlanningAssignment | undefined => {
        const schedule = schedules.find(s => s.id === scheduleId);
        return schedule?.assignments.find(a => a.mailerId === mailerId && a.dayOfWeek === dayOfWeek);
    };

    const getCellKey = (scheduleId: string, mailerId: string, dayOfWeek: number) => {
        return `${scheduleId}_${mailerId}_${dayOfWeek}`;
    };

    // Apply preset to a cell (used for Quick Assign click mode)
    const applyPresetToCell = async (scheduleId: string, mailerId: string, dayOfWeek: number, preset: EntityPreset) => {
        try {
            const token = localStorage.getItem('auth_token');
            const taskCode = preset.codes.join('-');
            const taskColor = preset.color;

            const assignment = {
                scheduleId,
                mailerId,
                dayOfWeek,
                taskCode,
                taskColor
            };

            const response = await fetch(`${API_URL}/api/planning/assignments/bulk`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ assignments: [assignment] })
            });

            if (response.ok) {
                setSchedules(prevSchedules =>
                    prevSchedules.map(schedule => {
                        if (schedule.id !== scheduleId) return schedule;

                        let newAssignments = [...schedule.assignments];
                        const existingIndex = newAssignments.findIndex(
                            a => a.mailerId === mailerId && a.dayOfWeek === dayOfWeek
                        );

                        if (existingIndex >= 0) {
                            newAssignments[existingIndex] = { ...newAssignments[existingIndex], taskCode, taskColor };
                        } else {
                            newAssignments.push({
                                id: `temp-${Date.now()}-${Math.random()}`,
                                scheduleId,
                                mailerId,
                                dayOfWeek,
                                taskCode,
                                taskColor
                            } as PlanningAssignment);
                        }
                        return { ...schedule, assignments: newAssignments };
                    })
                );
            }
        } catch (error) {
            console.error('Error applying preset:', error);
        }
    };

    // Copy cell content
    const handleCopyCell = (scheduleId: string, mailerId: string, dayOfWeek: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const assignment = getAssignment(scheduleId, mailerId, dayOfWeek);
        if (assignment?.taskCode) {
            setCopiedCell({ taskCode: assignment.taskCode, taskColor: assignment.taskColor || '#E0E0E0' });
        }
    };

    // Paste cell content
    const handlePasteCell = async (scheduleId: string, mailerId: string, dayOfWeek: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!copiedCell || !isAdmin) return;

        try {
            const token = localStorage.getItem('auth_token');
            const assignment = {
                scheduleId,
                mailerId,
                dayOfWeek,
                taskCode: copiedCell.taskCode,
                taskColor: copiedCell.taskColor
            };

            const response = await fetch(`${API_URL}/api/planning/assignments/bulk`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ assignments: [assignment] })
            });

            if (response.ok) {
                setSchedules(prevSchedules =>
                    prevSchedules.map(schedule => {
                        if (schedule.id !== scheduleId) return schedule;

                        let newAssignments = [...schedule.assignments];
                        const existingIndex = newAssignments.findIndex(
                            a => a.mailerId === mailerId && a.dayOfWeek === dayOfWeek
                        );

                        if (existingIndex >= 0) {
                            newAssignments[existingIndex] = { ...newAssignments[existingIndex], taskCode: copiedCell.taskCode, taskColor: copiedCell.taskColor };
                        } else {
                            newAssignments.push({
                                id: `temp-${Date.now()}-${Math.random()}`,
                                scheduleId,
                                mailerId,
                                dayOfWeek,
                                taskCode: copiedCell.taskCode,
                                taskColor: copiedCell.taskColor
                            } as PlanningAssignment);
                        }
                        return { ...schedule, assignments: newAssignments };
                    })
                );
            }
        } catch (error) {
            console.error('Error pasting cell:', error);
        }
    };

    // Paste to all selected cells
    const handlePasteToSelectedCells = async () => {
        if (!copiedCell || !isAdmin || selectedCells.size === 0) return;

        try {
            const token = localStorage.getItem('auth_token');

            const assignments = Array.from(selectedCells).map((cellKey: string) => {
                const [scheduleId, mailerId, dayOfWeek] = cellKey.split('_');
                return {
                    scheduleId,
                    mailerId,
                    dayOfWeek: parseInt(dayOfWeek),
                    taskCode: copiedCell.taskCode,
                    taskColor: copiedCell.taskColor
                };
            });

            const response = await fetch(`${API_URL}/api/planning/assignments/bulk`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ assignments })
            });

            if (response.ok) {
                // Update state locally
                setSchedules(prevSchedules =>
                    prevSchedules.map(schedule => {
                        const scheduleAssignments = assignments.filter(a => a.scheduleId === schedule.id);
                        if (scheduleAssignments.length === 0) return schedule;

                        let newAssignments = [...schedule.assignments];
                        scheduleAssignments.forEach(newAssignment => {
                            const existingIndex = newAssignments.findIndex(
                                a => a.mailerId === newAssignment.mailerId && a.dayOfWeek === newAssignment.dayOfWeek
                            );
                            if (existingIndex >= 0) {
                                newAssignments[existingIndex] = { ...newAssignments[existingIndex], taskCode: copiedCell.taskCode, taskColor: copiedCell.taskColor };
                            } else {
                                newAssignments.push({
                                    id: `temp-${Date.now()}-${Math.random()}`,
                                    scheduleId: schedule.id,
                                    mailerId: newAssignment.mailerId,
                                    dayOfWeek: newAssignment.dayOfWeek,
                                    taskCode: copiedCell.taskCode,
                                    taskColor: copiedCell.taskColor
                                } as PlanningAssignment);
                            }
                        });
                        return { ...schedule, assignments: newAssignments };
                    })
                );
                setSelectedCells(new Set()); // Clear selection after paste
            } else {
                const errorData = await response.json();
                console.error('Server error details:', errorData);
                alert(`Failed to paste: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error pasting to selected cells:', error);
        }
    };

    // Apply selected preset to all selected cells
    const applyPresetToSelectedCells = async (presetToApply?: EntityPreset) => {
        const preset = presetToApply || selectedPreset;
        if (!preset || !isAdmin || selectedCells.size === 0) return;

        try {
            const token = localStorage.getItem('auth_token');
            const taskCode = selectedPreset.codes.join('-');
            const taskColor = selectedPreset.color;

            const assignments = Array.from(selectedCells).map((cellKey: string) => {
                const [scheduleId, mailerId, dayOfWeek] = cellKey.split('_');
                return {
                    scheduleId,
                    mailerId,
                    dayOfWeek: parseInt(dayOfWeek),
                    taskCode,
                    taskColor
                };
            });

            const response = await fetch(`${API_URL}/api/planning/assignments/bulk`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ assignments })
            });

            if (response.ok) {
                // Update state locally
                setSchedules(prevSchedules =>
                    prevSchedules.map(schedule => {
                        const scheduleAssignments = assignments.filter(a => a.scheduleId === schedule.id);
                        if (scheduleAssignments.length === 0) return schedule;

                        let newAssignments = [...schedule.assignments];
                        scheduleAssignments.forEach(newAssignment => {
                            const existingIndex = newAssignments.findIndex(
                                a => a.mailerId === newAssignment.mailerId && a.dayOfWeek === newAssignment.dayOfWeek
                            );
                            if (existingIndex >= 0) {
                                newAssignments[existingIndex] = { ...newAssignments[existingIndex], taskCode, taskColor };
                            } else {
                                newAssignments.push({
                                    id: `temp-${Date.now()}-${Math.random()}`,
                                    scheduleId: schedule.id,
                                    mailerId: newAssignment.mailerId,
                                    dayOfWeek: newAssignment.dayOfWeek,
                                    taskCode,
                                    taskColor
                                } as PlanningAssignment);
                            }
                        });
                        return { ...schedule, assignments: newAssignments };
                    })
                );
                setSelectedCells(new Set()); // Clear selection after applying
            } else {
                const errorData = await response.json();
                alert(`Failed to apply preset: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error applying preset to selected cells:', error);
        }
    };

    const handleCellMouseDown = (scheduleId: string, mailerId: string, dayOfWeek: number, event: React.MouseEvent) => {
        if (!isAdmin || editingCell) return;

        // Prevent text selection while dragging
        if (event.detail > 1) event.preventDefault();

        setIsDragging(true);
        setDragStartCell({ scheduleId, mailerId, dayOfWeek });

        const cellKey = getCellKey(scheduleId, mailerId, dayOfWeek);

        if (event.shiftKey && lastClickedCell && lastClickedCell.scheduleId === scheduleId) {
            // Shift+Click: Select range (reuse existing logic)
            handleCellClick(scheduleId, mailerId, dayOfWeek, event);
        } else if (event.ctrlKey || event.metaKey) {
            // Multi-select with Ctrl/Cmd
            const newSelected = new Set(selectedCells);
            if (newSelected.has(cellKey)) {
                newSelected.delete(cellKey);
            } else {
                newSelected.add(cellKey);
            }
            setSelectedCells(newSelected);
        } else {
            // Single select / Start new drag selection
            setSelectedCells(new Set([cellKey]));
        }

        setLastClickedCell({ scheduleId, mailerId, dayOfWeek });
    };

    const handleCellMouseEnter = (scheduleId: string, mailerId: string, dayOfWeek: number) => {
        if (!isDragging || !dragStartCell || !isAdmin || editingCell) return;
        if (dragStartCell.scheduleId !== scheduleId) return;

        // Range selection logic for dragging
        const allMailers: string[] = [];
        teams.forEach(team => {
            team.mailers.forEach(mailer => {
                allMailers.push(mailer.id);
            });
        });

        const startMailerIdx = allMailers.indexOf(dragStartCell.mailerId);
        const endMailerIdx = allMailers.indexOf(mailerId);

        if (startMailerIdx === -1 || endMailerIdx === -1) return;

        const mStart = Math.min(startMailerIdx, endMailerIdx);
        const mEnd = Math.max(startMailerIdx, endMailerIdx);
        const dStart = Math.min(dragStartCell.dayOfWeek, dayOfWeek);
        const dEnd = Math.max(dragStartCell.dayOfWeek, dayOfWeek);

        const newSelected = new Set<string>();
        // If we want to support Ctrl + Drag, we'd merge with existing selection.
        // For now, let's keep it simple: drag creates a new range selection.
        for (let i = mStart; i <= mEnd; i++) {
            for (let j = dStart; j <= dEnd; j++) {
                newSelected.add(getCellKey(scheduleId, allMailers[i], j));
            }
        }
        setSelectedCells(newSelected);
    };

    const handleCellClick = async (scheduleId: string, mailerId: string, dayOfWeek: number, event: React.MouseEvent) => {
        if (!isAdmin) return;

        // If in editing mode, don't do selection
        if (editingCell) return;

        const cellKey = getCellKey(scheduleId, mailerId, dayOfWeek);
        const newSelected = new Set(selectedCells);

        if (event.shiftKey && lastClickedCell && lastClickedCell.scheduleId === scheduleId) {
            // Shift+Click: Select range of cells
            // Get all mailers in order to determine the range
            const allMailers: { mailerId: string; teamId: string }[] = [];
            teams.forEach(team => {
                team.mailers.forEach(mailer => {
                    allMailers.push({ mailerId: mailer.id, teamId: team.id });
                });
            });

            // Find indices of last clicked and current cell
            const lastMailerIdx = allMailers.findIndex(m => m.mailerId === lastClickedCell.mailerId);
            const currentMailerIdx = allMailers.findIndex(m => m.mailerId === mailerId);

            if (lastMailerIdx !== -1 && currentMailerIdx !== -1) {
                const startMailerIdx = Math.min(lastMailerIdx, currentMailerIdx);
                const endMailerIdx = Math.max(lastMailerIdx, currentMailerIdx);
                const startDay = Math.min(lastClickedCell.dayOfWeek, dayOfWeek);
                const endDay = Math.max(lastClickedCell.dayOfWeek, dayOfWeek);

                // Select all cells in the range
                for (let mIdx = startMailerIdx; mIdx <= endMailerIdx; mIdx++) {
                    for (let d = startDay; d <= endDay; d++) {
                        const key = getCellKey(scheduleId, allMailers[mIdx].mailerId, d);
                        newSelected.add(key);
                    }
                }
            }
        } else if (event.ctrlKey || event.metaKey) {
            // Multi-select with Ctrl/Cmd
            if (newSelected.has(cellKey)) {
                newSelected.delete(cellKey);
            } else {
                newSelected.add(cellKey);
            }
        } else {
            // Single select
            newSelected.clear();
            newSelected.add(cellKey);
        }

        // Update last clicked cell for shift-click
        setLastClickedCell({ scheduleId, mailerId, dayOfWeek });
        setSelectedCells(newSelected);
    };

    const handleCellDoubleClick = (scheduleId: string, mailerId: string, dayOfWeek: number, currentTask: string) => {
        if (!isAdmin) return;
        const cellKey = getCellKey(scheduleId, mailerId, dayOfWeek);
        setEditingCell(cellKey);
        setEditValue(currentTask || '');
    };

    const handleCellSave = async (scheduleId: string, mailerId: string, dayOfWeek: number) => {
        if (!isAdmin) return;

        try {
            const token = localStorage.getItem('auth_token');
            const taskCode = editValue.trim();
            const taskColor = TASK_COLORS[taskCode] || TASK_COLORS['default'];

            // If empty, we might want to delete the assignment or just clear the code
            // The backend handles empty taskCode as deletion if we send it that way

            const assignment = {
                scheduleId,
                mailerId,
                dayOfWeek,
                taskCode,
                taskColor
            };

            const response = await fetch(`${API_URL}/api/planning/assignments/bulk`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ assignments: [assignment] })
            });

            if (response.ok) {
                setSchedules(prevSchedules =>
                    prevSchedules.map(schedule => {
                        if (schedule.id !== scheduleId) return schedule;

                        let newAssignments = [...schedule.assignments];
                        const existingIndex = newAssignments.findIndex(
                            a => a.mailerId === mailerId && a.dayOfWeek === dayOfWeek
                        );

                        if (existingIndex >= 0) {
                            if (!taskCode) {
                                // Remove assignment if empty
                                newAssignments = newAssignments.filter((_, idx) => idx !== existingIndex);
                            } else {
                                newAssignments[existingIndex] = { ...newAssignments[existingIndex], taskCode, taskColor };
                            }
                        } else if (taskCode) {
                            newAssignments.push({
                                id: `temp-${Date.now()}-${Math.random()}`,
                                scheduleId,
                                mailerId,
                                dayOfWeek,
                                taskCode,
                                taskColor
                            } as PlanningAssignment);
                        }
                        return { ...schedule, assignments: newAssignments };
                    })
                );
            }
        } catch (error) {
            console.error('Error saving cell:', error);
        } finally {
            setEditingCell(null);
            setEditValue('');
        }
    };

    const handleDragStart = (preset: EntityPreset, e: React.DragEvent) => {
        if (!isAdmin) return;
        console.log('Drag started:', preset);
        setDraggedEntity(preset);
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', JSON.stringify(preset));
    };

    const handleDragOver = (event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = async (scheduleId: string, mailerId: string, dayOfWeek: number, e: React.DragEvent) => {
        e.preventDefault();
        console.log('Drop event fired', { scheduleId, mailerId, dayOfWeek });

        if (!isAdmin) {
            console.log('Not admin, ignoring drop');
            return;
        }

        let preset: EntityPreset | null = draggedEntity;

        // Try to get from dataTransfer if state is null
        if (!preset) {
            try {
                const data = e.dataTransfer.getData('text/plain');
                console.log('Data from transfer:', data);
                if (data) {
                    preset = JSON.parse(data);
                }
            } catch (err) {
                console.error('Error parsing drag data', err);
            }
        }

        if (!preset) {
            console.log('No preset found in drop');
            return;
        }

        console.log('Processing drop for preset:', preset);

        try {
            const token = localStorage.getItem('auth_token');
            const taskCode = preset.codes.join('-');
            const taskColor = preset.color;
            const targetCellKey = `${scheduleId}_${mailerId}_${dayOfWeek}`;

            // Determine which cells to update
            const cellsToUpdate = selectedCells.has(targetCellKey)
                ? Array.from(selectedCells)
                : [targetCellKey];

            const assignments = cellsToUpdate.map((cellKey: string) => {
                const [sId, mId, dIdx] = cellKey.split('_');
                return {
                    scheduleId: sId,
                    mailerId: mId,
                    dayOfWeek: parseInt(dIdx),
                    taskCode,
                    taskColor
                };
            });

            const response = await fetch(`${API_URL}/api/planning/assignments/bulk`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ assignments })
            });

            if (response.ok) {
                setSchedules(prevSchedules =>
                    prevSchedules.map(schedule => {
                        const scheduleAssignments = assignments.filter(a => a.scheduleId === schedule.id);
                        if (scheduleAssignments.length === 0) return schedule;

                        let newAssignments = [...schedule.assignments];
                        scheduleAssignments.forEach(newAssignment => {
                            const existingIndex = newAssignments.findIndex(
                                a => a.mailerId === newAssignment.mailerId && a.dayOfWeek === newAssignment.dayOfWeek
                            );
                            if (existingIndex >= 0) {
                                newAssignments[existingIndex] = { ...newAssignments[existingIndex], taskCode, taskColor };
                            } else {
                                newAssignments.push({
                                    id: `temp-${Date.now()}-${Math.random()}`,
                                    scheduleId: schedule.id,
                                    mailerId: newAssignment.mailerId,
                                    dayOfWeek: newAssignment.dayOfWeek,
                                    taskCode,
                                    taskColor
                                } as PlanningAssignment);
                            }
                        });
                        return { ...schedule, assignments: newAssignments };
                    })
                );
                setDraggedEntity(null);
            } else {
                const errorData = await response.json();
                console.error('Server error details:', errorData);
                const details = Array.isArray(errorData.details)
                    ? errorData.details.map((d: any) => d.error || JSON.stringify(d)).join('\n')
                    : (errorData.details || errorData.error || 'Unknown error');
                alert(`Failed to assign task:\n${details}`);
            }
        } catch (error) {
            console.error('Error assigning task:', error);
        }
    };

    const handleBulkUpdate = async () => {
        if (!isAdmin || selectedCells.size === 0) return;

        try {
            const token = localStorage.getItem('auth_token');
            const taskColor = TASK_COLORS[bulkTaskInput] || TASK_COLORS['default'];

            const assignments = Array.from(selectedCells).map((cellKey: string) => {
                const [scheduleId, mailerId, dayOfWeek] = cellKey.split('_');
                return {
                    scheduleId,
                    mailerId,
                    dayOfWeek: parseInt(dayOfWeek),
                    taskCode: bulkTaskInput,
                    taskColor
                };
            });

            const response = await fetch(`${API_URL}/api/planning/assignments/bulk`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ assignments })
            });

            if (response.ok) {
                // Update state locally without showing loading spinner
                setSchedules(prevSchedules =>
                    prevSchedules.map(schedule => ({
                        ...schedule,
                        assignments: schedule.assignments.map(assignment => {
                            const cellKey = `${assignment.scheduleId}_${assignment.mailerId}_${assignment.dayOfWeek}`;
                            if (selectedCells.has(cellKey)) {
                                return { ...assignment, taskCode: bulkTaskInput, taskColor };
                            }
                            return assignment;
                        }).concat(
                            // Add new assignments for cells that didn't exist
                            assignments
                                .filter(a => a.scheduleId === schedule.id)
                                .filter(a => !schedule.assignments.some(
                                    existing => existing.mailerId === a.mailerId && existing.dayOfWeek === a.dayOfWeek
                                ))
                                .map(a => ({
                                    id: `temp-${Date.now()}-${Math.random()}`,
                                    ...a,
                                    scheduleId: schedule.id
                                } as PlanningAssignment))
                        )
                    }))
                );
                setSelectedCells(new Set());
                setShowBulkUpdateModal(false);
                setBulkTaskInput('');
            } else {
                const errorData = await response.json();
                console.error('Server error details:', errorData);
                const details = Array.isArray(errorData.details)
                    ? errorData.details.map((d: any) => d.error || JSON.stringify(d)).join('\n')
                    : (errorData.details || errorData.error || 'Unknown error');
                alert(`Failed to bulk update:\n${details}`);
            }
        } catch (error) {
            console.error('Error bulk updating:', error);
        }
    };

    // Reset planning assignments for a specific schedule (Current Week or Next Week)
    const handleResetPlanning = async (scheduleId: string, weekLabel: string) => {
        if (!isAdmin) return;
        if (!confirm(`Are you sure you want to reset ALL assignments in the ${weekLabel} table? This action cannot be undone.`)) return;

        try {
            const token = localStorage.getItem('auth_token');
            const schedule = schedules.find(s => s.id === scheduleId);

            if (!schedule) {
                alert('Schedule not found.');
                return;
            }

            // Collect all assignments to clear (set taskCode to empty)
            const assignmentsToClear = schedule.assignments.map(assignment => ({
                scheduleId: schedule.id,
                mailerId: assignment.mailerId,
                dayOfWeek: assignment.dayOfWeek,
                taskCode: '',
                taskColor: '#ffffff'
            }));

            if (assignmentsToClear.length === 0) {
                alert('No assignments to clear.');
                return;
            }

            const response = await fetch(`${API_URL}/api/planning/assignments/bulk`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ assignments: assignmentsToClear })
            });

            if (response.ok) {
                // Clear assignments from state for this schedule only
                setSchedules(prevSchedules =>
                    prevSchedules.map(s => {
                        if (s.id !== scheduleId) return s;
                        return { ...s, assignments: [] };
                    })
                );
                setSelectedCells(new Set());
            } else {
                const errorData = await response.json();
                alert(`Failed to reset: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error resetting planning:', error);
            alert('An error occurred while resetting.');
        }
    };

    // Clear a single cell assignment
    const handleClearCell = async (scheduleId: string, mailerId: string, dayOfWeek: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent cell selection
        if (!isAdmin) return;

        try {
            const token = localStorage.getItem('auth_token');
            const assignment = {
                scheduleId,
                mailerId,
                dayOfWeek,
                taskCode: '',
                taskColor: '#ffffff'
            };

            const response = await fetch(`${API_URL}/api/planning/assignments/bulk`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ assignments: [assignment] })
            });

            if (response.ok) {
                // Remove assignment from state
                setSchedules(prevSchedules =>
                    prevSchedules.map(schedule => {
                        if (schedule.id !== scheduleId) return schedule;
                        return {
                            ...schedule,
                            assignments: schedule.assignments.filter(
                                a => !(a.mailerId === mailerId && a.dayOfWeek === dayOfWeek)
                            )
                        };
                    })
                );
            }
        } catch (error) {
            console.error('Error clearing cell:', error);
        }
    };

    const formatDateRange = (start: string, end: string) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        return `${startDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`;
    };

    const getCellStyle = (scheduleId: string, mailerId: string, dayOfWeek: number, assignment?: PlanningAssignment) => {
        const cellKey = getCellKey(scheduleId, mailerId, dayOfWeek);
        const isSelected = selectedCells.has(cellKey);

        return {
            backgroundColor: assignment?.taskColor || '#ffffff',
            cursor: isAdmin ? 'pointer' : 'default',
            border: isSelected ? '3px solid #4F46E5' : '1px solid #D1D5DB',
            boxShadow: isSelected ? '0 0 0 2px rgba(79, 70, 229, 0.2)' : 'none'
        };
    };

    // Filter teams and mailers based on search and filters
    const getFilteredTeams = (schedule: PlanningSchedule, searchValue: string, teamFilter: string, statusFilter: 'all' | 'active' | 'inactive', taskFilter: string): Team[] => {
        return teams.map(team => {
            // Filter by team
            if (teamFilter && team.id !== teamFilter) {
                return { ...team, mailers: [] };
            }

            // Filter mailers within the team
            const filteredMailers = team.mailers.filter(mailer => {
                // Search by mailer name
                if (searchValue && !mailer.name.toLowerCase().includes(searchValue.toLowerCase())) {
                    return false;
                }

                // Filter by status
                if (statusFilter === 'active' && !mailer.isActive) {
                    return false;
                }
                if (statusFilter === 'inactive' && mailer.isActive) {
                    return false;
                }

                // Filter by task type - check if mailer has any assignments with the task code
                if (taskFilter) {
                    const hasTask = schedule.assignments.some(
                        a => a.mailerId === mailer.id && a.taskCode && a.taskCode.toLowerCase().includes(taskFilter.toLowerCase())
                    );
                    if (!hasTask) {
                        return false;
                    }
                }

                return true;
            });

            return { ...team, mailers: filteredMailers };
        }).filter(team => team.mailers.length > 0);
    };

    // Get unique task codes from assignments for the filter dropdown
    const getAllTaskCodes = (): string[] => {
        const taskCodes = new Set<string>();
        schedules.forEach(schedule => {
            schedule.assignments.forEach(a => {
                if (a.taskCode) {
                    taskCodes.add(a.taskCode);
                }
            });
        });
        return Array.from(taskCodes).sort();
    };

    // Export to XLSX function
    const exportToXLSX = (schedule: PlanningSchedule, filteredTeams: Team[], weekLabel: string) => {
        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();

        // Create data array for the worksheet
        const wsData: (string | undefined)[][] = [];

        // Header row
        wsData.push(['Team', 'Mailer', ...DAYS]);

        // Data rows
        filteredTeams.forEach(team => {
            team.mailers.forEach((mailer, idx) => {
                const row: (string | undefined)[] = [];

                // Team name (only on first mailer of team)
                if (idx === 0) {
                    row.push(team.displayName);
                } else {
                    row.push('');
                }

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

        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Set column widths
        ws['!cols'] = [
            { wch: 20 }, // Team
            { wch: 25 }, // Mailer
            { wch: 15 }, // Monday
            { wch: 15 }, // Tuesday
            { wch: 15 }, // Wednesday
            { wch: 15 }, // Thursday
            { wch: 15 }, // Friday
            { wch: 15 }, // Saturday
            { wch: 15 }, // Sunday
        ];

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, weekLabel);

        // Generate filename with date
        const dateStr = formatDateRange(schedule.weekStart, schedule.weekEnd).replace(/\//g, '-');
        const filename = `TeamPlanning_${weekLabel.replace(' ', '_')}_${dateStr}.xlsx`;

        // Export
        XLSX.writeFile(wb, filename);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 font-semibold">Loading planning data...</p>
                </div>
            </div>
        );
    }

    const currentWeek = schedules.find(s => s.isCurrent);
    const nextWeek = schedules.find(s => s.isNext);

    return (
        <div className="min-h-screen bg-gray-50 p-6 font-sans text-gray-900">
            <div className="max-w-[1920px] mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8 transition-all hover:shadow-md">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
                                📅 Team Planning
                            </h1>
                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>
                                    {isAdmin ? 'Admin Access' : 'Viewer Access'}
                                </span>
                                <p className="text-sm text-gray-500">Manage schedules and assignments efficiently.</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {isAdmin && (
                                <>
                                    <button
                                        onClick={initializeWeeks}
                                        className="flex items-center gap-2 px-3 h-9 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 rounded-lg font-medium transition-all duration-200 shadow-sm active:scale-95 text-xs"
                                    >
                                        <span>🔄</span> Initialize
                                    </button>

                                    <button
                                        onClick={() => {
                                            setShowHistory(!showHistory);
                                            if (!showHistory) fetchHistory();
                                        }}
                                        className="flex items-center gap-2 px-3 h-9 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 rounded-lg font-medium transition-all duration-200 shadow-sm active:scale-95 text-xs"
                                    >
                                        <span>{showHistory ? '📊' : '📜'}</span> {showHistory ? 'Current View' : 'History'}
                                    </button>

                                    <button
                                        onClick={() => setShowManageModal(true)}
                                        className="flex items-center gap-2 px-3 h-9 bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 rounded-lg font-medium transition-all duration-200 shadow-sm active:scale-95 text-xs"
                                    >
                                        <span>⚙️</span> Manage
                                    </button>

                                    {selectedCells.size > 0 && (
                                        <button
                                            onClick={() => setShowBulkUpdateModal(true)}
                                            className="flex items-center gap-2 px-3 h-9 bg-white border border-gray-200 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 rounded-lg font-medium transition-all duration-200 shadow-sm active:scale-95 animate-pulse text-xs"
                                        >
                                            <span>✏️</span> Update ({selectedCells.size})
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Entity Presets - Draggable and Clickable */}
                {isAdmin && !showHistory && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <span>🎯</span> Quick Assign
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">Click a preset to enable click-to-fill mode, or drag to cells.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedPreset && (
                                    <button
                                        onClick={() => setSelectedPreset(null)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-md text-xs font-medium transition-all border border-red-200 shadow-sm"
                                    >
                                        <span>✕</span> Deselect
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowPresetModal(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-600 rounded-md text-xs font-medium transition-all border border-gray-200 shadow-sm hover:border-gray-300"
                                >
                                    <span>⚙️</span> Customize
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {presets.map((preset) => {
                                const isSelected = selectedPreset?.label === preset.label;
                                return (
                                    <div
                                        key={preset.label}
                                        draggable={isAdmin}
                                        onDragStart={(e) => handleDragStart(preset, e)}
                                        onClick={() => {
                                            if (selectedCells.size > 0) {
                                                applyPresetToSelectedCells(preset);
                                            } else {
                                                if (selectedPreset?.label === preset.label) {
                                                    setSelectedPreset(null); // Deselect if already selected
                                                } else {
                                                    setSelectedPreset(preset); // Select this preset
                                                }
                                            }
                                        }}
                                        className={`group relative px-4 py-2 rounded-lg font-semibold shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 select-none ${isSelected
                                            ? 'ring-2 ring-indigo-500 ring-offset-2 border-2 border-indigo-400'
                                            : 'border border-black/5'
                                            }`}
                                        style={{ backgroundColor: preset.color, color: '#1f2937' }}
                                        title={isSelected ? 'Click to deselect' : 'Click to select for quick assign'}
                                    >
                                        {isSelected && (
                                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow">
                                                ✓
                                            </span>
                                        )}
                                        <span className="w-1.5 h-1.5 rounded-full bg-black/20"></span>
                                        <span className="text-sm">{preset.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                        {selectedPreset && (
                            <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                                <p className="text-sm text-indigo-700 font-medium flex items-center gap-2">
                                    <span className="text-lg">🎯</span>
                                    <span>Quick Assign Active: Select cells and press <strong>Enter</strong> to apply <strong>{selectedPreset.label}</strong></span>
                                </p>
                                {selectedCells.size > 0 && (
                                    <button
                                        onClick={applyPresetToSelectedCells}
                                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-md shadow-sm transition-all flex items-center gap-2"
                                    >
                                        <span>📥</span> Apply to {selectedCells.size} cell{selectedCells.size > 1 ? 's' : ''} (Enter)
                                    </button>
                                )}
                            </div>
                        )}
                        <div className="mt-4 flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                    Ctrl + Click
                                </span>
                                <span className="text-xs text-gray-500">to toggle individual cells</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                    Shift + Click
                                </span>
                                <span className="text-xs text-gray-500">to select a range of cells</span>
                            </div>
                            {copiedCell && (
                                <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md">
                                    <span className="text-xs text-blue-700 font-medium">📋 Copied: {copiedCell.taskCode}</span>
                                    {selectedCells.size > 0 && (
                                        <button
                                            onClick={handlePasteToSelectedCells}
                                            className="ml-2 px-2 py-0.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded transition-colors"
                                            title={`Paste to ${selectedCells.size} selected cell(s)`}
                                        >
                                            📥 Paste to {selectedCells.size} cell{selectedCells.size > 1 ? 's' : ''}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Planning Grid */}
                {!showHistory && (
                    <div className="space-y-8">
                        {[currentWeek, nextWeek].map((schedule) => {
                            if (!schedule) return null;

                            const isVisible = schedule.isCurrent ? showCurrentWeek : showNextWeek;
                            const toggleVisibility = () => {
                                if (schedule.isCurrent) {
                                    setShowCurrentWeek(!showCurrentWeek);
                                } else {
                                    setShowNextWeek(!showNextWeek);
                                }
                            };

                            // Get filter values based on current/next week
                            const searchValue = schedule.isCurrent ? currentWeekSearch : nextWeekSearch;
                            const setSearchValue = schedule.isCurrent ? setCurrentWeekSearch : setNextWeekSearch;
                            const teamFilter = schedule.isCurrent ? currentWeekTeamFilter : nextWeekTeamFilter;
                            const setTeamFilter = schedule.isCurrent ? setCurrentWeekTeamFilter : setNextWeekTeamFilter;
                            const statusFilter = schedule.isCurrent ? currentWeekStatusFilter : nextWeekStatusFilter;
                            const setStatusFilter = schedule.isCurrent ? setCurrentWeekStatusFilter : setNextWeekStatusFilter;
                            const taskFilter = schedule.isCurrent ? currentWeekTaskFilter : nextWeekTaskFilter;
                            const setTaskFilter = schedule.isCurrent ? setCurrentWeekTaskFilter : setNextWeekTaskFilter;

                            // Get filtered teams
                            const filteredTeams = getFilteredTeams(schedule, searchValue, teamFilter, statusFilter, taskFilter);
                            const allTaskCodes = getAllTaskCodes();

                            return (
                                <div key={schedule.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 min-w-full w-fit">
                                    <div className={`px-6 py-4 border-b border-gray-100 flex items-center justify-between ${schedule.isCurrent ? 'bg-gradient-to-r from-emerald-50 to-white' : 'bg-gradient-to-r from-blue-50 to-white'}`}>
                                        <div className="flex items-center gap-3 cursor-pointer" onClick={toggleVisibility}>
                                            <span className={`text-2xl ${schedule.isCurrent ? 'text-emerald-600' : 'text-blue-600'}`}>
                                                {schedule.isCurrent ? '📍' : '➡️'}
                                            </span>
                                            <div>
                                                <h2 className={`text-lg font-bold ${schedule.isCurrent ? 'text-emerald-900' : 'text-blue-900'}`}>
                                                    {schedule.isCurrent ? 'Current Week' : 'Next Week'}
                                                </h2>
                                                <p className={`text-sm font-medium ${schedule.isCurrent ? 'text-emerald-600' : 'text-blue-600'}`}>
                                                    {formatDateRange(schedule.weekStart, schedule.weekEnd)}
                                                </p>
                                            </div>
                                            {/* Collapse/Expand indicator */}
                                            <svg
                                                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isVisible ? 'rotate-0' : '-rotate-90'}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* Export Button */}
                                            <button
                                                onClick={() => exportToXLSX(schedule, filteredTeams, schedule.isCurrent ? 'Current Week' : 'Next Week')}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 rounded-md text-xs font-medium transition-all shadow-sm"
                                                title={`Export ${schedule.isCurrent ? 'Current Week' : 'Next Week'} to Excel`}
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                                Export XLSX
                                            </button>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => handleResetPlanning(schedule.id, schedule.isCurrent ? 'Current Week' : 'Next Week')}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-md text-xs font-medium transition-all shadow-sm"
                                                    title={`Reset all assignments in ${schedule.isCurrent ? 'Current Week' : 'Next Week'}`}
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    Reset
                                                </button>
                                            )}
                                            <button
                                                onClick={toggleVisibility}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-medium transition-all shadow-sm ${isVisible
                                                    ? 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                                                    : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                                                    }`}
                                                title={isVisible ? 'Hide table' : 'Show table'}
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    {isVisible ? (
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                    ) : (
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    )}
                                                </svg>
                                                {isVisible ? 'Hide' : 'Show'}
                                            </button>
                                        </div>
                                    </div>

                                    {isVisible && (
                                        <div className="">
                                            {/* Filter Bar */}
                                            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center gap-3">
                                                {/* Search by Mailer Name */}
                                                <div className="relative">
                                                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                    <input
                                                        type="text"
                                                        value={searchValue}
                                                        onChange={(e) => setSearchValue(e.target.value)}
                                                        placeholder="Search mailer..."
                                                        className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-40"
                                                    />
                                                </div>

                                                {/* Filter by Team */}
                                                <select
                                                    value={teamFilter}
                                                    onChange={(e) => setTeamFilter(e.target.value)}
                                                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                                                >
                                                    <option value="">All Teams</option>
                                                    {teams.map(team => (
                                                        <option key={team.id} value={team.id}>{team.displayName}</option>
                                                    ))}
                                                </select>

                                                {/* Filter by Status */}
                                                <select
                                                    value={statusFilter}
                                                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                                                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                                                >
                                                    <option value="all">All Status</option>
                                                    <option value="active">Active Only</option>
                                                    <option value="inactive">Inactive Only</option>
                                                </select>

                                                {/* Filter by Task Type */}
                                                <select
                                                    value={taskFilter}
                                                    onChange={(e) => setTaskFilter(e.target.value)}
                                                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                                                >
                                                    <option value="">All Tasks</option>
                                                    {allTaskCodes.map(code => (
                                                        <option key={code} value={code}>{code}</option>
                                                    ))}
                                                </select>

                                                {/* Clear Filters */}
                                                {(searchValue || teamFilter || statusFilter !== 'all' || taskFilter) && (
                                                    <button
                                                        onClick={() => {
                                                            setSearchValue('');
                                                            setTeamFilter('');
                                                            setStatusFilter('all');
                                                            setTaskFilter('');
                                                        }}
                                                        className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                                    >
                                                        Clear Filters
                                                    </button>
                                                )}

                                                {/* Result Count */}
                                                <span className="text-xs text-gray-500 ml-auto">
                                                    Showing {filteredTeams.reduce((acc, t) => acc + t.mailers.length, 0)} mailers
                                                </span>
                                            </div>

                                            <table className="w-full border-collapse border border-gray-300">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-300">
                                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 border border-gray-300 shadow-sm">Team</th>
                                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider sticky left-[100px] bg-gray-50 z-20 border border-gray-300 shadow-sm whitespace-nowrap">Mailer</th>
                                                        {DAYS.map((day) => (
                                                            <th key={day} className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[100px] border border-gray-300">
                                                                {day}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {filteredTeams.map((team) => (
                                                        <React.Fragment key={team.id}>
                                                            {team.mailers.map((mailer, mailerIdx) => (
                                                                <tr key={mailer.id} className="hover:bg-gray-50 transition-colors group">
                                                                    {mailerIdx === 0 && (
                                                                        <td
                                                                            rowSpan={team.mailers.length}
                                                                            className="px-4 py-3 text-sm font-bold text-gray-800 bg-white sticky left-0 z-10 border border-gray-300 shadow-sm align-top"
                                                                        >
                                                                            <div className="flex items-center gap-2 mt-1">
                                                                                <div className="w-1 h-4 rounded-full" style={{ backgroundColor: team.color || '#ccc' }}></div>
                                                                                {team.displayName}
                                                                            </div>
                                                                        </td>
                                                                    )}
                                                                    <td className="px-4 py-3 text-sm font-medium text-gray-600 bg-white sticky left-[100px] z-10 border border-gray-300 shadow-sm whitespace-nowrap">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className={`w-2 h-2 rounded-full ${mailer.isActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                                                            {mailer.name}
                                                                        </div>
                                                                    </td>
                                                                    {DAYS.map((_, dayIdx) => {
                                                                        const assignment = getAssignment(schedule.id, mailer.id, dayIdx);
                                                                        const cellKey = getCellKey(schedule.id, mailer.id, dayIdx);
                                                                        const isSelected = selectedCells.has(cellKey);

                                                                        return (
                                                                            <td
                                                                                key={dayIdx}
                                                                                className={`px-2 py-2 text-center text-xs font-semibold transition-all duration-150 border border-gray-300 relative ${isAdmin ? 'cursor-pointer' : 'cursor-default'}`}
                                                                                style={{
                                                                                    backgroundColor: assignment?.taskColor || (isSelected ? '#EEF2FF' : 'transparent'),
                                                                                    boxShadow: isSelected ? 'inset 0 0 0 2px #4F46E5' : 'none'
                                                                                }}
                                                                                onMouseDown={(e) => handleCellMouseDown(schedule.id, mailer.id, dayIdx, e)}
                                                                                onMouseEnter={() => handleCellMouseEnter(schedule.id, mailer.id, dayIdx)}
                                                                                onDoubleClick={() => handleCellDoubleClick(schedule.id, mailer.id, dayIdx, assignment?.taskCode || '')}
                                                                                onDragOver={handleDragOver}
                                                                                onDrop={(e) => handleDrop(schedule.id, mailer.id, dayIdx, e)}
                                                                            >
                                                                                {editingCell === cellKey ? (
                                                                                    <input
                                                                                        type="text"
                                                                                        value={editValue}
                                                                                        onChange={(e) => setEditValue(e.target.value)}
                                                                                        onBlur={() => handleCellSave(schedule.id, mailer.id, dayIdx)}
                                                                                        onKeyDown={(e) => {
                                                                                            if (e.key === 'Enter') {
                                                                                                handleCellSave(schedule.id, mailer.id, dayIdx);
                                                                                            } else if (e.key === 'Escape') {
                                                                                                setEditingCell(null);
                                                                                                setEditValue('');
                                                                                            }
                                                                                        }}
                                                                                        autoFocus
                                                                                        className="w-full h-full px-1 py-1 text-xs text-center border-none focus:ring-2 focus:ring-indigo-500 rounded bg-white"
                                                                                    />
                                                                                ) : (
                                                                                    assignment?.taskCode ? (
                                                                                        <div className="relative group/cell">
                                                                                            <span className="inline-block w-full py-1.5 px-2 rounded-md shadow-sm bg-white bg-opacity-40 backdrop-blur-sm whitespace-nowrap">
                                                                                                {assignment.taskCode}
                                                                                            </span>
                                                                                            {isAdmin && (
                                                                                                <>
                                                                                                    {/* Copy button */}
                                                                                                    <button
                                                                                                        onClick={(e) => handleCopyCell(schedule.id, mailer.id, dayIdx, e)}
                                                                                                        className="absolute -top-1 -left-1 w-4 h-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity text-[8px] font-bold shadow-sm"
                                                                                                        title="Copy cell"
                                                                                                    >
                                                                                                        📋
                                                                                                    </button>
                                                                                                    {/* Clear button */}
                                                                                                    <button
                                                                                                        onClick={(e) => handleClearCell(schedule.id, mailer.id, dayIdx, e)}
                                                                                                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity text-[10px] font-bold shadow-sm"
                                                                                                        title="Clear assignment"
                                                                                                    >
                                                                                                        ×
                                                                                                    </button>
                                                                                                    {/* Paste button (only if something is copied) */}
                                                                                                    {copiedCell && copiedCell.taskCode !== assignment.taskCode && (
                                                                                                        <button
                                                                                                            onClick={(e) => handlePasteCell(schedule.id, mailer.id, dayIdx, e)}
                                                                                                            className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity text-[8px] font-bold shadow-sm"
                                                                                                            title={`Paste: ${copiedCell.taskCode}`}
                                                                                                        >
                                                                                                            📥
                                                                                                        </button>
                                                                                                    )}
                                                                                                </>
                                                                                            )}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="relative group/cell w-full h-full min-h-[24px]">
                                                                                            {/* Paste button for empty cells */}
                                                                                            {isAdmin && copiedCell ? (
                                                                                                <button
                                                                                                    onClick={(e) => handlePasteCell(schedule.id, mailer.id, dayIdx, e)}
                                                                                                    className="opacity-0 group-hover/cell:opacity-100 transition-opacity text-gray-400 hover:text-green-500 text-[10px]"
                                                                                                    title={`Paste: ${copiedCell.taskCode}`}
                                                                                                >
                                                                                                    📥 Paste
                                                                                                </button>
                                                                                            ) : (
                                                                                                <span className="opacity-0 group-hover:opacity-100 text-gray-300 text-[10px]">+</span>
                                                                                            )}
                                                                                        </div>
                                                                                    )
                                                                                )}
                                                                            </td>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            ))}
                                                        </React.Fragment>
                                                    ))}
                                                    {filteredTeams.length === 0 && (
                                                        <tr>
                                                            <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                                                                No mailers match the current filters
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Historical View */}
                {showHistory && isAdmin && (
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">📜 Historical Planning (3 Months)</h2>
                        <div className="space-y-6">
                            {historicalSchedules.map((schedule) => (
                                <div key={schedule.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="bg-purple-600 p-3">
                                        <h3 className="text-lg font-bold text-white">
                                            Week {schedule.weekNumber}, {schedule.year} - {formatDateRange(schedule.weekStart, schedule.weekEnd)}
                                        </h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="bg-gray-200">
                                                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-bold">Team</th>
                                                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-bold">Mailer</th>
                                                    {DAYS.map((day) => (
                                                        <th key={day} className="border border-gray-300 px-3 py-2 text-center text-sm font-bold">
                                                            {day.substring(0, 3)}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {teams.map((team) => (
                                                    <React.Fragment key={team.id}>
                                                        {team.mailers.map((mailer, mailerIdx) => (
                                                            <tr key={mailer.id}>
                                                                {mailerIdx === 0 && (
                                                                    <td
                                                                        rowSpan={team.mailers.length}
                                                                        className="border border-gray-300 px-3 py-2 text-sm font-bold bg-gray-100"
                                                                    >
                                                                        {team.displayName}
                                                                    </td>
                                                                )}
                                                                <td className="border border-gray-300 px-3 py-2 text-sm">
                                                                    {mailer.name}
                                                                </td>
                                                                {DAYS.map((_, dayIdx) => {
                                                                    const assignment = schedule.assignments.find(
                                                                        a => a.mailerId === mailer.id && a.dayOfWeek === dayIdx
                                                                    );

                                                                    return (
                                                                        <td
                                                                            key={dayIdx}
                                                                            className="border border-gray-300 px-2 py-2 text-center text-xs"
                                                                            style={{ backgroundColor: assignment?.taskColor || '#ffffff' }}
                                                                        >
                                                                            {assignment?.taskCode || ''}
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        ))}
                                                    </React.Fragment>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Bulk Update Modal */}
                {showBulkUpdateModal && isAdmin && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-gray-200 animate-in fade-in zoom-in duration-200">
                            <div className="px-6 py-5 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                        <span className="text-xl">✏️</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">Bulk Update</h3>
                                        <p className="text-sm text-gray-500">Editing {selectedCells.size} selected {selectedCells.size === 1 ? 'cell' : 'cells'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-5">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Task Code <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={bulkTaskInput}
                                    onChange={(e) => setBulkTaskInput(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400 text-sm"
                                    placeholder="e.g., CMH3, HOTMAIL, Desktop..."
                                    autoFocus
                                />
                                <p className="mt-2 text-xs text-gray-500">Enter the task code to assign to all selected cells</p>
                            </div>

                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-xl flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowBulkUpdateModal(false);
                                        setBulkTaskInput('');
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-all text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!confirm('Are you sure you want to clear these assignments?')) return;
                                        try {
                                            const token = localStorage.getItem('auth_token');
                                            const assignments = Array.from(selectedCells).map((cellKey: string) => {
                                                const [scheduleId, mailerId, dayOfWeek] = cellKey.split('_');
                                                return {
                                                    scheduleId,
                                                    mailerId,
                                                    dayOfWeek: parseInt(dayOfWeek),
                                                    taskCode: '',
                                                    taskColor: null
                                                };
                                            });

                                            const response = await fetch(`${API_URL}/api/planning/assignments/bulk`, {
                                                method: 'POST',
                                                headers: {
                                                    'Authorization': `Bearer ${token}`,
                                                    'Content-Type': 'application/json'
                                                },
                                                body: JSON.stringify({ assignments })
                                            });

                                            if (response.ok) {
                                                setSchedules(prevSchedules =>
                                                    prevSchedules.map(schedule => ({
                                                        ...schedule,
                                                        assignments: schedule.assignments.filter(assignment => {
                                                            const cellKey = `${assignment.scheduleId}_${assignment.mailerId}_${assignment.dayOfWeek}`;
                                                            return !selectedCells.has(cellKey);
                                                        })
                                                    }))
                                                );
                                                setSelectedCells(new Set());
                                                setShowBulkUpdateModal(false);
                                                setBulkTaskInput('');
                                            }
                                        } catch (error) {
                                            console.error('Error clearing assignments:', error);
                                        }
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all text-sm"
                                >
                                    Clear
                                </button>
                                <button
                                    onClick={handleBulkUpdate}
                                    disabled={!bulkTaskInput.trim()}
                                    className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all text-sm"
                                >
                                    Update All
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Teams & Mailers Management Modal */}
                {showManageModal && isAdmin && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200">
                            {/* Header */}
                            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900">Manage Teams & Mailers</h3>
                                        <p className="text-sm text-gray-500 mt-1">Organize your team structure and members</p>
                                    </div>
                                    <button
                                        onClick={() => setShowManageModal(false)}
                                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-gray-200 px-6">
                                <button
                                    onClick={() => setManagementTab('teams')}
                                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${managementTab === 'teams'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Teams
                                </button>
                                <button
                                    onClick={() => setManagementTab('mailers')}
                                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${managementTab === 'mailers'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Mailers
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto px-6 py-5">
                                {/* Teams Tab */}
                                {managementTab === 'teams' && (
                                    <div className="space-y-5">
                                        <div className="flex justify-between items-center">
                                            <p className="text-sm text-gray-500">{teams.length} {teams.length === 1 ? 'team' : 'teams'} configured</p>
                                            {!isAddingTeam && !editingTeam && (
                                                <button
                                                    onClick={() => {
                                                        setIsAddingTeam(true);
                                                        setTeamForm({ name: '', displayName: '', color: '#6366f1', order: teams.length + 1 });
                                                    }}
                                                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
                                                >
                                                    + Add Team
                                                </button>
                                            )}
                                        </div>

                                        {(isAddingTeam || editingTeam) && (
                                            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                                                <h5 className="font-medium text-gray-900 mb-4">
                                                    {editingTeam ? 'Edit Team' : 'Add New Team'}
                                                </h5>
                                                <div className="grid grid-cols-2 gap-5 mb-5">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Internal Name</label>
                                                        <input
                                                            type="text"
                                                            value={teamForm.name}
                                                            onChange={e => setTeamForm({ ...teamForm, name: e.target.value })}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                            placeholder="e.g., DESKTOP"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                                                        <input
                                                            type="text"
                                                            value={teamForm.displayName}
                                                            onChange={e => setTeamForm({ ...teamForm, displayName: e.target.value })}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                            placeholder="e.g., Desktop Team"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                                                        <div className="flex gap-2 items-center">
                                                            <input
                                                                type="color"
                                                                value={teamForm.color}
                                                                onChange={e => setTeamForm({ ...teamForm, color: e.target.value })}
                                                                className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                                                            />
                                                            <span className="text-sm text-gray-500 font-mono">{teamForm.color}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                                                        <input
                                                            type="number"
                                                            value={teamForm.order}
                                                            onChange={e => setTeamForm({ ...teamForm, order: parseInt(e.target.value) })}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                                                    <button
                                                        onClick={() => {
                                                            setIsAddingTeam(false);
                                                            setEditingTeam(null);
                                                        }}
                                                        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={handleSaveTeam}
                                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
                                                    >
                                                        {editingTeam ? 'Save Changes' : 'Add Team'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            {teams.map((team) => (
                                                <div
                                                    key={team.id}
                                                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-4 h-4 rounded"
                                                            style={{ backgroundColor: team.color || '#ccc' }}
                                                        />
                                                        <div>
                                                            <p className="font-medium text-gray-900">{team.displayName}</p>
                                                            <p className="text-xs text-gray-500">
                                                                {team.name} · {team.mailers.length} mailers
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => {
                                                                setEditingTeam(team);
                                                                setTeamForm({
                                                                    name: team.name,
                                                                    displayName: team.displayName,
                                                                    color: team.color || '#000000',
                                                                    order: team.order
                                                                });
                                                                setIsAddingTeam(false);
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                            title="Edit"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteTeam(team.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            title="Delete"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Mailers Tab */}
                                {managementTab === 'mailers' && (
                                    <div className="space-y-5">
                                        <div className="flex justify-between items-center">
                                            <p className="text-sm text-gray-500">
                                                {teams.reduce((acc, t) => acc + t.mailers.length, 0)} mailers across {teams.length} teams
                                            </p>
                                            {!isAddingMailer && !editingMailer && (
                                                <button
                                                    onClick={() => {
                                                        setIsAddingMailer(true);
                                                        setMailerForm({ name: '', teamId: teams[0]?.id || '', order: 0, isActive: true });
                                                    }}
                                                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
                                                >
                                                    + Add Mailer
                                                </button>
                                            )}
                                        </div>

                                        {(isAddingMailer || editingMailer) && (
                                            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                                                <h5 className="font-medium text-gray-900 mb-4">
                                                    {editingMailer ? 'Edit Mailer' : 'Add New Mailer'}
                                                </h5>
                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                                        <input
                                                            type="text"
                                                            value={mailerForm.name}
                                                            onChange={e => setMailerForm({ ...mailerForm, name: e.target.value })}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                            placeholder="e.g., John Doe"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                                                        <select
                                                            value={mailerForm.teamId}
                                                            onChange={e => setMailerForm({ ...mailerForm, teamId: e.target.value })}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                        >
                                                            {teams.map(team => (
                                                                <option key={team.id} value={team.id}>{team.displayName}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                                                        <input
                                                            type="number"
                                                            value={mailerForm.order}
                                                            onChange={e => setMailerForm({ ...mailerForm, order: parseInt(e.target.value) })}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                        />
                                                    </div>
                                                    <div className="flex items-center">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={mailerForm.isActive}
                                                                onChange={e => setMailerForm({ ...mailerForm, isActive: e.target.checked })}
                                                                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                                            />
                                                            <span className="text-sm text-gray-700">Active</span>
                                                        </label>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                                                    <button
                                                        onClick={() => {
                                                            setIsAddingMailer(false);
                                                            setEditingMailer(null);
                                                        }}
                                                        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={handleSaveMailer}
                                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
                                                    >
                                                        {editingMailer ? 'Save Changes' : 'Add Mailer'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            {teams.map((team) => (
                                                <div key={team.id}>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div
                                                            className="w-3 h-3 rounded"
                                                            style={{ backgroundColor: team.color || '#ccc' }}
                                                        />
                                                        <h5 className="text-sm font-medium text-gray-700">{team.displayName}</h5>
                                                        <span className="text-xs text-gray-400">
                                                            ({team.mailers.length})
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1 ml-5">
                                                        {team.mailers.map((mailer) => (
                                                            <div
                                                                key={mailer.id}
                                                                className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-2 h-2 rounded-full ${mailer.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                                    <span className="text-sm text-gray-900">{mailer.name}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingMailer(mailer);
                                                                            setMailerForm({
                                                                                name: mailer.name,
                                                                                teamId: mailer.teamId,
                                                                                order: mailer.order,
                                                                                isActive: mailer.isActive
                                                                            });
                                                                            setIsAddingMailer(false);
                                                                        }}
                                                                        className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                                        title="Edit"
                                                                    >
                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                        </svg>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteMailer(mailer.id)}
                                                                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                        title="Delete"
                                                                    >
                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Preset Management Modal */}
                {showPresetModal && isAdmin && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200">
                            {/* Header */}
                            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900">Manage Presets</h3>
                                        <p className="text-sm text-gray-500 mt-1">Quick assign templates for your planning grid</p>
                                    </div>
                                    <button
                                        onClick={() => setShowPresetModal(false)}
                                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto px-6 py-5">
                                <div className="space-y-5">
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm text-gray-500">{presets.length} {presets.length === 1 ? 'preset' : 'presets'} configured</p>
                                        {!isAddingPreset && !editingPreset && (
                                            <button
                                                onClick={() => {
                                                    setIsAddingPreset(true);
                                                    setPresetForm({ label: '', codes: '', color: '#90EE90' });
                                                }}
                                                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
                                            >
                                                + Add Preset
                                            </button>
                                        )}
                                    </div>

                                    {(isAddingPreset || editingPreset) && (
                                        <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                                            <h5 className="font-medium text-gray-900 mb-4">
                                                {editingPreset ? 'Edit Preset' : 'Add New Preset'}
                                            </h5>
                                            <div className="space-y-4 mb-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                                                    <input
                                                        type="text"
                                                        value={presetForm.label}
                                                        onChange={e => setPresetForm({ ...presetForm, label: e.target.value })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                        placeholder="e.g., CMH3-CMH9"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Task Codes</label>
                                                    <input
                                                        type="text"
                                                        value={presetForm.codes}
                                                        onChange={e => setPresetForm({ ...presetForm, codes: e.target.value })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                        placeholder="e.g., CMH3, CMH9"
                                                    />
                                                    <p className="mt-1 text-xs text-gray-500">Separate multiple codes with commas</p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                                                    <div className="flex gap-2 items-center">
                                                        <input
                                                            type="color"
                                                            value={presetForm.color}
                                                            onChange={e => setPresetForm({ ...presetForm, color: e.target.value })}
                                                            className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                                                        />
                                                        <span className="text-sm text-gray-500 font-mono">{presetForm.color}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                                                <button
                                                    onClick={() => {
                                                        setIsAddingPreset(false);
                                                        setEditingPreset(null);
                                                    }}
                                                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleSavePreset}
                                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
                                                >
                                                    {editingPreset ? 'Save Changes' : 'Add Preset'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        {presets.map((preset) => (
                                            <div
                                                key={preset.id || preset.label}
                                                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-4 h-4 rounded"
                                                        style={{ backgroundColor: preset.color }}
                                                    />
                                                    <div>
                                                        <p className="font-medium text-gray-900">{preset.label}</p>
                                                        <p className="text-xs text-gray-500">{preset.codes.join(', ')}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => {
                                                            setEditingPreset(preset);
                                                            setPresetForm({
                                                                label: preset.label,
                                                                codes: preset.codes.join(', '),
                                                                color: preset.color
                                                            });
                                                            setIsAddingPreset(false);
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                        title="Edit"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePreset(preset.id!)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        title="Delete"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
                }
            </div>
        </div >
    );
};

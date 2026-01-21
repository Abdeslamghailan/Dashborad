import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Filter, Search, X, Trash2 } from 'lucide-react';
import { service } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { ChangeHistoryEntry } from './history/ChangeHistory';
import { HistoryTable } from './history/HistoryTable';

export const HistoryPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [history, setHistory] = useState<ChangeHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(true);

    // Filter states
    const [entityIdFilter, setEntityIdFilter] = useState('');
    const [entityTypeFilter, setEntityTypeFilter] = useState('');
    const [usernameFilter, setUsernameFilter] = useState('');
    const [changeTypeFilter, setChangeTypeFilter] = useState('');
    const [methodIdFilter, setMethodIdFilter] = useState('');
    const [categoryIdFilter, setCategoryIdFilter] = useState('');
    const [fieldChangedFilter, setFieldChangedFilter] = useState('');
    const [startDateFilter, setStartDateFilter] = useState('');
    const [endDateFilter, setEndDateFilter] = useState('');

    // Redirect non-admins/mailers
    useEffect(() => {
        if (user?.role !== 'ADMIN' && user?.role !== 'MAILER') {
            navigate('/');
        }
    }, [user, navigate]);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const data = await service.getAllHistory({
                entityId: entityIdFilter || undefined,
                entityType: entityTypeFilter || undefined,
                username: usernameFilter || undefined,
                changeType: changeTypeFilter || undefined,
                methodId: methodIdFilter || undefined,
                categoryId: categoryIdFilter || undefined,
                fieldChanged: fieldChangedFilter || undefined,
                startDate: startDateFilter || undefined,
                endDate: endDateFilter || undefined,
                limit: 500
            });
            setHistory(data);
        } catch (error) {
            console.error('Failed to fetch history:', error);
            setHistory([]);
        } finally {
            setLoading(false);
        }
    };

    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteClick = (id: number) => {
        setDeleteId(id);
        setShowDeleteConfirm(true);
    };

    const handleDeleteAllClick = () => {
        setDeleteId(-1); // -1 indicates delete all
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (deleteId === null) return;

        try {
            setIsDeleting(true);
            if (deleteId === -1) {
                await service.deleteAllHistory();
            } else {
                await service.deleteHistoryEntry(deleteId);
            }
            await fetchHistory();
            setShowDeleteConfirm(false);
            setDeleteId(null);
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete history');
        } finally {
            setIsDeleting(false);
        }
    };

    const clearFilters = () => {
        setEntityIdFilter('');
        setEntityTypeFilter('');
        setUsernameFilter('');
        setChangeTypeFilter('');
        setMethodIdFilter('');
        setCategoryIdFilter('');
        setFieldChangedFilter('');
        setStartDateFilter('');
        setEndDateFilter('');
    };

    if (user?.role !== 'ADMIN' && user?.role !== 'MAILER') {
        return null;
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-20 px-4">
            {/* Header Section */}
            <div className="flex items-center justify-between pt-6 border-b border-gray-100 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Clock size={24} className="text-gray-400" />
                        Audit Log & History
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Track all system changes and user actions
                    </p>
                </div>
                <div className="flex gap-2">
                    {user?.role === 'ADMIN' && (
                        <button
                            onClick={handleDeleteAllClick}
                            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium border border-transparent hover:border-red-100"
                        >
                            <Trash2 size={18} />
                            Clear History
                        </button>
                    )}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium border ${showFilters
                                ? 'bg-gray-100 text-gray-700 border-gray-200'
                                : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                            }`}
                    >
                        <Filter size={18} />
                        {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </button>
                </div>
            </div>

            {/* Filters Section */}
            {showFilters && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-gray-500 uppercase">Entity ID</label>
                            <input
                                type="text"
                                value={entityIdFilter}
                                onChange={(e) => setEntityIdFilter(e.target.value)}
                                placeholder="e.g., ent_cmh1"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-gray-500 uppercase">Change Type</label>
                            <select
                                value={changeTypeFilter}
                                onChange={(e) => setChangeTypeFilter(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm"
                            >
                                <option value="">All Changes</option>
                                <option value="create">Create</option>
                                <option value="update">Update</option>
                                <option value="delete">Delete</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-gray-500 uppercase">Username</label>
                            <input
                                type="text"
                                value={usernameFilter}
                                onChange={(e) => setUsernameFilter(e.target.value)}
                                placeholder="Search user..."
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-gray-500 uppercase">Entity Type</label>
                            <select
                                value={entityTypeFilter}
                                onChange={(e) => setEntityTypeFilter(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm"
                            >
                                <option value="">All Types</option>
                                <option value="DayPlan">Day Plan</option>
                                <option value="PlanningAssignment">Planning</option>
                                <option value="Entity">Entity Config</option>
                                <option value="ProxyServer">Proxy</option>
                                <option value="Mailer">Mailer</option>
                                <option value="Team">Team</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-gray-500 uppercase">Method ID</label>
                            <input
                                type="text"
                                value={methodIdFilter}
                                onChange={(e) => setMethodIdFilter(e.target.value)}
                                placeholder="e.g., desktop"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-gray-500 uppercase">Field Changed</label>
                            <input
                                type="text"
                                value={fieldChangedFilter}
                                onChange={(e) => setFieldChangedFilter(e.target.value)}
                                placeholder="e.g., step, start"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm"
                            />
                        </div>

                        <div className="lg:col-span-2 grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-gray-500 uppercase">Start Date</label>
                                <input
                                    type="date"
                                    value={startDateFilter}
                                    onChange={(e) => setStartDateFilter(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-gray-500 uppercase">End Date</label>
                                <input
                                    type="date"
                                    value={endDateFilter}
                                    onChange={(e) => setEndDateFilter(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100">
                        <button
                            onClick={fetchHistory}
                            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm font-semibold shadow-sm"
                        >
                            <Search size={16} />
                            Apply Filters
                        </button>
                        <button
                            onClick={() => {
                                clearFilters();
                                setTimeout(fetchHistory, 100);
                            }}
                            className="flex items-center gap-2 px-5 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all text-sm font-semibold"
                        >
                            <X size={16} />
                            Reset
                        </button>
                    </div>
                </div>
            )}

            {/* Content Section */}
            <div className="space-y-4">
                <div className="text-sm text-gray-500 px-1">
                    Showing <span className="font-semibold text-gray-900">{history.length}</span> entries
                </div>

                {loading ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-16 text-center shadow-sm">
                        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500 font-medium">Loading audit logs...</p>
                    </div>
                ) : history.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-16 text-center shadow-sm">
                        <Clock size={40} className="mx-auto text-gray-200 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">No history found</h3>
                        <p className="text-gray-500 text-sm">Try adjusting your filters to find what you're looking for.</p>
                    </div>
                ) : (
                    <HistoryTable
                        history={history}
                        onDelete={user?.role === 'ADMIN' ? handleDeleteClick : undefined}
                        isAdmin={user?.role === 'ADMIN'}
                    />
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {deleteId === -1 ? 'Clear All History?' : 'Delete Entry?'}
                        </h3>
                        <p className="text-gray-500 text-sm leading-relaxed mb-6">
                            {deleteId === -1
                                ? 'This will permanently erase all audit logs. This action cannot be undone.'
                                : 'Are you sure you want to delete this specific audit log? This action cannot be undone.'}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setDeleteId(null);
                                }}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all font-medium text-sm"
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-bold text-sm flex items-center gap-2"
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

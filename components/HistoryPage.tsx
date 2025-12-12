import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, User, Edit3, Plus, Trash2, Filter, Search, X } from 'lucide-react';
import { service } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { ChangeHistoryEntry } from './history/ChangeHistory';
import { generateEntityChangeSummary } from '../utils/smartDiff';

export const HistoryPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [history, setHistory] = useState<ChangeHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);

    // Filter states
    const [entityIdFilter, setEntityIdFilter] = useState('');
    const [entityTypeFilter, setEntityTypeFilter] = useState('');
    const [usernameFilter, setUsernameFilter] = useState('');
    const [changeTypeFilter, setChangeTypeFilter] = useState('');
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
        setStartDateFilter('');
        setEndDateFilter('');
    };

    const getChangeIcon = (changeType: string) => {
        switch (changeType) {
            case 'create':
                return <Plus size={16} className="text-green-600" />;
            case 'update':
                return <Edit3 size={16} className="text-blue-600" />;
            case 'delete':
                return <Trash2 size={16} className="text-red-600" />;
            default:
                return <Edit3 size={16} className="text-gray-600" />;
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'ADMIN':
                return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'MAILER':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'USER':
                return 'bg-gray-100 text-gray-700 border-gray-200';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get entity name from description
    const getEntityName = (description: string): string => {
        const match = description.match(/for "([^"]+)"/);
        return match ? match[1] : 'Entity';
    };

    const renderChangeDetails = (entry: ChangeHistoryEntry) => {
        if (entry.changeType === 'delete') {
            return (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700 font-medium text-sm">
                        <Trash2 size={14} />
                        <strong>Deleted:</strong> {getEntityName(entry.description)}
                    </div>
                </div>
            );
        }

        if (entry.changeType === 'create') {
            return (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
                        <Plus size={14} />
                        <strong>Created:</strong> {getEntityName(entry.description)}
                    </div>
                </div>
            );
        }

        // For updates, use smart diff
        if (entry.oldValue && entry.newValue) {
            const entityName = getEntityName(entry.description);
            const changes = generateEntityChangeSummary(
                entityName,
                entry.fieldChanged,
                entry.oldValue,
                entry.newValue
            );

            if (changes.length > 0) {
                return (
                    <div className="mt-3 space-y-2">
                        {changes.map((change, idx) => (
                            <div key={idx} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="text-sm text-gray-800 font-medium">
                                    {change}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            }
        }

        return null;
    };

    if (user?.role !== 'ADMIN') {
        return null;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Clock size={28} />
                        Change History
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        View all changes from the last 3 months (Admin Only)
                    </p>
                </div>
                <div className="flex gap-3">
                    {user?.role === 'ADMIN' && (
                        <button
                            onClick={handleDeleteAllClick}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            <Trash2 size={18} />
                            Delete All
                        </button>
                    )}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <Filter size={18} />
                        {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </button>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Entity ID
                            </label>
                            <input
                                type="text"
                                value={entityIdFilter}
                                onChange={(e) => setEntityIdFilter(e.target.value)}
                                placeholder="e.g., ent_example"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Table/Type
                            </label>
                            <select
                                value={entityTypeFilter}
                                onChange={(e) => setEntityTypeFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">All Types</option>
                                <option value="entity">Entity</option>
                                <option value="proxy">Proxy</option>
                                <option value="reporting">Reporting</option>
                                <option value="limits">Limits</option>
                                <option value="notes">Notes</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Username
                            </label>
                            <input
                                type="text"
                                value={usernameFilter}
                                onChange={(e) => setUsernameFilter(e.target.value)}
                                placeholder="Search by username"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Change Type
                            </label>
                            <select
                                value={changeTypeFilter}
                                onChange={(e) => setChangeTypeFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">All Changes</option>
                                <option value="create">Create</option>
                                <option value="update">Update</option>
                                <option value="delete">Delete</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={startDateFilter}
                                onChange={(e) => setStartDateFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={endDateFilter}
                                onChange={(e) => setEndDateFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4">
                        <button
                            onClick={fetchHistory}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            <Search size={16} />
                            Apply Filters
                        </button>
                        <button
                            onClick={() => {
                                clearFilters();
                                setTimeout(fetchHistory, 100);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            <X size={16} />
                            Clear Filters
                        </button>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        Showing <span className="font-semibold text-gray-900">{history.length}</span> changes
                    </div>
                </div>
            </div>

            {/* History List */}
            {loading ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                    <Clock size={32} className="mx-auto text-gray-400 animate-spin mb-4" />
                    <p className="text-gray-500">Loading history...</p>
                </div>
            ) : history.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                    <Clock size={32} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No history found matching your filters</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                    {history.map((entry) => (
                        <div key={entry.id} className="p-6 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start gap-4">
                                {/* Icon */}
                                <div className="mt-1 flex-shrink-0">
                                    {getChangeIcon(entry.changeType)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                        <div>
                                            <p className="text-base font-semibold text-gray-900">
                                                {entry.description}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-gray-500 whitespace-nowrap">
                                                {formatTimestamp(entry.createdAt)}
                                            </span>
                                            {user?.role === 'ADMIN' && (
                                                <button
                                                    onClick={() => handleDeleteClick(entry.id)}
                                                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                                    title="Delete entry"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Metadata */}
                                    <div className="flex items-center gap-4 text-sm mb-3">
                                        <div className="flex items-center gap-1.5 text-gray-600">
                                            <User size={14} />
                                            <span className="font-medium">{entry.username}</span>
                                        </div>
                                        <span
                                            className={`px-2 py-0.5 rounded border text-xs ${getRoleBadgeColor(entry.userRole)}`}
                                        >
                                            {entry.userRole}
                                        </span>
                                        {entry.entityId && (
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                {entry.entityId}
                                            </span>
                                        )}
                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                            {entry.entityType}
                                        </span>
                                    </div>

                                    {/* Change Details */}
                                    {renderChangeDetails(entry)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900">
                            {deleteId === -1 ? 'Delete All History?' : 'Delete History Entry?'}
                        </h3>
                        <p className="text-gray-600">
                            {deleteId === -1
                                ? 'Are you sure you want to delete ALL history entries? This action cannot be undone.'
                                : 'Are you sure you want to delete this history entry? This action cannot be undone.'}
                        </p>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setDeleteId(null);
                                }}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <>
                                        <Clock size={16} className="animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    'Delete'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

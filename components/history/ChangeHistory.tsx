import React, { useEffect, useState } from 'react';
import { Clock, User, Edit3, Plus, Trash2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { service } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { generateEntityChangeSummary } from '../../utils/smartDiff';

export interface ChangeHistoryEntry {
    id: number;
    entityId: string | null;
    entityType: string;
    changeType: string;
    fieldChanged: string | null;
    userId: number;
    username: string;
    userRole: string;
    description: string;
    oldValue: string | null;
    newValue: string | null;
    createdAt: string;
}

interface ChangeHistoryProps {
    entityId?: string;
    entityType?: string;
    limit?: number;
    showExpanded?: boolean;
}

export const ChangeHistory: React.FC<ChangeHistoryProps> = ({
    entityId,
    entityType,
    limit = 5,
    showExpanded = false
}) => {
    const { user } = useAuth();
    const [history, setHistory] = useState<ChangeHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(showExpanded);

    // Only show for admins and mailers
    if (user?.role !== 'ADMIN' && user?.role !== 'MAILER') {
        return null;
    }

    useEffect(() => {
        fetchHistory();
    }, [entityId, entityType, limit]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            let data: ChangeHistoryEntry[];

            if (entityId) {
                data = await service.getEntityHistory(entityId, limit);
            } else if (entityType) {
                data = await service.getHistoryByType(entityType, limit);
            } else {
                data = [];
            }

            setHistory(data);
        } catch (error) {
            console.error('Failed to fetch history:', error);
            setHistory([]);
        } finally {
            setLoading(false);
        }
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
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get entity name from description
    const getEntityName = (description: string): string => {
        const match = description.match(/for "([^"]+)"/);
        return match ? match[1] : 'Entity';
    };

    // Generate smart change details
    const renderChangeDetails = (entry: ChangeHistoryEntry) => {
        if (entry.changeType === 'delete') {
            return (
                <div className="mt-2 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                    <strong>Deleted:</strong> {getEntityName(entry.description)}
                </div>
            );
        }

        if (entry.changeType === 'create') {
            return (
                <div className="mt-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                    <strong>Created:</strong> {getEntityName(entry.description)}
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
                    <div className="mt-2 space-y-1">
                        {changes.map((change, idx) => (
                            <div key={idx} className="text-sm text-gray-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                                {change}
                            </div>
                        ))}
                    </div>
                );
            }
        }

        return null;
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock size={16} className="animate-spin" />
                    Loading history...
                </div>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock size={16} />
                    No change history available
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-2 hover:text-indigo-600 transition-colors"
                >
                    <Clock size={18} className="text-indigo-600" />
                    <h3 className="font-semibold text-gray-900">Change History</h3>
                    <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                        {history.length} changes
                    </span>
                    {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                <Link
                    to="/history"
                    className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                    View All
                    <ExternalLink size={14} />
                </Link>
            </div>

            {/* History List */}
            {expanded && (
                <div className="divide-y divide-gray-100">
                    {history.map((entry) => (
                        <div key={entry.id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start gap-3">
                                {/* Icon */}
                                <div className="mt-1 flex-shrink-0">
                                    {getChangeIcon(entry.changeType)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    {/* Main description */}
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <p className="text-sm font-medium text-gray-900">
                                            {entry.description}
                                        </p>
                                        <span className="text-xs text-gray-500 whitespace-nowrap">
                                            {formatTimestamp(entry.createdAt)}
                                        </span>
                                    </div>

                                    {/* User info */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="flex items-center gap-1.5 text-xs">
                                            <User size={12} className="text-gray-400" />
                                            <span className="font-semibold text-gray-900">{entry.username}</span>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(entry.userRole)}`}>
                                            {entry.userRole}
                                        </span>
                                    </div>

                                    {/* Smart change details */}
                                    {renderChangeDetails(entry)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

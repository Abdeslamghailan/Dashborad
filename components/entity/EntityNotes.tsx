import React, { useState, useEffect } from 'react';
import { Entity } from '../../types';
import { service } from '../../services';
import { Save, Edit3, FileText } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';

interface EntityNotesProps {
    entity: Entity;
    onUpdate: () => void;
}

export const EntityNotes: React.FC<EntityNotesProps> = ({ entity, onUpdate }) => {
    const { user } = useAuth();
    const [notes, setNotes] = useState(entity.notes || '');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        setNotes(entity.notes || '');
        setHasChanges(false);
    }, [entity.notes]);

    const handleNotesChange = (value: string) => {
        setNotes(value);
        setHasChanges(value !== (entity.notes || ''));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatedEntity = {
                ...entity,
                notes: notes
            };
            await service.saveEntity(updatedEntity);
            setHasChanges(false);
            setIsEditing(false);
            onUpdate();
        } catch (error) {
            console.error('Failed to save notes:', error);
            alert('Failed to save notes. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setNotes(entity.notes || '');
        setHasChanges(false);
        setIsEditing(false);
    };

    const isAdmin = user?.role === 'ADMIN';
    const canEdit = isAdmin || user?.role === 'MAILER';

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <FileText className="text-indigo-600" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Notes</h2>
                            <p className="text-sm text-gray-600">Add important notes and reminders for this entity</p>
                        </div>
                    </div>
                    {canEdit && !isEditing && (
                        <Button
                            onClick={() => setIsEditing(true)}
                            variant="outline"
                            leftIcon={<Edit3 size={16} />}
                            className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        >
                            Edit Notes
                        </Button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {isEditing ? (
                    <div className="space-y-4">
                        <textarea
                            value={notes}
                            onChange={(e) => handleNotesChange(e.target.value)}
                            placeholder="Add your notes here... You can include important information, reminders, or any other details about this entity."
                            className="w-full min-h-[400px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-y font-mono text-sm"
                            autoFocus
                        />
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                                {notes.length} characters
                            </p>
                            <div className="flex gap-3">
                                <Button
                                    onClick={handleCancel}
                                    variant="outline"
                                    disabled={isSaving}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    isLoading={isSaving}
                                    disabled={!hasChanges || isSaving}
                                    leftIcon={<Save size={16} />}
                                >
                                    Save Notes
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        {notes ? (
                            <div className="prose max-w-none">
                                <pre className="whitespace-pre-wrap font-sans text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    {notes}
                                </pre>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileText className="text-gray-400" size={32} />
                                </div>
                                <p className="text-gray-500 mb-2">No notes yet</p>
                                <p className="text-sm text-gray-400 mb-4">
                                    {canEdit ? 'Click "Edit Notes" to add your first note' : 'No notes have been added for this entity'}
                                </p>
                                {canEdit && (
                                    <Button
                                        onClick={() => setIsEditing(true)}
                                        variant="outline"
                                        leftIcon={<Edit3 size={16} />}
                                    >
                                        Add Notes
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

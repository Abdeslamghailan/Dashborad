import React, { useState, useEffect } from 'react';
import { Entity, NoteCard } from '../../types';
import { service } from '../../services';
import { Plus, Edit3, FileText, Trash2, X, Save, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';

interface EntityNotesProps {
    entity: Entity;
    onUpdate: () => void;
}

export const EntityNotes: React.FC<EntityNotesProps> = ({ entity, onUpdate }) => {
    const { user } = useAuth();
    const [noteCards, setNoteCards] = useState<NoteCard[]>(entity.noteCards || []);
    const [isSaving, setIsSaving] = useState(false);
    const [editingCard, setEditingCard] = useState<NoteCard | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalContent, setModalContent] = useState('');

    // Delete confirmation state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [cardToDelete, setCardToDelete] = useState<string | null>(null);

    useEffect(() => {
        console.log('[EntityNotes] useEffect triggered - entity.noteCards changed:', entity.noteCards);
        setNoteCards(entity.noteCards || []);
    }, [entity.noteCards]);

    const generateId = () => `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const handleAddNote = () => {
        setEditingCard(null);
        setModalTitle('');
        setModalContent('');
        setShowModal(true);
    };

    const handleEditCard = (card: NoteCard) => {
        setEditingCard(card);
        setModalTitle(card.title);
        setModalContent(card.content);
        setShowModal(true);
    };

    // Show delete confirmation modal
    const handleDeleteClick = (cardId: string) => {
        console.log('[EntityNotes] Delete button clicked for cardId:', cardId);
        setCardToDelete(cardId);
        setShowDeleteConfirm(true);
    };

    // Actually delete the card
    const confirmDelete = async () => {
        if (!cardToDelete) return;

        console.log('[EntityNotes] Confirming delete for cardId:', cardToDelete);
        const updatedCards = noteCards.filter(c => c.id !== cardToDelete);
        console.log('[EntityNotes] updatedCards after filter:', updatedCards);

        // Update local state immediately
        setNoteCards(updatedCards);
        setShowDeleteConfirm(false);
        setCardToDelete(null);

        // Save to server
        try {
            const updatedEntity: Entity = {
                ...entity,
                noteCards: updatedCards
            };
            console.log('[EntityNotes] Saving entity with noteCards:', updatedEntity.noteCards);
            await service.saveEntity(updatedEntity, { skipEvent: true });
            console.log('[EntityNotes] Delete saved successfully');
        } catch (error) {
            console.error('[EntityNotes] Failed to delete note:', error);
            setNoteCards(entity.noteCards || []);
            alert('Failed to delete note. Please try again.');
        }
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
        setCardToDelete(null);
    };

    const handleSaveModal = async () => {
        if (!modalTitle.trim()) {
            alert('Please enter a title for the note.');
            return;
        }

        setIsSaving(true);
        try {
            let updatedCards: NoteCard[];

            if (editingCard) {
                updatedCards = noteCards.map(c =>
                    c.id === editingCard.id
                        ? { ...c, title: modalTitle.trim(), content: modalContent.trim() }
                        : c
                );
            } else {
                const newCard: NoteCard = {
                    id: generateId(),
                    title: modalTitle.trim(),
                    content: modalContent.trim()
                };
                updatedCards = [...noteCards, newCard];
            }

            setNoteCards(updatedCards);

            const updatedEntity: Entity = {
                ...entity,
                noteCards: updatedCards
            };
            await service.saveEntity(updatedEntity, { skipEvent: true });
            setShowModal(false);
        } catch (error) {
            console.error('Failed to save note:', error);
            alert('Failed to save note. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingCard(null);
        setModalTitle('');
        setModalContent('');
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
                    {canEdit && (
                        <Button
                            onClick={handleAddNote}
                            variant="outline"
                            leftIcon={<Plus size={16} />}
                            className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        >
                            Add Notes
                        </Button>
                    )}
                </div>
            </div>

            {/* Content - Vertical Cards Grid */}
            <div className="p-6">
                {noteCards.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {noteCards.map((card) => (
                            <div
                                key={card.id}
                                className="bg-white border-2 border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden group"
                            >
                                {/* Card Title */}
                                <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200 flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-indigo-700 uppercase tracking-wide truncate flex-1">
                                        {card.title}
                                    </h4>
                                    {canEdit && (
                                        <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEditCard(card)}
                                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-100 rounded transition-colors"
                                                title="Edit Note"
                                            >
                                                <Edit3 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(card.id)}
                                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                                                title="Delete Note"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {/* Card Content */}
                                <div
                                    className="flex-1 p-4 text-sm text-gray-600 min-h-[120px] cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => canEdit && handleEditCard(card)}
                                    title={canEdit ? "Click to edit" : undefined}
                                >
                                    <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                                        {card.content || <span className="text-gray-400 italic">No content...</span>}
                                    </pre>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="text-gray-400" size={32} />
                        </div>
                        <p className="text-gray-500 mb-2">No notes yet</p>
                        <p className="text-sm text-gray-400 mb-4">
                            {canEdit ? 'Click "Add Notes" to create your first note card' : 'No notes have been added for this entity'}
                        </p>
                        {canEdit && (
                            <Button
                                onClick={handleAddNote}
                                variant="outline"
                                leftIcon={<Plus size={16} />}
                            >
                                ADD NOTES
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="text-red-600" size={24} />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Note</h3>
                            <p className="text-gray-600 mb-6">Are you sure you want to delete this note? This action cannot be undone.</p>
                            <div className="flex gap-3 justify-center">
                                <Button variant="ghost" onClick={cancelDelete}>
                                    Cancel
                                </Button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for Add/Edit Note */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-800">
                                {editingCard ? 'Edit Note' : 'Add New Note'}
                            </h3>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={modalTitle}
                                    onChange={(e) => setModalTitle(e.target.value)}
                                    placeholder="Enter note title..."
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                                <textarea
                                    value={modalContent}
                                    onChange={(e) => setModalContent(e.target.value)}
                                    placeholder="Enter note content..."
                                    rows={8}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                            <Button variant="ghost" onClick={handleCloseModal}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveModal}
                                isLoading={isSaving}
                                disabled={!modalTitle.trim()}
                                leftIcon={<Save size={16} />}
                            >
                                {editingCard ? 'Save Changes' : 'Add Note'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

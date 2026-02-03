import React, { useState, useEffect } from 'react';
import { Entity, NoteCard } from '../../types';
import { service } from '../../services';
import { Plus, Edit3, FileText, Trash2, X, Save, AlertTriangle, Search, StickyNote, MoreVertical } from 'lucide-react';
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
    const [searchQuery, setSearchQuery] = useState('');

    // Delete confirmation state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [cardToDelete, setCardToDelete] = useState<string | null>(null);

    useEffect(() => {
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

    const handleDeleteClick = (cardId: string) => {
        setCardToDelete(cardId);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!cardToDelete) return;

        const updatedCards = noteCards.filter(c => c.id !== cardToDelete);
        setNoteCards(updatedCards);
        setShowDeleteConfirm(false);
        setCardToDelete(null);

        try {
            const updatedEntity: Entity = {
                ...entity,
                noteCards: updatedCards
            };
            await service.saveEntity(updatedEntity, { skipEvent: true });
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
        if (!modalTitle.trim()) return;

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

    const filteredNotes = noteCards.filter(card =>
        card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isAdmin = user?.role === 'ADMIN';
    const canEdit = isAdmin || user?.role === 'MAILER';

    return (
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100/80 overflow-hidden transition-all duration-300">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 border-b border-gray-100">
                <div className="px-8 py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 rotate-3 transition-transform hover:rotate-0 duration-300">
                                <StickyNote className="text-white" size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                                    Notes & Highlights
                                </h2>
                                <p className="text-sm font-medium text-gray-500">
                                    Organize crucial insights and daily reminders
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Search bar */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                                    <Search size={16} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search notes..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-white/60 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 w-full md:w-64 transition-all"
                                />
                            </div>

                            {canEdit && (
                                <Button
                                    onClick={handleAddNote}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 border-none px-6 rounded-xl hover:scale-[1.02] active:scale-95 transition-all"
                                    leftIcon={<Plus size={18} />}
                                >
                                    New Note
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Notes Grid */}
            <div className="p-8 bg-gray-50/30">
                {filteredNotes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                        {filteredNotes.map((card) => (
                            <div
                                key={card.id}
                                className="group relative bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-300 flex flex-col overflow-hidden"
                            >
                                {/* Accent Line */}
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-purple-500 opacity-80 group-hover:opacity-100 transition-opacity" />

                                <div className="pl-5.5 p-5 flex flex-col h-full">
                                    {/* Card Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <h4 className="text-base font-bold text-gray-800 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2 pr-6">
                                            {card.title}
                                        </h4>
                                        {canEdit && (
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEditCard(card); }}
                                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                    title="Edit Note"
                                                >
                                                    <Edit3 size={15} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(card.id); }}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete Note"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Content */}
                                    <div
                                        className="flex-1 cursor-pointer"
                                        onClick={() => canEdit && handleEditCard(card)}
                                    >
                                        <div className="text-sm text-gray-600 leading-relaxed font-medium">
                                            <pre className="whitespace-pre-wrap font-sans break-words bg-transparent border-none p-0 m-0">
                                                {card.content || <span className="text-gray-300 italic">Add details here...</span>}
                                            </pre>
                                        </div>
                                    </div>

                                    {/* Decorator Dot */}
                                    <div className="mt-4 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-200 group-hover:bg-indigo-400 transition-colors" />
                                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest group-hover:text-indigo-300 transition-colors">
                                            Priority Note
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                        <div className="relative w-24 h-24 mx-auto mb-6">
                            <div className="absolute inset-0 bg-indigo-50 rounded-full animate-ping opacity-20" />
                            <div className="relative w-24 h-24 bg-indigo-50 rounded-3xl flex items-center justify-center border border-indigo-100 shadow-inner">
                                <FileText className="text-indigo-300" size={48} />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No notes found</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mb-8 font-medium">
                            {searchQuery
                                ? `We couldn't find any notes matching "${searchQuery}"`
                                : "Start by adding your first note card. It's a great way to keep track of important details."}
                        </p>
                        {canEdit && !searchQuery && (
                            <Button
                                onClick={handleAddNote}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-10 shadow-lg shadow-indigo-200"
                                leftIcon={<Plus size={20} />}
                            >
                                Let's Add One
                            </Button>
                        )}
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-indigo-600 font-bold hover:underline"
                            >
                                Clear search filter
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] transition-opacity duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden transform scale-100 transition-transform duration-300">
                        <div className="p-8 text-center">
                            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-100 shadow-inner">
                                <AlertTriangle className="text-red-500" size={36} />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Delete this note?</h3>
                            <p className="text-gray-500 mb-8 font-medium leading-relaxed">
                                This action is permanent and cannot be undone. Are you sure you want to proceed?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={cancelDelete}
                                    className="flex-1 py-3 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-all font-bold"
                                >
                                    No, Keep it
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-bold shadow-lg shadow-red-200"
                                >
                                    Yes, Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for Add/Edit Note */}
            {showModal && (
                <div className="fixed inset-0 bg-indigo-950/40 backdrop-blur-md flex items-center justify-center z-[100] transition-all p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all border border-white/20">
                        {/* Modal Header */}
                        <div className="relative px-8 py-6 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                        {editingCard ? <Edit3 size={20} /> : <Plus size={20} />}
                                    </div>
                                    <h3 className="text-xl font-bold">
                                        {editingCard ? 'Edit Note Highlights' : 'Create New Note'}
                                    </h3>
                                </div>
                                <button
                                    onClick={handleCloseModal}
                                    className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-indigo-500 uppercase tracking-widest pl-1">Note Title</label>
                                <input
                                    type="text"
                                    value={modalTitle}
                                    onChange={(e) => setModalTitle(e.target.value)}
                                    placeholder="Enter a descriptive title..."
                                    className="w-full bg-gray-50 border-0 rounded-2xl px-5 py-4 text-base font-bold text-gray-800 placeholder:text-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all outline-none border-b-2 border-transparent focus:border-indigo-500"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-indigo-500 uppercase tracking-widest pl-1">Content Details</label>
                                <textarea
                                    value={modalContent}
                                    onChange={(e) => setModalContent(e.target.value)}
                                    placeholder="What's on your mind? Add some details here..."
                                    rows={8}
                                    className="w-full bg-gray-50 border-0 rounded-2xl px-5 py-4 text-sm font-medium text-gray-600 placeholder:text-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all outline-none resize-none border-b-2 border-transparent focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-between px-8 py-6 bg-gray-50">
                            <div className="flex items-center gap-2 text-gray-400">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Auto-formatting enabled</span>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={handleCloseModal}
                                    className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    Discard
                                </button>
                                <Button
                                    onClick={handleSaveModal}
                                    isLoading={isSaving}
                                    disabled={!modalTitle.trim()}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 py-3 h-auto font-bold shadow-lg shadow-indigo-100"
                                    leftIcon={<Save size={18} />}
                                >
                                    {editingCard ? 'Sync Changes' : 'Publish Note'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


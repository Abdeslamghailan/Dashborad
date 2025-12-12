import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { Entity, ParentCategory, LimitConfig } from '../types';
import { Button } from './ui/Button';

interface EntityFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (entity: Entity) => Promise<void>;
    initialEntity?: Entity | null;
}

export const EntityFormModal: React.FC<EntityFormModalProps> = ({ isOpen, onClose, onSave, initialEntity }) => {
    const [formData, setFormData] = useState<Entity>({
        id: '',
        name: '',
        status: 'active',
        contactPerson: '',
        email: '',
        reporting: { parentCategories: [] },
        limitsConfiguration: []
    });

    useEffect(() => {
        if (initialEntity) {
            setFormData(initialEntity);
        } else {
            setFormData({
                id: `ent_${Date.now()}`, // Auto-generate ID
                name: '',
                status: 'active',
                contactPerson: '',
                email: '',
                reporting: { parentCategories: [] },
                limitsConfiguration: []
            });
        }
    }, [initialEntity, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            {initialEntity ? 'Edit Entity' : 'Create New Entity'}
                        </h3>
                        <p className="text-sm text-gray-500">
                            {initialEntity ? 'Update entity details and configuration' : 'Fill in the details to create a new entity'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Entity Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all uppercase placeholder:normal-case"
                                placeholder="e.g., MARKETING DEPARTMENT"
                            />
                        </div>



                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <select
                                value={formData.status || 'active'}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                </form>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        leftIcon={<Save size={18} />}
                    >
                        {initialEntity ? 'Update Entity' : 'Create Entity'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

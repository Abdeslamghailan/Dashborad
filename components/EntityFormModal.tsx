import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Check } from 'lucide-react';
import { Entity, ParentCategory, LimitConfig, MethodType } from '../types';
import { Button } from './ui/Button';
import { AVAILABLE_METHODS } from '../config/methods';
import { API_URL } from '../config';

import { useAuth } from '../contexts/AuthContext';
import { service } from '../services';

interface EntityFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (entity: Entity) => Promise<void>;
    initialEntity?: Entity | null;
}

export const EntityFormModal: React.FC<EntityFormModalProps> = ({ isOpen, onClose, onSave, initialEntity }) => {
    const { token } = useAuth();
    const [formData, setFormData] = useState<Entity>({
        id: '',
        name: '',
        status: 'active',
        contactPerson: '',
        email: '',
        enabledMethods: ['desktop'], // Default to desktop method
        reporting: { parentCategories: [] },
        limitsConfiguration: []
    });

    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (initialEntity) {
            setFormData({
                ...initialEntity,
                enabledMethods: initialEntity.enabledMethods || ['desktop']
            });
        } else {
            setFormData({
                id: `ent_${Date.now()}`, // Auto-generate ID
                name: '',
                status: 'active',
                contactPerson: '',
                email: '',
                enabledMethods: ['desktop'],
                reporting: { parentCategories: [] },
                limitsConfiguration: []
            });
        }
        setError(null);
    }, [initialEntity, isOpen]);

    const [availableMethods, setAvailableMethods] = useState<any[]>([]);

    useEffect(() => {
        const fetchMethods = async () => {
            try {
                const data = await service.getReportingMethods();
                setAvailableMethods(data);
            } catch (error) {
                console.error('Failed to fetch methods:', error);
            }
        };
        if (isOpen) {
            fetchMethods();
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (err: any) {
            console.error('EntityFormModal: Error saving:', err);
            setError(err.message || 'Failed to save entity');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleMethod = (methodId: MethodType) => {
        const currentMethods = formData.enabledMethods || [];
        if (currentMethods.includes(methodId)) {
            // Remove method (but keep at least one)
            if (currentMethods.length > 1) {
                setFormData({
                    ...formData,
                    enabledMethods: currentMethods.filter(m => m !== methodId)
                });
            }
        } else {
            // Add method
            setFormData({
                ...formData,
                enabledMethods: [...currentMethods, methodId]
            });
        }
    };

    if (!isOpen) return null;

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

                {error && (
                    <div className="px-6 pt-4">
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3 animate-in slide-in-from-top-2 duration-200">
                            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-600">
                                <X size={16} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold uppercase tracking-wider mb-0.5">Save Error</p>
                                <p className="text-xs font-medium opacity-90">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className={`block text-sm font-bold mb-1 uppercase tracking-tight ${error?.toLowerCase().includes('name') ? 'text-red-500' : 'text-gray-600'}`}>
                                Entity Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all uppercase placeholder:normal-case font-bold ${error?.toLowerCase().includes('name')
                                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50'
                                        : 'border-gray-200 focus:ring-sky-500 focus:border-sky-500'
                                    }`}
                                placeholder="e.g., MARKETING DEPARTMENT"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className={`block text-sm font-bold mb-1 uppercase tracking-tight ${error?.toLowerCase().includes('status') ? 'text-red-500' : 'text-gray-600'}`}>
                                Status
                            </label>
                            <select
                                value={formData.status || 'active'}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all bg-white font-bold ${error?.toLowerCase().includes('status')
                                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50'
                                        : 'border-gray-200 focus:ring-sky-500 focus:border-sky-500'
                                    }`}
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        {/* Bot Configuration */}
                        <div className="col-span-2 pt-4 border-t border-gray-100">
                            <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">
                                Telegram Bot Configuration
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Bot Token</label>
                                    <input
                                        type="password"
                                        value={formData.botConfig?.token || ''}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            botConfig: { ...(formData.botConfig || { chatId: '' }), token: e.target.value }
                                        })}
                                        placeholder="7798410..."
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all text-xs font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Chat ID</label>
                                    <input
                                        type="text"
                                        value={formData.botConfig?.chatId || ''}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            botConfig: { ...(formData.botConfig || { token: '' }), chatId: e.target.value }
                                        })}
                                        placeholder="-100..."
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all text-xs font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Methods Selection */}
                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-gray-600 mb-3 uppercase tracking-tight">
                                Reporting Methods <span className="text-red-500">*</span>
                            </label>
                            <p className="text-xs text-gray-500 mb-3 font-medium">
                                Select which reporting methods this entity should have access to. Each method has its own navigation and features.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                {availableMethods.length > 0 ? (
                                    availableMethods.map((method) => {
                                        const isSelected = (formData.enabledMethods || []).includes(method.id);
                                        return (
                                            <button
                                                key={method.id}
                                                type="button"
                                                onClick={() => toggleMethod(method.id)}
                                                className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left ${isSelected
                                                    ? 'border-sky-500 bg-sky-50/50 shadow-sm'
                                                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div
                                                    className={`p-2.5 rounded-lg bg-gradient-to-br ${method.gradient || 'from-gray-500 to-gray-600'} text-white shadow-sm`}
                                                >
                                                    <Plus size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-gray-900 text-sm uppercase tracking-tight">{method.name}</div>
                                                    <div className="text-[10px] text-gray-500 truncate font-semibold">{method.description}</div>
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute top-2 right-2">
                                                        <div className="w-5 h-5 bg-sky-500 rounded-full flex items-center justify-center">
                                                            <Check size={12} className="text-white" />
                                                        </div>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-2 text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                        <p className="text-gray-500 font-medium">No reporting methods available</p>
                                        <p className="text-xs text-gray-400 mt-1">Please add methods in the Admin Panel first</p>
                                    </div>
                                )}
                            </div>
                            {(formData.enabledMethods || []).length === 0 && (
                                <p className="text-xs text-red-500 mt-2 font-bold uppercase tracking-tight">Please select at least one method</p>
                            )}
                        </div>
                    </div>
                </form>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        className="font-bold uppercase tracking-wider text-xs"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        leftIcon={isSaving ? <Check className="animate-pulse" size={18} /> : <Save size={18} />}
                        disabled={(formData.enabledMethods || []).length === 0 || isSaving}
                        className="font-bold uppercase tracking-wider text-xs bg-sky-500 hover:bg-sky-600 text-white shadow-lg"
                    >
                        {isSaving ? 'Saving...' : (initialEntity ? 'Update Entity' : 'Create Entity')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

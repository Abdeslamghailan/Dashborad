import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Search, Filter, Calendar, History, Trash2, Download } from 'lucide-react';
import { ChangeHistory } from '../history/ChangeHistory';

export const HistoryTab: React.FC = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">System Audit Logs</h2>
                    <p className="text-gray-500">Track all changes across entities, users, and configurations</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
                        <Download size={18} />
                        Export Logs
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                {/* We use showExpanded to keep it open in the admin panel */}
                <ChangeHistory limit={100} showExpanded={true} />
            </div>
        </motion.div>
    );
};

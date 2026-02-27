import React from 'react';
import { formatNumber } from '../../utils/reporting';

interface MetricCardProps {
    value: number;
    label: string;
    type: 'spam' | 'inbox';
}

export const MetricCard: React.FC<MetricCardProps> = ({ value, label, type }) => (
    <div className={`p-4 rounded-lg border shadow-sm text-center ${type === 'spam' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
        }`}>
        <div className={`font-bold text-2xl ${type === 'spam' ? 'text-red-600' : 'text-green-600'}`}>
            {formatNumber(value)}
        </div>
        <div className={`text-xs uppercase mt-1 ${type === 'spam' ? 'text-red-800' : 'text-green-800'}`}>
            {label}
        </div>
    </div>
);

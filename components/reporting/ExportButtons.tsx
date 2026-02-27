import React from 'react';
import { FileText, FileSpreadsheet } from 'lucide-react';

interface ExportButtonsProps {
    data: any;
    filename: string;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({ data, filename }) => {
    const exportToCSV = () => {
        if (!data || !data.combined_actions) return;
        const headers = ['Timestamp', 'Entity', 'Profile', 'Session', 'Category', 'Action Type', 'Form Name'];
        const rows = data.combined_actions.map((a: any) => [
            a.timestamp,
            a.entity,
            a.profile,
            a.session,
            a.category,
            a.action_type,
            a.form_name
        ]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex gap-2">
            <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
                <FileText size={16} className="text-rose-500" />
                PDF Report
            </button>
            <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
                <FileSpreadsheet size={16} className="text-emerald-500" />
                Export CSV
            </button>
        </div>
    );
};

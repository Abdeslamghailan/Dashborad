import React, { useState, useMemo } from 'react';
import { Copy, Check } from 'lucide-react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import { formatNumber, formatPercentage } from '../../utils/reporting';

interface DataItem {
    name: string;
    count: number;
}

interface ChartTableCardProps {
    title: string;
    icon: string;
    data: DataItem[];
    colors: string[];
    type: 'spam' | 'inbox';
    tableHeaders?: string[];
}

export const ChartTableCard: React.FC<ChartTableCardProps> = ({
    title,
    icon,
    data,
    colors,
    type,
    tableHeaders = ['Name', 'Count', 'Percentage']
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [copied, setCopied] = useState(false);

    const headerBg = type === 'spam' ? 'bg-red-500' : 'bg-green-500';
    const headerLight = type === 'spam' ? 'bg-red-100' : 'bg-green-100';
    const textColor = type === 'spam' ? 'text-red-700' : 'text-green-700';

    const filteredData = useMemo(() => {
        if (!searchTerm) return data;
        return data.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [data, searchTerm]);

    const totalCount = data.reduce((sum, item) => sum + item.count, 0);
    const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const displayedTotal = paginatedData.reduce((sum, item) => sum + item.count, 0);

    // Chart data (top 5 + others)
    const chartData = useMemo(() => {
        const sorted = [...data].sort((a, b) => b.count - a.count);
        const top5 = sorted.slice(0, 5);
        const others = sorted.slice(5);
        const othersCount = others.reduce((sum, item) => sum + item.count, 0);

        const result = top5.map((item, i) => ({
            name: item.name,
            value: item.count,
            color: colors[i % colors.length]
        }));

        if (othersCount > 0) {
            result.push({ name: `Other (${others.length})`, value: othersCount, color: colors[5] || '#94a3b8' });
        }
        return result;
    }, [data, colors]);

    const copyData = () => {
        const text = filteredData.map(item => item.name).join('\n');
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="rounded-xl border overflow-hidden shadow-lg bg-white">
            <div className={`${headerBg} px-4 py-3 text-sm font-semibold text-white uppercase`}>
                {icon} {title}
            </div>

            <div className="p-4">
                {/* Chart */}
                <div className="h-48 w-full mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => [formatNumber(value), 'Count']} />
                            <Legend layout="vertical" align="right" verticalAlign="middle" formatter={(value) => <span className="text-xs">{value}</span>} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-2 mb-3 border-b pb-3">
                    <div className="flex-1 min-w-[150px]">
                        <input
                            type="text"
                            placeholder={`Search ${title.toLowerCase()}...`}
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className={`w-full px-3 py-2 border rounded text-xs ${type === 'spam' ? 'border-red-200 focus:border-red-400' : 'border-green-200 focus:border-green-400'}`}
                        />
                    </div>
                    <button
                        onClick={copyData}
                        className={`${headerBg} text-white px-3 py-2 rounded text-xs flex items-center gap-1`}
                    >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <span className="text-xs text-gray-500">Rows per page:</span>
                    <select
                        value={rowsPerPage}
                        onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                        className="border rounded px-2 py-1 text-xs"
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                    </select>
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-2 py-1 border rounded text-xs disabled:opacity-50">
                        ← Prev
                    </button>
                    <span className="text-xs">Page: {currentPage}/{totalPages || 1}</span>
                    <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-2 py-1 border rounded text-xs disabled:opacity-50">
                        Next →
                    </button>
                </div>

                {/* Table */}
                <table className="w-full text-xs border-collapse border border-gray-200">
                    <thead>
                        <tr className={headerLight}>
                            {tableHeaders.map((h, i) => (
                                <th key={i} className={`p-2 border border-gray-200 ${textColor} ${i > 0 ? 'text-center' : 'text-left'}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="p-2 border border-gray-200">
                                    <div className="flex items-center gap-2">
                                        {item.name}
                                    </div>
                                </td>
                                <td className="p-2 text-center border border-gray-200">{formatNumber(item.count)}</td>
                                <td className="p-2 text-center border border-gray-200">{formatPercentage(item.count, totalCount)}%</td>
                            </tr>
                        ))}
                        <tr className={`font-bold ${headerLight}`}>
                            <td className="p-2 border border-gray-200">Total (Displayed)</td>
                            <td className="p-2 text-center border border-gray-200">{formatNumber(displayedTotal)}</td>
                            <td className="p-2 text-center border border-gray-200">{formatPercentage(displayedTotal, totalCount)}%</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

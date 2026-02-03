import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    Upload, Search, Download, FileText, Copy, BarChart3, Clock,
    AlertCircle, ChevronRight, FileSpreadsheet, ExternalLink, Filter,
    X, CloudUpload, Activity, Zap, Shield, Database, Globe, ArrowRight,
    CheckCircle2, Info
} from 'lucide-react';
import { Button } from './ui/Button';

interface DropData {
    id: string;
    number: number;
    time: string;
    ips: string[];
}

export const ReportIPExtractor: React.FC = () => {
    const [drops, setDrops] = useState<DropData[]>([]);
    const [activeTab, setActiveTab] = useState<'drops' | 'statistics'>('drops');
    const [searchTerm, setSearchTerm] = useState('');
    const [statsSearchTerm, setStatsSearchTerm] = useState('');
    const [occurrenceFilter, setOccurrenceFilter] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const parseContent = async (content: string) => {
        setIsProcessing(true);
        // Simulate minor processing delay for "intelligent" feel
        await new Promise(resolve => setTimeout(resolve, 800));

        // Improved regex-based IP extraction
        const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
        const finalDrops = content.split(/DROP\s+\d+/i).slice(1).map((section, idx) => {
            const timeMatch = section.match(/(\d{2}:\d{2})/);
            const foundIps = section.match(ipRegex) || [];
            return {
                id: `DROP ${idx + 1}`,
                number: idx + 1,
                time: timeMatch ? timeMatch[1] : '--:--',
                ips: foundIps
            };
        });

        if (finalDrops.length > 0) {
            setDrops(finalDrops);
            setActiveTab('drops');
        }
        setIsProcessing(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => parseContent(event.target?.result as string);
        reader.readAsText(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => parseContent(event.target?.result as string);
            reader.readAsText(file);
        }
    };

    const stats = useMemo(() => {
        const ipCounts: Record<string, number> = {};
        drops.forEach(drop => drop.ips.forEach(ip => { ipCounts[ip] = (ipCounts[ip] || 0) + 1; }));
        return Object.entries(ipCounts)
            .map(([ip, count]) => ({ ip, count }))
            .sort((a, b) => b.count - a.count);
    }, [drops]);

    const filteredStats = useMemo(() => {
        return stats.filter(stat => {
            const matchesSearch = stat.ip.toLowerCase().includes(statsSearchTerm.toLowerCase());
            const matchesOccurrence = occurrenceFilter ? stat.count.toString() === occurrenceFilter : true;
            return matchesSearch && matchesOccurrence;
        });
    }, [stats, statsSearchTerm, occurrenceFilter]);

    const globalStats = useMemo(() => {
        if (drops.length === 0) return null;
        const totalIps = drops.reduce((acc, d) => acc + d.ips.length, 0);
        const uniqueIps = stats.length;
        const peakDrop = [...drops].sort((a, b) => b.ips.length - a.ips.length)[0];
        return { totalIps, uniqueIps, peakDrop };
    }, [drops, stats]);


    const maxOccurrences = useMemo(() => stats.length > 0 ? stats[0].count : 0, [stats]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const exportToCSV = () => {
        if (filteredStats.length === 0) return;

        // Create CSV header
        const headers = ['#', 'IP Address', 'Count', 'Distribution (%)'];
        const csvRows = [headers.join(',')];

        // Add data rows
        filteredStats.forEach((stat, idx) => {
            const percentage = Math.round((stat.count / maxOccurrences) * 100);
            const row = [
                idx + 1,
                stat.ip,
                stat.count,
                percentage
            ];
            csvRows.push(row.join(','));
        });

        // Create CSV content
        const csvContent = csvRows.join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ip_statistics_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const copyTableToClipboard = () => {
        if (filteredStats.length === 0) return;

        // Create formatted table text
        const headers = '#\tIP Address\tCount\tDistribution (%)';
        const rows = filteredStats.map((stat, idx) => {
            const percentage = Math.round((stat.count / maxOccurrences) * 100);
            return `${idx + 1}\t${stat.ip}\t${stat.count}\t${percentage}%`;
        });

        const tableText = [headers, ...rows].join('\n');
        navigator.clipboard.writeText(tableText);
    };

    const exportToHTML = () => {
        if (drops.length === 0) return;

        const date = new Date().toLocaleString();

        // Build HTML content
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IP Extractor CMHW - Export Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f8fafc;
            padding: 2rem;
            color: #1f2937;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { 
            text-align: center; 
            margin-bottom: 2rem;
            padding: 2rem;
            background: white;
            border-radius: 1rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .header h1 { 
            font-size: 2.5rem; 
            font-weight: 900;
            color: #111827;
            margin-bottom: 0.5rem;
        }
        .header .brand { color: #5c7cfa; }
        .header .subtitle { 
            color: #6b7280; 
            font-size: 0.875rem;
            font-weight: 500;
        }
        .stats-bar {
            display: flex;
            gap: 1rem;
            justify-content: center;
            margin: 1.5rem 0;
            flex-wrap: wrap;
        }
        .stat-card {
            background: white;
            padding: 1rem 1.5rem;
            border-radius: 1rem;
            border: 1px solid #e5e7eb;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .stat-label {
            font-size: 0.625rem;
            font-weight: 700;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.25rem;
        }
        .stat-value {
            font-size: 1.5rem;
            font-weight: 900;
            color: #111827;
        }
        .stat-value.primary { color: #5c7cfa; }
        .section {
            background: white;
            border-radius: 1rem;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .section-title {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 1.125rem;
            font-weight: 700;
            color: #374151;
            margin-bottom: 1rem;
            padding-bottom: 0.75rem;
            border-bottom: 2px solid #e5e7eb;
        }
        .nav-bar {
            position: sticky;
            top: 1rem;
            z-index: 100;
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(8px);
            padding: 0.75rem;
            border-radius: 1rem;
            margin-bottom: 2rem;
            display: flex;
            justify-content: center;
            gap: 1rem;
            border: 1px solid #e5e7eb;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .nav-link {
            text-decoration: none;
            color: #6b7280;
            font-weight: 700;
            font-size: 0.875rem;
            padding: 0.5rem 1rem;
            border-radius: 0.75rem;
            transition: all 0.2s;
        }
        .nav-link:hover {
            color: #5c7cfa;
            background: #f3f4f6;
        }
        .nav-link.active {
            background: #5c7cfa;
            color: white;
            box-shadow: 0 4px 12px rgba(92, 124, 250, 0.2);
        }
        html { scroll-behavior: smooth; }
        @media print {
            .nav-bar { display: none; }
        }
        .drops-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1rem;
        }
        .drop-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-top: 4px solid #5c7cfa;
            border-radius: 1rem;
            padding: 1rem;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .drop-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.75rem;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid #f3f4f6;
        }
        .drop-badge {
            background: #4f46e5;
            color: white;
            padding: 0.25rem 0.625rem;
            border-radius: 0.5rem;
            font-size: 0.625rem;
            font-weight: 700;
            text-transform: uppercase;
        }
        .drop-time {
            font-size: 0.875rem;
            font-weight: 700;
            color: #374151;
        }
        .drop-count {
            background: #eef2ff;
            color: #5c7cfa;
            padding: 0.25rem 0.5rem;
            border-radius: 0.5rem;
            font-size: 0.625rem;
            font-weight: 700;
            border: 1px solid #c7d2fe;
        }
        .ip-list {
            background: #f9fafb;
            border-radius: 0.5rem;
            padding: 0.75rem;
            max-height: 300px;
            overflow-y: auto;
        }
        .ip-item {
            background: white;
            border: 1px solid #e5e7eb;
            padding: 0.5rem 0.75rem;
            margin-bottom: 0.25rem;
            border-radius: 0.5rem;
            font-family: 'Courier New', monospace;
            font-size: 0.75rem;
            font-weight: 700;
            color: #4b5563;
        }
        .stats-table {
            width: 100%;
            border-collapse: collapse;
        }
        .stats-table thead {
            background: #f9fafb;
        }
        .stats-table th {
            padding: 0.75rem 1.5rem;
            text-align: left;
            font-size: 0.625rem;
            font-weight: 700;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid #e5e7eb;
        }
        .stats-table td {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid #f3f4f6;
        }
        .stats-table tr:hover {
            background: #f9fafb;
        }
        .ip-address {
            font-family: 'Courier New', monospace;
            font-size: 0.875rem;
            font-weight: 700;
            color: #374151;
        }
        .count-badge {
            background: #eef2ff;
            color: #4f46e5;
            padding: 0.25rem 0.75rem;
            border-radius: 0.5rem;
            font-size: 0.75rem;
            font-weight: 700;
            border: 1px solid #c7d2fe;
            display: inline-block;
        }
        .progress-bar {
            background: #e5e7eb;
            height: 0.5rem;
            border-radius: 9999px;
            overflow: hidden;
            width: 8rem;
        }
        .progress-fill {
            background: linear-gradient(to right, #6366f1, #4f46e5);
            height: 100%;
            border-radius: 9999px;
            transition: width 0.3s;
        }
        .footer {
            text-align: center;
            margin-top: 2rem;
            padding: 1rem;
            color: #9ca3af;
            font-size: 0.75rem;
        }
        @media print {
            body { background: white; padding: 0; }
            .section { box-shadow: none; page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>IP Extractor <span class="brand">CMHW</span></h1>
            <p class="subtitle">Extract and analyze IP addresses from network logs with precision</p>
            <div class="stats-bar">
                <div class="stat-card">
                    <div class="stat-label">Total IPs</div>
                    <div class="stat-value">${globalStats?.totalIps || 0}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Unique IPs</div>
                    <div class="stat-value primary">${globalStats?.uniqueIps || 0}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Peak Drop</div>
                    <div class="stat-value">${globalStats?.peakDrop?.ips.length || 0}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Total Drops</div>
                    <div class="stat-value">${drops.length}</div>
                </div>
            </div>
            <p class="subtitle">Generated on ${date}</p>
        </div>

        <nav class="nav-bar">
            <a href="#drops" class="nav-link">📊 Drops View</a>
            <a href="#stats" class="nav-link">📈 Statistics View</a>
        </nav>

        <div class="section" id="drops">
            <h2 class="section-title">📊 Drops (${drops.length})</h2>
            <div class="drops-grid">
                ${drops.map(drop => `
                    <div class="drop-card">
                        <div class="drop-header">
                            <div style="display: flex; align-items: center; gap: 0.625rem;">
                                <span class="drop-badge">Drop ${drop.number}</span>
                                <span class="drop-time">${drop.time}</span>
                            </div>
                            <span class="drop-count">${drop.ips.length}</span>
                        </div>
                        <div class="ip-list">
                            ${drop.ips.map(ip => `<div class="ip-item">${ip}</div>`).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="section" id="stats">
            <h2 class="section-title">📈 IP Statistics (${stats.length})</h2>
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>IP Address</th>
                        <th style="text-align: center;">Count</th>
                        <th style="text-align: right;">Distribution</th>
                    </tr>
                </thead>
                <tbody>
                    ${stats.map((stat, idx) => {
            const percentage = Math.round((stat.count / maxOccurrences) * 100);
            return `
                            <tr>
                                <td style="color: #9ca3af; font-weight: 700;">${idx + 1}</td>
                                <td><span class="ip-address">${stat.ip}</span></td>
                                <td style="text-align: center;"><span class="count-badge">${stat.count}</span></td>
                                <td style="text-align: right;">
                                    <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem;">
                                        <span style="font-size: 0.75rem; font-weight: 700; color: #9ca3af; min-width: 3rem;">${percentage}%</span>
                                        <div class="progress-bar">
                                            <div class="progress-fill" style="width: ${percentage}%;"></div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>IP Extractor CMHW - Network Intelligence Tool</p>
        </div>
    </div>

    <script>
        window.addEventListener('scroll', () => {
            const sections = document.querySelectorAll('.section');
            const navLinks = document.querySelectorAll('.nav-link');
            
            let current = '';
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                if (pageYOffset >= sectionTop - 100) {
                    current = section.getAttribute('id');
                }
            });

            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + current) {
                    link.classList.add('active');
                }
            });
        });
    </script>
</body>
</html>
        `;

        // Create and download HTML file
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `IP_Extractor_CMHW_${new Date().toISOString().split('T')[0]}.html`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen py-4 sm:py-6 px-2 sm:px-4 font-sans bg-[#f8fafc] animate-in fade-in duration-500">
            <div className="max-w-[1400px] mx-auto space-y-4 sm:space-y-6">
                {/* Header Section */}
                <div className="text-center space-y-2">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">
                        IP Extractor <span className="text-[#5c7cfa]">CMHW</span>
                    </h1>
                    <p className="text-gray-500 text-xs sm:text-sm font-medium">
                        Extract and analyze IP addresses from network logs with precision
                    </p>
                </div>

                {/* Stats Bar */}
                {drops.length > 0 && globalStats && (
                    <div className="flex justify-center gap-3 flex-wrap">
                        <div className="bg-white px-6 py-3 rounded-2xl border border-gray-200 shadow-sm">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Total</div>
                            <div className="text-2xl font-black text-gray-900">{globalStats.totalIps}</div>
                        </div>
                        <div className="bg-white px-6 py-3 rounded-2xl border border-gray-200 shadow-sm">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Unique</div>
                            <div className="text-2xl font-black text-[#5c7cfa]">{globalStats.uniqueIps}</div>
                        </div>
                        <div className="bg-white px-6 py-3 rounded-2xl border border-gray-200 shadow-sm">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Peak</div>
                            <div className="text-2xl font-black text-gray-900">{globalStats.peakDrop.ips.length}</div>
                        </div>
                    </div>
                )}

                {/* Upload Area */}
                {drops.length === 0 && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`
                            relative overflow-hidden group border-2 border-dashed rounded-2xl p-16 transition-all cursor-pointer
                            ${isDragging ? 'border-indigo-400 bg-indigo-50/30 scale-[0.98]' : 'border-gray-200 hover:border-indigo-300'}
                            ${isProcessing ? 'pointer-events-none opacity-70' : ''}
                        `}
                        >
                            <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.log" onChange={handleFileUpload} />
                            <div className="relative z-10 flex flex-col items-center gap-6">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${isProcessing ? 'bg-indigo-600' : 'bg-indigo-50 group-hover:bg-indigo-100'}`}>
                                    {isProcessing ? (
                                        <Activity className="w-8 h-8 text-white animate-pulse" />
                                    ) : (
                                        <CloudUpload className={`w-8 h-8 transition-colors duration-300 ${isDragging ? 'text-indigo-600' : 'text-[#5c7cfa]'}`} />
                                    )}
                                </div>
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-bold text-gray-900">
                                        {isProcessing ? 'Processing...' : 'Upload Log File'}
                                    </h3>
                                    <p className="text-gray-500 text-sm font-medium">
                                        {isProcessing ? 'Extracting IP addresses from your file' : 'Drag and drop or click to select a .txt or .log file'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Results Section */}
                {drops.length > 0 && (
                    <div className="space-y-6">
                        {/* Tabs and Controls */}
                        <div className="bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-1 w-full sm:w-auto">
                            <button
                                onClick={() => setActiveTab('drops')}
                                className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'drops' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <Database size={18} />
                                Drops ({drops.length})
                            </button>

                            <button
                                onClick={() => setActiveTab('statistics')}
                                className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'statistics' ? 'bg-[#5c7cfa] text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <BarChart3 size={18} />
                                Statistics ({stats.length})
                            </button>

                            <div className="flex items-center gap-2 sm:ml-auto">
                                <Button
                                    variant="outline"
                                    onClick={() => { setDrops([]); setSearchTerm(''); }}
                                    className="border-gray-200 text-gray-500 hover:bg-gray-50 px-4 sm:px-6 py-2.5 h-auto text-xs sm:text-sm font-bold"
                                >
                                    Reset
                                </Button>
                                <Button
                                    onClick={exportToHTML}
                                    className="bg-gradient-to-r from-orange-400 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-[0_4px_14px_0_rgba(249,115,22,0.39)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.23)] border border-transparent px-4 sm:px-6 py-2.5 h-auto text-xs sm:text-sm font-bold"
                                    leftIcon={<Download size={18} />}
                                >
                                    Export As HTML
                                </Button>
                            </div>
                        </div>


                        {activeTab === 'drops' ? (
                            <div className="space-y-6">
                                {/* Search Bar */}
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                                    <div className="relative">
                                        <div className="absolute left-4 top-4 pointer-events-none">
                                            <Search className="h-5 w-5 text-gray-300" />
                                        </div>
                                        <textarea
                                            placeholder="Search IP addresses... (paste multiple IPs separated by commas, spaces, or new lines)"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            rows={2}
                                            className="block w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 transition-all resize-none"
                                        />
                                        {searchTerm && (
                                            <div className="absolute right-3 top-3">
                                                <button
                                                    onClick={() => setSearchTerm('')}
                                                    className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                                                    title="Clear search"
                                                >
                                                    <X size={16} className="text-gray-400 hover:text-gray-600" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {searchTerm && (
                                        <div className="mt-2 text-xs text-gray-500 font-medium">
                                            Searching for {searchTerm.split(/[\s,\n]+/).filter(Boolean).length} IP address(es)
                                        </div>
                                    )}
                                </div>

                                {/* Drop Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                    {drops.map((drop, idx) => {
                                        const keywords = searchTerm.toLowerCase().split(/[\s,\n]+/).filter(Boolean);
                                        const filteredIps = searchTerm
                                            ? drop.ips.filter(ip => keywords.some(part => ip.toLowerCase().includes(part)))
                                            : drop.ips;

                                        if (searchTerm && filteredIps.length === 0) return null;

                                        return (
                                            <div key={idx} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col h-full border-t-4 border-t-[#5c7cfa]">
                                                {/* Header */}
                                                <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="px-2.5 py-1 bg-indigo-600 rounded-lg text-[10px] font-bold text-white uppercase tracking-wide">
                                                            Drop {drop.number}
                                                        </div>
                                                        <span className="text-sm font-bold text-gray-700">{drop.time}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="px-2 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-[10px] font-bold text-[#5c7cfa]">
                                                            {filteredIps.length}
                                                        </div>
                                                        <button
                                                            onClick={() => copyToClipboard(filteredIps.join('\n'))}
                                                            className="p-1.5 text-gray-400 hover:text-[#5c7cfa] rounded-md transition-all duration-200"
                                                            title="Copy All IPs"
                                                        >
                                                            <Copy size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* IP List */}
                                                <div className="flex-grow overflow-hidden bg-gray-50">
                                                    <div className="max-h-[340px] overflow-y-auto p-3 space-y-1">
                                                        {filteredIps.map((ip, ipIdx) => {
                                                            const isHighlighted = keywords.some(k => ip.toLowerCase().includes(k));
                                                            return (
                                                                <div
                                                                    key={ipIdx}
                                                                    className={`
                                                                        group/ip flex items-center justify-between gap-2 py-2 px-3 rounded-lg transition-all duration-200
                                                                        ${isHighlighted
                                                                            ? 'bg-indigo-50 border border-indigo-100'
                                                                            : 'bg-white border border-gray-100 hover:border-gray-200'
                                                                        }
                                                                    `}
                                                                >
                                                                    <span className={`
                                                                        text-xs font-mono font-bold truncate transition-colors
                                                                        ${isHighlighted
                                                                            ? 'text-indigo-700'
                                                                            : 'text-gray-600'
                                                                        }
                                                                    `}>
                                                                        {ip}
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            copyToClipboard(ip);
                                                                        }}
                                                                        className="opacity-0 group-hover/ip:opacity-100 p-1 hover:bg-gray-50 rounded transition-all duration-200 flex-shrink-0"
                                                                        title="Copy IP"
                                                                    >
                                                                        <Copy size={11} className="text-gray-400 hover:text-indigo-600" />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Statistics View */}
                                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                    {/* Header */}
                                    <div className="p-6 border-b border-gray-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="space-y-1">
                                                <h2 className="text-lg font-bold text-gray-700">Global IP Statistics</h2>
                                                <p className="text-gray-400 text-xs font-medium">Aggregated occurrences across all parsed drops</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Button
                                                    variant="success"
                                                    onClick={exportToCSV}
                                                    className="px-4 py-2 h-auto text-xs font-bold flex items-center gap-2"
                                                    leftIcon={<Download size={16} />}
                                                >
                                                    Export Excel (CSV)
                                                </Button>
                                                <Button
                                                    onClick={copyTableToClipboard}
                                                    variant="outline"
                                                    className="border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 h-auto text-xs font-bold flex items-center gap-2"
                                                    leftIcon={<Copy size={16} />}
                                                >
                                                    Copy List
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Search Filters */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Search IPs / Values */}
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">
                                                    Search IPs / Values
                                                </label>
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                                                    <input
                                                        type="text"
                                                        placeholder="Paste IPs to search (multiple allowed)..."
                                                        value={statsSearchTerm}
                                                        onChange={(e) => setStatsSearchTerm(e.target.value)}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 transition-all"
                                                    />
                                                </div>
                                            </div>

                                            {/* Exact Occurrences */}
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">
                                                    Exact Occurrences
                                                </label>
                                                <div className="relative">
                                                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. 1, 3, 5"
                                                        value={occurrenceFilter}
                                                        onChange={(e) => setOccurrenceFilter(e.target.value)}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50">
                                                <tr className="border-b border-gray-100">
                                                    <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">#</th>
                                                    <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">IP Address</th>
                                                    <th className="px-6 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wide">Count</th>
                                                    <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wide">Distribution</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {filteredStats.map((stat, idx) => (
                                                    <tr key={idx} className="group hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-[10px] font-bold text-gray-500 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                                {idx + 1}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="font-mono text-sm font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">{stat.ip}</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center justify-center">
                                                                <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                                    {stat.count}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex justify-end items-center gap-3">
                                                                <span className="text-xs font-bold text-gray-400 min-w-[3rem] text-right">{Math.round((stat.count / maxOccurrences) * 100)}%</span>
                                                                <div className="w-32 bg-gray-100 h-2 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                                                                        style={{ width: `${(stat.count / maxOccurrences) * 100}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

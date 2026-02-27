import React, { useState, useMemo } from 'react';
import {
    Activity, Box, Filter, RotateCcw, Network, Calendar,
    FileText, FileSpreadsheet, List, Zap, Globe, Mail,
    TrendingUp, Clock, AlertTriangle, RefreshCw, ChevronDown,
    ShieldAlert, PieChart as PieChartIcon, Ban, Inbox
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import { MultiSelect } from './reporting/Filters/MultiSelect';
import { QuickHourFilter } from './reporting/Filters/QuickHourFilter';
import { DatePicker } from './reporting/Filters/DatePicker';
import { MetricCard } from './reporting/MetricCard';
import { ExecutiveInsights } from './reporting/ExecutiveInsights';
import { TrendAnalysis } from './reporting/TrendAnalysis';
import { ChartTableCard } from './reporting/ChartTableCard';
import { SpamRelationships, InboxRelationships } from './reporting/RelationshipTables';
import { FromNameDistribution } from './reporting/FromNameDistribution';
import { SessionPerformance } from './reporting/SessionPerformance';
import { ExportButtons } from './reporting/ExportButtons';
import { RawDataViewer } from './reporting/RawDataViewer';

// Hooks & Utils
import { useDashboardData } from '../hooks/useDashboardData';
import { processDashboardStats } from '../utils/dashboardStats';

import '../styles/dashboard.css';

const SPAM_COLORS = ['#ef4444', '#f87171', '#fb923c', '#facc15', '#a855f7', '#94a3b8'];
const INBOX_COLORS = ['#10b981', '#34d399', '#60a5fa', '#818cf8', '#f472b6', '#94a3b8'];

export const DashboardReporting: React.FC = () => {
    const {
        rawData,
        apiResponse,
        isLoading,
        isRefetching,
        error,
        availableEntities,
        selectedEntities,
        setSelectedEntities,
        selectedDate,
        setSelectedDate,
        selectedHours,
        setSelectedHours,
        dnsStatus,
        setDnsStatus,
        resolvedDomainsRef,
        fetchData,
        getDefaultHour,
        getEntityFromSession
    } = useDashboardData();

    const [advancedHoursOpen, setAdvancedHoursOpen] = useState(false);
    const [showDetailedLogs, setShowDetailedLogs] = useState(false);

    const filterOptions = useMemo(() => {
        const entities = availableEntities.length > 0
            ? availableEntities.map((e: any) => ({ label: e.name, value: e.id }))
            : Array.from({ length: 16 }, (_, i) => ({ label: `CMH${i + 1}`, value: `ent_cmh${i + 1}` }));

        const hours: string[] = [];
        for (let i = 0; i < 24; i++) {
            hours.push(i.toString().padStart(2, '0'));
        }
        return { entities, hours };
    }, [availableEntities]);

    const processedData = useMemo(() => {
        return processDashboardStats(
            rawData,
            selectedEntities,
            selectedHours,
            selectedDate,
            availableEntities,
            getEntityFromSession
        );
    }, [rawData, selectedEntities, selectedHours, selectedDate, availableEntities]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                    <p className="text-gray-500 font-medium">Loading real-time analytics...</p>
                </div>
            </div>
        );
    }

    if (error || !processedData) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 text-center max-w-md">
                    <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-rose-900 mb-2">Connection Error</h3>
                    <p className="text-rose-700 mb-4">{error || 'Failed to process data'}</p>
                    <button onClick={() => window.location.reload()} className="px-4 py-2 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8">
            {/* Sticky Navigation & Filter Toolbar */}
            <nav className="sticky top-0 z-[1000] bg-white/80 backdrop-blur-md border-b border-slate-200/60 transition-all duration-300">
                <div className="max-w-[1800px] mx-auto px-4 h-14 flex items-center justify-between gap-4 flex-nowrap">
                    <div className="flex items-center gap-1 flex-nowrap flex-shrink-0">
                        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 rounded-lg text-slate-500 mr-1">
                            <Activity size={14} className="text-blue-500" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Navigate</span>
                        </div>
                        {[
                            { id: 'overview', label: 'Overview', icon: <PieChartIcon size={14} />, color: 'blue' },
                            { id: 'forms', label: 'Forms', icon: <FileText size={14} />, color: 'purple' },
                            { id: 'actions', label: 'Actions', icon: <Zap size={14} />, color: 'amber' },
                            { id: 'domains', label: 'Domains', icon: <Globe size={14} />, color: 'emerald' },
                            { id: 'relationships', label: 'Relationships', icon: <Network size={14} />, color: 'rose' },
                            { id: 'distribution', label: 'Distribution', icon: <TrendingUp size={14} />, color: 'cyan' },
                            { id: 'raw-data', label: 'Raw Data', icon: <List size={14} />, color: 'slate' },
                        ].map((section) => (
                            <button
                                key={section.id}
                                onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                className={`px-2.5 py-1.5 text-[11px] font-bold text-slate-600 rounded-lg transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap group`}
                            >
                                <span className={`text-${section.color}-500 group-hover:text-${section.color}-600 transition-colors`}>{section.icon}</span>
                                {section.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 flex-nowrap flex-shrink-0">
                        <div className="w-16 flex justify-end">
                            <AnimatePresence>
                                {isRefetching && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 5 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 5 }}
                                        className="flex items-center gap-1.5 text-blue-600"
                                    >
                                        <RefreshCw size={12} className="animate-spin" />
                                        <span className="text-[9px] font-black uppercase tracking-tighter">Updating</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="h-8 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent mx-1" />

                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200/60 shadow-sm">
                            <Filter size={14} className="text-indigo-500" />
                            <span className="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">Filters</span>
                        </div>

                        <div className="w-[140px] flex-shrink-0">
                            <DatePicker date={selectedDate} onChange={setSelectedDate} />
                        </div>

                        <div className="w-[120px] flex-shrink-0">
                            <MultiSelect label="Entities" options={filterOptions.entities} selected={selectedEntities} onChange={setSelectedEntities} icon={Box} disableQuickSelect={true} />
                        </div>

                        <div className="flex-shrink-0 relative">
                            <QuickHourFilter
                                selectedHours={selectedHours}
                                onChange={setSelectedHours}
                                onOpenAdvanced={() => setAdvancedHoursOpen(true)}
                            />
                            <div className="absolute top-0 right-0 w-0 h-0">
                                <MultiSelect
                                    label="Hours"
                                    options={filterOptions.hours}
                                    selected={selectedHours}
                                    onChange={setSelectedHours}
                                    icon={Clock}
                                    isExternalOpen={advancedHoursOpen}
                                    onExternalClose={() => setAdvancedHoursOpen(false)}
                                />
                            </div>
                        </div>

                        <div className="w-24 flex justify-end ml-2">
                            <button
                                onClick={() => fetchData(true)}
                                disabled={isRefetching}
                                className="flex items-center gap-1.5 px-2 py-1.5 bg-blue-500 text-white rounded-lg text-[9px] font-bold uppercase tracking-wide hover:bg-blue-600 transition-all duration-200 shadow-sm whitespace-nowrap disabled:opacity-50"
                            >
                                <RefreshCw size={12} className={`stroke-[3] ${isRefetching ? 'animate-spin' : ''}`} />
                                <span>Refresh</span>
                            </button>
                        </div>

                        <div className="w-20 flex justify-end">
                            <AnimatePresence>
                                {(selectedEntities.length > 0 ||
                                    selectedHours.length !== 1 ||
                                    selectedHours[0] !== getDefaultHour() ||
                                    (selectedDate && selectedDate !== new Date().toISOString().split('T')[0])) && (
                                        <button
                                            onClick={() => {
                                                setSelectedEntities([]);
                                                setSelectedHours([getDefaultHour()]);
                                                setSelectedDate(new Date().toISOString().split('T')[0]);
                                            }}
                                            className="flex items-center gap-1.5 px-2 py-1.5 bg-rose-500 text-white rounded-lg text-[9px] font-bold uppercase tracking-wide hover:bg-rose-600 transition-all duration-200 shadow-sm whitespace-nowrap"
                                        >
                                            <RotateCcw size={12} className="stroke-[3]" />
                                            <span>Reset</span>
                                        </button>
                                    )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Alerts Section */}
            {processedData.alerts.length > 0 && (
                <div className="mb-6 space-y-3">
                    {processedData.alerts.map((alert: any, idx: number) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex items-center gap-3 p-4 rounded-xl border ${alert.type === 'danger' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-amber-50 border-amber-100 text-amber-800'
                                }`}
                        >
                            <AlertTriangle size={20} className={alert.type === 'danger' ? 'text-red-500' : 'text-amber-500'} />
                            <div>
                                <span className="font-bold">{alert.title}:</span> {alert.message}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* AI Insights */}
            <ExecutiveInsights insights={processedData.insights} />

            {/* Header */}
            <div id="overview" className="bg-white rounded-xl shadow-sm border p-4 mb-5 scroll-mt-32">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Desktop Report Details</h1>
                        <p className="text-gray-500 text-sm">SPAM & INBOX</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-6 text-center">
                            <div><div className="text-gray-500 text-xs uppercase font-semibold">Entity</div><div className="text-blue-600 font-bold">{processedData.displayEntity}</div></div>
                            <div className="h-8 w-px bg-gray-300"></div>
                            <div><div className="text-gray-500 text-xs uppercase font-semibold">Hour</div><div className="text-gray-900 font-bold">{processedData.displayHour}</div></div>
                            <div className="h-8 w-px bg-gray-300"></div>
                            <div><div className="text-gray-500 text-xs uppercase font-semibold">Date</div><div className="text-gray-900 font-bold">{processedData.displayDate}</div></div>
                        </div>
                        <div className="h-8 w-px bg-gray-300 hidden lg:block"></div>
                        <ExportButtons data={rawData} filename={`Dashboard_Report_${processedData.displayEntity}`} />
                    </div>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-5">
                <MetricCard value={processedData.stats.spamActions} label="Spam Actions" type="spam" />
                <MetricCard value={processedData.stats.spamForms} label="Spam Froms" type="spam" />
                <MetricCard value={processedData.stats.spamDomains} label="Spam Domains" type="spam" />
                <MetricCard value={processedData.stats.inboxActions} label="Inbox Actions" type="inbox" />
                <MetricCard value={processedData.stats.inboxForms} label="Inbox Froms" type="inbox" />
                <MetricCard value={processedData.stats.inboxDomains} label="Inbox Domains" type="inbox" />
            </div>

            {/* Trend Analysis */}
            <TrendAnalysis data={processedData.trendData} />

            {/* Desktop Reporting Dashboard */}
            <div className="bg-white rounded-xl border shadow-sm mb-5">
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-3 font-semibold text-sm rounded-t-xl">
                    Desktop Reporting Dashboard
                </div>
                <div className="p-5">
                    {/* Spam & Inbox Forms */}
                    <div id="forms" className="scroll-mt-20">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="text-xl">📝</span> Forms Distribution
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
                            <ChartTableCard title="Top Spam Forms Distribution" icon="🚫" data={processedData.spamForms} colors={SPAM_COLORS} type="spam" tableHeaders={['From Name', 'Count', 'Percentage']} />
                            <ChartTableCard title="Top Inbox Forms Distribution" icon="👤" data={processedData.inboxForms} colors={INBOX_COLORS} type="inbox" tableHeaders={['From Name', 'Count', 'Percentage']} />
                        </div>
                    </div>

                    <hr className="my-6" />

                    {/* Inbox Actions */}
                    <div id="actions" className="mb-8 scroll-mt-20">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="text-xl">📬</span> Actions Distribution
                        </h3>
                        <ChartTableCard title="Inbox Actions Distribution" icon="📬" data={processedData.inboxActionTypes} colors={INBOX_COLORS} type="inbox" tableHeaders={['Action Type', 'Count', 'Percentage']} />
                    </div>

                    <hr className="my-6" />

                    {/* Domains */}
                    <div id="domains" className="scroll-mt-20">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="text-xl">🌐</span> Domains Analysis
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <ChartTableCard title="Spam Domains Analysis" icon="🌐" data={processedData.spamDomainsData} colors={SPAM_COLORS} type="spam" tableHeaders={['Domain', 'Count', 'Percentage']} />
                            <ChartTableCard title="Inbox Domains Analysis" icon="📧" data={processedData.inboxDomainsData} colors={INBOX_COLORS} type="inbox" tableHeaders={['Domain', 'Count', 'Percentage']} />
                        </div>
                    </div>
                </div>
            </div>

            {/* From Name → Domain Relationships */}
            <div id="relationships" className="mb-8 scroll-mt-20">
                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🔗</span> From Name → Domain Relationships
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full border">
                            <div className={`w-2 h-2 rounded-full ${dnsStatus === 'resolving' ? 'bg-blue-500 animate-pulse' :
                                dnsStatus === 'completed' ? 'bg-green-500' :
                                    dnsStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                                }`} />
                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                                DNS: {dnsStatus}
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                resolvedDomainsRef.current.clear();
                                setDnsStatus('idle');
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                            title="Refresh IP Addresses"
                        >
                            <RotateCcw size={16} className={dnsStatus === 'resolving' ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SpamRelationships data={processedData.spamRelationships} />
                    <InboxRelationships data={processedData.inboxRelationships} />
                </div>
            </div>

            {/* From Name Distribution */}
            <div id="distribution" className="mb-8 scroll-mt-20">
                <FromNameDistribution spamData={processedData.spamRelationships} inboxData={processedData.inboxRelationships} />
            </div>

            {/* Session Performance Section */}
            <div id="session-performance" className="scroll-mt-20">
                <SessionPerformance sessions={processedData.sessionStats.sessions} stats={processedData.sessionStats.stats} />
            </div>

            {/* Full Detailed Logs Section */}
            <div className="mt-8 mb-12">
                <button
                    onClick={() => setShowDetailedLogs(!showDetailedLogs)}
                    className="w-full flex items-center justify-between p-4 bg-white border rounded-xl shadow-sm hover:bg-gray-50 transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-100 p-2 rounded-lg text-slate-600 group-hover:bg-slate-200 transition-colors">
                            <FileText size={20} />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-gray-900 text-lg">Full Detailed Logs</h3>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Raw System Reports & Action Breakdown</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black px-2 py-1 bg-slate-100 text-slate-600 rounded uppercase border border-slate-200">
                            {showDetailedLogs ? 'Click to Hide' : 'Click to Expand'}
                        </span>
                        <ChevronDown size={20} className={`text-gray-400 transition-transform duration-300 ${showDetailedLogs ? 'rotate-180' : ''}`} />
                    </div>
                </button>

                <AnimatePresence>
                    {showDetailedLogs && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                                {/* Spam Detailed Report */}
                                <div className="bg-white border-2 border-red-100 rounded-2xl shadow-xl overflow-hidden">
                                    <div className="bg-red-500 px-6 py-4 flex items-center justify-between">
                                        <h4 className="text-white font-black text-lg uppercase tracking-tighter">Spam Detailed Report</h4>
                                        <Ban size={20} className="text-white/50" />
                                    </div>
                                    <div className="p-6 bg-slate-900 font-mono text-[11px] leading-relaxed text-red-400 h-[600px] overflow-y-auto custom-scrollbar">
                                        <pre className="whitespace-pre-wrap">{processedData.detailedLogs.spam}</pre>
                                    </div>
                                </div>

                                {/* Inbox Detailed Report */}
                                <div className="bg-white border-2 border-green-100 rounded-2xl shadow-xl overflow-hidden">
                                    <div className="bg-green-500 px-6 py-4 flex items-center justify-between">
                                        <h4 className="text-white font-black text-lg uppercase tracking-tighter">Inbox Detailed Report</h4>
                                        <Inbox size={20} className="text-white/50" />
                                    </div>
                                    <div className="p-6 bg-slate-900 font-mono text-[11px] leading-relaxed text-green-400 h-[600px] overflow-y-auto custom-scrollbar">
                                        <pre className="whitespace-pre-wrap">{processedData.detailedLogs.inbox}</pre>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Raw Data Viewer Section */}
            <div className="mt-12">
                <RawDataViewer data={apiResponse} />
            </div>
        </div>
    );
};

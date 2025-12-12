import React, { useState } from 'react';
import { Entity, ParentCategory, Profile } from '../../types';
import { dataService } from '../../services/dataService';
import {
  ChevronDown, ChevronRight, Activity, Server, ListFilter,
  Search, Copy, ArrowUpDown, ArrowUp, ArrowDown, Check,
  BarChart2, Users, AlertCircle, Layers, Trash2, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import * as XLSX from 'xlsx';

interface Props {
  entity: Entity;
}

type SortKey = 'profileName' | 'type' | 'mainIp' | 'sessionCount' | 'successCount' | 'errorCount';
type SortDirection = 'asc' | 'desc';

export const ReportingView: React.FC<Props> = ({ entity }) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [detailedSearchQueries, setDetailedSearchQueries] = useState<Record<string, string>>({});

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'sessionCount',
    direction: 'desc'
  });
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [copiedTableId, setCopiedTableId] = useState<string | null>(null);
  const [copiedDetailedTable, setCopiedDetailedTable] = useState<string | null>(null);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [newSessions, setNewSessions] = useState<Record<string, any[]>>({});
  const [updatedExistingSessions, setUpdatedExistingSessions] = useState<Record<string, Partial<Profile>>>({});
  const [updatedMirrorNames, setUpdatedMirrorNames] = useState<Record<string, string>>({});
  const [removedSessionIds, setRemovedSessionIds] = useState<Set<string>>(new Set());

  // Smart Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTarget, setImportTarget] = useState<{ catId: string, mirrorNum: number } | null>(null);
  const [importData, setImportData] = useState('');

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExistingSessionUpdate = (profileId: string, field: keyof Profile, value: string) => {
    setUpdatedExistingSessions(prev => ({
      ...prev,
      [profileId]: {
        ...prev[profileId],
        [field]: value
      }
    }));
  };

  const handleNewSessionUpdate = (categoryId: string, mirrorNum: number, sessionId: string, field: keyof Profile, value: string) => {
    const key = `${categoryId}-M${mirrorNum}`;
    setNewSessions(prev => ({
      ...prev,
      [key]: prev[key].map(s => s.id === sessionId ? { ...s, [field]: value } : s)
    }));
  };

  const handleMirrorNameChange = (catId: string, mirrorNum: number, name: string) => {
    setUpdatedMirrorNames(prev => ({
      ...prev,
      [`${catId}-${mirrorNum}`]: name
    }));
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleSearchChange = (catId: string, query: string) => {
    setSearchQueries(prev => ({ ...prev, [catId]: query }));
  };

  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const handleCopyTableData = (catId: string, Profiles: Profile[]) => {
    const headers = ['Session Name', 'Type', 'Main IP', 'Total', 'Connected', 'Blocked'];
    const rows = Profiles.map(p => [
      p.profileName,
      p.type,
      p.mainIp || '-',
      p.sessionCount || 0,
      p.successCount || 0,
      p.errorCount || 0
    ].join('\t'));

    const textToCopy = [headers.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(textToCopy);

    setCopiedTableId(catId);
    setTimeout(() => setCopiedTableId(null), 2000);
  };

  const handleExportSummary = () => {
    // Create worksheet data
    const headers = ['Metric', ...entity.reporting.parentCategories.map(cat => cat.name.replace(' REPORTING', '')), 'Totals'];
    const totalRow = ['Total', ...entity.reporting.parentCategories.map(cat => calculateCategoryTotals(cat).count), grandTotals.count];
    const connectedRow = ['Connected', ...entity.reporting.parentCategories.map(cat => calculateCategoryTotals(cat).success), grandTotals.success];
    const blockedRow = ['Blocked', ...entity.reporting.parentCategories.map(cat => calculateCategoryTotals(cat).errors), grandTotals.errors];

    const wsData = [headers, totalRow, connectedRow, blockedRow];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');

    // Generate Excel file and trigger download
    XLSX.writeFile(wb, `${entity.name}_Summary_Report.xlsx`);
  };

  const handleExportDetailedTable = (categoryName: string, profiles: Profile[]) => {
    // Create worksheet data
    const headers = ['Session Name', 'Type', 'Main IP', 'Total', 'Connected', 'Blocked'];
    const rows = profiles.map(p => [
      p.profileName,
      p.type,
      p.mainIp || 'N/A',
      p.sessionCount || 0,
      p.successCount || 0,
      p.errorCount || 0
    ]);

    const wsData = [headers, ...rows];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, categoryName.replace(' REPORTING', ''));

    // Generate Excel file and trigger download
    const fileName = `${entity.name}_${categoryName.replace(' REPORTING', '')}_Details.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleDetailedSearchChange = (tableId: string, query: string) => {
    setDetailedSearchQueries(prev => ({ ...prev, [tableId]: query }));
  };

  const handleCopyDetailedTable = (tableId: string, profiles: Profile[], type: 'principal' | 'mirror') => {
    const headers = ['Session', 'IP', 'User', 'Password'];
    const rows = profiles.map(p => [
      p.profileName,
      p.mainIp || 'N/A',
      type === 'principal' ? 'admin' : `admin_${tableId.split('-').pop()}`,
      type === 'principal' ? 'CMH1_DeskTOP' : `CMH1_MiroiR${tableId.split('-').pop()}`
    ].join('\t'));

    const textToCopy = [headers.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(textToCopy);

    setCopiedDetailedTable(tableId);
    setTimeout(() => setCopiedDetailedTable(null), 2000);
  };

  const handleAddMirrorSession = (categoryId: string, mirrorNum: number) => {
    const key = `${categoryId}-M${mirrorNum}`;
    const existingSessions = newSessions[key] || [];
    const newSessionCount = existingSessions.length + 1;

    const newSession = {
      id: `new-${Date.now()}-${newSessionCount}`,
      profileName: `New_M${mirrorNum}_Session_${newSessionCount}`,
      mainIp: '',
      user: '',
      password: '',
      isMirror: true,
      mirrorNumber: mirrorNum,
      isNew: true,
      type: 'Other',
      connected: false,
      blocked: false,
      sessionCount: 0,
      successCount: 0,
      errorCount: 0
    };

    setNewSessions(prev => ({
      ...prev,
      [key]: [...existingSessions, newSession]
    }));
  };

  const handleRemoveNewSession = (categoryId: string, mirrorNum: number, sessionId: string) => {
    const key = `${categoryId}-M${mirrorNum}`;
    setNewSessions(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter(s => s.id !== sessionId)
    }));
  };

  const handleRemoveExistingSession = (sessionId: string) => {
    if (window.confirm('Are you sure you want to remove this session? This action cannot be undone after saving.')) {
      setRemovedSessionIds(prev => new Set(prev).add(sessionId));
    }
  };

  const handleProcessImport = () => {
    if (!importTarget || !importData.trim()) return;

    const lines = importData.trim().split('\n');
    const parsedSessions: Profile[] = [];
    const { catId, mirrorNum } = importTarget;
    const key = `${catId}-M${mirrorNum}`;
    const existingSessions = newSessions[key] || [];
    let currentCount = existingSessions.length;

    lines.forEach(line => {
      // Format: Name IP User Password MirrorType
      // Split by tab or multiple spaces
      const parts = line.trim().split(/[\t\s]+/);

      if (parts.length >= 4) {
        currentCount++;
        const [name, ip, user, password] = parts;

        parsedSessions.push({
          id: `new-import-${Date.now()}-${currentCount}`,
          profileName: name,
          mainIp: ip,
          user: user,
          password: password,
          isMirror: true,
          mirrorNumber: mirrorNum,
          isNew: true,
          type: 'Other',
          connected: false,
          blocked: false,
          sessionCount: 0,
          successCount: 0,
          errorCount: 0
        });
      }
    });

    if (parsedSessions.length > 0) {
      setNewSessions(prev => ({
        ...prev,
        [key]: [...existingSessions, ...parsedSessions]
      }));
    }

    setImportData('');
    setIsImportModalOpen(false);
    setImportTarget(null);
  };

  const handleSaveChanges = async () => {
    try {
      // Deep copy entity to avoid direct mutation of props
      const updatedEntity = JSON.parse(JSON.stringify(entity));

      // Update existing sessions and add new ones
      updatedEntity.reporting.parentCategories.forEach((cat: ParentCategory) => {
        // Filter out removed sessions and update existing profiles
        cat.profiles = cat.profiles?.filter((profile: Profile) => !removedSessionIds.has(profile.id)) || [];

        cat.profiles?.forEach((profile: Profile) => {
          if (updatedExistingSessions[profile.id]) {
            Object.assign(profile, updatedExistingSessions[profile.id]);
          }
        });

        // Add new sessions
        [1, 2].forEach(mirrorNum => {
          const key = `${cat.id}-M${mirrorNum}`;
          if (newSessions[key] && newSessions[key].length > 0) {
            if (!cat.profiles) cat.profiles = [];
            // Remove isNew flag and add to profiles
            const sessionsToAdd = newSessions[key].map(({ isNew, ...rest }) => rest);
            cat.profiles.push(...sessionsToAdd);
          }

          // Update mirror names
          const nameKey = `${cat.id}-${mirrorNum}`;
          if (updatedMirrorNames[nameKey]) {
            if (!cat.mirrorNames) cat.mirrorNames = {};
            cat.mirrorNames[mirrorNum] = updatedMirrorNames[nameKey];
          }
        });
      });

      console.log('Saving updated entity:', updatedEntity);
      await dataService.saveEntity(updatedEntity);

      // Reset state and close modal
      setIsSessionModalOpen(false);
      setNewSessions({});
      setUpdatedExistingSessions({});
      setRemovedSessionIds(new Set());

      // Force reload to show changes (since we rely on props)
      window.location.reload();
    } catch (error) {
      console.error("Failed to save sessions:", error);
      alert("Failed to save changes. Please try again.");
    }
  };

  // --- Styles & Design System ---

  const getRowStyle = (type: string) => {
    const baseStyle = "transition-all duration-200 cursor-default border-b border-gray-100 last:border-b-0";
    switch (type) {
      case 'IP 1':
        return `${baseStyle} border-l-[3px] border-l-blue-500 bg-blue-50/10 hover:bg-blue-50/30`;
      case 'Offer':
        return `${baseStyle} border-l-[3px] border-l-purple-500 bg-purple-50/10 hover:bg-purple-50/30`;
      default:
        return `${baseStyle} border-l-[3px] border-l-gray-300 hover:bg-gray-50/50`;
    }
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'IP 1': return 'bg-blue-50 text-blue-700 border border-blue-100 ring-1 ring-blue-100/50';
      case 'Offer': return 'bg-purple-50 text-purple-700 border border-purple-100 ring-1 ring-purple-100/50';
      default: return 'bg-gray-100 text-gray-600 border border-gray-300';
    }
  };

  // --- Data Processing ---

  const processProfiles = (profiles: Profile[], query: string) => {
    const filtered = (profiles || []).filter(p =>
      p.profileName?.toLowerCase().includes(query.toLowerCase()) ||
      (p.mainIp && p.mainIp.includes(query))
    );

    return filtered.sort((a, b) => {
      const aValue = a[sortConfig.key] ?? '';
      const bValue = b[sortConfig.key] ?? '';

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aString = String(aValue).toLowerCase();
      const bString = String(bValue).toLowerCase();
      return sortConfig.direction === 'asc'
        ? aString.localeCompare(bString)
        : bString.localeCompare(aString);
    });
  };

  // --- Calculations ---

  const calculateCategoryTotals = (category: ParentCategory) => {
    // Only count non-mirror profiles
    const principalProfiles = (category.profiles || []).filter(p => !p.isMirror);
    return principalProfiles.reduce((acc, p) => ({
      count: acc.count + (p.sessionCount || 0),
      success: acc.success + (p.successCount || 0),
      errors: acc.errors + (p.errorCount || 0)
    }), { count: 0, success: 0, errors: 0 });
  };

  // Grand totals - deduplicated by profileName to avoid counting same session multiple times
  const grandTotals = (() => {
    // Get all non-mirror profiles from all categories
    const allProfiles = entity.reporting.parentCategories.flatMap(cat =>
      (cat.profiles || []).filter(p => !p.isMirror)
    );

    // Deduplicate by profileName - keep the first occurrence
    const uniqueProfileMap = new Map<string, Profile>();
    allProfiles.forEach(profile => {
      if (!uniqueProfileMap.has(profile.profileName)) {
        uniqueProfileMap.set(profile.profileName, profile);
      }
    });
    const uniqueProfiles = Array.from(uniqueProfileMap.values());

    return uniqueProfiles.reduce((acc, p) => ({
      count: acc.count + (p.sessionCount || 0),
      success: acc.success + (p.successCount || 0),
      errors: acc.errors + (p.errorCount || 0)
    }), { count: 0, success: 0, errors: 0 });
  })();


  // --- Sub-components ---

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig.key !== column) return <ArrowUpDown size={14} className="opacity-20 ml-1" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-indigo-600 ml-1" /> : <ArrowDown size={14} className="text-indigo-600 ml-1" />;
  };

  const Th = ({ label, column, align = 'center' }: { label: string, column: SortKey, align?: 'left' | 'center' | 'right' }) => (
    <th
      className={`px-6 py-4 text-sm font-semibold text-gray-700 cursor-pointer select-none hover:brightness-95 transition-all border border-gray-300 group ${align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center'}`}
      onClick={() => handleSort(column)}
    >
      <div className={`flex items-center gap-2 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
        {label}
        <SortIcon column={column} />
      </div>
    </th>
  );

  // Safety check
  if (!entity.reporting || !entity.reporting.parentCategories || entity.reporting.parentCategories.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <p className="text-gray-500">No reporting data available for this entity.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">

      {/* 1. Summary Matrix Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
              <BarChart2 size={22} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg tracking-tight">Report Seeds by Type</h4>
              <p className="text-sm text-gray-500 font-medium">Aggregated metrics overview</p>
            </div>
          </div>
          <Button
            variant="success"
            size="sm"
            onClick={() => handleExportSummary()}
            leftIcon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>}
          >
            Export.XLSX
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse min-w-[600px] border border-gray-200">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider border border-gray-200">Metric</th>
                {entity.reporting.parentCategories.map(cat => (
                  <th key={cat.id} className="px-6 py-4 text-center font-semibold text-gray-500 text-xs uppercase tracking-wider border border-gray-200">
                    {cat.name.replace(' REPORTING', '')}
                  </th>
                ))}
                <th className="px-6 py-4 text-center font-bold text-gray-700 text-xs uppercase tracking-wider bg-gray-100 border border-gray-200">Totals</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-5 font-medium text-gray-700 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center">
                      <Layers size={16} strokeWidth={2} />
                    </div>
                    Total
                  </div>
                </td>
                {entity.reporting.parentCategories.map(cat => (
                  <td key={cat.id} className="px-6 py-5 font-medium text-gray-600 font-mono text-center text-base border border-gray-200">
                    {calculateCategoryTotals(cat).count.toLocaleString()}
                  </td>
                ))}
                <td className="px-6 py-5 font-bold text-gray-900 bg-gray-50 font-mono text-center text-base border border-gray-200">
                  {grandTotals.count.toLocaleString()}
                </td>
              </tr>
              <tr className="hover:bg-green-50/30 transition-colors group">
                <td className="px-6 py-5 font-medium text-gray-700 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                      <Check size={16} strokeWidth={2} />
                    </div>
                    Connected
                  </div>
                </td>
                {entity.reporting.parentCategories.map(cat => (
                  <td key={cat.id} className="px-6 py-5 font-medium text-gray-600 font-mono text-center text-base border border-gray-200">
                    {calculateCategoryTotals(cat).success.toLocaleString()}
                  </td>
                ))}
                <td className="px-6 py-5 font-bold text-green-600 bg-green-50/10 font-mono text-center text-base border border-gray-200">
                  {grandTotals.success.toLocaleString()}
                </td>
              </tr>
              <tr className="hover:bg-red-50/30 transition-colors group">
                <td className="px-6 py-5 font-medium text-gray-700 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                      <AlertCircle size={16} strokeWidth={2} />
                    </div>
                    Blocked
                  </div>
                </td>
                {entity.reporting.parentCategories.map(cat => (
                  <td key={cat.id} className="px-6 py-5 font-medium text-gray-600 font-mono text-center text-base border border-gray-200">
                    {calculateCategoryTotals(cat).errors.toLocaleString()}
                  </td>
                ))}
                <td className="px-6 py-5 font-bold text-red-600 bg-red-50/10 font-mono text-center text-base border border-gray-200">
                  {grandTotals.errors.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Detailed Breakdown */}
      <div className="space-y-8">
        <div className="flex items-center gap-3 px-2">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            <ListFilter size={20} />
          </div>
          <h4 className="font-bold text-gray-900 text-xl tracking-tight">Detailed Seeds by Session</h4>
        </div>

        <div className="grid gap-8">
          {entity.reporting.parentCategories.map(cat => {
            const query = searchQueries[cat.id] || '';
            // Filter out mirror sessions (M1, M2) for this view
            const principalProfiles = cat.profiles?.filter(p => !p.isMirror && !p.profileName.includes('_M1_') && !p.profileName.includes('_M2_')) || [];
            const processedProfiles = processProfiles(principalProfiles, query);

            // Calculate totals based on filtered profiles
            const catTotals = principalProfiles.reduce((acc, p) => ({
              count: acc.count + (p.sessionCount || 0),
              success: acc.success + (p.successCount || 0),
              errors: acc.errors + (p.errorCount || 0)
            }), { count: 0, success: 0, errors: 0 });

            const filteredTotals = processedProfiles.reduce((acc, p) => ({
              count: acc.count + (p.sessionCount || 0),
              success: acc.success + (p.successCount || 0),
              errors: acc.errors + (p.errorCount || 0)
            }), { count: 0, success: 0, errors: 0 });

            return (
              <div key={cat.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-6 py-5 transition-colors group ${expandedCategories[cat.id] ? 'border-b border-gray-100' : 'hover:bg-gray-50/50'} bg-white`}
                >
                  <div className="flex items-center gap-5">
                    <div className={`p-2.5 rounded-xl transition-all duration-300 ${expandedCategories[cat.id] ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-gray-50 text-gray-400 group-hover:text-indigo-500'}`}>
                      {expandedCategories[cat.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                    <div className="text-left">
                      <h5 className={`font-bold text-lg transition-colors ${expandedCategories[cat.id] ? 'text-gray-900' : 'text-gray-600'}`}>{cat.name}</h5>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-bold">{principalProfiles.length} Sessions</span>
                      </div>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-8 px-4">
                    <div className="text-right">
                      <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Total Profiles</span>
                      <span className="font-bold text-gray-800 font-mono text-xl">{catTotals.count.toLocaleString()}</span>
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {expandedCategories[cat.id] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      {/* Toolbar */}
                      <div className="px-6 py-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100">
                        <div className="relative group/search w-full sm:w-auto">
                          <input
                            type="text"
                            placeholder={`Search ${cat.name}...`}
                            value={query}
                            onChange={(e) => handleSearchChange(cat.id, e.target.value)}
                            className="pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none w-full sm:w-80 transition-all placeholder:text-gray-400 group-hover/search:bg-white shadow-sm"
                          />
                          <Search className="absolute left-3.5 top-3 text-gray-400 group-focus-within/search:text-indigo-500 transition-colors" size={16} />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleExportDetailedTable(cat.name, processedProfiles)}
                            leftIcon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>}
                          >
                            Export.XLSX
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleCopyTableData(cat.id, processedProfiles)}
                            leftIcon={copiedTableId === cat.id ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                          >
                            {copiedTableId === cat.id ? 'Copied!' : 'Copy Data'}
                          </Button>
                        </div>
                      </div>

                      {/* Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border border-gray-200">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                              <Th label="Session Name" column="profileName" align="left" />
                              <Th label="Type" column="type" />
                              <Th label="Main IP" column="mainIp" />
                              <Th label="Total" column="sessionCount" />
                              <Th label="Connected" column="successCount" />
                              <Th label="Blocked" column="errorCount" />
                            </tr>
                          </thead>
                          <tbody>
                            {processedProfiles.map((profile) => (
                              <tr
                                key={profile.id}
                                className={`group transition-all duration-200 ${getRowStyle(profile.type)}`}
                              >
                                {/* Name */}
                                <td className="px-6 py-4 font-medium text-gray-900 text-left border border-gray-200">
                                  {profile.profileName}
                                </td>

                                {/* Type */}
                                <td className="px-6 py-4 text-center border border-gray-200">
                                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${getTypeBadgeStyle(profile.type)}`}>
                                    {profile.type}
                                  </span>
                                </td>

                                {/* IP */}
                                <td className="px-6 py-4 text-center border border-gray-200">
                                  <div className="flex items-center justify-center gap-2 group/ip">
                                    <div className="flex items-center gap-2 px-2.5 py-1 rounded border border-gray-200 bg-gray-50 text-gray-600">
                                      <Server size={12} className="text-gray-400" />
                                      <span className="font-mono text-xs font-medium">{profile.mainIp || 'N/A'}</span>
                                    </div>
                                    {profile.mainIp && (
                                      <button
                                        onClick={() => handleCopyIp(profile.mainIp!)}
                                        className="text-gray-400 hover:text-indigo-600 opacity-0 group-hover/ip:opacity-100 transition-all duration-200 p-1.5 hover:bg-indigo-50 rounded-lg active:scale-90"
                                        title="Copy IP"
                                      >
                                        {copiedIp === profile.mainIp ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                      </button>
                                    )}
                                  </div>
                                </td>

                                {/* Metrics */}
                                <td className="px-6 py-4 text-center font-medium text-gray-600 font-mono text-sm border border-gray-200">
                                  {profile.sessionCount?.toLocaleString() || '-'}
                                </td>
                                <td className="px-6 py-4 text-center font-medium text-green-600 font-mono text-sm border border-gray-200">
                                  {profile.successCount?.toLocaleString() || '-'}
                                </td>
                                <td className="px-6 py-4 text-center font-medium text-red-600 font-mono text-sm border border-gray-200">
                                  {profile.errorCount?.toLocaleString() || '-'}
                                </td>
                              </tr>
                            ))}

                            {processedProfiles.length === 0 && (
                              <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic bg-gray-50/30 border border-gray-200">
                                  No Profiles found matching "{query}"
                                </td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot className="bg-gray-50 border-t border-gray-200">
                            <tr>
                              <td colSpan={3} className="px-6 py-4 text-center font-bold text-xs uppercase tracking-widest text-gray-500 border border-gray-200">
                                Total
                              </td>
                              <td className="px-6 py-4 text-center font-bold text-gray-900 font-mono text-base tabular-nums border border-gray-200">
                                {filteredTotals.count.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-center font-bold text-green-600 font-mono text-base tabular-nums border border-gray-200">
                                {filteredTotals.success.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-center font-bold text-red-600 font-mono text-base tabular-nums border border-gray-200">
                                {filteredTotals.errors.toLocaleString()}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Sessions Detailed — Principal & Mirrors */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-white px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-xl shadow-md shadow-indigo-200 text-white">
              <Users size={22} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg tracking-tight">Sessions Detailed — Principal & Mirrors</h4>
              <p className="text-sm text-gray-500 font-medium">Manage and view all session details</p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Activity size={16} />}
            onClick={() => setIsSessionModalOpen(true)}
          >
            Update Sessions
          </Button>
        </div>

        <div className="grid gap-6 p-6 sm:p-8 bg-gray-50/50">
          {entity.reporting.parentCategories.map(cat => {
            const categoryId = `detailed-${cat.id}`;

            return (
              <div key={categoryId} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(categoryId)}
                  className={`w-full flex items-center justify-between px-6 py-5 transition-colors group ${expandedCategories[categoryId] ? 'border-b border-gray-100' : 'hover:bg-gray-50/50'} bg-white`}
                >
                  <div className="flex items-center gap-5">
                    <div className={`p-2.5 rounded-xl transition-all duration-300 ${expandedCategories[categoryId] ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-gray-50 text-gray-400 group-hover:text-indigo-500'}`}>
                      {expandedCategories[categoryId] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                    <div className="text-left">
                      <h5 className={`font-bold text-lg transition-colors ${expandedCategories[categoryId] ? 'text-gray-900' : 'text-gray-600'}`}>{cat.name}</h5>
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {expandedCategories[categoryId] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 space-y-8">
                        {/* Principal Sessions Table */}
                        <div>
                          {/* Title with Search and Copy */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                              <h6 className="font-bold text-gray-800 text-sm uppercase tracking-wide">
                                {cat.name.replace(' REPORTING', '')} - Principal
                              </h6>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="relative group/search">
                                <input
                                  type="text"
                                  placeholder="Search..."
                                  value={detailedSearchQueries[`${categoryId}-principal`] || ''}
                                  onChange={(e) => handleDetailedSearchChange(`${categoryId}-principal`, e.target.value)}
                                  className="pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none w-48 transition-all placeholder:text-gray-400 group-hover/search:bg-white shadow-sm"
                                />
                                <Search className="absolute left-3 top-2 text-gray-400 group-focus-within/search:text-indigo-500 transition-colors" size={14} />
                              </div>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  const principalProfiles = cat.profiles?.filter(p => {
                                    const query = detailedSearchQueries[`${categoryId}-principal`] || '';
                                    const matchesSearch = p.profileName.toLowerCase().includes(query.toLowerCase()) ||
                                      (p.mainIp && p.mainIp.includes(query));
                                    return p.profileName.includes('_P_') && matchesSearch;
                                  }) || [];
                                  handleCopyDetailedTable(`${categoryId}-principal`, principalProfiles, 'principal');
                                }}
                                leftIcon={copiedDetailedTable === `${categoryId}-principal` ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                              >
                              </Button>
                            </div>
                          </div>

                          <div className="overflow-x-auto rounded-xl border border-gray-200">
                            <table className="w-full text-sm border-collapse">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                  <th className="px-6 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider border border-gray-200">Session</th>
                                  <th className="px-6 py-3 text-center font-semibold text-gray-500 text-xs uppercase tracking-wider border border-gray-200">IP</th>
                                  <th className="px-6 py-3 text-center font-semibold text-gray-500 text-xs uppercase tracking-wider border border-gray-200">User</th>
                                  <th className="px-6 py-3 text-center font-semibold text-gray-500 text-xs uppercase tracking-wider border border-gray-200">Password</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cat.profiles?.filter(p => {
                                  const query = detailedSearchQueries[`${categoryId}-principal`] || '';
                                  const matchesSearch = p.profileName.toLowerCase().includes(query.toLowerCase()) ||
                                    (p.mainIp && p.mainIp.includes(query));
                                  return !p.isMirror && !p.profileName.includes('_M1_') && !p.profileName.includes('_M2_') && matchesSearch;
                                }).map((profile) => (
                                  <tr key={profile.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-3 font-medium text-gray-900 text-left border border-gray-200">
                                      {profile.profileName}
                                    </td>
                                    <td className="px-6 py-3 text-center border border-gray-200">
                                      <span className="font-mono text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">{profile.mainIp || 'N/A'}</span>
                                    </td>
                                    <td className="px-6 py-3 text-center border border-gray-200">
                                      <span className="text-gray-600">admin</span>
                                    </td>
                                    <td className="px-6 py-3 text-center border border-gray-200">
                                      <span className="text-gray-600">CMH1_DeskTOP</span>
                                    </td>
                                  </tr>
                                ))}
                                {(!cat.profiles || cat.profiles.filter(p => {
                                  const query = detailedSearchQueries[`${categoryId}-principal`] || '';
                                  const matchesSearch = p.profileName.toLowerCase().includes(query.toLowerCase()) ||
                                    (p.mainIp && p.mainIp.includes(query));
                                  return !p.isMirror && !p.profileName.includes('_M1_') && !p.profileName.includes('_M2_') && matchesSearch;
                                }).length === 0) && (
                                    <tr>
                                      <td colSpan={4} className="px-6 py-8 text-center text-gray-400 italic bg-gray-50/30 border border-gray-200">
                                        No principal sessions found
                                      </td>
                                    </tr>
                                  )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Mirror Sessions Tables */}
                        <div className="grid md:grid-cols-2 gap-6">
                          {[1, 2].map(mirrorNum => {
                            const mirrorTableId = `${categoryId}-mirror${mirrorNum}`;
                            return (
                              <div key={mirrorNum} className="bg-gray-50/30 rounded-xl p-4 border border-gray-100">
                                {/* Title with Search and Copy */}
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                    <span className={`w-1.5 h-1.5 rounded-full ${mirrorNum === 1 ? 'bg-blue-500' : 'bg-purple-500'}`}></span>
                                    <h6 className="font-bold text-gray-800 text-sm uppercase tracking-wide">
                                      {cat.mirrorNames?.[mirrorNum] || `M ${cat.name.replace(' REPORTING', '')} ${mirrorNum}`}
                                    </h6>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <div className="relative group/search">
                                      <input
                                        type="text"
                                        placeholder="Search..."
                                        value={detailedSearchQueries[mirrorTableId] || ''}
                                        onChange={(e) => handleDetailedSearchChange(mirrorTableId, e.target.value)}
                                        className="pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none w-32 transition-all placeholder:text-gray-400 shadow-sm"
                                      />
                                      <Search className="absolute left-2.5 top-2 text-gray-400 group-focus-within/search:text-indigo-500 transition-colors" size={12} />
                                    </div>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => {
                                        const mirrorProfiles = cat.profiles?.filter(p => {
                                          const query = detailedSearchQueries[mirrorTableId] || '';
                                          const matchesSearch = p.profileName.toLowerCase().includes(query.toLowerCase()) ||
                                            (p.mainIp && p.mainIp.includes(query));
                                          return (p.mirrorNumber === mirrorNum || (!p.mirrorNumber && p.profileName.includes(`_M${mirrorNum}_`))) && matchesSearch;
                                        }) || [];
                                        handleCopyDetailedTable(mirrorTableId, mirrorProfiles, 'mirror');
                                      }}
                                      leftIcon={copiedDetailedTable === mirrorTableId ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                                    >
                                    </Button>
                                  </div>
                                </div>

                                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                                  <table className="w-full text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-4 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider border border-gray-200">Session</th>
                                        <th className="px-4 py-2 text-center font-semibold text-gray-500 uppercase tracking-wider border border-gray-200">IP</th>
                                        <th className="px-4 py-2 text-center font-semibold text-gray-500 uppercase tracking-wider border border-gray-200">User</th>
                                        <th className="px-4 py-2 text-center font-semibold text-gray-500 uppercase tracking-wider border border-gray-200">Pass</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {/* Existing sessions */}
                                      {cat.profiles?.filter(p => {
                                        const query = detailedSearchQueries[mirrorTableId] || '';
                                        const matchesSearch = p.profileName.toLowerCase().includes(query.toLowerCase()) ||
                                          (p.mainIp && p.mainIp.includes(query));
                                        return (p.mirrorNumber === mirrorNum || (!p.mirrorNumber && p.profileName.includes(`_M${mirrorNum}_`))) && matchesSearch;
                                      }).map((profile) => (
                                        <tr key={profile.id} className="hover:bg-gray-50/50 transition-colors">
                                          <td className="px-4 py-2 font-medium text-gray-900 text-left truncate max-w-[120px] border border-gray-200" title={profile.profileName}>
                                            {profile.profileName}
                                          </td>
                                          <td className="px-4 py-2 text-center border border-gray-200">
                                            <span className="font-mono text-gray-600">{profile.mainIp || '-'}</span>
                                          </td>
                                          <td className="px-4 py-2 text-center text-gray-500 truncate max-w-[80px] border border-gray-200" title={profile.user}>
                                            {profile.user || '-'}
                                          </td>
                                          <td className="px-4 py-2 text-center text-gray-500 truncate max-w-[80px] border border-gray-200" title={profile.password}>
                                            {profile.password || '-'}
                                          </td>
                                        </tr>
                                      ))}

                                      {/* New sessions */}
                                      {(() => {
                                        const newSessionsKey = `${categoryId}-M${mirrorNum}`;
                                        const newSessionsList = newSessions[newSessionsKey] || [];
                                        const query = detailedSearchQueries[mirrorTableId] || '';

                                        return newSessionsList
                                          .filter(session => {
                                            const matchesSearch = session.profileName.toLowerCase().includes(query.toLowerCase()) ||
                                              (session.mainIp && session.mainIp.includes(query));
                                            return matchesSearch;
                                          })
                                          .map((session) => (
                                            <tr key={session.id} className="hover:bg-green-50/50 transition-colors bg-green-50/10">
                                              <td className="px-4 py-2 font-medium text-gray-900 text-left border border-gray-200">
                                                <div className="flex items-center gap-1">
                                                  <span className="truncate max-w-[100px]" title={session.profileName}>{session.profileName}</span>
                                                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded font-bold">NEW</span>
                                                </div>
                                              </td>
                                              <td className="px-4 py-2 text-center border border-gray-200">
                                                <span className="font-mono text-gray-600">{session.mainIp || '-'}</span>
                                              </td>
                                              <td className="px-4 py-2 text-center text-gray-500 border border-gray-200">
                                                {session.user}
                                              </td>
                                              <td className="px-4 py-2 text-center text-gray-500 border border-gray-200">
                                                {session.password}
                                              </td>
                                            </tr>
                                          ));
                                      })()}

                                      {(() => {
                                        const newSessionsKey = `${categoryId}-M${mirrorNum}`;
                                        const newSessionsList = newSessions[newSessionsKey] || [];
                                        const existingCount = cat.profiles?.filter(p => {
                                          const query = detailedSearchQueries[mirrorTableId] || '';
                                          const matchesSearch = p.profileName.toLowerCase().includes(query.toLowerCase()) ||
                                            (p.mainIp && p.mainIp.includes(query));
                                          return (p.mirrorNumber === mirrorNum || (!p.mirrorNumber && p.profileName.includes(`_M${mirrorNum}_`))) && matchesSearch;
                                        }).length || 0;

                                        const query = detailedSearchQueries[mirrorTableId] || '';
                                        const newCount = newSessionsList.filter(session => {
                                          const matchesSearch = session.profileName.toLowerCase().includes(query.toLowerCase()) ||
                                            (session.mainIp && session.mainIp.includes(query));
                                          return matchesSearch;
                                        }).length;

                                        return (existingCount === 0 && newCount === 0) && (
                                          <tr>
                                            <td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic bg-gray-50/30 border border-gray-200">
                                              No mirror {mirrorNum} sessions
                                            </td>
                                          </tr>
                                        );
                                      })()}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Session Details Modal */}
      <AnimatePresence>
        {isSessionModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsSessionModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="bg-white px-8 py-6 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                    <Users size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Manage Sessions</h3>
                    <p className="text-sm text-gray-500">Update principal and mirror session details</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSessionModalOpen(false)}
                  className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-lg transition-colors"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-8 overflow-y-auto flex-1 bg-gray-50/50">
                <div className="space-y-8">
                  {entity.reporting.parentCategories.map(cat => (
                    <div key={cat.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 flex items-center gap-3">
                        <span className={`w-2 h-8 rounded-full ${cat.name.toUpperCase().includes('OFFER') ? 'bg-yellow-400' : 'bg-blue-500'}`}></span>
                        <h4 className="text-lg font-bold text-gray-800">
                          {cat.name}
                        </h4>
                      </div>

                      <div className="p-6">
                        {/* Principal Sessions */}
                        <div className="mb-8">
                          <h5 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            Principal Sessions
                          </h5>
                          <div className="space-y-3">
                            {cat.profiles?.filter(p => !p.isMirror && !p.profileName.includes('_M1_') && !p.profileName.includes('_M2_') && !removedSessionIds.has(p.id)).map(profile => (
                              <div key={profile.id} className="grid grid-cols-12 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 relative group hover:border-gray-200 transition-colors">
                                <button
                                  onClick={() => handleRemoveExistingSession(profile.id)}
                                  className="absolute -top-2 -right-2 p-1.5 bg-white text-red-500 border border-gray-200 hover:bg-red-50 hover:border-red-200 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
                                  title="Remove session"
                                >
                                  <Trash2 size={14} />
                                </button>
                                <div className="col-span-3">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 block">Session Name</label>
                                  <input
                                    type="text"
                                    value={profile.profileName}
                                    disabled
                                    className="w-full px-3 py-2 text-sm bg-gray-100 border border-transparent rounded-lg text-gray-500 font-medium"
                                  />
                                </div>
                                <div className="col-span-3">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 block">IP Address</label>
                                  <input
                                    type="text"
                                    value={updatedExistingSessions[profile.id]?.mainIp ?? profile.mainIp ?? ''}
                                    onChange={(e) => handleExistingSessionUpdate(profile.id, 'mainIp', e.target.value)}
                                    placeholder="Enter IP"
                                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono text-gray-700"
                                  />
                                </div>
                                <div className="col-span-3">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 block">User</label>
                                  <input
                                    type="text"
                                    value={updatedExistingSessions[profile.id]?.user ?? profile.user ?? ''}
                                    onChange={(e) => handleExistingSessionUpdate(profile.id, 'user', e.target.value)}
                                    placeholder="Enter username"
                                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-gray-700"
                                  />
                                </div>
                                <div className="col-span-3">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 block">Password</label>
                                  <input
                                    type="text"
                                    value={updatedExistingSessions[profile.id]?.password ?? profile.password ?? ''}
                                    onChange={(e) => handleExistingSessionUpdate(profile.id, 'password', e.target.value)}
                                    placeholder="Enter password"
                                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-gray-700"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Mirror Sessions */}
                        <div className="grid md:grid-cols-2 gap-8">
                          {[1, 2].map(mirrorNum => {
                            const newSessionsKey = `${cat.id}-M${mirrorNum}`;
                            const newSessionsList = newSessions[newSessionsKey] || [];

                            return (
                              <div key={mirrorNum} className="bg-gray-50/30 rounded-xl p-4 border border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex-1 mr-4">
                                    <input
                                      type="text"
                                      value={updatedMirrorNames[`${cat.id}-${mirrorNum}`] ?? cat.mirrorNames?.[mirrorNum] ?? `M ${cat.name.replace(' REPORTING', '')} ${mirrorNum}`}
                                      onChange={(e) => handleMirrorNameChange(cat.id, mirrorNum, e.target.value)}
                                      className="font-bold text-gray-700 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none transition-colors w-full text-sm"
                                      placeholder={`Mirror ${mirrorNum} Name`}
                                    />
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mt-1 block">Mirror {mirrorNum}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      leftIcon={<Upload size={14} />}
                                      onClick={() => {
                                        setImportTarget({ catId: cat.id, mirrorNum });
                                        setIsImportModalOpen(true);
                                      }}
                                      className="!px-2"
                                      title="Smart Import"
                                    >
                                    </Button>
                                    <Button
                                      variant="success"
                                      size="sm"
                                      leftIcon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>}
                                      onClick={() => handleAddMirrorSession(cat.id, mirrorNum)}
                                      className="!px-2"
                                      title="Add Session"
                                    >
                                    </Button>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  {/* Existing Mirror Sessions */}
                                  {cat.profiles?.filter(p => (p.mirrorNumber === mirrorNum || (!p.mirrorNumber && p.profileName.includes(`_M${mirrorNum}_`))) && !removedSessionIds.has(p.id)).map(profile => (
                                    <div key={profile.id} className="p-3 bg-white rounded-lg border border-gray-200 relative group hover:border-indigo-200 transition-colors shadow-sm">
                                      <button
                                        onClick={() => handleRemoveExistingSession(profile.id)}
                                        className="absolute -top-2 -right-2 p-1 bg-white text-red-500 border border-gray-200 hover:bg-red-50 hover:border-red-200 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
                                        title="Remove session"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                      <div className="space-y-2">
                                        <div>
                                          <input
                                            type="text"
                                            value={profile.profileName}
                                            disabled
                                            className="w-full text-xs font-bold text-gray-700 bg-transparent border-none p-0 focus:ring-0"
                                          />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                          <input
                                            type="text"
                                            value={updatedExistingSessions[profile.id]?.mainIp ?? profile.mainIp ?? ''}
                                            onChange={(e) => handleExistingSessionUpdate(profile.id, 'mainIp', e.target.value)}
                                            placeholder="IP"
                                            className="w-full px-2 py-1 text-xs bg-gray-50 border border-gray-100 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-gray-600"
                                          />
                                          <input
                                            type="text"
                                            value={updatedExistingSessions[profile.id]?.user ?? profile.user ?? ''}
                                            onChange={(e) => handleExistingSessionUpdate(profile.id, 'user', e.target.value)}
                                            placeholder="User"
                                            className="w-full px-2 py-1 text-xs bg-gray-50 border border-gray-100 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-600"
                                          />
                                          <input
                                            type="text"
                                            value={updatedExistingSessions[profile.id]?.password ?? profile.password ?? ''}
                                            onChange={(e) => handleExistingSessionUpdate(profile.id, 'password', e.target.value)}
                                            placeholder="Pass"
                                            className="w-full px-2 py-1 text-xs bg-gray-50 border border-gray-100 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-600"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ))}

                                  {/* New Mirror Sessions */}
                                  {newSessionsList.map((session, index) => (
                                    <div key={session.id} className="p-3 bg-green-50/50 rounded-lg border border-green-200 relative group shadow-sm">
                                      <button
                                        onClick={() => handleRemoveNewSession(cat.id, mirrorNum, session.id)}
                                        className="absolute -top-2 -right-2 p-1 bg-white text-red-500 border border-gray-200 hover:bg-red-50 hover:border-red-200 rounded-full shadow-sm transition-colors z-10"
                                        title="Remove session"
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path d="M18 6L6 18M6 6l12 12" />
                                        </svg>
                                      </button>
                                      <div className="space-y-2">
                                        <div>
                                          <label className="text-[10px] font-bold uppercase tracking-wider text-green-600 mb-1 block">Session Name</label>
                                          <input
                                            type="text"
                                            value={session.profileName}
                                            onChange={(e) => handleNewSessionUpdate(cat.id, mirrorNum, session.id, 'profileName', e.target.value)}
                                            placeholder="Enter session name"
                                            className="w-full px-2 py-1.5 text-xs font-bold text-gray-900 bg-white border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none placeholder:text-gray-400"
                                          />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                          <input
                                            type="text"
                                            value={session.mainIp}
                                            onChange={(e) => handleNewSessionUpdate(cat.id, mirrorNum, session.id, 'mainIp', e.target.value)}
                                            placeholder="IP"
                                            className="w-full px-2 py-1 text-xs bg-white border border-green-200 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none font-mono text-gray-600"
                                          />
                                          <input
                                            type="text"
                                            value={session.user}
                                            onChange={(e) => handleNewSessionUpdate(cat.id, mirrorNum, session.id, 'user', e.target.value)}
                                            placeholder="User"
                                            className="w-full px-2 py-1 text-xs bg-white border border-green-200 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none text-gray-600"
                                          />
                                          <input
                                            type="text"
                                            value={session.password}
                                            onChange={(e) => handleNewSessionUpdate(cat.id, mirrorNum, session.id, 'password', e.target.value)}
                                            placeholder="Pass"
                                            className="w-full px-2 py-1 text-xs bg-white border border-green-200 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none text-gray-600"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ))}

                                  {(!cat.profiles || cat.profiles.filter(p => p.profileName.includes(`_M${mirrorNum}_`)).length === 0) && newSessionsList.length === 0 && (
                                    <div className="p-6 text-center text-gray-400 italic bg-gray-50/50 rounded-lg border border-dashed border-gray-200 text-xs">
                                      No sessions yet
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-white px-8 py-4 flex items-center justify-end gap-3 border-t border-gray-100 sticky bottom-0 z-10">
                <Button
                  variant="secondary"
                  onClick={() => setIsSessionModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<Check size={16} />}
                  onClick={handleSaveChanges}
                >
                  Save Changes
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Smart Import Modal */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                <h3 className="font-bold text-gray-900">Smart Import - Mirror {importTarget?.mirrorNum}</h3>
                <button
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportTarget(null);
                    setImportData('');
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4 text-sm text-blue-800">
                  <p className="font-semibold mb-1">Format: Name [TAB] IP [TAB] User [TAB] Password</p>
                  <p className="opacity-80">Example: CMH2_M2_IP_3	38.242.192.109	admin_1	CMH2_MiroiR2</p>
                </div>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="w-full h-64 border border-gray-200 rounded-lg p-4 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none bg-gray-50 text-gray-700"
                  placeholder={`CMH2_M2_IP_3	38.242.192.109	admin_1	CMH2_MiroiR2
any_name	178.18.246.197	Csizmadia_Oszlar	CMH2_MiroiR2
test	161.97.145.230	admin_1	CMH2_MiroiR
...`}
                  autoFocus
                />
                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsImportModalOpen(false);
                      setImportTarget(null);
                      setImportData('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleProcessImport}
                    disabled={!importData.trim()}
                  >
                    Process Import
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};





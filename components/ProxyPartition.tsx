import React, { useState, useEffect, useRef } from 'react';
import { Upload, Shuffle, FileSpreadsheet, AlertCircle, CheckCircle, Trash2, Save, Copy, RefreshCw, ChevronRight, ChevronLeft, Search, Download, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { API_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useListedIPs } from '../contexts/ListedIPsContext';
import { Button } from './ui/Button';

interface CSVRow {
    entity: string;
    server: string;
    server_entity_status_id: string;
    status: string;
    ip: string;
    proxy: string;
    country: string;
    next_due_date: string;
    updated_on: string;
    to_return: string;
    ping_avg: string;
    port: string;
}

interface ProcessedData {
    [entity: string]: {
        'PROXY USA': string[];
        'PROXY GEO': string[];
    };
}

export const ProxyPartition: React.FC = () => {
    const { token } = useAuth();
    const [csvData, setCsvData] = useState<CSVRow[]>([]);
    const [processedData, setProcessedData] = useState<ProcessedData>({});

    // Listed IPs State
    // Listed IPs State
    const { listedIPsText, setListedIPsText, listedIPsSet, saveListedIPs, resetListedIPs, isIPListed } = useListedIPs();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        fetchSavedData();
    }, []);

    const fetchSavedData = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_URL}/api/proxy-partition`, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data && Object.keys(data).length > 0) {
                    setProcessedData(data);
                    // Reconstruct entities list for filtering
                    // Note: We don't have the original CSV rows, but we have the processed structure
                }
            }
        } catch (error) {
            console.error('Failed to fetch saved proxy partition:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveToBackend = async (data: ProcessedData) => {
        try {
            await fetch(`${API_URL}/api/proxy-partition`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify(data)
            });
        } catch (error) {
            console.error('Failed to save proxy partition:', error);
            setUploadStatus({ type: 'error', message: 'Failed to save data to server.' });
        }
    };

    const parseCSV = (text: string): CSVRow[] => {
        const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        const nonEmptyLines = lines.filter(line => line.trim() !== '');
        if (nonEmptyLines.length === 0) return [];

        const firstLine = nonEmptyLines[0];
        const delimiters = [',', ';', '\t'];
        let delimiter = ',';
        let maxCount = 0;

        delimiters.forEach(d => {
            const count = firstLine.split(d).length - 1;
            if (count > maxCount) {
                maxCount = count;
                delimiter = d;
            }
        });

        const headers = nonEmptyLines[0].split(delimiter).map(h =>
            h.trim().toLowerCase().replace(/^["'](.*)["']$/, '$1')
        );

        return nonEmptyLines.slice(1).map(line => {
            const values = line.split(delimiter).map(v =>
                v.trim().replace(/^["'](.*)["']$/, '$1')
            );
            const row: any = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            return row as CSVRow;
        });
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setUploadStatus(null);

        // Simulate a small delay to show loading state for better UX
        setTimeout(() => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const text = e.target?.result as string;
                    const parsed = parseCSV(text);

                    if (parsed.length === 0) {
                        setUploadStatus({ type: 'error', message: 'No valid data found in CSV.' });
                        setIsLoading(false);
                        return;
                    }

                    if (!('proxy' in parsed[0])) {
                        setUploadStatus({
                            type: 'error',
                            message: `Column 'proxy' not found. Found: ${Object.keys(parsed[0]).join(', ')}`
                        });
                        setIsLoading(false);
                        return;
                    }

                    setCsvData(parsed);
                    const processedCount = processData(parsed);

                    if (processedCount === 0) {
                        setUploadStatus({ type: 'error', message: 'No rows with proxy=1 found. Check your CSV values.' });
                    } else {
                        setUploadStatus({ type: 'success', message: `Successfully processed ${processedCount} proxy IPs.` });
                    }
                } catch (err) {
                    setUploadStatus({ type: 'error', message: 'Failed to parse CSV file.' });
                } finally {
                    setIsLoading(false);
                    event.target.value = '';
                }
            };

            reader.readAsText(file);
        }, 500);
    };

    const processData = (data: CSVRow[]) => {
        const processed: ProcessedData = {};
        let count = 0;

        const proxyRows = data.filter(row => {
            const val = String(row.proxy).toLowerCase().trim();
            return val === '1' || val === 'true' || val === 'yes';
        });

        proxyRows.forEach(row => {
            if (!row.entity) return;

            if (!processed[row.entity]) {
                processed[row.entity] = {
                    'PROXY USA': [],
                    'PROXY GEO': []
                };
            }

            if (row.country === 'United States') {
                processed[row.entity]['PROXY USA'].push(row.ip);
            } else {
                processed[row.entity]['PROXY GEO'].push(row.ip);
            }
            count++;
        });

        setProcessedData(processed);
        saveToBackend(processed); // Auto-save to backend
        return count;
    };

    // --- Actions ---

    const resetTable = async () => {
        setCsvData([]);
        setProcessedData({});
        setUploadStatus(null);
        setSearchTerm('');
        await saveToBackend({}); // Clear backend data
    };

    const copyIPs = (ips: string[]) => {
        const cleanIPs = ips.filter(ip => !listedIPsSet.has(ip));
        const shuffled = cleanIPs.sort(() => Math.random() - 0.5);

        if (shuffled.length === 0) {
            alert('No clean IPs to copy!');
            return;
        }

        navigator.clipboard.writeText(shuffled.join('\n'));
        alert(`Copied ${shuffled.length} clean IPs (shuffled) to clipboard!`);
    };

    const copyEntityIPs = (entity: string) => {
        const usa = processedData[entity]['PROXY USA'] || [];
        const geo = processedData[entity]['PROXY GEO'] || [];
        copyIPs([...usa, ...geo]);
    };

    const copyCategoryIPs = (entity: string, category: 'PROXY USA' | 'PROXY GEO') => {
        const ips = processedData[entity][category] || [];
        copyIPs(ips);
    };

    const handleCopyAll = () => {
        const allIPs: string[] = [];
        filteredEntities.forEach(entity => {
            allIPs.push(...(processedData[entity]['PROXY USA'] || []));
            allIPs.push(...(processedData[entity]['PROXY GEO'] || []));
        });
        copyIPs(allIPs);
    };

    const handleExportXLSX = () => {
        if (filteredEntities.length === 0) return;

        // 1. Prepare Header Rows
        const row1: string[] = []; // Entity Names
        const row2: string[] = []; // PROXY USA / GEO headers
        const merges: XLSX.Range[] = [];

        filteredEntities.forEach((entity, index) => {
            row1.push(entity, ""); // Placeholder for merge
            row2.push("PROXY USA", "PROXY GEO");

            // Merge cells for Entity Name (2 columns wide)
            merges.push({ s: { r: 0, c: index * 2 }, e: { r: 0, c: index * 2 + 1 } });
        });

        // 2. Prepare Data Rows
        const dataRows: string[][] = [];
        const maxRowsInExport = Math.max(
            ...filteredEntities.flatMap(entity => [
                processedData[entity]['PROXY USA'].length,
                processedData[entity]['PROXY GEO'].length
            ]),
            0
        );

        for (let i = 0; i < maxRowsInExport; i++) {
            const row: string[] = [];
            filteredEntities.forEach(entity => {
                const usaIP = processedData[entity]['PROXY USA'][i] || "";
                const geoIP = processedData[entity]['PROXY GEO'][i] || "";
                row.push(usaIP, geoIP);
            });
            dataRows.push(row);
        }

        // 3. Create Worksheet
        const wsData = [row1, row2, ...dataRows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Apply merges
        ws['!merges'] = merges;

        // 4. Export
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Proxies");
        XLSX.writeFile(wb, "proxy_partition_export.xlsx");
    };

    // Filter Entities
    const entities = Object.keys(processedData);
    const filteredEntities = entities.filter(entity => {
        if (!searchTerm) return true;

        // Split by comma to support multiple search terms
        const terms = searchTerm.split(',').map(s => s.trim().toLowerCase()).filter(s => s);
        if (terms.length === 0) return true;

        return terms.some(term => {
            if (entity.toLowerCase().includes(term)) return true;

            const usaIPs = processedData[entity]['PROXY USA'] || [];
            const geoIPs = processedData[entity]['PROXY GEO'] || [];

            return usaIPs.some(ip => ip.includes(term)) || geoIPs.some(ip => ip.includes(term));
        });
    });

    const maxRows = Math.max(
        ...filteredEntities.flatMap(entity => [
            processedData[entity]['PROXY USA'].length,
            processedData[entity]['PROXY GEO'].length
        ]),
        0
    );

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] -m-8 relative">
            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                    <Loader2 size={48} className="text-blue-600 animate-spin mb-4" />
                    <p className="text-lg font-semibold text-gray-700">Processing CSV...</p>
                </div>
            )}

            {/* Header Toolbar */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 z-10 gap-4">
                <div className="flex items-center gap-6 min-w-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 whitespace-nowrap">Proxy Partition</h2>
                        <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">Upload CSV to classify and manage proxy IPs</p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative max-w-md w-full hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search entities (e.g. CMH1, CMH2)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {uploadStatus && (
                        <div className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 font-medium ${uploadStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                            }`}>
                            {uploadStatus.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                            {uploadStatus.message}
                        </div>
                    )}

                    {entities.length > 0 && (
                        <>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleCopyAll}
                                leftIcon={<Copy size={14} />}
                                title="Copy all visible clean IPs"
                            >
                                <span className="hidden lg:inline">Copy All</span>
                            </Button>
                            <Button
                                variant="success"
                                size="sm"
                                onClick={handleExportXLSX}
                                leftIcon={<Download size={14} />}
                                title="Export to Excel"
                            >
                                <span className="hidden lg:inline">Export</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={resetTable}
                                leftIcon={<RefreshCw size={14} />}
                            >
                                <span className="hidden lg:inline">Reset</span>
                            </Button>
                        </>
                    )}

                    <Button
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        leftIcon={<Upload size={14} />}
                    >
                        <span className="hidden sm:inline">Upload CSV</span>
                    </Button>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        ref={fileInputRef}
                    />

                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={`p-2 rounded-lg border transition-colors ${isSidebarOpen ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                            }`}
                        title={isSidebarOpen ? "Hide Listed IPs" : "Show Listed IPs"}
                    >
                        {isSidebarOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">

                {/* Left Column: Classified Proxies Table */}
                <div className="flex-1 overflow-auto bg-gray-50/50 p-6">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-w-max">
                        {filteredEntities.length > 0 ? (
                            <table className="border-collapse w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        {filteredEntities.map(entity => (
                                            <th
                                                key={entity}
                                                colSpan={2}
                                                className="px-4 py-3 text-center border-r border-gray-200 last:border-r-0 min-w-[300px]"
                                            >
                                                <div className="flex items-center justify-center gap-3">
                                                    <span className="font-bold text-gray-900">{entity}</span>
                                                    <button
                                                        onClick={() => copyEntityIPs(entity)}
                                                        className="p-1.5 bg-white border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all"
                                                        title="Copy all clean IPs for this entity (Shuffled)"
                                                    >
                                                        <Shuffle size={14} />
                                                    </button>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                    <tr className="bg-white border-b border-gray-200">
                                        {filteredEntities.map(entity => (
                                            <React.Fragment key={entity}>
                                                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border-r border-gray-100 bg-gray-50/30">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span>USA ({processedData[entity]['PROXY USA'].length})</span>
                                                        <button
                                                            onClick={() => copyCategoryIPs(entity, 'PROXY USA')}
                                                            className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-700 transition-colors"
                                                            title="Copy USA IPs"
                                                        >
                                                            <Copy size={12} />
                                                        </button>
                                                    </div>
                                                </th>
                                                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 border-r border-gray-200 last:border-r-0 bg-gray-50/30">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span>GEO ({processedData[entity]['PROXY GEO'].length})</span>
                                                        <button
                                                            onClick={() => copyCategoryIPs(entity, 'PROXY GEO')}
                                                            className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-700 transition-colors"
                                                            title="Copy GEO IPs"
                                                        >
                                                            <Copy size={12} />
                                                        </button>
                                                    </div>
                                                </th>
                                            </React.Fragment>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from({ length: maxRows }).map((_, rowIndex) => (
                                        <tr key={rowIndex} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors group">
                                            {filteredEntities.map(entity => (
                                                <React.Fragment key={entity}>
                                                    <td className="px-3 py-1.5 text-center border-r border-gray-100">
                                                        <div className={`text-xs font-mono ${processedData[entity]['PROXY USA'][rowIndex] &&
                                                            isIPListed(processedData[entity]['PROXY USA'][rowIndex])
                                                            ? 'text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded inline-block'
                                                            : 'text-gray-600 group-hover:text-gray-900'
                                                            }`}>
                                                            {processedData[entity]['PROXY USA'][rowIndex] || ''}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-1.5 text-center border-r border-gray-200 last:border-r-0">
                                                        <div className={`text-xs font-mono ${processedData[entity]['PROXY GEO'][rowIndex] &&
                                                            isIPListed(processedData[entity]['PROXY GEO'][rowIndex])
                                                            ? 'text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded inline-block'
                                                            : 'text-gray-600 group-hover:text-gray-900'
                                                            }`}>
                                                            {processedData[entity]['PROXY GEO'][rowIndex] || ''}
                                                        </div>
                                                    </td>
                                                </React.Fragment>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <FileSpreadsheet size={48} className="mb-4 opacity-20" />
                                <p className="text-base font-medium">
                                    {searchTerm ? 'No matching results found' : 'No Data Available'}
                                </p>
                                <p className="text-sm mt-1">
                                    {searchTerm ? 'Try a different search term' : 'Upload a CSV file to populate the table'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Listed IPs Sidebar (Collapsible) */}
                <AnimatePresence initial={false}>
                    {isSidebarOpen && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 320, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="border-l border-gray-200 bg-white shadow-xl z-20 flex flex-col"
                        >
                            <div className="p-4 bg-red-50 border-b border-red-100 flex items-center justify-between shrink-0">
                                <h3 className="font-bold text-red-900 flex items-center gap-2 text-sm">
                                    <AlertCircle size={16} />
                                    Listed IPs (Excluded)
                                </h3>
                                <div className="flex gap-1">
                                    <button
                                        onClick={resetListedIPs}
                                        className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                                        title="Clear List"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <button
                                        onClick={saveListedIPs}
                                        className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors shadow-sm"
                                        title="Apply Changes"
                                    >
                                        <Save size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 p-4 bg-red-50/30 flex flex-col overflow-hidden">
                                <p className="text-xs text-red-600 mb-2 px-1">
                                    IPs listed here will be highlighted red and excluded from copy actions.
                                </p>
                                <div className="relative flex-1">
                                    <textarea
                                        value={listedIPsText}
                                        onChange={(e) => setListedIPsText(e.target.value)}
                                        placeholder="Paste IPs here..."
                                        className="w-full h-full border border-red-200 rounded-xl p-3 bg-white font-mono text-xs resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-red-900 placeholder-red-300 shadow-sm"
                                    />
                                    <div className="absolute bottom-3 right-3 text-[10px] font-bold text-red-400 bg-red-50 px-2 py-1 rounded-full border border-red-100">
                                        {listedIPsSet.size} Listed
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

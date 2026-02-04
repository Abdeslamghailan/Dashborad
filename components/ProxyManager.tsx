import React, { useState, useEffect, useRef } from 'react';
import { Copy, Plus, Edit, Trash2, Power, PowerOff, Shuffle, X, AlertCircle, Save, ChevronRight, ChevronLeft, Download } from 'lucide-react';
import { Button } from './ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { service } from '../services';
import { useListedIPs } from '../contexts/ListedIPsContext';
import * as XLSX from 'xlsx';

interface ProxyServer {
    id: string;
    serverName: string;
    ips: string[];
    status: 'active' | 'stopped';
    createdAt: string;
    updatedAt?: string;
}

interface ProxyManagerProps {
    entityId: string;
    isAdmin: boolean;
}

export const ProxyManager: React.FC<ProxyManagerProps> = ({ entityId, isAdmin }) => {
    const { token } = useAuth();
    const [proxies, setProxies] = useState<ProxyServer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProxy, setEditingProxy] = useState<ProxyServer | null>(null);
    const [addMethod, setAddMethod] = useState<'normal' | 'smart'>('normal');
    const tableRef = useRef<HTMLDivElement>(null);

    // Form states
    const [serverName, setServerName] = useState('');
    const [ips, setIps] = useState('');
    const [cidr, setCidr] = useState('');

    // Listed IPs State
    const { listedIPsSet, isIPListed } = useListedIPs();

    useEffect(() => {
        fetchProxies();
    }, [entityId]);

    // Sync scroll position (for dual scroll bars if needed)
    useEffect(() => {
        const tableElement = tableRef.current;
        if (!tableElement) return;

        const handleScroll = () => {
            // Store scroll position for potential future use
            const scrollLeft = tableElement.scrollLeft;
            // You can add logic here to sync with another scroll element if needed
        };

        tableElement.addEventListener('scroll', handleScroll);
        return () => tableElement.removeEventListener('scroll', handleScroll);
    }, []);

    const fetchProxies = async () => {
        try {
            const data = await service.getProxies(entityId);
            setProxies(data);
        } catch (error) {
            console.error('Failed to fetch proxies:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddProxy = async () => {
        try {
            if (addMethod === 'smart') {
                // Parse multiple CIDR entries
                const lines = cidr.split('\n').filter(line => line.trim());
                const errors: string[] = [];
                let successCount = 0;

                for (const line of lines) {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length !== 2) {
                        errors.push(`Invalid format: ${line}`);
                        continue;
                    }

                    const [cidrBlock, name] = parts;

                    try {
                        await service.saveProxy(entityId, { method: 'smart', cidr: cidrBlock, serverName: name });
                        successCount++;
                    } catch (error: any) {
                        errors.push(`${name}: ${error.message || 'Failed'}`);
                    }
                }

                if (errors.length > 0) {
                    alert(`Added ${successCount} servers.\n\nErrors:\n` + errors.join('\n'));
                } else {
                    alert(`Successfully added ${successCount} proxy servers!`);
                }

                fetchProxies();
                resetForm();
                setIsAddModalOpen(false);
            } else {
                // Normal way - single server
                try {
                    await service.saveProxy(entityId, { method: 'normal', serverName, ips });
                    fetchProxies();
                    resetForm();
                    setIsAddModalOpen(false);
                } catch (error: any) {
                    alert(error.message || 'Failed to add proxy');
                }
            }
        } catch (error) {
            console.error('Failed to add proxy:', error);
            alert('Failed to add proxy');
        }
    };

    const handleUpdateProxy = async () => {
        if (!editingProxy) return;

        try {
            await service.updateProxy(entityId, editingProxy.id, { serverName, ips });
            fetchProxies();
            resetForm();
            setIsEditModalOpen(false);
        } catch (error) {
            console.error('Failed to update proxy:', error);
        }
    };

    const handleToggleStatus = async (proxyId: string) => {
        try {
            await service.toggleProxyStatus(entityId, proxyId);
            fetchProxies();
        } catch (error) {
            console.error('Failed to toggle status:', error);
        }
    };

    const handleDeleteProxy = async (proxyId: string) => {
        if (!confirm('Are you sure you want to delete this proxy server? This action cannot be undone.')) return;

        try {
            await service.deleteProxy(entityId, proxyId);
            fetchProxies();
        } catch (error) {
            console.error('Failed to delete proxy:', error);
        }
    };

    // Copy Shuffled: Only copies IPs from ACTIVE servers, excluding stopped servers and listed IPs
    const copyShuffled = () => {
        // Filter to only include active proxy servers (excludes stopped servers)
        const activeProxies = proxies.filter(p => p.status === 'active');
        const allIps = activeProxies.flatMap(p => p.ips);
        // Remove listed IPs
        const cleanIps = allIps.filter(ip => !listedIPsSet.has(ip));
        // Shuffle for load balancing
        const shuffled = cleanIps.sort(() => Math.random() - 0.5);
        navigator.clipboard.writeText(shuffled.join('\n'));
        alert(`Copied ${shuffled.length} clean IPs (shuffled) to clipboard!`);
    };

    const copyAll = () => {
        let text = '';
        proxies.forEach(proxy => {
            text += `${proxy.serverName} (${proxy.status})\n`;
            text += proxy.ips.join('\n') + '\n\n';
        });
        navigator.clipboard.writeText(text);
        alert('All proxy data copied to clipboard!');
    };

    const copyProxyIPs = (proxy: ProxyServer) => {
        const cleanIps = proxy.ips.filter(ip => !listedIPsSet.has(ip));
        const shuffled = cleanIps.sort(() => Math.random() - 0.5);

        if (shuffled.length === 0) {
            alert('No clean IPs to copy!');
            return;
        }

        navigator.clipboard.writeText(shuffled.join('\n'));
        alert(`Copied ${shuffled.length} clean IPs from ${proxy.serverName} to clipboard!`);
    };

    const resetForm = () => {
        setServerName('');
        setIps('');
        setCidr('');
        setEditingProxy(null);
    };

    const openEditModal = (proxy: ProxyServer) => {
        setEditingProxy(proxy);
        setServerName(proxy.serverName);
        setIps(proxy.ips.join('\n'));
        setIsEditModalOpen(true);
    };

    // Export table to XLSX
    const exportToXLSX = () => {
        // Create worksheet data matching table format
        const maxRows = Math.max(...proxies.map(p => p.ips.length));
        const data: any[][] = [];

        // Header row with server names
        const headerRow = proxies.map(p => p.serverName);
        data.push(headerRow);

        // Status row
        const statusRow = proxies.map(p => p.status.toUpperCase());
        data.push(statusRow);

        // IP rows
        for (let i = 0; i < maxRows; i++) {
            const row = proxies.map(p => p.ips[i] || '');
            data.push(row);
        }

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Proxy Servers');

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `proxy_servers_${timestamp}.xlsx`;

        // Download file
        XLSX.writeFile(wb, filename);
        alert(`Exported ${proxies.length} proxy servers to ${filename}`);
    };

    // Calculate IP counts
    const totalIPs = proxies.reduce((sum, proxy) => sum + proxy.ips.length, 0);
    const activeProxies = proxies.filter(p => p.status === 'active');
    const activeIPs = activeProxies.reduce((sum, proxy) => {
        const cleanIps = proxy.ips.filter(ip => !listedIPsSet.has(ip));
        return sum + cleanIps.length;
    }, 0);

    if (isLoading) {
        return <div className="text-center py-8">Loading proxies...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header with Action Buttons */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-900">Proxy Servers</h2>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                        {proxies.length} {proxies.length === 1 ? 'Server' : 'Servers'}
                    </span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                        {totalIPs} Total {totalIPs === 1 ? 'IP' : 'IPs'}
                    </span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                        {activeIPs} Active {activeIPs === 1 ? 'IP' : 'IPs'}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="secondary"
                        onClick={copyShuffled}
                        leftIcon={<Shuffle size={18} />}
                    >
                        Copy Shuffled
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={copyAll}
                        leftIcon={<Copy size={18} />}
                    >
                        Copy All
                    </Button>
                    <Button
                        variant="primary"
                        onClick={exportToXLSX}
                        leftIcon={<Download size={18} />}
                        disabled={proxies.length === 0}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        Export XLSX
                    </Button>
                    {isAdmin && (
                        <Button
                            onClick={() => setIsAddModalOpen(true)}
                            leftIcon={<Plus size={18} />}
                        >
                            Add Proxy
                        </Button>
                    )}
                </div>
            </div>

            {/* Proxy Table */}
            <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden flex relative min-h-[500px]">
                <div className="flex-1 overflow-x-auto" ref={tableRef}>
                    {proxies.length === 0 ? (
                        <div className="text-center py-16">
                            <p className="text-gray-500 mb-4">No proxy servers configured</p>
                            {isAdmin && (
                                <Button
                                    onClick={() => setIsAddModalOpen(true)}
                                    leftIcon={<Plus size={20} />}
                                >
                                    Add Your First Proxy
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-gray-300">
                                        {proxies.map((proxy) => (
                                            <th
                                                key={proxy.id}
                                                className={`px-4 py-3 text-center border-r border-gray-200 last:border-r-0 transition-colors ${proxy.status === 'stopped'
                                                    ? 'bg-red-300'
                                                    : 'bg-gradient-to-r from-gray-50 to-white'
                                                    }`}
                                            >
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className={`font-bold text-sm ${proxy.status === 'stopped' ? 'text-gray-900' : 'text-gray-900'
                                                        }`}>
                                                        {proxy.serverName}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => copyProxyIPs(proxy)}
                                                            className={`p-1.5 rounded-lg transition-colors ${proxy.status === 'stopped'
                                                                ? 'text-gray-700 hover:text-gray-900 hover:bg-red-400'
                                                                : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                                                                }`}
                                                            title="Copy Clean IPs"
                                                        >
                                                            <Copy size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => isAdmin && handleToggleStatus(proxy.id)}
                                                            disabled={!isAdmin}
                                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold transition-all ${proxy.status === 'active'
                                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                                : 'bg-gray-800 text-white hover:bg-gray-900'
                                                                } ${!isAdmin ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                                                        >
                                                            {proxy.status === 'active' ? (
                                                                <><Power size={12} /> Active</>
                                                            ) : (
                                                                <><PowerOff size={12} /> Stopped</>
                                                            )}
                                                        </button>
                                                        {isAdmin && (
                                                            <>
                                                                <button
                                                                    onClick={() => openEditModal(proxy)}
                                                                    className={`p-1.5 rounded-lg transition-colors ${proxy.status === 'stopped'
                                                                        ? 'text-gray-700 hover:bg-red-400'
                                                                        : 'text-gray-500 hover:text-gray-700'
                                                                        }`}
                                                                    style={{ backgroundColor: 'transparent' }}
                                                                    onMouseEnter={(e) => {
                                                                        if (proxy.status === 'stopped') {
                                                                            e.currentTarget.style.backgroundColor = 'rgba(252, 165, 165, 0.5)';
                                                                        } else {
                                                                            e.currentTarget.style.backgroundColor = 'rgba(135, 206, 235, 0.1)';
                                                                            e.currentTarget.style.color = '#87CEEB';
                                                                        }
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                                        if (proxy.status !== 'stopped') {
                                                                            e.currentTarget.style.color = '#6b7280';
                                                                        }
                                                                    }}
                                                                    title="Update Server"
                                                                >
                                                                    <Edit size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteProxy(proxy.id)}
                                                                    className={`p-1.5 rounded-lg transition-colors ${proxy.status === 'stopped'
                                                                        ? 'text-gray-700 hover:bg-red-400'
                                                                        : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                                                        }`}
                                                                    title="Delete Server"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Find the maximum number of IPs across all proxies */}
                                    {Array.from({ length: Math.max(...proxies.map(p => p.ips.length)) }).map((_, rowIndex) => (
                                        <tr key={rowIndex} className="border-b border-gray-100 hover:bg-gray-50/30 transition-colors">
                                            {proxies.map((proxy) => (
                                                <td
                                                    key={proxy.id}
                                                    className={`px-4 py-2 text-center border-r border-gray-100 last:border-r-0 ${proxy.status === 'stopped' && proxy.ips[rowIndex] ? 'bg-red-300' : ''
                                                        }`}
                                                >
                                                    <div className={`text-sm font-mono ${proxy.ips[rowIndex] && isIPListed(proxy.ips[rowIndex])
                                                        ? 'text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded inline-block'
                                                        : proxy.status === 'stopped' && proxy.ips[rowIndex]
                                                            ? 'text-gray-900'
                                                            : 'text-gray-700'
                                                        }`}>
                                                        {proxy.ips[rowIndex] || ''}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Proxy Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => { setIsAddModalOpen(false); resetForm(); }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
                        >
                            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                                <h3 className="font-semibold text-gray-900 text-lg">Add Proxy Server</h3>
                                <button
                                    onClick={() => { setIsAddModalOpen(false); resetForm(); }}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Method Selection */}
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setAddMethod('normal')}
                                        className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${addMethod === 'normal'
                                            ? 'text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        style={addMethod === 'normal' ? { background: 'linear-gradient(to right, #6FC5E8, #87CEEB)' } : {}}
                                    >
                                        Normal Way
                                    </button>
                                    <button
                                        onClick={() => setAddMethod('smart')}
                                        className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${addMethod === 'smart'
                                            ? 'text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        style={addMethod === 'smart' ? { background: 'linear-gradient(to right, #6FC5E8, #87CEEB)' } : {}}
                                    >
                                        Smart Way (CIDR)
                                    </button>
                                </div>

                                {/* Conditional Fields */}
                                {addMethod === 'normal' ? (
                                    <>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Server Name
                                            </label>
                                            <input
                                                type="text"
                                                value={serverName}
                                                onChange={(e) => setServerName(e.target.value)}
                                                placeholder="e.g., way_cmh1_6"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                IP Addresses (one per line)
                                            </label>
                                            <textarea
                                                value={ips}
                                                onChange={(e) => setIps(e.target.value)}
                                                placeholder="198.46.2.11&#10;198.46.2.12&#10;198.46.2.13"
                                                rows={10}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            CIDR Blocks with Server Names
                                        </label>
                                        <textarea
                                            value={cidr}
                                            onChange={(e) => setCidr(e.target.value)}
                                            placeholder="170.62.97.0/24&#9;dany_cmh1_30&#10;170.62.96.0/24&#9;dany_cmh1_28&#10;151.248.77.0/24&#9;pub_cmh1_6"
                                            rows={10}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                                        />
                                        <p className="mt-2 text-xs text-gray-500">
                                            Format: <span className="font-semibold">CIDR_BLOCK [TAB or SPACE] SERVER_NAME</span> (one per line)
                                            <br />
                                            IPs will be generated from .11 to .254 for each CIDR block
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                                <Button
                                    variant="ghost"
                                    onClick={() => { setIsAddModalOpen(false); resetForm(); }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleAddProxy}
                                >
                                    Add Proxy
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )
                }
            </AnimatePresence >

            {/* Edit Proxy Modal */}
            <AnimatePresence>
                {
                    isEditModalOpen && editingProxy && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => { setIsEditModalOpen(false); resetForm(); }}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
                            >
                                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                                    <h3 className="font-semibold text-gray-900 text-lg">Update Proxy Server</h3>
                                    <button
                                        onClick={() => { setIsEditModalOpen(false); resetForm(); }}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="p-6 space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Server Name
                                        </label>
                                        <input
                                            type="text"
                                            value={serverName}
                                            onChange={(e) => setServerName(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            IP Addresses (one per line)
                                        </label>
                                        <textarea
                                            value={ips}
                                            onChange={(e) => setIps(e.target.value)}
                                            rows={10}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                                    <Button
                                        variant="ghost"
                                        onClick={() => { setIsEditModalOpen(false); resetForm(); }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleUpdateProxy}
                                    >
                                        Update Server
                                    </Button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >
        </div >
    );
};

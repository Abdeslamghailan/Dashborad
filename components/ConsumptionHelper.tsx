import React, { useState, useMemo, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    ShieldAlert, Activity, RefreshCw, FileText, Download, Trash2, Copy, Check,
    ChevronLeft, ChevronRight, LayoutDashboard, PieChart as PieIcon, List,
    ClipboardList, Send, Trash, Globe, Settings, Save, AlertCircle, Zap,
    Target, BarChart3, Layers, Search, Filter, AlignLeft, Eraser, Type, LayoutGrid, X
} from 'lucide-react';
import { Button } from './ui/Button';
import { service } from '../services';
import { Entity, MethodType } from '../types';
import { useAuth } from '../contexts/AuthContext';

// --- Types ---
interface ConsumptionData {
    drop: string;
    seedsActive: number;
    seedsBlocked: number;
    mailboxesActive: number;
    mailboxesDropped: number;
    sessionsOut: string;
}

// --- Excel-style Components ---
const ExcelCard = ({ children, className = "", ...props }: { children: React.ReactNode, className?: string, [key: string]: any }) => (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-6 ${className}`} {...props}>
        {children}
    </div>
);

const ExcelSectionTitle = ({ children, icon: Icon }: { children: React.ReactNode, icon?: any }) => (
    <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon size={18} className="text-[#5c7cfa]" />}
        <h3 className="text-lg font-bold text-gray-700">{children}</h3>
    </div>
);

export const ConsumptionHelper: React.FC = () => {
    const [activeMethod, setActiveMethod] = useState<MethodType>('desktop');
    const [entities, setEntities] = useState<Entity[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadEntities = async () => {
            try {
                const data = await service.getEntities();
                setEntities(data);
            } catch (err) {
                console.error('Failed to load entities:', err);
            }
        };
        loadEntities();
    }, []);

    const [selectedEntityId, setSelectedEntityId] = useState<string>('');
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
    const [categoryConsumptionData, setCategoryConsumptionData] = useState<Record<string, {
        seeds: string;
        mailboxes: string;
        sessions: string;
        results: ConsumptionData[];
    }>>({});

    const selectedEntity = useMemo(() =>
        entities.find(e => e.id === selectedEntityId),
        [entities, selectedEntityId]);

    const categories = useMemo(() => {
        if (!selectedEntity) return [];
        if (activeMethod === 'desktop') {
            // Check methodsData first, then fallback to legacy reporting
            return selectedEntity.methodsData?.desktop?.parentCategories || selectedEntity.reporting?.parentCategories || [];
        }
        return selectedEntity.methodsData?.[activeMethod]?.parentCategories || [];
    }, [selectedEntity, activeMethod]);

    const handleGenerateConsumption = () => {
        setCategoryConsumptionData(prev => {
            const next = { ...prev };
            selectedCategoryIds.forEach(id => {
                const data = next[id] || { seeds: '', mailboxes: '', sessions: '', results: [] };
                const seedsLines = data.seeds.split('\n').filter(l => l.trim());
                const mailboxLines = data.mailboxes.split('\n').filter(l => l.trim());
                const sessionsLines = data.sessions.split('\n').filter(l => l.trim());

                const results: ConsumptionData[] = seedsLines.map((line, index) => {
                    const seedVal = parseInt(line) || 0;
                    const mbVal = parseInt(mailboxLines[index]) || 0;
                    const sessionVal = sessionsLines[index] || '0';
                    return {
                        drop: `Drop ${index + 1}`,
                        seedsActive: mbVal,
                        seedsBlocked: Math.max(0, seedVal - mbVal),
                        mailboxesActive: mbVal,
                        mailboxesDropped: 0,
                        sessionsOut: sessionVal
                    };
                });
                next[id] = { ...data, results };
            });
            return next;
        });
    };

    const consumptionTotals = useMemo(() => {
        let total = 0, active = 0, blocked = 0;
        selectedCategoryIds.forEach(id => {
            const results = categoryConsumptionData[id]?.results || [];
            results.forEach(curr => {
                total += curr.seedsActive + curr.seedsBlocked;
                active += curr.seedsActive;
                blocked += curr.seedsBlocked;
            });
        });
        return { total, active, blocked };
    }, [categoryConsumptionData, selectedCategoryIds]);

    const handleSendToBot = async () => {
        const botToken = selectedEntity?.botConfig?.token;
        const chatId = selectedEntity?.botConfig?.chatId;

        if (!botToken || !chatId) {
            alert('Telegram Bot is not configured for this entity. Please contact an administrator.');
            return;
        }

        const entityName = selectedEntity?.name || 'Unknown Entity';
        const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const fileName = `${activeMethod.charAt(0).toUpperCase() + activeMethod.slice(1)}_Consumption_Report_${dateStr.replace(/\//g, '-')}.html`;

        const navItems = selectedCategoryIds.map((id, idx) => {
            const cat = categories.find(c => c.id === id);
            return `<button class="nav-btn" onclick="showPage('page-${id}', this)">${cat?.name || 'Category'}</button>`;
        }).join('');

        const categoryPages = selectedCategoryIds.map(id => {
            const cat = categories.find(c => c.id === id);
            const data = categoryConsumptionData[id];
            if (!cat || !data || data.results.length === 0) return '';

            const catTotal = data.results.reduce((sum, r) => sum + r.seedsActive + r.seedsBlocked, 0);
            const catActive = data.results.reduce((sum, r) => sum + r.seedsActive, 0);
            const catBlocked = data.results.reduce((sum, r) => sum + r.seedsBlocked, 0);

            return `
        <div id="page-${id}" class="page">
            <div class="section-header">
                <span class="section-title">📂 Category: ${cat.name}</span>
            </div>

            <div class="stats-grid">
                <div class="stat-card total">
                    <span class="stat-icon">📊</span>
                    <span class="stat-value">${catTotal}</span>
                    <span class="stat-label">Total Consumed</span>
                </div>
                <div class="stat-card active">
                    <span class="stat-icon">✅</span>
                    <span class="stat-value">${catActive}</span>
                    <span class="stat-label">Active Seeds</span>
                </div>
                <div class="stat-card blocked">
                    <span class="stat-icon">🚫</span>
                    <span class="stat-value">${catBlocked}</span>
                    <span class="stat-label">Blocked Seeds</span>
                </div>
            </div>

            <div class="section" style="margin-bottom: 30px;">
                <div class="section-header">
                    <span class="section-title">📈 Performance Graph</span>
                </div>
                <div style="height: 300px; position: relative;">
                    <canvas id="chart-${id}"></canvas>
                </div>
            </div>

            <div class="section">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Drop Identifier</th>
                                <th>Total Volume</th>
                                <th>Active Status</th>
                                <th>Blocked Status</th>
                                <th>Sessions Out</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.results.map(res => `
                                <tr>
                                    <td class="drop-cell">${res.drop}</td>
                                    <td>${res.seedsActive + res.seedsBlocked}</td>
                                    <td><span class="active-cell">${res.seedsActive}</span></td>
                                    <td><span class="blocked-cell">${res.seedsBlocked}</span></td>
                                    <td><span class="session-cell">${res.sessionsOut}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;
        }).join('');

        let htmlReport = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${activeMethod.toUpperCase()} Consumption Report - ${entityName}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        :root {
            --primary: #4f46e5;
            --primary-light: #eef2ff;
            --success: #10b981;
            --success-light: #ecfdf5;
            --danger: #ef4444;
            --danger-light: #fef2f2;
            --dark: #1f2937;
            --gray: #6b7280;
            --bg: #f8fafc;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: var(--bg); color: var(--dark); line-height: 1.5; padding: 20px; }
        .container { max-width: 1100px; margin: 0 auto; }
        .navbar { background: white; padding: 10px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 20px; display: flex; gap: 10px; overflow-x: auto; position: sticky; top: 10px; z-index: 100; border: 1px solid #f1f5f9; }
        .nav-btn { padding: 10px 20px; border: none; background: transparent; color: var(--gray); font-weight: 700; font-size: 13px; cursor: pointer; border-radius: 12px; transition: all 0.2s; white-space: nowrap; }
        .nav-btn:hover { background: var(--bg); color: var(--primary); }
        .nav-btn.active { background: var(--primary); color: white; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3); }
        .header { background: white; border-radius: 24px; padding: 40px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); margin-bottom: 30px; position: relative; overflow: hidden; }
        .header::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 6px; background: linear-gradient(90deg, var(--primary), var(--success)); }
        .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
        .title-group h1 { font-size: 28px; font-weight: 800; color: var(--dark); letter-spacing: -0.025em; margin-bottom: 4px; }
        .title-group p { color: var(--gray); font-size: 14px; font-weight: 500; }
        .badge { background: var(--primary-light); color: var(--primary); padding: 6px 16px; border-radius: 99px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; background: #f9fafb; padding: 24px; border-radius: 16px; border: 1px solid #f3f4f6; }
        .meta-item { display: flex; flex-direction: column; gap: 4px; }
        .meta-label { font-size: 11px; font-weight: 700; color: var(--gray); text-transform: uppercase; letter-spacing: 0.05em; }
        .meta-value { font-size: 15px; font-weight: 600; color: var(--dark); }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 40px; }
        .stat-card { background: white; padding: 32px; border-radius: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; text-align: center; }
        .stat-icon { font-size: 24px; margin-bottom: 12px; display: block; }
        .stat-value { font-size: 36px; font-weight: 800; color: var(--dark); display: block; line-height: 1; margin-bottom: 8px; }
        .stat-label { font-size: 13px; font-weight: 600; color: var(--gray); text-transform: uppercase; letter-spacing: 0.05em; }
        .stat-card.total { border-bottom: 4px solid var(--primary); }
        .stat-card.active { border-bottom: 4px solid var(--success); }
        .stat-card.blocked { border-bottom: 4px solid var(--danger); }
        .section { background: white; border-radius: 24px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; }
        .section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        .section-title { font-size: 18px; font-weight: 700; color: var(--dark); }
        .table-container { overflow-x: auto; }
        table { width: 100%; border-collapse: separate; border-spacing: 0; }
        th { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; font-weight: 700; color: var(--gray); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #f1f5f9; }
        td { padding: 20px 16px; text-align: center; font-size: 14px; font-weight: 600; color: var(--dark); border-bottom: 1px solid #f1f5f9; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: #f8fafc; }
        .drop-cell { color: var(--primary); font-weight: 700; }
        .active-cell { color: var(--success); background: var(--success-light); border-radius: 8px; padding: 4px 12px; display: inline-block; }
        .blocked-cell { color: var(--danger); background: var(--danger-light); border-radius: 8px; padding: 4px 12px; display: inline-block; }
        .session-cell { color: var(--primary); background: var(--primary-light); border-radius: 8px; padding: 4px 12px; display: inline-block; }
        .footer { text-align: center; margin-top: 60px; padding-top: 30px; border-top: 1px solid #e2e8f0; }
        .footer p { color: var(--gray); font-size: 13px; font-weight: 500; }
        .footer-brand { font-weight: 700; color: var(--dark); margin-bottom: 4px; }
        .page { display: none; animation: fadeIn 0.3s ease-out; }
        .page.active { display: block; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body>
    <div class="container">
        <nav class="navbar">
            <button class="nav-btn active" onclick="showPage('global-overview', this)">Global Overview</button>
            ${navItems}
        </nav>
        <div id="global-overview" class="page active">
            <div class="header">
                <div class="header-top">
                    <div class="title-group">
                        <h1>${activeMethod.toUpperCase()} Consumption Report</h1>
                        <p>Global Analytics & Performance Tracking</p>
                    </div>
                    <span class="badge">Live Report</span>
                </div>
                <div class="meta-grid">
                    <div class="meta-item">
                        <span class="meta-label">Entity</span>
                        <span class="meta-value">${entityName}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Total Categories</span>
                        <span class="meta-value">${selectedCategoryIds.length}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Generated On</span>
                        <span class="meta-value">${dateStr} • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
            </div>
            <div class="stats-grid">
                <div class="stat-card total">
                    <span class="stat-icon">📊</span>
                    <span class="stat-value">${consumptionTotals.total}</span>
                    <span class="stat-label">Global Total</span>
                </div>
                <div class="stat-card active">
                    <span class="stat-icon">✅</span>
                    <span class="stat-value">${consumptionTotals.active}</span>
                    <span class="stat-label">Global Active</span>
                </div>
                <div class="stat-card blocked">
                    <span class="stat-icon">🚫</span>
                    <span class="stat-value">${consumptionTotals.blocked}</span>
                    <span class="stat-label">Global Blocked</span>
                </div>
            </div>
            <div class="section" style="margin-bottom: 30px;">
                <div class="section-header">
                    <span class="section-title">📊 Category Comparison</span>
                </div>
                <div style="height: 350px; position: relative;">
                    <canvas id="global-chart"></canvas>
                </div>
            </div>
            <div class="section">
                <div class="section-header">
                    <span class="section-title">Category Summary</span>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                 <th>Category Name</th>
                                <th>Total Seeds</th>
                                <th>Active</th>
                                <th>Blocked</th>
                                <th>Sessions Out</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${selectedCategoryIds.map(id => {
            const cat = categories.find(c => c.id === id);
            const data = categoryConsumptionData[id];
            if (!cat || !data) return '';
            const total = data.results.reduce((s, r) => s + r.seedsActive + r.seedsBlocked, 0);
            const active = data.results.reduce((s, r) => s + r.seedsActive, 0);
            const blocked = data.results.reduce((s, r) => s + r.seedsBlocked, 0);
            const sessions = data.results.map(r => r.sessionsOut).join(', ');
            return `
                                    <tr>
                                        <td class="drop-cell">${cat.name}</td>
                                        <td>${total}</td>
                                        <td><span class="active-cell">${active}</span></td>
                                        <td><span class="blocked-cell">${blocked}</span></td>
                                        <td><span class="session-cell">${sessions}</span></td>
                                    </tr>
                                `;
        }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        ${categoryPages}
        <div class="footer">
            <div class="footer-brand">Reporter Helper CMHW</div>
            <p>© ${new Date().getFullYear()} Secure Analytics Dashboard. All rights reserved.</p>
        </div>
    </div>
    <script>
        function showPage(pageId, btn) {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');
            btn.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        window.onload = function() {
            const chartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { font: { weight: 'bold', family: 'Inter' } } }
                },
                scales: {
                    y: { beginAtZero: true, grid: { display: true, color: '#f1f5f9' } },
                    x: { grid: { display: false } }
                }
            };
            new Chart(document.getElementById('global-chart'), {
                type: 'bar',
                data: {
                    labels: ${JSON.stringify(selectedCategoryIds.map(id => categories.find(c => c.id === id)?.name || 'Unknown'))},
                    datasets: [
                        {
                            label: 'Active Seeds',
                            data: ${JSON.stringify(selectedCategoryIds.map(id => (categoryConsumptionData[id]?.results || []).reduce((s, r) => s + r.seedsActive, 0)))},
                            backgroundColor: '#10b981',
                            borderRadius: 6
                        },
                        {
                            label: 'Blocked Seeds',
                            data: ${JSON.stringify(selectedCategoryIds.map(id => (categoryConsumptionData[id]?.results || []).reduce((s, r) => s + r.seedsBlocked, 0)))},
                            backgroundColor: '#ef4444',
                            borderRadius: 6
                        }
                    ]
                },
                options: chartOptions
            });
            ${selectedCategoryIds.map(id => {
            const data = categoryConsumptionData[id];
            if (!data) return '';
            return `
            new Chart(document.getElementById('chart-${id}'), {
                type: 'bar',
                data: {
                    labels: ${JSON.stringify(data.results.map(r => r.drop))},
                    datasets: [
                        {
                            label: 'Active',
                            data: ${JSON.stringify(data.results.map(r => r.seedsActive))},
                            backgroundColor: '#10b981',
                            borderRadius: 4
                        },
                        {
                            label: 'Blocked',
                            data: ${JSON.stringify(data.results.map(r => r.seedsBlocked))},
                            backgroundColor: '#ef4444',
                            borderRadius: 4
                        }
                    ]
                },
                options: chartOptions
            });`;
        }).join('')}
        };
    </script>
</body>
</html>`;

        try {
            const data = await service.sendToBot({
                entityId: selectedEntityId,
                htmlReport,
                botToken,
                chatId,
                fileName
            });
            if (data.success) alert('Report file sent to Telegram!');
            else throw new Error(data.error);
        } catch (err: any) {
            alert(`Failed to send report: ${err.message}`);
        }
    };

    if (activeMethod === 'desktop') {
        return (
            <div className="space-y-6">
                {/* Header Section */}
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                        Consumption <span className="text-[#5c7cfa]">Helper</span>
                    </h1>
                    <p className="text-gray-500 text-sm font-medium">
                        Analyze and report consumption data for Desktop and Webautomate.
                    </p>
                </div>

                {/* Method Switcher */}
                <div className="flex justify-center">
                    <div className="bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-1">
                        <button
                            onClick={() => {
                                setActiveMethod('desktop');
                                setSelectedCategoryIds([]);
                                setActiveCategoryId(null);
                            }}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeMethod === 'desktop' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <LayoutGrid size={18} />
                            Desktop Consumption
                        </button>
                        <button
                            onClick={() => {
                                setActiveMethod('webautomate');
                                setSelectedCategoryIds([]);
                                setActiveCategoryId(null);
                            }}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${(activeMethod as string) === 'webautomate' ? 'bg-[#5c7cfa] text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <Globe size={18} />
                            Webautomate Consumption
                        </button>
                    </div>
                </div>

                <ExcelCard>
                    <ExcelSectionTitle icon={Settings}>Report Configuration</ExcelSectionTitle>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Entity</label>
                                    <select
                                        value={selectedEntityId}
                                        onChange={(e) => {
                                            setSelectedEntityId(e.target.value);
                                            setSelectedCategoryIds([]);
                                            setActiveCategoryId(null);
                                        }}
                                        className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:border-indigo-500 outline-none"
                                    >
                                        <option value="">Choose Entity...</option>
                                        {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Categories (Multi-Select)</label>
                                    <div className="flex flex-wrap gap-2 p-3 bg-white border border-gray-200 rounded-xl min-h-[45px]">
                                        {categories.map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => {
                                                    setSelectedCategoryIds(prev => {
                                                        const isSelected = prev.includes(c.id);
                                                        if (!isSelected) {
                                                            setActiveCategoryId(c.id);
                                                            return [...prev, c.id];
                                                        } else {
                                                            setActiveCategoryId(c.id);
                                                            return prev;
                                                        }
                                                    });
                                                }}
                                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${selectedCategoryIds.includes(c.id)
                                                    ? activeCategoryId === c.id
                                                        ? 'bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-300'
                                                        : 'bg-indigo-100 text-indigo-600 border border-indigo-200'
                                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {c.name}
                                                {selectedCategoryIds.includes(c.id) && (
                                                    <span
                                                        className="ml-2 hover:text-red-500"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedCategoryIds(prev => prev.filter(id => id !== c.id));
                                                            if (activeCategoryId === c.id) setActiveCategoryId(null);
                                                        }}
                                                    >
                                                        ×
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                        {categories.length === 0 && <span className="text-gray-300 text-xs italic">No categories available</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="space-y-1">
                            <label className="text-sm font-black text-gray-900 uppercase tracking-wider ml-1">
                                Consommation Seeds {activeCategoryId ? `(${categories.find(c => c.id === activeCategoryId)?.name})` : ''}
                            </label>
                            <textarea
                                value={activeCategoryId ? (categoryConsumptionData[activeCategoryId]?.seeds || '') : ''}
                                onChange={(e) => {
                                    if (!activeCategoryId) return;
                                    setCategoryConsumptionData(prev => ({
                                        ...prev,
                                        [activeCategoryId]: { ...(prev[activeCategoryId] || { seeds: '', mailboxes: '', sessions: '', results: [] }), seeds: e.target.value }
                                    }));
                                }}
                                disabled={!activeCategoryId}
                                placeholder="99&#10;99&#10;99"
                                className="w-full h-48 p-4 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 resize-none bg-white placeholder-gray-300 leading-relaxed disabled:bg-gray-50"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-black text-emerald-600 uppercase tracking-wider ml-1">
                                Nbr Boites Active/Drop {activeCategoryId ? `(${categories.find(c => c.id === activeCategoryId)?.name})` : ''}
                            </label>
                            <textarea
                                value={activeCategoryId ? (categoryConsumptionData[activeCategoryId]?.mailboxes || '') : ''}
                                onChange={(e) => {
                                    if (!activeCategoryId) return;
                                    setCategoryConsumptionData(prev => ({
                                        ...prev,
                                        [activeCategoryId]: { ...(prev[activeCategoryId] || { seeds: '', mailboxes: '', sessions: '', results: [] }), mailboxes: e.target.value }
                                    }));
                                }}
                                disabled={!activeCategoryId}
                                placeholder="80&#10;97&#10;83"
                                className="w-full h-48 p-4 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 resize-none bg-white placeholder-gray-300 leading-relaxed disabled:bg-gray-50"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-black text-gray-900 uppercase tracking-wider ml-1">Sessions Out</label>
                            <textarea
                                value={activeCategoryId ? (categoryConsumptionData[activeCategoryId]?.sessions || '') : ''}
                                onChange={(e) => {
                                    if (!activeCategoryId) return;
                                    setCategoryConsumptionData(prev => ({
                                        ...prev,
                                        [activeCategoryId]: { ...(prev[activeCategoryId] || { seeds: '', mailboxes: '', sessions: '', results: [] }), sessions: e.target.value }
                                    }));
                                }}
                                placeholder="0&#10;0&#10;0"
                                disabled={!activeCategoryId}
                                className="w-full h-48 p-4 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 resize-none bg-white placeholder-gray-300 leading-relaxed disabled:bg-gray-50"
                            />
                        </div>
                    </div>

                    <div className="flex justify-center gap-4">
                        <Button
                            onClick={handleGenerateConsumption}
                            className="bg-indigo-600 hover:bg-indigo-700 px-8 py-2.5 h-auto text-sm font-bold"
                            leftIcon={<Zap size={18} />}
                        >
                            Generate Report
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setCategoryConsumptionData({});
                                setSelectedCategoryIds([]);
                                setActiveCategoryId(null);
                            }}
                            className="border-gray-200 text-gray-500 hover:bg-gray-50 px-8 py-2.5 h-auto text-sm font-bold"
                        >
                            Clear All
                        </Button>
                    </div>
                </ExcelCard>

                {selectedCategoryIds.length > 0 && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <ExcelCard className="border-b-4 border-b-indigo-500">
                                <div className="text-center">
                                    <div className="text-3xl font-black text-gray-900">{consumptionTotals.total}</div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Consumed</div>
                                </div>
                            </ExcelCard>
                            <ExcelCard className="border-b-4 border-b-emerald-500">
                                <div className="text-center">
                                    <div className="text-3xl font-black text-emerald-600">{consumptionTotals.active}</div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Seeds</div>
                                </div>
                            </ExcelCard>
                            <ExcelCard className="border-b-4 border-b-red-500">
                                <div className="text-center">
                                    <div className="text-3xl font-black text-red-500">{consumptionTotals.blocked}</div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Blocked Seeds</div>
                                </div>
                            </ExcelCard>
                        </div>

                        <div className="flex justify-center">
                            <Button
                                onClick={handleSendToBot}
                                className="bg-gray-900 hover:bg-black text-white px-12 py-3 h-auto text-sm font-black uppercase tracking-widest shadow-xl"
                                leftIcon={<Send size={18} />}
                            >
                                Send Report to Telegram Bot
                            </Button>
                        </div>

                        {selectedCategoryIds.map(id => {
                            const cat = categories.find(c => c.id === id);
                            const data = categoryConsumptionData[id];
                            if (!cat || !data || data.results.length === 0) return null;

                            return (
                                <ExcelCard key={id} className="overflow-hidden p-0">
                                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                        <ExcelSectionTitle icon={Layers}>
                                            {cat.name} - Detailed Data
                                        </ExcelSectionTitle>
                                        <div className="flex gap-4">
                                            <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                                                Active: {data.results.reduce((s, r) => s + r.seedsActive, 0)}
                                            </div>
                                            <div className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full">
                                                Blocked: {data.results.reduce((s, r) => s + r.seedsBlocked, 0)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <div className="h-[300px] mb-8">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={data.results}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="drop" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                                        cursor={{ fill: '#f8fafc' }}
                                                    />
                                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }} />
                                                    <Bar name="Active Seeds" dataKey="seedsActive" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                                                    <Bar name="Blocked Seeds" dataKey="seedsBlocked" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-center border-separate border-spacing-0 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                                <thead>
                                                    <tr className="bg-gray-50/80 backdrop-blur-sm">
                                                        <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-200">Drop</th>
                                                        <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-200 border-l">Total</th>
                                                        <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-200 border-l">Active</th>
                                                        <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-200 border-l">Blocked</th>
                                                        <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-200 border-l">Sessions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {data.results.map((row, i) => (
                                                        <tr key={i} className="hover:bg-indigo-50/30 transition-all duration-200 group">
                                                            <td className="px-8 py-5 text-sm font-bold text-gray-700 border-b border-gray-100 group-last:border-b-0">{row.drop}</td>
                                                            <td className="px-8 py-5 text-sm font-semibold text-gray-600 border-b border-gray-100 border-l group-last:border-b-0">{row.seedsActive + row.seedsBlocked}</td>
                                                            <td className="px-8 py-5 text-sm font-bold text-emerald-600 border-b border-gray-100 border-l group-last:border-b-0">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                    {row.seedsActive}
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-5 text-sm font-black text-red-500 border-b border-gray-100 border-l group-last:border-b-0">{row.seedsBlocked}</td>
                                                            <td className="px-8 py-5 text-sm font-bold text-indigo-600 border-b border-gray-100 border-l group-last:border-b-0">{row.sessionsOut}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </ExcelCard>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header & Method Switcher */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                        Consumption <span className="text-[#5c7cfa]">Webautomat</span>
                    </h1>
                    <p className="text-gray-500 text-sm font-medium">
                        Advanced analytics engine for {activeMethod} reporting.
                    </p>
                </div>

                <div className="bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-1">
                    <button
                        onClick={() => {
                            setActiveMethod('desktop');
                            setSelectedCategoryIds([]);
                            setActiveCategoryId(null);
                        }}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${(activeMethod as string) === 'desktop' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <LayoutGrid size={18} />
                        Desktop
                    </button>
                    <button
                        onClick={() => {
                            setActiveMethod('webautomate');
                            setSelectedCategoryIds([]);
                            setActiveCategoryId(null);
                        }}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeMethod === 'webautomate' ? 'bg-[#5c7cfa] text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        <Globe size={18} />
                        Webautomate
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
                {/* Left Sidebar */}
                <div className="space-y-8">
                    <ExcelCard className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <Settings size={20} className="text-indigo-600" />
                            </div>
                            <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Report Configuration</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Entity Target</label>
                                <select
                                    value={selectedEntityId}
                                    onChange={(e) => {
                                        setSelectedEntityId(e.target.value);
                                        setSelectedCategoryIds([]);
                                        setActiveCategoryId(null);
                                    }}
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Choose Entity...</option>
                                    {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Categories (Multi-Select)</label>
                                <div className="space-y-3">
                                    <div className="flex flex-wrap gap-2 p-4 bg-gray-50 border border-gray-100 rounded-2xl min-h-[60px]">
                                        {selectedCategoryIds.map(id => {
                                            const cat = categories.find(c => c.id === id);
                                            return (
                                                <div
                                                    key={id}
                                                    onClick={() => setActiveCategoryId(id)}
                                                    className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${activeCategoryId === id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-100 hover:border-indigo-200'}`}
                                                >
                                                    {cat?.name}
                                                    <X
                                                        size={14}
                                                        className="hover:text-red-400 transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedCategoryIds(prev => prev.filter(cid => cid !== id));
                                                            if (activeCategoryId === id) setActiveCategoryId(null);
                                                        }}
                                                    />
                                                </div>
                                            );
                                        })}
                                        {selectedCategoryIds.length === 0 && <span className="text-gray-300 text-xs italic">No categories selected</span>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        {categories.filter(c => !selectedCategoryIds.includes(c.id)).map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => {
                                                    setSelectedCategoryIds(prev => [...prev, c.id]);
                                                    setActiveCategoryId(c.id);
                                                }}
                                                className="px-3 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-bold text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-all text-left truncate"
                                            >
                                                + {c.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ExcelCard>


                </div>

                {/* Main Content Area */}
                <div className="space-y-8">
                    <ExcelCard className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden p-0">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <Target size={20} className="text-indigo-600" />
                                </div>
                                <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Consumption Webautomat</h3>
                            </div>
                            <button
                                onClick={() => {
                                    setCategoryConsumptionData({});
                                    setSelectedCategoryIds([]);
                                    setActiveCategoryId(null);
                                }}
                                className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Zap size={16} />
                                        <label className="text-xs font-black text-gray-900 uppercase tracking-widest">Consommation Seeds</label>
                                    </div>
                                    <textarea
                                        value={activeCategoryId ? (categoryConsumptionData[activeCategoryId]?.seeds || '') : ''}
                                        onChange={(e) => {
                                            if (!activeCategoryId) return;
                                            setCategoryConsumptionData(prev => ({
                                                ...prev,
                                                [activeCategoryId]: { ...(prev[activeCategoryId] || { seeds: '', mailboxes: '', sessions: '', results: [] }), seeds: e.target.value }
                                            }));
                                        }}
                                        disabled={!activeCategoryId}
                                        placeholder="99&#10;85&#10;..."
                                        className="w-full h-48 p-5 bg-gray-50 border border-gray-100 rounded-3xl text-sm font-medium text-gray-600 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all resize-none leading-relaxed disabled:opacity-50"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <LayoutGrid size={16} />
                                        <label className="text-xs font-black text-emerald-600 uppercase tracking-widest">Active/Drop Boxes</label>
                                    </div>
                                    <textarea
                                        value={activeCategoryId ? (categoryConsumptionData[activeCategoryId]?.mailboxes || '') : ''}
                                        onChange={(e) => {
                                            if (!activeCategoryId) return;
                                            setCategoryConsumptionData(prev => ({
                                                ...prev,
                                                [activeCategoryId]: { ...(prev[activeCategoryId] || { seeds: '', mailboxes: '', sessions: '', results: [] }), mailboxes: e.target.value }
                                            }));
                                        }}
                                        disabled={!activeCategoryId}
                                        placeholder="80&#10;97&#10;..."
                                        className="w-full h-48 p-5 bg-gray-50 border border-gray-100 rounded-3xl text-sm font-medium text-gray-600 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all resize-none leading-relaxed disabled:opacity-50"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Globe size={16} />
                                        <label className="text-xs font-black text-gray-900 uppercase tracking-widest">Sessions Out</label>
                                    </div>
                                    <textarea
                                        value={activeCategoryId ? (categoryConsumptionData[activeCategoryId]?.sessions || '') : ''}
                                        onChange={(e) => {
                                            if (!activeCategoryId) return;
                                            setCategoryConsumptionData(prev => ({
                                                ...prev,
                                                [activeCategoryId]: { ...(prev[activeCategoryId] || { seeds: '', mailboxes: '', sessions: '', results: [] }), sessions: e.target.value }
                                            }));
                                        }}
                                        disabled={!activeCategoryId}
                                        placeholder="0&#10;0&#10;..."
                                        className="w-full h-48 p-5 bg-gray-50 border border-gray-100 rounded-3xl text-sm font-medium text-gray-600 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all resize-none leading-relaxed disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">
                                    {activeCategoryId ? `${(categoryConsumptionData[activeCategoryId]?.seeds || '').split('\n').filter(l => l.trim()).length} records detected across inputs` : 'Select a category to input data'}
                                </p>
                                <Button
                                    onClick={handleGenerateConsumption}
                                    className="bg-indigo-600 hover:bg-indigo-700 px-10 py-4 h-auto text-sm font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    leftIcon={<FileText size={18} />}
                                >
                                    Generate Full Report
                                </Button>
                            </div>
                        </div>
                    </ExcelCard>

                    {selectedCategoryIds.length > 0 && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                            <ExcelCard className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                <div className="flex justify-between items-center mb-10">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 rounded-lg">
                                            <BarChart3 size={20} className="text-indigo-600" />
                                        </div>
                                        <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Detailed Consumption Breakdown</h3>
                                    </div>
                                    <div className="flex gap-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-indigo-600" />
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seeds</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Boxes</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-orange-400" />
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sessions</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Consumed</p>
                                        <p className="text-3xl font-black text-gray-900">{consumptionTotals.total}</p>
                                    </div>
                                    <div className="p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100">
                                        <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">Active Seeds</p>
                                        <p className="text-3xl font-black text-emerald-600">{consumptionTotals.active}</p>
                                    </div>
                                    <div className="p-6 bg-red-50/50 rounded-3xl border border-red-100">
                                        <p className="text-[10px] font-black text-red-600/60 uppercase tracking-widest mb-1">Blocked Seeds</p>
                                        <p className="text-3xl font-black text-red-600">{consumptionTotals.blocked}</p>
                                    </div>
                                </div>

                                <div className="flex justify-center mb-10">
                                    <Button
                                        onClick={handleSendToBot}
                                        className="bg-gray-900 hover:bg-black text-white px-12 py-4 h-auto text-sm font-black uppercase tracking-widest rounded-2xl shadow-2xl transition-all hover:scale-[1.02]"
                                        leftIcon={<Send size={18} />}
                                    >
                                        Send Report to Telegram
                                    </Button>
                                </div>

                                <div className="space-y-12">
                                    {selectedCategoryIds.map(id => {
                                        const cat = categories.find(c => c.id === id);
                                        const data = categoryConsumptionData[id];
                                        if (!cat || !data || data.results.length === 0) return null;

                                        return (
                                            <div key={id} className="space-y-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-px flex-1 bg-gray-100" />
                                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">{cat.name}</h4>
                                                    <div className="h-px flex-1 bg-gray-100" />
                                                </div>

                                                <div className="h-[300px]">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={data.results}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                            <XAxis dataKey="drop" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                                            <Tooltip
                                                                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                                                                cursor={{ fill: '#f8fafc' }}
                                                            />
                                                            <Bar name="Active Seeds" dataKey="seedsActive" fill="#10b981" radius={[6, 6, 0, 0]} barSize={30} />
                                                            <Bar name="Blocked Seeds" dataKey="seedsBlocked" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={30} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>

                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-center border-separate border-spacing-0">
                                                        <thead>
                                                            <tr>
                                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-50">Drop</th>
                                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-50">Total</th>
                                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-50">Active</th>
                                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-50">Blocked</th>
                                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-50">Sessions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-50">
                                                            {data.results.map((row, i) => (
                                                                <tr key={i} className="group hover:bg-gray-50/50 transition-all">
                                                                    <td className="px-6 py-5 text-sm font-bold text-gray-700">{row.drop}</td>
                                                                    <td className="px-6 py-5 text-sm font-semibold text-gray-500">{row.seedsActive + row.seedsBlocked}</td>
                                                                    <td className="px-6 py-5">
                                                                        <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">{row.seedsActive}</span>
                                                                    </td>
                                                                    <td className="px-6 py-5">
                                                                        <span className="text-sm font-black text-red-500 bg-red-50 px-3 py-1 rounded-lg">{row.seedsBlocked}</span>
                                                                    </td>
                                                                    <td className="px-6 py-5 text-sm font-bold text-indigo-600">{row.sessionsOut}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ExcelCard>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

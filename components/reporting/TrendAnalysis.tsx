import React from 'react';
import { TrendingUp } from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface TrendData {
    hour: string;
    inbox: number;
    spam: number;
}

interface TrendAnalysisProps {
    data: TrendData[];
}

export const TrendAnalysis: React.FC<TrendAnalysisProps> = ({ data }) => (
    <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
                <div className="bg-blue-100 p-2 rounded-lg">
                    <TrendingUp size={20} className="text-blue-600" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">Spam vs Inbox Trend</h3>
                    <p className="text-xs text-gray-500">Activity distribution over the last 24 hours</p>
                </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Inbox</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Spam</span>
                </div>
            </div>
        </div>
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorInbox" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorSpam" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                        dataKey="hour"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area type="monotone" dataKey="inbox" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorInbox)" />
                    <Area type="monotone" dataKey="spam" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorSpam)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    </div>
);

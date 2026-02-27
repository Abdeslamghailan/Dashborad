import React from 'react';
import { Sparkles, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface Insight {
    icon: React.ReactNode;
    text: string;
    trend?: string;
    trendType?: 'positive' | 'negative';
}

interface ExecutiveInsightsProps {
    insights: Insight[];
}

export const ExecutiveInsights: React.FC<ExecutiveInsightsProps> = ({ insights }) => (
    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles size={120} />
        </div>
        <div className="flex items-center gap-2 mb-4">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <Zap size={20} className="text-yellow-300" />
            </div>
            <h2 className="text-lg font-bold">Executive AI Insights</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.map((insight, idx) => (
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:bg-white/20 transition-colors"
                >
                    <div className="flex items-start gap-3">
                        <div className="mt-1">{insight.icon}</div>
                        <div>
                            <p className="text-sm font-medium leading-relaxed">{insight.text}</p>
                            {insight.trend && (
                                <span className={`text-[10px] font-bold uppercase mt-2 inline-block px-2 py-0.5 rounded ${insight.trendType === 'positive' ? 'bg-green-500/30 text-green-200' : 'bg-red-500/30 text-red-200'
                                    }`}>
                                    {insight.trend}
                                </span>
                            )}
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    </div>
);

import React, { useState, useRef } from 'react';
import { Upload, X, Copy, Check, Sparkles, Download, FileText, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/Button';

interface Profile {
    id: string;
    code: string;
}

export const ProxySync: React.FC = () => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [proxyInput, setProxyInput] = useState('');
    const [downloadedFile, setDownloadedFile] = useState<{ name: string; content: string } | null>(null);
    const [isCopying, setIsCopying] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            parseSessionFile(content);
        };
        reader.readAsText(file);
    };

    const parseSessionFile = (content: string) => {
        // Strip any leading/trailing quotes that might be in the file (more robust than previous version)
        const lines = content.split('\n').map(l => l.trim().replace(/^"+|"+$/g, ''));
        const parsedProfiles: Profile[] = [];
        let currentId = '';

        lines.forEach(line => {
            if (!line) {
                currentId = '';
                return;
            }

            if (!currentId) {
                // First non-empty line of a block is the ID
                currentId = line;
            } else {
                // Subsequent lines are codes
                parsedProfiles.push({ id: currentId, code: line });
            }
        });

        setProfiles(parsedProfiles);
    };

    const handleCleanProxies = () => {
        const lines = proxyInput.split('\n').map(l => l.trim()).filter(l => l !== '');
        const uniqueProxies = Array.from(new Set(lines));
        const needed = profiles.length;

        // Take only what's needed
        const cleaned = uniqueProxies.slice(0, needed);
        setProxyInput(cleaned.join('\n'));
    };

    const handleGenerate = () => {
        const proxies = proxyInput.split('\n').map(l => l.trim()).filter(l => l !== '');
        if (proxies.length < profiles.length) return;

        let output = '';
        let lastId = '';

        profiles.forEach((profile, index) => {
            if (profile.id !== lastId) {
                if (output) output += '\n';
                output += `${profile.id}\n`;
                lastId = profile.id;
            }
            output += `${profile.code}#${profile.id}#${proxies[index]}\n`;
        });

        // Date-Time formatting: 03_02_2026_12:30
        const now = new Date();
        const d = String(now.getDate()).padStart(2, '0');
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const y = now.getFullYear();
        const h = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');

        const entityName = (profiles[0]?.id.split('_')[0] || 'ProxySync').replace(/"/g, '');
        const timestamp = `${d}_${m}_${y}_${h}-${min}`;
        const fileName = `${entityName}_${timestamp}.txt`;

        setDownloadedFile({ name: fileName, content: output });

        // Trigger download
        const blob = new Blob([output], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    };

    const copyFileName = () => {
        if (!downloadedFile) return;
        navigator.clipboard.writeText(downloadedFile.name);
        setIsCopying(true);
        setTimeout(() => setIsCopying(false), 2000);
    };

    const proxyLines = proxyInput.split('\n').map(l => l.trim()).filter(l => l !== '');
    const proxyCount = proxyLines.length;
    const isReady = profiles.length > 0 && proxyCount >= profiles.length;

    return (
        <div className="max-w-4xl mx-auto space-y-8 py-12">
            {/* Header */}
            <div className="text-center space-y-4">
                <div className="flex items-center justify-center -space-x-1">
                    <h1 className="text-6xl font-black text-slate-900 uppercase tracking-tighter">Proxy</h1>
                    <h1 className="text-6xl font-black text-indigo-600 uppercase tracking-tighter">Sync</h1>
                </div>
                <p className="text-slate-500 font-medium text-lg">
                    Map session profiles to proxies instantly.
                </p>
            </div>

            {/* Upload Area */}
            <div
                onClick={() => fileInputRef.current?.click()}
                className="bg-white rounded-[60px] p-24 flex flex-col items-center justify-center gap-6 cursor-pointer hover:bg-slate-50/50 transition-all group relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.05)]"
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".txt"
                    onChange={handleFileUpload}
                />

                {/* Decorative Dashed Border (Single layer like screen 1) */}
                <div className="absolute inset-8 border-2 border-dashed border-slate-200 rounded-[40px] pointer-events-none group-hover:border-indigo-300 transition-colors" />

                <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-[0_15px_30px_rgba(79,70,229,0.3)] group-hover:scale-110 transition-transform relative z-10">
                    <Upload size={40} />
                </div>
                <span className="text-2xl font-black text-slate-800 uppercase tracking-tight relative z-10">
                    Upload Session TXT
                </span>
            </div>

            {/* Profiles Found Indicator (Matches Screen 2) */}
            <AnimatePresence>
                {profiles.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-900 rounded-[32px] p-8 shadow-2xl flex items-center justify-between"
                    >
                        <div className="space-y-1">
                            <span className="text-xs font-black text-indigo-500 uppercase tracking-[0.3em]">Ready</span>
                            <h3 className="text-3xl font-black text-white tracking-tighter">
                                {profiles.length} Profiles Found
                            </h3>
                        </div>
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => setProfiles([])}
                                className="text-slate-400 hover:text-white font-black uppercase tracking-widest transition-colors"
                            >
                                Annuler
                            </button>
                            <Button
                                onClick={() => setIsModalOpen(true)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-6 rounded-2xl font-black uppercase tracking-widest text-lg shadow-[0_10px_20px_rgba(79,70,229,0.4)] active:translate-y-1 transition-all"
                            >
                                Enter Proxies
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Success Toast Placeholder (from image 2) */}
            <AnimatePresence>
                {profiles.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="fixed top-6 right-6 bg-[#00c853] text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 z-[100]"
                    >
                        <div className="bg-white/20 p-1 rounded-full">
                            <Check size={16} />
                        </div>
                        <span className="font-bold text-sm">Profiles loaded: {profiles.length}</span>
                        <X
                            size={16}
                            className="ml-4 cursor-pointer hover:scale-110"
                            onClick={() => setProfiles([])}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modals */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl"
                        >
                            {/* Modal Header */}
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                    Assigning Proxies
                                </h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-10 space-y-8">
                                {!downloadedFile ? (
                                    <>
                                        <div className="relative">
                                            <textarea
                                                value={proxyInput}
                                                onChange={(e) => setProxyInput(e.target.value)}
                                                placeholder={`Paste ${profiles.length} proxies here...`}
                                                className="w-full h-80 p-8 bg-slate-50 border-2 border-slate-100 rounded-[32px] focus:outline-none focus:border-indigo-400 transition-all font-mono text-lg resize-none placeholder:text-slate-300"
                                            />

                                            {/* Counter & Clean Button (Matches Screen 4) */}
                                            <div className="absolute bottom-8 right-8 flex items-center gap-2">
                                                <div className={`flex items-center rounded-xl overflow-hidden border-2 ${proxyCount > profiles.length ? 'bg-[#50e3c2] border-[#45cfb1]' : 'bg-slate-100 border-slate-200'}`}>
                                                    <div className="px-4 py-2 text-sm font-black text-slate-800">
                                                        {proxyCount}/{profiles.length}
                                                    </div>
                                                    <div className="w-px h-6 bg-slate-800/20" />
                                                    <button
                                                        onClick={handleCleanProxies}
                                                        className="px-3 py-2 hover:bg-black/5 transition-colors flex items-center justify-center"
                                                        title="Clean Duplicates & Match Count"
                                                    >
                                                        <Sparkles size={20} className="text-slate-800" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 pt-4">
                                            <button
                                                onClick={() => setIsModalOpen(false)}
                                                className="px-8 py-4 text-slate-500 font-black uppercase tracking-widest hover:text-slate-800 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <Button
                                                onClick={handleGenerate}
                                                disabled={!isReady}
                                                className={`flex-1 py-6 rounded-[24px] font-black uppercase tracking-widest text-lg transition-all ${isReady
                                                    ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-95'
                                                    : 'bg-slate-200 text-slate-400 cursor-default'}`}
                                            >
                                                {/* In screen 3/4 the button is "Generate & Download" with a specific style */}
                                                Generate & Download
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-12 flex flex-col items-center justify-center space-y-8">
                                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                                            <Check size={40} />
                                        </div>
                                        <h3 className="text-3xl font-black text-slate-800 uppercase">
                                            File Downloaded
                                        </h3>
                                        <div className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
                                                    <FileText size={24} />
                                                </div>
                                                <span className="font-mono font-bold text-indigo-600 break-all">
                                                    {downloadedFile.name}
                                                </span>
                                            </div>
                                            <Button
                                                onClick={copyFileName}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap"
                                            >
                                                {isCopying ? <Check size={18} /> : <Copy size={18} />}
                                                {isCopying ? 'Copied' : 'Copy Name'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

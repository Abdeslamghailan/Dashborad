import React, { useState, useRef } from 'react';

interface PlanningImageImportProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (base64Image: string) => Promise<any>;
    onApplySuggestions: (assignments: any[]) => void;
}

export const PlanningImageImport: React.FC<PlanningImageImportProps> = ({
    isOpen,
    onClose,
    onImport,
    onApplySuggestions
}) => {
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [results, setResults] = useState<any | null>(null);
    const [applyError, setApplyError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleProcess = async () => {
        if (!image) return;
        setLoading(true);
        try {
            const data = await onImport(image);
            setResults(data);
        } catch (error) {
            alert('Failed to process image. Make sure the API is configured correctly.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
                    <div>
                        <h3 className="font-bold text-xl flex items-center gap-2">
                            <span>📸</span> AI Smart Import
                        </h3>
                        <p className="text-xs text-indigo-100 mt-1 uppercase tracking-wider font-semibold">Beta Feature</p>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">✕</button>
                </div>

                <div className="p-8">
                    {!image ? (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-4 border-dashed border-gray-100 rounded-3xl p-12 text-center hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer group"
                        >
                            <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                                <span className="text-4xl">📁</span>
                            </div>
                            <h4 className="text-xl font-bold text-gray-800 mb-2">Upload Screenshot</h4>
                            <p className="text-gray-500 text-sm max-w-xs mx-auto">
                                Drag and drop your planning screenshot or click to browse.
                            </p>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                accept="image/*" 
                                className="hidden" 
                            />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 group">
                                <img src={image} alt="Upload preview" className="w-full max-h-64 object-contain" />
                                <button 
                                    onClick={() => setImage(null)}
                                    className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-full hover:bg-black transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            {!results && (
                                <button
                                    onClick={handleProcess}
                                    disabled={loading}
                                    className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all ${
                                        loading 
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 active:scale-[0.98]'
                                    }`}
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Analyzing Image...
                                        </>
                                    ) : (
                                        <>
                                            <span>✨</span> Start AI Analysis
                                        </>
                                    )}
                                </button>
                            )}

                            {results && (
                                <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl">
                                        <div className="flex items-center gap-3 text-emerald-700 mb-2">
                                            <span className="text-xl">✅</span>
                                            <h4 className="font-bold text-lg">Analysis Complete</h4>
                                        </div>
                                        <p className="text-sm text-emerald-600 font-medium">
                                            The AI has successfully recognized the table structure and mapped {results.assignments?.length || 0} assignments.
                                        </p>
                                    </div>

                                    {applyError && (
                                        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-sm text-red-700 font-medium flex items-start gap-3 animate-in fade-in duration-300">
                                            <span className="text-xl leading-none">⚠️</span>
                                            <span>{applyError}</span>
                                        </div>
                                    )}

                                    <div className="flex gap-4">
                                        <button
                                            onClick={async () => {
                                                setApplyError(null);
                                                setApplying(true);
                                                try {
                                                    await onApplySuggestions(results.assignments);
                                                } catch (err: any) {
                                                    setApplyError(err?.message || 'Failed to apply planning. Please try again.');
                                                } finally {
                                                    setApplying(false);
                                                }
                                            }}
                                            disabled={applying}
                                            className={`flex-grow py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-3 transition-all ${
                                                applying
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                                            }`}
                                        >
                                            {applying ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin"></div>
                                                    Saving...
                                                </>
                                            ) : (
                                                'Apply Planning'
                                            )}
                                        </button>
                                        <button
                                            onClick={() => { setResults(null); setApplyError(null); }}
                                            className="px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 font-medium tracking-widest uppercase">
                        Requires high-contrast screenshots for best results
                    </p>
                </div>
            </div>
        </div>
    );
};

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ListedIPsContextType {
    listedIPsText: string;
    setListedIPsText: (text: string) => void;
    listedIPsSet: Set<string>;
    saveListedIPs: () => void;
    resetListedIPs: () => void;
    isIPListed: (ip: string) => boolean;
}

const ListedIPsContext = createContext<ListedIPsContextType | undefined>(undefined);

export const ListedIPsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [listedIPsText, setListedIPsText] = useState<string>('');
    const [listedIPsSet, setListedIPsSet] = useState<Set<string>>(new Set());

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('listed_ips');
        if (saved) {
            setListedIPsText(saved);
            const ips = saved.split('\n').map(ip => ip.trim()).filter(ip => ip);
            setListedIPsSet(new Set(ips));
        }
    }, []);

    const saveListedIPs = () => {
        const ips = listedIPsText.split('\n').map(ip => ip.trim()).filter(ip => ip);
        setListedIPsSet(new Set(ips));
        localStorage.setItem('listed_ips', listedIPsText);
    };

    const resetListedIPs = () => {
        setListedIPsText('');
        setListedIPsSet(new Set());
        localStorage.removeItem('listed_ips');
    };

    const isIPListed = (ip: string): boolean => {
        return listedIPsSet.has(ip);
    };

    return (
        <ListedIPsContext.Provider value={{
            listedIPsText,
            setListedIPsText,
            listedIPsSet,
            saveListedIPs,
            resetListedIPs,
            isIPListed
        }}>
            {children}
        </ListedIPsContext.Provider>
    );
};

export const useListedIPs = () => {
    const context = useContext(ListedIPsContext);
    if (context === undefined) {
        throw new Error('useListedIPs must be used within a ListedIPsProvider');
    }
    return context;
};

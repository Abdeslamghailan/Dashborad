import { useState, useEffect, useMemo, useRef } from 'react';
import { apiService } from '../services/apiService';
import { formatPercentage } from '../utils/reporting';

export const useDashboardData = () => {
    const [rawData, setRawData] = useState<any>(null);
    const [apiResponse, setApiResponse] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefetching, setIsRefetching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [availableEntities, setAvailableEntities] = useState<any[]>([]);
    const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    
    const getDefaultHour = () => {
        const now = new Date();
        return now.getHours().toString().padStart(2, '0');
    };
    const [selectedHours, setSelectedHours] = useState<string[]>([getDefaultHour()]);
    const [dnsStatus, setDnsStatus] = useState<'idle' | 'resolving' | 'completed' | 'error'>('idle');
    const resolvedDomainsRef = useRef<Set<string>>(new Set());

    // Helper to extract entity ID from session strings
    const getEntityFromSession = (session: string) => {
        if (!session) return 'Unknown';
        const s = session.toLowerCase();
        if (s.startsWith('cmh')) {
            const match = s.match(/^cmh[_\s]?(\d+)/);
            return match ? `ent_cmh${match[1]}` : `ent_${s.split('_')[0]}`;
        } else if (s.startsWith('ent_')) {
            return s.split('_').slice(0, 2).join('_');
        } else if (s.startsWith('ent ')) {
            return `ent_${s.split(' ')[1]}`;
        } else {
            return s.split('_')[0];
        }
    };

    const normalizeTimestamp = (ts: string) => {
        if (!ts) return '';
        const parts = ts.trim().split(' ');
        if (parts.length < 2) return ts;

        let datePart = parts[0];
        let timePart = parts[1];

        const dateParts = datePart.split(/[-/]/);
        if (dateParts.length === 3) {
            if (dateParts[0].length === 4) {
                datePart = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;
            } else {
                datePart = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
            }
        }

        const timeParts = timePart.split(/[-:]/);
        if (timeParts.length >= 2) {
            timePart = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`;
        }

        return `${datePart} ${timePart}`;
    };

    const fetchData = async (showRefetchingState = false) => {
        try {
            if (showRefetchingState) setIsRefetching(true);
            else setIsLoading(true);

            const params = new URLSearchParams();
            if (selectedEntities.length > 0) {
                const apiEntityNames = selectedEntities.map(id => id.replace(/^ent_/, '').toUpperCase());
                params.append('entities', apiEntityNames.join(','));
            }

            const filterDate = selectedDate || new Date().toISOString().split('T')[0];
            params.append('date', filterDate);

            if (selectedHours.length > 0 && selectedHours.length < 24) {
                params.append('hours', selectedHours.join(','));
            }
            params.append('limit', '5000');

            const result = await apiService.getDashboardData(params.toString());
            if (!result.data) throw new Error('Invalid data format received');

            setApiResponse(result.data);

            const transformItems = (items: any[], category?: string) => {
                return (items || []).map(item => {
                    const data = item.parsed || item;
                    const entity = getEntityFromSession(data.session);
                    return {
                        ...data,
                        timestamp: normalizeTimestamp(data.timestamp),
                        entity: entity,
                        category: category || data.category
                    };
                });
            };

            const inboxActions = transformItems(result.data.inbox_actions, 'inbox');
            const spamActions: any[] = [];
            (result.data.spam_actions || []).forEach((item: any) => {
                const data = item.parsed || item;
                const count = Number(data.count) || 0;
                const ts = normalizeTimestamp(data.timestamp);
                const entity = getEntityFromSession(data.session);

                if (count === 0) return;
                for (let i = 0; i < count; i++) {
                    spamActions.push({
                        ...data,
                        count: 1,
                        timestamp: ts,
                        entity: entity,
                        category: 'spam',
                        action_type: 'SPAM_ACTION'
                    });
                }
            });

            setRawData({
                combined_actions: [...inboxActions, ...spamActions],
                inbox_domains: transformItems(result.data.inbox_domains, 'inbox'),
                spam_domains: transformItems(result.data.spam_domains, 'spam'),
                inbox_relationships: transformItems(result.data.inbox_relationships, 'inbox')
            });

            setError(null);
        } catch (err: any) {
            console.error('Data Fetch Error:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
            setIsRefetching(false);
        }
    };

    useEffect(() => {
        const loadEntities = async () => {
            try {
                const entities = await apiService.getEntities();
                if (entities) setAvailableEntities(entities);
            } catch (error) {
                console.error('Failed to load entities:', error);
            }
        };
        loadEntities();
    }, []);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (isLoading) return;
        const timeoutId = setTimeout(() => fetchData(true), 500);
        return () => clearTimeout(timeoutId);
    }, [selectedEntities, selectedDate, selectedHours]);

    // DNS Resolution
    useEffect(() => {
        const resolveDomainIPs = async () => {
            if (!rawData) return;
            try {
                setDnsStatus('resolving');
                const allDomains = [...rawData.spam_domains.map((d: any) => d.domain)]
                    .filter((d: string) => d && d !== 'Unknown').map(d => d.trim());
                const uniqueDomains = [...new Set(allDomains)];
                const domainsToResolve = uniqueDomains.filter(d => !resolvedDomainsRef.current.has(d));

                if (domainsToResolve.length === 0) {
                    setDnsStatus('completed');
                    return;
                }

                domainsToResolve.forEach(d => resolvedDomainsRef.current.add(d));
                const ipMap: Record<string, string> = {};
                const batchSize = 5;
                for (let i = 0; i < domainsToResolve.length; i += batchSize) {
                    const batch = domainsToResolve.slice(i, i + batchSize);
                    await Promise.all(batch.map(async (domain) => {
                        try {
                            const res = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
                            if (!res.ok) return;
                            const json = await res.json();
                            if (json.Answer && json.Answer.length > 0) {
                                const aRecord = json.Answer.find((ans: any) => ans.type === 1);
                                if (aRecord) ipMap[domain] = aRecord.data;
                            }
                        } catch (e) {
                            console.error(`Failed to resolve ${domain}:`, e);
                        }
                    }));
                }

                setRawData((prev: any) => {
                    if (!prev) return prev;
                    const updateWithIPs = (items: any[]) => (items || []).map((d: any) => ({
                        ...d,
                        ip: ipMap[d.domain?.trim()] || d.ip || 'N/A'
                    }));
                    return { ...prev, spam_domains: updateWithIPs(prev.spam_domains) };
                });
                setDnsStatus('completed');
            } catch (error) {
                console.error('DNS Resolution Error:', error);
                setDnsStatus('error');
            }
        };

        if (rawData && dnsStatus === 'idle') resolveDomainIPs();
    }, [rawData?.spam_domains?.length]);

    return {
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
    };
};

import React from 'react';
import { TrendingUp, Clock, Globe } from 'lucide-react';
import { formatNumber, formatPercentage } from './reporting';

export const processDashboardStats = (rawData: any, selectedEntities: string[], selectedHours: string[], selectedDate: string, availableEntities: any[], getEntityFromSession: (s: string) => string) => {
    if (!rawData || !rawData.combined_actions) return null;

    const getEntityName = (entityId: string): string => {
        if (!entityId) return 'Unknown';
        const entity = availableEntities.find((e: any) => e.id === entityId);
        if (entity) return entity.name;
        if (entityId.startsWith('ent_')) {
            return entityId.replace('ent_', '').toUpperCase();
        }
        return entityId;
    };

    const targetDate = selectedDate || new Date().toISOString().split('T')[0];

    const filterByEntityAndDate = (arr: any[]) => {
        let filtered = arr || [];
        if (selectedEntities.length > 0) {
            filtered = filtered.filter((item: any) => {
                if (item.entity) return selectedEntities.includes(item.entity);
                if (item.session) {
                    const entityFromSession = getEntityFromSession(item.session);
                    return selectedEntities.includes(entityFromSession);
                }
                return true;
            });
        }

        filtered = filtered.filter((item: any) => {
            if (!item.timestamp) return true;
            const itemDate = item.timestamp.split(' ')[0];
            return itemDate === targetDate;
        });
        return filtered;
    };

    const dailyActions = filterByEntityAndDate(rawData.combined_actions || []);

    const filterByHour = (arr: any[]) => {
        if (selectedHours.length === 0) return arr;
        return arr.filter((item: any) => {
            if (!item.timestamp) return true;
            const hPart = item.timestamp.split(' ')[1];
            if (!hPart) return true;
            const hour = hPart.split(':')[0].padStart(2, '0');
            return selectedHours.includes(hour);
        });
    };

    const actions = filterByHour(dailyActions);
    const spamActions = actions.filter((a: any) => a.category === 'spam');
    const inboxActions = actions.filter((a: any) => a.category === 'inbox');

    const dailyInboxDomains = filterByEntityAndDate(rawData.inbox_domains || []);
    const dailySpamDomains = filterByEntityAndDate(rawData.spam_domains || []);
    const dailyInboxRelationships = filterByEntityAndDate(rawData.inbox_relationships || []);

    const inboxDomains = filterByHour(dailyInboxDomains);
    const spamDomains = filterByHour(dailySpamDomains);
    const inboxRelationships = filterByHour(dailyInboxRelationships);

    const aggregateFromNames = (arr: any[], senderField: string) => {
        const map: Record<string, number> = {};
        arr.forEach(item => {
            const key = item[senderField] || 'Unknown';
            const amount = Number(item.count) || 1;
            map[key] = (map[key] || 0) + amount;
        });
        const total = Object.values(map).reduce((sum, val) => sum + val, 0);
        return Object.entries(map).map(([name, count]) => ({ name, count, percentage: formatPercentage(count, total) })).sort((a, b) => b.count - a.count);
    };

    const aggregateDomains = (arr: any[]) => {
        const map: Record<string, number> = {};
        arr.forEach(item => {
            const key = item.domain || 'Unknown';
            const amount = Number(item.count) || 1;
            map[key] = (map[key] || 0) + amount;
        });
        const total = Object.values(map).reduce((sum, val) => sum + val, 0);
        return Object.entries(map).map(([name, count]) => ({
            name,
            count,
            percentage: formatPercentage(count, total)
        })).sort((a, b) => b.count - a.count);
    };

    const aggregateActionTypes = (arr: any[]) => {
        const map: Record<string, number> = {};
        arr.forEach(item => {
            const actionType = item.action_type || 'Unknown';
            const amount = Number(item.count) || 1;
            map[actionType] = (map[actionType] || 0) + amount;
            if (item.archive_action && item.archive_action !== actionType) {
                map[item.archive_action] = (map[item.archive_action] || 0) + amount;
            }
        });
        const total = Object.values(map).reduce((sum, val) => sum + val, 0);
        return Object.entries(map).map(([name, count]) => ({ name, count, percentage: formatPercentage(count, total) })).sort((a, b) => b.count - a.count);
    };

    const buildSpamRelationships = () => {
        const map: Record<string, Record<string, { count: number; ip: string }>> = {};
        spamDomains.forEach((item: any) => {
            const fromName = item.sender || 'Unknown';
            const domain = item.domain || 'Unknown';
            const ip = item.ip || 'N/A';
            const amount = Number(item.count) || 1;
            if (!map[fromName]) map[fromName] = {};
            if (!map[fromName][domain]) map[fromName][domain] = { count: 0, ip };
            map[fromName][domain].count += amount;
            if (ip && ip !== 'N/A') map[fromName][domain].ip = ip;
        });
        const result: any[] = [];
        const grandTotal = spamDomains.length;
        Object.entries(map).forEach(([fromName, domains]) => {
            Object.entries(domains).forEach(([domain, data]) => {
                result.push({ fromName, domain, ip: data.ip, count: data.count, percentage: formatPercentage(data.count, grandTotal) });
            });
        });
        return result.sort((a, b) => b.count - a.count);
    };

    const buildInboxRelationships = () => {
        if (inboxRelationships.length > 0) {
            const grandTotal = inboxRelationships.reduce((sum: number, item: any) => sum + (Number(item.count) || 1), 0);
            return inboxRelationships.map((item: any) => ({
                fromName: item.from_name || 'Unknown',
                domain: item.domain || 'Unknown',
                count: Number(item.count) || 1,
                percentage: formatPercentage(Number(item.count) || 1, grandTotal)
            })).sort((a: any, b: any) => b.count - a.count);
        }
        return [];
    };

    const trendMap: Record<string, { hour: string; spam: number; inbox: number }> = {};
    for (let i = 0; i < 24; i++) {
        const h = i.toString().padStart(2, '0');
        trendMap[h] = { hour: `${h}:00`, spam: 0, inbox: 0 };
    }
    dailyActions.forEach((a: any) => {
        const hPart = a.timestamp.split(' ')[1];
        if (hPart) {
            const h = hPart.split(':')[0].padStart(2, '0');
            if (trendMap[h]) {
                const amount = Number(a.count) || 1;
                if (a.category === 'spam') trendMap[h].spam += amount;
                else trendMap[h].inbox += amount;
            }
        }
    });
    const trendData = Object.values(trendMap);

    const insights = [];
    const topEntity = [...new Set(actions.map((a: any) => a.entity))].map(e => ({
        name: e,
        rate: (actions.filter((a: any) => a.entity === e && a.category === 'inbox').length / (actions.filter((a: any) => a.entity === e).length || 1)) * 100
    })).sort((a, b) => b.rate - a.rate)[0];

    if (topEntity) {
        insights.push({
            icon: React.createElement(TrendingUp, { size: 16, className: "text-green-400" }),
            text: `Entity ${getEntityName(topEntity.name)} is performing best with a ${topEntity.rate.toFixed(1)}% Inbox rate.`,
            trend: "Optimal Performance",
            trendType: "positive"
        });
    }

    const peakSpamHour = [...trendData].sort((a, b) => b.spam - a.spam)[0];
    if (peakSpamHour && peakSpamHour.spam > 0) {
        insights.push({
            icon: React.createElement(Clock, { size: 16, className: "text-orange-400" }),
            text: `Peak spam activity detected at ${peakSpamHour.hour} with ${peakSpamHour.spam} actions.`,
            trend: "High Activity",
            trendType: "negative"
        });
    }

    const uniqueDomains = new Set(spamDomains.map((d: any) => d.domain)).size;
    insights.push({
        icon: React.createElement(Globe, { size: 16, className: "text-blue-400" }),
        text: `Currently monitoring ${uniqueDomains} unique spam domains across all active entities.`,
        trend: "Broad Coverage",
        trendType: "positive"
    });

    const alerts = [];
    const entitiesInData = [...new Set(actions.map((a: any) => a.entity))];
    entitiesInData.forEach(e => {
        const entityActions = actions.filter((a: any) => a.entity === e);
        const spamCount = entityActions.filter((a: any) => a.category === 'spam').length;
        if ((spamCount / (entityActions.length || 1)) > 0.15) {
            alerts.push({
                type: 'danger',
                title: 'Spam Spike Detected',
                message: `Entity ${getEntityName(e)} has exceeded the 15% spam threshold.`
            });
        }
        
        const entitySpamForms = new Set(spamDomains.filter((d: any) => d.entity === e || (d.session && d.session.split('_')[0] === e)).map((d: any) => d.sender)).size;
        const entityInboxForms = new Set(inboxDomains.filter((d: any) => d.entity === e || (d.session && d.session.split('_')[0] === e)).map((d: any) => d.sender)).size;
        const totalForms = entitySpamForms + entityInboxForms;

        if (totalForms > 0 && (entitySpamForms / totalForms) > 0.5) {
            alerts.push({
                type: 'danger',
                title: 'Excessive Spam Forms',
                message: `Too much spam in entity ${getEntityName(e)}: ${entitySpamForms} spam forms out of ${totalForms} total (${((entitySpamForms / totalForms) * 100).toFixed(1)}%).`
            });
        }
    });

    const spamByProfile: Record<string, number> = {};
    spamActions.forEach((a: any) => { spamByProfile[a.profile] = (spamByProfile[a.profile] || 0) + 1; });
    const spamCounts = Object.values(spamByProfile);

    const sessionsMap: Record<string, any[]> = {};
    actions.forEach(a => {
        if (!sessionsMap[a.session]) sessionsMap[a.session] = [];
        sessionsMap[a.session].push(a);
    });

    const sessionStats = {
        sessions: Object.entries(sessionsMap).map(([id, sessionActions]) => {
            const inbox = sessionActions.filter(a => a.category === 'inbox').reduce((sum, a) => sum + (Number(a.count) || 1), 0);
            const spam = sessionActions.filter(a => a.category === 'spam').reduce((sum, a) => sum + (Number(a.count) || 1), 0);
            const total = inbox + spam;
            return {
                id,
                inbox,
                spam,
                total,
                entity: getEntityName(sessionActions[0]?.entity),
                profilesCount: Array.from(new Set(sessionActions.map(a => a.profile))),
                spamPct: total > 0 ? (spam / total) * 100 : 0
            };
        }),
        stats: {
            totalProfiles: new Set(actions.map((a: any) => a.profile)).size,
            minSpam: spamCounts.length > 0 ? Math.min(...spamCounts) : 0,
            maxSpam: spamCounts.length > 0 ? Math.max(...spamCounts) : 0,
            avgSpam: spamCounts.length > 0 ? (spamCounts.reduce((a, b) => a + b, 0) / spamCounts.length).toFixed(2) : '0',
        }
    };

    const detailedLogs = {
        spam: (() => {
            let log = "**************** DETAILED SPAM ACTIONS REPORT ****************\n\n";
            log += "> SPAM DOMAIN IN FROM-EMAIL:\n";
            const spamDomainsMap: Record<string, number> = {};
            spamDomains.forEach((d: any) => { spamDomainsMap[d.domain] = (spamDomainsMap[d.domain] || 0) + 1; });
            const sortedSpamDomains = Object.entries(spamDomainsMap).sort((a, b) => b[1] - a[1]);
            const totalSpamDomains = spamDomains.length || 1;
            sortedSpamDomains.forEach(([domain, count]) => {
                log += `${domain} (${count},   ${((count / totalSpamDomains) * 100).toFixed(2)}%)\n`;
            });
            log += "\n> SPAM FROM NAME:\n";
            const spamFromNamesMap: Record<string, number> = {};
            spamDomains.forEach((d: any) => { spamFromNamesMap[d.sender] = (spamFromNamesMap[d.sender] || 0) + 1; });
            const sortedSpamFromNames = Object.entries(spamFromNamesMap).sort((a, b) => b[1] - a[1]);
            sortedSpamFromNames.forEach(([name, count]) => {
                log += `${name} (${count},   ${((count / totalSpamDomains) * 100).toFixed(2)}%)\n`;
            });
            log += "\n\n**************** PROFILES IN SESSIONS ****************\n\n";
            const totalProfilesCount = new Set(actions.map((a: any) => a.profile)).size;
            log += `TOTAL NBR PROFILES: ${totalProfilesCount}  |  TOTAL Spam Actions: ${spamActions.length}\n\n`;
            Object.entries(sessionsMap).forEach(([sessionId, sessionActions]) => {
                const sessionProfiles = new Set(sessionActions.map(a => a.profile));
                const sessionSpamActions = sessionActions.filter(a => a.category === 'spam');
                log += `> ${sessionId}  |  Nbr Profiles: ${sessionProfiles.size}  |  Nbr Spam Actions: ${sessionSpamActions.length}\n`;
                const profileSpamMap: Record<string, number> = {};
                sessionActions.forEach(a => {
                    if (a.category === 'spam') {
                        profileSpamMap[a.profile] = (profileSpamMap[a.profile] || 0) + 1;
                    } else if (!profileSpamMap[a.profile]) {
                        profileSpamMap[a.profile] = 0;
                    }
                });
                Object.entries(profileSpamMap).sort().forEach(([profile, count]) => {
                    log += `Pr: ${profile} - Spam Action(s): ${count}\n`;
                });
                log += "\n";
            });
            return log;
        })(),
        inbox: (() => {
            let log = "**************** DETAILED INBOX ACTIONS REPORT ****************\n\n";
            const actionCounts: Record<string, number> = {};
            inboxActions.forEach((a: any) => { actionCounts[a.action_type] = (actionCounts[a.action_type] || 0) + 1; });
            const totalInbox = inboxActions.length || 1;
            log += "OVERALL STATISTICS:\n";
            Object.entries(actionCounts).forEach(([type, count]) => {
                log += `Total ${type} Actions: ${count} (${((count / totalInbox) * 100).toFixed(1)}%)\n`;
            });
            log += `Total All Actions: ${actions.length}\n`;
            log += `Total Profiles: ${new Set(actions.map((a: any) => a.profile)).size}\n\n`;
            log += "> INBOX DOMAINS:\n";
            const inboxDomainsMap: Record<string, number> = {};
            inboxDomains.forEach((d: any) => { inboxDomainsMap[d.domain] = (inboxDomainsMap[d.domain] || 0) + 1; });
            const sortedInboxDomains = Object.entries(inboxDomainsMap).sort((a, b) => b[1] - a[1]);
            sortedInboxDomains.forEach(([domain, count]) => {
                log += `${domain} (${count},   ${((count / totalInbox) * 100).toFixed(2)}%)\n`;
            });
            log += "\n> INBOX FROM NAMES:\n";
            const inboxFromNamesMap: Record<string, number> = {};
            inboxDomains.forEach((d: any) => { inboxFromNamesMap[d.sender] = (inboxFromNamesMap[d.sender] || 0) + 1; });
            const sortedInboxFromNames = Object.entries(inboxFromNamesMap).sort((a, b) => b[1] - a[1]);
            sortedInboxFromNames.forEach(([name, count]) => {
                log += `${name} (${count},   ${((count / totalInbox) * 100).toFixed(2)}%)\n`;
            });
            log += "\n\n**************** INBOX ACTIONS BY SESSION ****************\n\n";
            Object.entries(sessionsMap).forEach(([sessionId, sessionActions]) => {
                log += `> ${sessionId}\n`;
                const profileActionsMap: Record<string, Record<string, number>> = {};
                sessionActions.forEach(a => {
                    if (a.category === 'inbox') {
                        if (!profileActionsMap[a.profile]) profileActionsMap[a.profile] = {};
                        profileActionsMap[a.profile][a.action_type] = (profileActionsMap[a.profile][a.action_type] || 0) + 1;
                    }
                });
                Object.entries(profileActionsMap).sort().forEach(([profile, types]) => {
                    const typesStr = Object.entries(types).map(([type, count]) => `${type}:${count}`).join(' | ');
                    log += `PR:${profile} - ${typesStr}\n`;
                });
                log += "\n";
            });
            return log;
        })()
    };

    return {
        stats: {
            totalProfiles: new Set(actions.map((a: any) => a.profile)).size,
            activeSessions: new Set(actions.map((a: any) => a.session)).size,
            spamActions: spamActions.length,
            inboxActions: inboxActions.length,
            spamForms: new Set(spamDomains.map((a: any) => a.sender)).size,
            inboxForms: new Set(inboxDomains.map((a: any) => a.sender)).size,
            spamDomains: new Set(spamDomains.map((a: any) => a.domain)).size,
            inboxDomains: new Set(inboxDomains.map((a: any) => a.domain)).size,
        },
        spamStats: {
            min: spamCounts.length > 0 ? Math.min(...spamCounts) : 0,
            max: spamCounts.length > 0 ? Math.max(...spamCounts) : 0,
            avg: spamCounts.length > 0 ? (spamCounts.reduce((a, b) => a + b, 0) / spamCounts.length).toFixed(2) : '0',
        },
        sessionStats,
        spamForms: aggregateFromNames(spamDomains, 'sender'),
        inboxForms: aggregateFromNames(inboxDomains, 'sender'),
        spamDomainsData: aggregateDomains(spamDomains),
        inboxDomainsData: aggregateDomains(inboxDomains),
        inboxActionTypes: aggregateActionTypes(inboxActions),
        spamRelationships: buildSpamRelationships(),
        inboxRelationships: buildInboxRelationships(),
        displayEntity: selectedEntities.length === 0 ? 'ALL' : (selectedEntities.length === 1 ? getEntityName(selectedEntities[0]) : `Multiple (${selectedEntities.length})`),
        displayHour: selectedHours.length === 0 ? 'ALL' : (selectedHours.length === 1 ? `${selectedHours[0]}:00` : `Multiple (${selectedHours.length})`),
        displayDate: targetDate.split('-').reverse().join('/'),
        trendData,
        insights,
        alerts,
        detailedLogs
    };
};

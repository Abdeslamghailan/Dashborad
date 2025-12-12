import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { logChange } from '../services/historyService.js';

const router = Router();
// const prisma = new PrismaClient(); // Removed local instance

// Helper function to generate IPs from CIDR
function generateIPsFromCIDR(cidr: string, serverName: string): { serverName: string; ips: string[] } {
    const [baseIP, bits] = cidr.split('/');
    const ipParts = baseIP.split('.').map(Number);
    
    if (ipParts.length !== 4 || ipParts.some(p => isNaN(p) || p < 0 || p > 255)) {
        throw new Error('Invalid IP address format');
    }
    
    const bitsNum = parseInt(bits);
    if (isNaN(bitsNum) || bitsNum < 0 || bitsNum > 32) {
        throw new Error('Invalid CIDR bits');
    }
    
    const ips: string[] = [];
    const [a, b, c, d] = ipParts;
    
    // For /24 networks, generate IPs from .11 to .254
    if (bitsNum === 24) {
        for (let i = 11; i <= 254; i++) {
            ips.push(`${a}.${b}.${c}.${i}`);
        }
    } else {
        // For other CIDR blocks, calculate the range
        const hostBits = 32 - bitsNum;
        const totalHosts = Math.pow(2, hostBits);
        const startHost = 11;
        const endHost = Math.min(254, totalHosts - 2);
        
        for (let i = startHost; i <= endHost; i++) {
            const lastOctet = (d + i) % 256;
            ips.push(`${a}.${b}.${c}.${lastOctet}`);
        }
    }
    
    return { serverName, ips };
}

// Helper to validate IP address
function isValidIP(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(part => {
        const num = parseInt(part, 10);
        return !isNaN(num) && num >= 0 && num <= 255 && part === num.toString();
    });
}

// Get all proxies for an entity
router.get('/:entityId', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const { entityId } = req.params;
        
        const proxies = await prisma.proxyServer.findMany({
            where: { entityId },
            orderBy: { createdAt: 'desc' }
        });
        
        const parsedProxies = proxies.map(p => ({
            ...p,
            ips: JSON.parse(p.ips)
        }));
        
        res.json(parsedProxies);
    } catch (error) {
        console.error('Error fetching proxies:', error);
        res.status(500).json({ error: 'Failed to fetch proxies' });
    }
});

// Add proxy server (normal or smart way)
router.post('/:entityId', authenticateToken, async (req: AuthRequest, res) => {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MAILER') {
        return res.status(403).json({ error: 'Access denied' });
    }
    try {
        const { entityId } = req.params;
        const { serverName, ips, cidr, method } = req.body;
        
        let proxyData;
        
        if (method === 'smart' && cidr) {
            // Smart way: generate IPs from CIDR
            const generated = generateIPsFromCIDR(cidr, serverName);
            proxyData = {
                serverName: generated.serverName,
                ips: generated.ips,
                status: 'active'
            };
        } else {
            // Normal way: use provided IPs
            const ipList = Array.isArray(ips) ? ips : ips.split('\n').map((ip: string) => ip.trim()).filter(Boolean);
            
            // Validate IPs
            const invalidIPs = ipList.filter((ip: string) => !isValidIP(ip));
            if (invalidIPs.length > 0) {
                return res.status(400).json({ error: `Invalid IP addresses found: ${invalidIPs.join(', ')}` });
            }

            proxyData = {
                serverName,
                ips: ipList,
                status: 'active'
            };
        }
        
        const newProxy = await prisma.proxyServer.create({
            data: {
                entityId,
                serverName: proxyData.serverName,
                ips: JSON.stringify(proxyData.ips),
                status: proxyData.status
            }
        });
        
        await logChange(req, {
            entityId,
            entityType: 'proxy',
            changeType: 'create',
            description: `Added proxy server "${newProxy.serverName}"`,
            newValue: { ...newProxy, ips: JSON.parse(newProxy.ips) }
        });
        
        res.json({ ...newProxy, ips: JSON.parse(newProxy.ips) });
    } catch (error) {
        console.error('Error adding proxy:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to add proxy' });
    }
});

// Update proxy server
router.put('/:entityId/:proxyId', authenticateToken, async (req: AuthRequest, res) => {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MAILER') {
        return res.status(403).json({ error: 'Access denied' });
    }
    try {
        const { proxyId } = req.params;
        const { serverName, ips, status } = req.body;
        
        const updateData: any = {};
        if (serverName) updateData.serverName = serverName;
        if (ips) {
             const ipList = Array.isArray(ips) ? ips : ips.split('\n').map((ip: string) => ip.trim()).filter(Boolean);
             
             // Validate IPs
             const invalidIPs = ipList.filter((ip: string) => !isValidIP(ip));
             if (invalidIPs.length > 0) {
                 return res.status(400).json({ error: `Invalid IP addresses found: ${invalidIPs.join(', ')}` });
             }

             updateData.ips = JSON.stringify(ipList);
        }
        if (status) updateData.status = status;
        
        const updatedProxy = await prisma.proxyServer.update({
            where: { id: proxyId },
            data: updateData
        });
        
        await logChange(req, {
            entityId: updatedProxy.entityId,
            entityType: 'proxy',
            changeType: 'update',
            description: `Updated proxy server "${updatedProxy.serverName}"`,
            newValue: { ...updatedProxy, ips: JSON.parse(updatedProxy.ips) }
        });
        
        res.json({ ...updatedProxy, ips: JSON.parse(updatedProxy.ips) });
    } catch (error) {
        console.error('Error updating proxy:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update proxy' });
    }
});

// Toggle proxy status
router.patch('/:entityId/:proxyId/status', authenticateToken, async (req: AuthRequest, res) => {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MAILER') {
        return res.status(403).json({ error: 'Access denied' });
    }
    try {
        const { proxyId } = req.params;
        
        const proxy = await prisma.proxyServer.findUnique({ where: { id: proxyId } });
        if (!proxy) return res.status(404).json({ error: 'Proxy not found' });
        
        const newStatus = proxy.status === 'active' ? 'stopped' : 'active';
        
        const updatedProxy = await prisma.proxyServer.update({
            where: { id: proxyId },
            data: { status: newStatus }
        });
        
        await logChange(req, {
            entityId: updatedProxy.entityId,
            entityType: 'proxy',
            changeType: 'update',
            fieldChanged: 'status',
            description: `Changed proxy status to ${newStatus} for "${updatedProxy.serverName}"`,
            oldValue: { status: proxy.status },
            newValue: { status: newStatus }
        });
        
        res.json({ ...updatedProxy, ips: JSON.parse(updatedProxy.ips) });
    } catch (error) {
        console.error('Error toggling proxy status:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to toggle proxy status' });
    }
});

// Delete proxy server
router.delete('/:entityId/:proxyId', authenticateToken, async (req: AuthRequest, res) => {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MAILER') {
        return res.status(403).json({ error: 'Access denied' });
    }
    try {
        const { proxyId } = req.params;
        
        const proxy = await prisma.proxyServer.findUnique({ where: { id: proxyId } });

        await prisma.proxyServer.delete({
            where: { id: proxyId }
        });
        
        if (proxy) {
            await logChange(req, {
                entityId: proxy.entityId,
                entityType: 'proxy',
                changeType: 'delete',
                description: `Deleted proxy server "${proxy.serverName}"`,
                oldValue: { ...proxy, ips: JSON.parse(proxy.ips) }
            });
        }
        
        res.json({ message: 'Proxy deleted successfully' });
    } catch (error) {
        console.error('Error deleting proxy:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete proxy' });
    }
});

export default router;

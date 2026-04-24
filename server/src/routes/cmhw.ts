import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

const CMHW_API_URL = process.env.CMHW_API_URL || 'http://localhost:5002';

// Reset session on each server start to force fresh login with correct credentials
let flaskSessionCookie: string | null = null; // Always null on fresh start

/**
 * Auto-login to Flask backend if we don't have a session cookie yet.
 * Tries multiple approaches:
 * 1. The auto_login_dev middleware (new Flask process)
 * 2. Explicit login with credentials (works with any Flask process)
 */
async function ensureFlaskSession(): Promise<string> {
    if (flaskSessionCookie) return flaskSessionCookie;

    // Helper to extract session cookie from response headers
    // Handles both single string and array (node-fetch v3+ / undici)
    function extractSession(res: globalThis.Response): string | null {
        // Try getSetCookie() (node 18+ undici)
        const allCookies: string[] = (res.headers as any).getSetCookie?.() ?? [];
        const fromArray = allCookies.find((c: string) => c.includes('session='));
        const raw = fromArray || res.headers.get('set-cookie') || '';
        const match = raw.match(/session=([^;]+)/);
        return match ? `session=${match[1]}` : null;
    }

    try {
        // Approach 1: Try the login endpoint with default credentials
        const loginRes = await fetch(`${CMHW_API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: process.env.CMHW_ADMIN_USER || 'admin',
                password: process.env.CMHW_ADMIN_PASS || 'dropflow_admin_2024'
            }),
            redirect: 'follow'
        });

        // Extract cookie immediately from response headers (before reading body)
        const cookie1 = extractSession(loginRes);
        if (cookie1) {
            flaskSessionCookie = cookie1;
            logger.info(`CMHW Flask session established via login (status ${loginRes.status})`);
            return flaskSessionCookie;
        }

        // If login returned 200 with success but no cookie in headers, 
        // try to get the cookie from a follow-up call
        if (loginRes.status === 200) {
            try {
                const body = await loginRes.json() as any;
                logger.info(`CMHW login body: ${JSON.stringify(body)}`);
            } catch { /* not JSON */ }
        }

        logger.warn(`CMHW login attempt returned status ${loginRes.status} but no session cookie found`);

        // Approach 2: Try hitting /api/me 
        const meRes = await fetch(`${CMHW_API_URL}/api/me`, {
            redirect: 'follow',
            headers: { 'Content-Type': 'application/json' }
        });

        const cookie2 = extractSession(meRes);
        if (cookie2) {
            flaskSessionCookie = cookie2;
            logger.info('CMHW Flask session established via auto-login');
            return flaskSessionCookie;
        }
    } catch (err) {
        logger.error('Failed to establish Flask session:', err);
    }

    logger.warn('Could not establish CMHW Flask session - entities may not load');
    return '';
}


/**
 * Generic proxy function: forwards request to Flask backend
 */
async function proxyToFlask(
    req: Request,
    res: Response,
    flaskPath: string,
    method: string = 'GET'
) {
    try {
        const sessionCookie = await ensureFlaskSession();

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (sessionCookie) {
            headers['Cookie'] = sessionCookie;
        }

        const fetchOptions: RequestInit = {
            method,
            headers,
            redirect: 'follow',
        };

        // Include body for POST/PUT requests
        if (['POST', 'PUT', 'PATCH'].includes(method) && req.body) {
            fetchOptions.body = JSON.stringify(req.body);
        }

        const flaskRes = await fetch(`${CMHW_API_URL}${flaskPath}`, fetchOptions);

        // If Flask redirected to login, our session expired
        if (flaskRes.status === 302) {
            flaskSessionCookie = null; // Reset session
            const retrySession = await ensureFlaskSession();
            if (retrySession) {
                headers['Cookie'] = retrySession;
                const retryRes = await fetch(`${CMHW_API_URL}${flaskPath}`, { ...fetchOptions, headers });

                // Update cookie if Flask sent a new one
                const newCookie = retryRes.headers.get('set-cookie');
                if (newCookie) {
                    const match = newCookie.match(/session=([^;]+)/);
                    if (match) flaskSessionCookie = `session=${match[1]}`;
                }

                if (retryRes.status === 204) return res.status(204).end();
                const data = await retryRes.text();
                try {
                    return res.status(retryRes.status).json(JSON.parse(data));
                } catch {
                    return res.status(retryRes.status).send(data);
                }
            }
            return res.status(401).json({ error: 'CMHW authentication failed' });
        }

        // Update cookie if Flask sent a new one
        const newCookie = flaskRes.headers.get('set-cookie');
        if (newCookie) {
            const match = newCookie.match(/session=([^;]+)/);
            if (match) flaskSessionCookie = `session=${match[1]}`;
        }

        if (flaskRes.status === 204) return res.status(204).end();

        const data = await flaskRes.text();
        try {
            return res.status(flaskRes.status).json(JSON.parse(data));
        } catch {
            return res.status(flaskRes.status).send(data);
        }
    } catch (err: any) {
        logger.error(`CMHW proxy error [${method} ${flaskPath}]:`, err.message);
        return res.status(502).json({
            error: 'CMHW backend unavailable',
            detail: `Could not reach Flask at ${CMHW_API_URL}. Is it running?`
        });
    }
}

// ─── Diagnostics ─────────────────────────────────────
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const session = await ensureFlaskSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session) headers['Cookie'] = session;

        const testRes = await fetch(`${CMHW_API_URL}/api/entities`, {
            headers,
            redirect: 'follow'
        });

        res.json({
            flaskUrl: CMHW_API_URL,
            hasSession: !!session,
            sessionCookie: session ? session.substring(0, 20) + '...' : null,
            testStatus: testRes.status,
            testRedirected: testRes.status === 302,
            testContentType: testRes.headers.get('content-type'),
        });
    } catch (err: any) {
        res.json({
            flaskUrl: CMHW_API_URL,
            hasSession: false,
            error: err.message
        });
    }
});

// ─── Auth ────────────────────────────────────────────
router.get('/me', authenticateToken, (req, res) => proxyToFlask(req, res, '/api/me'));

// ─── Entities ────────────────────────────────────────
router.get('/entities', authenticateToken, (req, res) => proxyToFlask(req, res, '/api/entities'));
router.post('/entities', authenticateToken, (req, res) => proxyToFlask(req, res, '/api/entities', 'POST'));
router.delete('/entities/:id', authenticateToken, (req, res) => proxyToFlask(req, res, `/api/entities/${req.params.id}`, 'DELETE'));

// ─── Plans ───────────────────────────────────────────
router.get('/plans/:name', (req, res) => proxyToFlask(req, res, `/api/plans/${req.params.name}`));
router.post('/plans', authenticateToken, (req, res) => proxyToFlask(req, res, '/api/plans', 'POST'));
router.put('/plans/:id', authenticateToken, (req, res) => proxyToFlask(req, res, `/api/plans/${req.params.id}`, 'PUT'));
router.delete('/plans/:id', authenticateToken, (req, res) => proxyToFlask(req, res, `/api/plans/${req.params.id}`, 'DELETE'));

// ─── Reporting Types ─────────────────────────────────
router.get('/reporting-types', authenticateToken, (req, res) => {
    const qs = req.query.entity_id ? `?entity_id=${req.query.entity_id}` : '';
    proxyToFlask(req, res, `/api/reporting-types${qs}`);
});
router.post('/reporting-types', authenticateToken, (req, res) => proxyToFlask(req, res, '/api/reporting-types', 'POST'));
router.put('/reporting-types/:id', authenticateToken, (req, res) => proxyToFlask(req, res, `/api/reporting-types/${req.params.id}`, 'PUT'));
router.delete('/reporting-types/:id', authenticateToken, (req, res) => proxyToFlask(req, res, `/api/reporting-types/${req.params.id}`, 'DELETE'));

// ─── Session Tokens ──────────────────────────────────
router.post('/session-token', authenticateToken, (req, res) => proxyToFlask(req, res, '/api/session-token', 'POST'));
router.get('/session-token/:token', (req, res) => proxyToFlask(req, res, `/api/session-token/${req.params.token}`));

// ─── Admin (Users & Access) ─────────────────────────
router.get('/admin/users', authenticateToken, requireAdmin, (req, res) => proxyToFlask(req, res, '/api/admin/users'));
router.post('/admin/users', authenticateToken, requireAdmin, (req, res) => proxyToFlask(req, res, '/api/admin/users', 'POST'));
router.put('/admin/users/:id', authenticateToken, requireAdmin, (req, res) => proxyToFlask(req, res, `/api/admin/users/${req.params.id}`, 'PUT'));
router.delete('/admin/users/:id', authenticateToken, requireAdmin, (req, res) => proxyToFlask(req, res, `/api/admin/users/${req.params.id}`, 'DELETE'));
router.get('/admin/users/:id/access', authenticateToken, requireAdmin, (req, res) => proxyToFlask(req, res, `/api/admin/users/${req.params.id}/access`));
router.post('/admin/users/:id/access', authenticateToken, requireAdmin, (req, res) => proxyToFlask(req, res, `/api/admin/users/${req.params.id}/access`, 'POST'));

export default router;
 

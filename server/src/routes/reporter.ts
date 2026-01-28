import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import prisma from '../db.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Send report to Telegram bot
router.post('/send-to-bot', authenticateToken, async (req, res) => {
    try {
        const { entityId, htmlReport, botToken, chatId } = req.body;

        if (!botToken || !chatId) {
            return res.status(400).json({ error: 'Bot token and Chat ID are required' });
        }

        // Telegram API URL for sending messages
        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

        const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: htmlReport,
                parse_mode: 'HTML',
            }),
        });

        const data = await response.json();

        if (!data.ok) {
            logger.error('Telegram API error:', data);
            return res.status(500).json({ error: data.description || 'Failed to send message to Telegram' });
        }

        res.json({ success: true, message: 'Report sent to Telegram successfully' });
    } catch (error) {
        logger.error('Send to bot error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;

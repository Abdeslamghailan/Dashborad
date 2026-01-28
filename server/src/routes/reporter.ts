import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import prisma from '../db.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Send report to Telegram bot
router.post('/send-to-bot', authenticateToken, async (req, res) => {
    try {
        const { entityId, htmlReport, botToken, chatId, fileName } = req.body;

        if (!botToken || !chatId) {
            return res.status(400).json({ error: 'Bot token and Chat ID are required' });
        }

        // Create a Blob from the HTML content
        const blob = new Blob([htmlReport], { type: 'text/html' });
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('document', blob, fileName || 'report.html');
        formData.append('caption', `📊 Consumption Report - ${new Date().toLocaleDateString()}`);

        // Telegram API URL for sending documents
        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendDocument`;

        const response = await fetch(telegramUrl, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (!data.ok) {
            logger.error('Telegram API error:', data);
            return res.status(500).json({ error: data.description || 'Failed to send document to Telegram' });
        }

        res.json({ success: true, message: 'Report sent to Telegram successfully' });
    } catch (error) {
        logger.error('Send to bot error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;

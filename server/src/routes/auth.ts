import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../db.js';
import { verifyTelegramAuth } from '../telegramAuth.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

import { logChange } from '../services/historyService.js';

const router = Router();

// Telegram login endpoint
router.post('/telegram', async (req, res) => {
  try {
    const telegramData = req.body;
    console.log('=== TELEGRAM AUTH REQUEST ===');
    // Sensitive data logging removed
    
    // Convert id to string (Telegram sends it as number)
    const telegramId = String(telegramData.id);
    console.log('Telegram ID (converted to string):', telegramId);
    
    // Verify Telegram authentication
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error('❌ FATAL: TELEGRAM_BOT_TOKEN is not defined in environment variables');
      return res.status(500).json({ error: 'Server configuration error: Missing Bot Token' });
    }

    const isValid = verifyTelegramAuth(telegramData, botToken);
    console.log('Verification result:', isValid);
    
    if (!isValid) {
      console.log('❌ Authentication failed - invalid hash');
      return res.status(401).json({ error: 'Invalid Telegram authentication' });
    }

    console.log('✅ Telegram authentication verified');

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { telegramId: telegramId }
    });

    if (!user) {
      console.log('📝 Creating new user with telegramId:', telegramId);
      user = await prisma.user.create({
        data: {
          telegramId: telegramId,
          username: telegramData.username,
          firstName: telegramData.first_name,
          lastName: telegramData.last_name,
          photoUrl: telegramData.photo_url,
          role: 'USER',
          isApproved: false // Explicitly set to false
        }
      });
      
      await logChange(null, {
        entityType: 'User',
        entityId: user.id.toString(),
        changeType: 'create',
        description: `User registered via Telegram: ${user.username}`,
        newValue: user
      }, { id: user.id, username: user.username || 'Unknown', role: user.role });

      console.log('✅ User created successfully:', { id: user.id, username: user.username, isApproved: user.isApproved });
      return res.status(403).json({ error: 'Registration pending approval', code: 'PENDING_APPROVAL' });
    }

    console.log('👤 Existing user found:', { id: user.id, username: user.username, isApproved: user.isApproved });

    // Check approval status
    if (!user.isApproved && user.role !== 'ADMIN') {
      console.log('⏳ User not approved yet');
      return res.status(403).json({ error: 'Account pending approval', code: 'PENDING_APPROVAL' });
    }

    // Update user info if needed
    console.log('📸 Photo URL from Telegram:', telegramData.photo_url);
    user = await prisma.user.update({
      where: { telegramId: telegramId },
      data: {
        username: telegramData.username,
        firstName: telegramData.first_name,
        lastName: telegramData.last_name,
        photoUrl: telegramData.photo_url
      }
    });
    
    await logChange(null, {
      entityType: 'User',
      entityId: user.id.toString(),
      changeType: 'update',
      description: `User updated via Telegram login: ${user.username}`,
      newValue: user
    }, { id: user.id, username: user.username || 'Unknown', role: user.role });

    console.log('📸 Photo URL after update:', user.photoUrl);

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, telegramId: user.telegramId, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    console.log('✅ Login successful for user:', user.username);
    res.json({ token, user: { id: user.id, username: user.username, photoUrl: user.photoUrl, role: user.role, telegramId: user.telegramId } });
  } catch (error) {
    console.error('❌ Auth error:', error);
    // Stack trace logging removed
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Username/Password login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await prisma.user.findFirst({
      where: { username }
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, telegramId: user.telegramId, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user.id, username: user.username, photoUrl: user.photoUrl, role: user.role, telegramId: user.telegramId } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: String(error) });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        role: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../db.js';
import { verifyTelegramAuth } from '../telegramAuth.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { logChange } from '../services/historyService.js';
import { logger } from '../utils/logger.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Apply rate limiting specifically to login routes below

// Telegram login endpoint
router.post('/telegram', authLimiter, async (req, res) => {
  try {
    const telegramData = req.body;
    logger.debug('Telegram authentication request received');
    
    // Convert id to string (Telegram sends it as number)
    const telegramId = String(telegramData.id);
    
    // Verify Telegram authentication
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      logger.error('TELEGRAM_BOT_TOKEN is not defined in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const isValid = verifyTelegramAuth(telegramData, botToken);
    
    if (!isValid) {
      logger.security('Invalid Telegram authentication attempt', { telegramId });
      return res.status(401).json({ error: 'Invalid Telegram authentication' });
    }

    logger.debug('Telegram authentication verified');

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { telegramId: telegramId }
    });

    if (!user) {
      logger.info('Creating new user', { telegramId });
      user = await prisma.user.create({
        data: {
          telegramId: telegramId,
          username: telegramData.username,
          firstName: telegramData.first_name,
          lastName: telegramData.last_name,
          photoUrl: telegramData.photo_url,
          role: 'USER',
          isApproved: false
        }
      });
      
      await logChange(null, {
        entityType: 'User',
        entityId: user.id.toString(),
        changeType: 'create',
        description: `User registered via Telegram: ${user.username}`,
        newValue: user
      }, { id: user.id, username: user.username || 'Unknown', role: user.role });

      logger.info('User created successfully', { userId: user.id, username: user.username });
      return res.status(403).json({ error: 'Registration pending approval', code: 'PENDING_APPROVAL' });
    }

    logger.debug('Existing user found', { userId: user.id, username: user.username });

    // Check approval status
    if (!user.isApproved && user.role !== 'ADMIN') {
      logger.info('User not approved yet', { userId: user.id });
      return res.status(403).json({ error: 'Account pending approval', code: 'PENDING_APPROVAL' });
    }

    // Update user info if needed
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

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, telegramId: user.telegramId, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    const isProduction = process.env.NODE_ENV === 'production';
    
    // Set httpOnly cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logger.info('Login successful', { userId: user.id, username: user.username });
    res.json({ user: { id: user.id, username: user.username, photoUrl: user.photoUrl, role: user.role, telegramId: user.telegramId, mustChangePassword: user.mustChangePassword } });
  } catch (error) {
    logger.error('Authentication failed', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Username/Password login endpoint
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Validate username format
    if (typeof username !== 'string' || username.length > 100) {
      logger.security('Invalid username format in login attempt', { username });
      return res.status(400).json({ error: 'Invalid username format' });
    }

    if (typeof password !== 'string' || password.length > 128) {
      logger.security('Invalid password format in login attempt', { username });
      return res.status(400).json({ error: 'Invalid password format' });
    }

    const user = await prisma.user.findFirst({
      where: { username }
    });

    logger.debug('Login attempt', { username });

    if (!user || !user.password) {
      logger.security('Login failed: Invalid credentials', { username });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      logger.security('Login failed: Invalid password', { username });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, telegramId: user.telegramId, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    const isProduction = process.env.NODE_ENV === 'production';
    
    // Set httpOnly cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logger.info('Password login successful', { userId: user.id, username: user.username });
    res.json({ user: { id: user.id, username: user.username, photoUrl: user.photoUrl, role: user.role, telegramId: user.telegramId, mustChangePassword: user.mustChangePassword } });
  } catch (error) {
    logger.error('Login failed', error);
    res.status(500).json({ error: 'Login failed' });
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
    logger.error('Failed to get user', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update password endpoint
router.post('/update-password', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new passwords are required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!user || !user.password) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      logger.security('Password update failed: Incorrect current password', { userId: user.id });
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        mustChangePassword: false
      }
    });

    logger.info('Password updated successfully', { userId: user.id });
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    logger.error('Failed to update password', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ message: 'Logged out successfully' });
});

export default router;


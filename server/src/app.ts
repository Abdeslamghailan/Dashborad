import { generateRandomPassword } from './utils/validation.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth';
import entityRoutes from './routes/entities';
import adminRoutes from './routes/admin';
import proxyRoutes from './routes/proxies';
import proxyPartitionRoutes from './routes/proxyPartition';
import historyRoutes from './routes/history';
import planningRoutes from './routes/planning';

import dayplanRoutes from './routes/dayplan';
import scriptsRoutes from './routes/scripts';
import methodsRoutes from './routes/methods';
import dashboardRoutes from './routes/dashboard';
import reporterRoutes from './routes/reporter';
import prisma from './db';
import { initBackupService } from './services/backupService';
import { logger } from './utils/logger.js';
import { validateEnv } from './utils/envValidator';

import { apiLimiter } from './middleware/rateLimiter';

dotenv.config();
validateEnv();

const __dirname = process.cwd();

export const app = express();

// Apply global rate limiting
app.use(apiLimiter);

// Trust the first proxy (Netlify/Railway load balancer)
app.set('trust proxy', 1);

const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET) {
  logger.error('FATAL ERROR: JWT_SECRET is not defined');
  // Don't exit process in serverless, just log it. 
  // Requests requiring JWT will fail with 500 when they try to use it.
}

// Security Middleware - Properly configured Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://telegram.org"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://dns.google"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: isProduction ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
}));

// Strict CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3002',
  'https://cmhw.netlify.app',
  'https://cmhw2.netlify.app',
  'https://cmhw3.netlify.app',
  // 'http://app.cmhwarmup.com:8366',
  'https://abdelgh9.pythonanywhere.com',
];

// Add Railway/Netlify URL if available
if (process.env.RAILWAY_PUBLIC_DOMAIN) {
  allowedOrigins.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
}
if (process.env.URL) {
  allowedOrigins.push(process.env.URL);
}

// Development-only ngrok support
if (!isProduction && process.env.NGROK_URL) {
  allowedOrigins.push(process.env.NGROK_URL);
}

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin) || 
      (!isProduction && /\.ngrok-free\.dev$/.test(origin));
    
    if (isAllowed) {
      callback(null, true);
    } else {
      logger.security('CORS blocked request from unauthorized origin', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(cookieParser());

// CSRF Protection middleware - Validates custom header
app.use((req, res, next) => {
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  
  if (isStateChanging) {
    const csrfHeader = req.headers['x-requested-with'];
    if (csrfHeader !== 'XMLHttpRequest') {
      logger.security('CSRF protection: Missing or invalid X-Requested-With header', {
        method: req.method,
        path: req.path,
        ip: req.ip
      });
      return res.status(403).json({ error: 'CSRF protection: Invalid request source' });
    }
  }
  next();
});

import { auditLogger } from './middleware/auditLogger';

app.use(express.json({ limit: '10mb' }));
app.use(auditLogger as any);

// Request logging (development only)
if (!isProduction) {
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });
}

// Routes
// Prefix with /api for Netlify Functions redirection usually, but here we keep it standard.
// The Netlify rewrite will handle /api/* -> function
app.use('/api/auth', authRoutes);
app.use('/api/entities', entityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/proxies', proxyRoutes);
app.use('/api/proxy-partition', proxyPartitionRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/planning', planningRoutes);

app.use('/api/dayplan', dayplanRoutes);
app.use('/api/scripts', scriptsRoutes);
app.use('/api/methods', methodsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reporter', reporterRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Check various tables
    const userCount = await prisma.user.count().catch(() => -1);
    const historyCount = await prisma.changeHistory.count().catch(() => -1);
    let intervalCount = -1;
    try {
      intervalCount = await (prisma as any).intervalPauseHistory.count();
    } catch (e) {
      // Table might not exist yet
    }
    
    res.json({ 
      status: 'ok', 
      env: process.env.NODE_ENV,
      db: {
        users: userCount,
        history: historyCount,
        intervalHistory: intervalCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Health check error', error);
    res.status(500).json({ 
      status: 'error', 
      env: process.env.NODE_ENV
    });
  }
});

// Simple test endpoint (no DB)
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'success', 
    message: 'API endpoint reached successfully!',
    env: process.env.NODE_ENV,
    time: new Date().toISOString()
  });
});

// Initialize Backup Service ONLY if explicitly enabled (disabled on Netlify)
if (process.env.ENABLE_LOCAL_BACKUPS === 'true') {
  initBackupService();
}

// Serve static files in production (ONLY if not running as a lambda)
if (isProduction && !process.env.NETLIFY) {
  const frontendPath = path.join(__dirname, '../../dist');
  if (process.env.ENABLE_STATIC_SERVE === 'true') {
     app.use(express.static(frontendPath));
     app.get('*', (req, res) => {
       if (req.path.startsWith('/api') || req.path === '/health') {
         return res.status(404).json({ error: 'Not found' });
       }
       res.sendFile(path.join(frontendPath, 'index.html'));
     });
  }
}

// Function to ensure admin user exists
export async function ensureAdminUser() {
  try {
    const bcrypt = await import('bcryptjs');
    const existingAdmin = await prisma.user.findFirst({
      where: { username: 'admin' }
    });

    if (!existingAdmin) {
      logger.info('No admin user found, creating one');
      
      const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || generateRandomPassword(16);
      
      if (!process.env.INITIAL_ADMIN_PASSWORD) {
        logger.security('CRITICAL: No INITIAL_ADMIN_PASSWORD provided. Generated a random one-time password.', {
          password: initialPassword
        });
        console.warn('CRITICAL SECURITY: No INITIAL_ADMIN_PASSWORD found in env. Generated one-time admin password:', initialPassword);
      }
      
      const hashedPassword = await bcrypt.default.hash(initialPassword, 10);
      
      await prisma.user.create({
        data: {
          telegramId: 'admin_placeholder_' + Date.now(),
          username: 'admin',
          password: hashedPassword,
          role: 'ADMIN',
          isApproved: true,
          firstName: 'Admin',
          lastName: 'User'
        }
      });
      logger.info('Admin user created successfully');
    } else {
      logger.debug('Admin user already exists');
    }
  } catch (error) {
    logger.error('Failed to ensure admin user', error);
  }
}

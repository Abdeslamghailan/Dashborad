import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
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
import prisma from './db';
import { initBackupService } from './services/backupService';
import { logger } from './utils/logger.js';

dotenv.config();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
const __dirname = process.cwd();

export const app = express();

// Trust the first proxy (Netlify/Railway load balancer)
app.set('trust proxy', 1);

const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET) {
  logger.error('FATAL ERROR: JWT_SECRET is not defined');
  if (isProduction) {
    process.exit(1);
  }
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

app.use(express.json({ limit: '10mb' }));

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

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Simple query to check DB connection
    const userCount = await prisma.user.count();
    res.json({ 
      status: 'ok', 
      env: process.env.NODE_ENV,
      db: 'connected',
      userCount
    });
  } catch (error) {
    logger.error('Health check DB error', error);
    res.status(500).json({ 
      status: 'error', 
      env: process.env.NODE_ENV,
      db: 'disconnected'
    });
  }
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
      const hashedPassword = await bcrypt.default.hash('admin123', 10);
      
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

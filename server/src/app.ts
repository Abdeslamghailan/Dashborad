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
import diagramRoutes from './routes/diagram';
import dayplanRoutes from './routes/dayplan';
import scriptsRoutes from './routes/scripts';
import prisma from './db';
import { initBackupService } from './services/backupService';

dotenv.config();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
const __dirname = process.cwd();

export const app = express();

// Trust the first proxy (Netlify/Railway load balancer)
app.set('trust proxy', 1);

const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined.');
  // Don't exit here in lambda, just log error. 
  // process.exit(1); 
}

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: isProduction ? false : undefined,
  crossOriginEmbedderPolicy: false,
  // Netlify might need this
  hsts: isProduction
}));

// Dynamic CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3002',
  'https://sharan-unsuspendible-milagros.ngrok-free.dev',
];

// Add Railway/Netlify URL if available
if (process.env.RAILWAY_PUBLIC_DOMAIN) {
  allowedOrigins.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
}
if (process.env.URL) { // Netlify
  allowedOrigins.push(process.env.URL);
}

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin) || 
      /\.ngrok-free\.dev$/.test(origin) ||
      /\.railway\.app$/.test(origin) ||
      /\.up\.railway\.app$/.test(origin) ||
      /\.netlify\.app$/.test(origin); // Allow all netlify subdomains
    
    if (isAllowed) {
      callback(null, true);
    } else {
      // In production, we might want to be stricter, but for now allow to avoid issues
      console.log('CORS allowed (relaxed):', origin);
      callback(null, true); 
    }
  },
  credentials: true
}));

app.use(express.json());

// Debug logging
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.path}`);
  next();
});

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
app.use('/api/diagram', diagramRoutes);
app.use('/api/dayplan', dayplanRoutes);
app.use('/api/scripts', scriptsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV });
});

// Initialize Backup Service ONLY if explicitly enabled (disabled on Netlify)
if (process.env.ENABLE_LOCAL_BACKUPS === 'true') {
  initBackupService();
}

// DEBUG ROUTE
app.get('/debug', async (req, res) => {
  try {
    const fs = await import('fs');
    const distPath = path.join(__dirname, '../../dist');
    let distFiles = 'Not found';
    try {
      if (fs.existsSync(distPath)) {
        distFiles = fs.readdirSync(distPath).join(', ');
      }
    } catch (e: any) {
      distFiles = e.message;
    }

    res.json({
      currentDir: __dirname,
      distPath,
      distFiles,
      env: process.env.NODE_ENV
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Serve static files in production (ONLY if not running as a lambda, but Express doesn't know)
// On Netlify, static files are served by CDN, not Express.
// But if we run this locally or on Railway, we might want it.
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
      console.log('🔧 No admin user found, creating one...');
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
      console.log('✅ Admin user created successfully');
    } else {
      console.log('✅ Admin user already exists');
    }
  } catch (error) {
    console.error('❌ Failed to ensure admin user:', error);
  }
}

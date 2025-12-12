import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
// import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import entityRoutes from './routes/entities.js';
import adminRoutes from './routes/admin.js';
import proxyRoutes from './routes/proxies.js';
import proxyPartitionRoutes from './routes/proxyPartition.js';
import historyRoutes from './routes/history.js';
import planningRoutes from './routes/planning.js';
import diagramRoutes from './routes/diagram.js';
import dayplanRoutes from './routes/dayplan.js';
import scriptsRoutes from './routes/scripts.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Trust the first proxy (Railway load balancer)
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3002;
const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined.');
  process.exit(1);
}

// Security Middleware - relaxed for production to allow static files
app.use(helmet({
  contentSecurityPolicy: isProduction ? false : undefined,
  crossOriginEmbedderPolicy: false,
}));

// Rate Limiting - increased for production
/*
// Rate Limiting - increased for production
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: isProduction ? 500 : 100, // Higher limit in production
//   message: 'Too many requests from this IP, please try again later.',
//   validate: { xForwardedForHeader: false } // Disable strict validation to prevent crashes
// });
// app.use(limiter);
*/

// Dynamic CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3002',
  'https://sharan-unsuspendible-milagros.ngrok-free.dev',
];

// Add Railway URL if available
if (process.env.RAILWAY_PUBLIC_DOMAIN) {
  allowedOrigins.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
}

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list or matches patterns
    const isAllowed = allowedOrigins.includes(origin) || 
      /\.ngrok-free\.dev$/.test(origin) ||
      /\.railway\.app$/.test(origin) ||
      /\.up\.railway\.app$/.test(origin);
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow all in production for now
    }
  },
  credentials: true
}));
app.use(express.json());

// Routes
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
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

import { initBackupService } from './services/backupService.js';

// Initialize Backup Service
initBackupService();

// DEBUG ROUTE - To find where the files are
app.get('/debug', async (req, res) => {
  try {
    const fs = await import('fs');
    
    const currentDir = __dirname;
    const oneUp = path.resolve(__dirname, '..');
    const twoUp = path.resolve(__dirname, '../..');
    const threeUp = path.resolve(__dirname, '../../..');
    
    let distFiles = 'Not found';
    const distPath = path.join(__dirname, '../../dist');
    let indexContent = 'File not found';

    try {
      distFiles = fs.readdirSync(distPath).join(', ');
      try {
          indexContent = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8').substring(0, 500);
      } catch (e) {
          indexContent = 'Error reading file: ' + e;
      }
    } catch (e: any) {
      distFiles = e.message;
    }

    res.json({
      currentDir,
      oneUp,
      twoUp,
      threeUp,
      distPath,
      distFiles,
      indexContent,
      env: process.env.NODE_ENV
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Serve static files in production
if (isProduction) {
  // Serve the built frontend from the dist folder (two levels up from server/dist)
  const frontendPath = path.join(__dirname, '../../dist');
  console.log('Serving static files from:', frontendPath);
  
  app.use(express.static(frontendPath));
  
  // Handle client-side routing - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api') || req.path === '/health') {
      return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
});

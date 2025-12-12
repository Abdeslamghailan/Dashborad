import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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
const app = express();
const PORT = process.env.PORT || 3002;
if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined.');
    process.exit(1);
}
// Security Middleware
app.use(helmet());
// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);
// Middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://sharan-unsuspendible-milagros.ngrok-free.dev',
        /\.ngrok-free\.dev$/ // Allow any ngrok-free.dev subdomain
    ],
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
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

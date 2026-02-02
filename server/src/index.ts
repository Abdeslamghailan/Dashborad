import { app, ensureAdminUser } from './app.js';
import dotenv from 'dotenv';
import { scheduleHistoryCleanup } from './services/historyCleanup.js';

dotenv.config();

const PORT = process.env.PORT || 3002;
const isProduction = process.env.NODE_ENV === 'production';

// Start server
const startServer = async () => {
  // Ensure admin user exists before starting
  await ensureAdminUser();

  // Schedule history cleanup (3-month retention for Audit Log)
  scheduleHistoryCleanup();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
  });
};

startServer();


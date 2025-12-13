import { app, ensureAdminUser } from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3002;
const isProduction = process.env.NODE_ENV === 'production';

// Start server
const startServer = async () => {
  // Ensure admin user exists before starting
  await ensureAdminUser();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
  });
};

startServer();

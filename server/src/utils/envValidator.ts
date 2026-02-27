import { logger } from './logger.js';

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'TELEGRAM_BOT_TOKEN',
  'DATA_API_URL',
  'DATA_API_KEY'
];

export function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    logger.error('CRITICAL: Missing required environment variables:', missing);
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL ERROR: The application cannot start without these environment variables:', missing);
      process.exit(1);
    }
    return false;
  }
  
  logger.info('Environment variables validated successfully');
  return true;
}

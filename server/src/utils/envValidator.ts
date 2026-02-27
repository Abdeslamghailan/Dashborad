import { logger } from './logger.js';

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'TELEGRAM_BOT_TOKEN'
];

export function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    logger.error('CRITICAL: Missing required environment variables:', missing);
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ WARNING: The application is missing critical environment variables:', missing);
      console.warn('This may cause some features to fail, but we will attempt to start anyway.');
    }
    return false;
  }
  
  logger.info('Environment variables validated successfully');
  return true;
}

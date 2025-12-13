import serverless from 'serverless-http';
import { app, ensureAdminUser } from '../../server/src/app';

let isInitialized = false;

const httpHandler = serverless(app);

export const handler = async (event: any, context: any) => {
  // Prevent cold start issues by ensuring DB connection
  if (!isInitialized) {
    try {
      console.log('Initializing Netlify Function...');
      await ensureAdminUser();
      isInitialized = true;
    } catch (error) {
      console.error('Initialization failed:', error);
    }
  }
  
  return httpHandler(event, context);
};

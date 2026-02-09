import serverless from 'serverless-http';
import { app, ensureAdminUser } from '../../server/src/app';

let isInitialized = false;

const httpHandler = serverless(app);

export const handler = async (event: any, context: any) => {
  // Prevent cold start issues by ensuring DB connection
  if (!isInitialized) {
    try {
      console.log('Initializing Netlify Function... env:', process.env.NODE_ENV);
      console.log('DB Connection String Present:', !!process.env.DATABASE_URL);
      
      // Fire and forget initialization to not block the request
      ensureAdminUser().catch(err => console.error('Background initialization error:', err));
      isInitialized = true;
      console.log('✅ Netlify Function Initialized (background task started)');
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      // We don't block the handler, let it try to handle the request anyway
    }
  }
  
  console.log(`[Lambda] Processing request: ${event.httpMethod} ${event.path}`);
  return httpHandler(event, context);
};

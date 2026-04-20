// Centralized configuration
// Handles the port mismatch issue between dev (3003) and env default (3002)

// Use environment variable for production deployment
// Defaults to empty string for relative paths so the Vite proxy handles it
export const API_URL = '';

// Specific API URL for dashboard reporting
// export const REPORTING_API_URL = 'http://app.cmhwarmup.com:8366';
export const REPORTING_API_URL = 'https://abdelgh9.pythonanywhere.com';

console.log(`[Config] API_URL resolved to: "${API_URL || '(relative)'}"`);
console.log(`[Config] REPORTING_API_URL: "${REPORTING_API_URL}"`);


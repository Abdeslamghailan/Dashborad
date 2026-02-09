// Centralized configuration
// Handles the port mismatch issue between dev (3003) and env default (3002)

// Use environment variable for production deployment
// Defaults to empty string for relative paths
const rawApiUrl = import.meta.env.VITE_API_URL;

// On Netlify, if VITE_API_URL is the old domain or 'undefined', use empty string for relative paths
export const API_URL = (rawApiUrl && rawApiUrl !== 'undefined' && !window.location.hostname.includes('netlify.app')) 
  ? rawApiUrl 
  : '';

// Specific API URL for dashboard reporting
export const REPORTING_API_URL = 'http://app.cmhwarmup.com:8366';

console.log(`[Config] API_URL resolved to: "${API_URL || '(relative)'}"`);
console.log(`[Config] REPORTING_API_URL: "${REPORTING_API_URL}"`);


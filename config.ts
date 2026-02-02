// Centralized configuration
// Handles the port mismatch issue between dev (3003) and env default (3002)

// Use environment variable for production deployment (e.g., Netlify)
// Falls back to empty string for local development (uses Vite proxy)
export const API_URL = import.meta.env.VITE_API_URL || '';


// Centralized configuration
// Handles the port mismatch issue between dev (3003) and env default (3002)

// Always use relative path to leverage Vite proxy in both dev and prod (if served by same origin)
// or just rely on the proxy configuration in vite.config.ts for development.
export const API_URL = '';


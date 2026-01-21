import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
        strictPort: true,
        allowedHosts: [
          'localhost',
          '.ngrok-free.dev',
          'sharan-unsuspendible-milagros.ngrok-free.dev'
        ],
        proxy: {
          '/api': {
            target: 'http://localhost:3002',
            changeOrigin: true,
            secure: false
          }
        }
      },
      plugins: [react()],
      // SECURITY: Do NOT expose API keys to client
      // API calls should be proxied through backend
      define: {
        // Only define non-sensitive environment variables here
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: false, // Disable source maps in production
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: true, // Remove console.* in production
            drop_debugger: true
          }
        }
      }
    };
});

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Cast process to any to fix type errors in some environments
  const cwd = (process as any).cwd();
  const env = loadEnv(mode, cwd, '');

  // Helper to get env var from .env file OR system environment (Vercel/Netlify)
  const getEnv = (key: string) => {
    return JSON.stringify(env[key] || process.env[key] || '');
  };

  return {
    plugins: [react()],
    // We replace process.env.KEY in the code with the actual string value at build time
    define: {
      'process.env.API_KEY': getEnv('API_KEY'),
      'process.env.FIREBASE_API_KEY': getEnv('FIREBASE_API_KEY'),
      'process.env.FIREBASE_AUTH_DOMAIN': getEnv('FIREBASE_AUTH_DOMAIN'),
      'process.env.FIREBASE_PROJECT_ID': getEnv('FIREBASE_PROJECT_ID'),
      'process.env.FIREBASE_STORAGE_BUCKET': getEnv('FIREBASE_STORAGE_BUCKET'),
      'process.env.FIREBASE_MESSAGING_SENDER_ID': getEnv('FIREBASE_MESSAGING_SENDER_ID'),
      'process.env.FIREBASE_APP_ID': getEnv('FIREBASE_APP_ID')
    }
  };
});
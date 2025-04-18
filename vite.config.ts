import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src')
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: [
      '40c5a813-64b7-4486-a7fb-6f7113c27711-00-372o225b2ta42.kirk.replit.dev'
    ]
  }
});

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
<<<<<<< HEAD
    port: 5000,
    host: '0.0.0.0',
    hmr: {
      clientPort: 443,
      host: '0.0.0.0'
    }
=======
    port: 5173,
    host: '0.0.0.0',
    strictPort: true,
    hmr: {
      clientPort: 443
    },
    allowedHosts: [
      '40c5a813-64b7-4486-a7fb-6f7113c27711-00-372o225b2ta42.kirk.replit.dev',
      '.replit.dev',
      'localhost',
      '127.0.0.1'
    ]
>>>>>>> 85be560f67147b707c77250438131225c937ba90
  }
});

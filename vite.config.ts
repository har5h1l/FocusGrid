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
    port: 5000,
    host: '0.0.0.0',
    hmr: {
      clientPort: 443,
      host: '0.0.0.0'
    }
  }
});
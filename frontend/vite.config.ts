import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';
import { ensureCertsExist } from './ensureCerts.js';

// Ensure SSL certificates exist before Vite tries to read them
ensureCertsExist();

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    https: {
      key: fs.readFileSync(path.resolve(__dirname, 'certs/key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, 'certs/cert.pem')),
    },
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(
      process.env.VITE_API_URL
    ),
  },
});

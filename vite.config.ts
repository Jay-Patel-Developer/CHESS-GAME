import { defineConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';

// Get the repository name for GitHub Pages deployment
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'chess-game';

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? `/${repo}/` : '/',
  resolve: {
    alias: {
      '@': path.resolve('./src'),
    },
  },
  build: {
    outDir: 'dist',
  },
  worker: {
    format: 'es',
  },
  server: {
    headers: {
      // Set Content Security Policy to allow all required resources
      'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https://*; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://*.puter.com https://op12no2.github.io https://chess-ai-api.vercel.app https://backscattering.de https://unpkg.com https://cdnjs.cloudflare.com; worker-src 'self' blob: data: /engine/stockfish.js https://cdn.jsdelivr.net; connect-src 'self' https://cdn.jsdelivr.net https://*.puter.com https://api.puter.com https://op12no2.github.io https://chess-ai-api.vercel.app https://backscattering.de https://unpkg.com https://cdnjs.cloudflare.com wss: ws:;"
    }
  }
});

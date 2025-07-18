import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { ViteImageOptimize } from 'vite-plugin-image-optimizer';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ViteImageOptimize({
      // Your existing config
      includePublic: true,
      jpg: { quality: 70 },
      png: { quality: 70 },
      webp: { quality: 70 },
      avif: { quality: 70 },
    }),
  ],
});
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { imageOptimizer } from 'vite-plugin-image-optimizer';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    imageOptimizer({
      // Optimize images in `public` folder
      includePublic: true,
      // Compression settings
      jpg: { quality: 70 },   // Reduce JPG quality to 70%
      png: { quality: 70 },   // Reduce PNG quality (lossy)
      webp: { quality: 70 }, // Convert to WebP (smaller than JPG/PNG)
      avif: { quality: 60 }, // Optional: Convert to AVIF (even smaller)
    }),
  ],
});
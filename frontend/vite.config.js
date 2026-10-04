import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { displayFontSubset } from './scripts/vite-plugin-display-font.js'

export default defineConfig({
  // displayFontSubset: `?display-subset` imports of the brand display face (src/brand/displayFont.js).
  plugins: [displayFontSubset(), react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: {
    // Each agent / developer passes its own --port; the default is the shared dev server.
    port: 5173,
    strictPort: true,
    host: 'localhost',
    proxy: {
      '/api': {
        target: 'https://nuvovet-systems.onrender.com',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Vite 8 minifies with Oxc by default; 'esbuild' would need the optional esbuild peer.
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react'],
  },
  // Vitest (npm test → `vitest run`)
  test: {
    include: ['src/**/*.test.js', 'scripts/**/*.test.js'],
    environment: 'node',
    passWithNoTests: true,
  },
})

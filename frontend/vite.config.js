import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: 'localhost',
    middlewareMode: false,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173
    },
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
    include: ['react', 'react-dom', 'lucide-react']
  },
  // Vitest (npm test → `vitest run`)
  test: {
    include: ['src/**/*.test.js'],
    environment: 'node',
    passWithNoTests: true,
  },
})

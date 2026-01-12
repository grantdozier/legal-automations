import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/legal-automations/',
  build: {
    outDir: '../docs',
    emptyOutDir: true,
    rollupOptions: {
      external: ['@chroma-core/default-embed'],
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['chromadb'],
  },
})

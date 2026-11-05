import { tanstackRouter } from '@tanstack/router-plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// tanstackRouter PHẢI đứng trước react() (sinh routeTree.gen.ts trước khi React transform chạy).
export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    proxy: {
      // Cùng origin với BFF khi dev để cookie session + CSRF hoạt động như production.
      '/api': { target: process.env.BFF_URL ?? 'http://localhost:3000', changeOrigin: true },
    },
  },
});
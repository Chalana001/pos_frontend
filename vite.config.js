import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id)) {
            return 'react-vendor';
          }

          if (/[\\/]node_modules[\\/](recharts|d3-[^\\/]+|decimal\.js-light|eventemitter3|lodash-es|react-is|tiny-invariant)[\\/]/.test(id)) {
            return 'charts-vendor';
          }

          if (/[\\/]node_modules[\\/]html2canvas[\\/]/.test(id)) {
            return 'html2canvas-vendor';
          }

          if (/[\\/]node_modules[\\/]lucide-react[\\/]/.test(id)) {
            return 'icons-vendor';
          }

          if (/[\\/]node_modules[\\/](axios|date-fns|dexie|zod|react-hook-form|@hookform)[\\/]/.test(id)) {
            return 'app-vendor';
          }

          return undefined;
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});

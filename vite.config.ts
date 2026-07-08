/// <reference types="vitest/config" />
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true, // Allow testing PWA in localhost
      },
      manifest: {
        name: 'DienteLink',
        short_name: 'DienteLink',
        description: 'Gestión Dental Profesional',
        theme_color: '#3b82f6',
        background_color: '#F8FAFC',
        display: 'standalone',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  build: {
    // Raise warning threshold — we're splitting manually
    chunkSizeWarningLimit: 600,
    // Use esbuild (default, faster) with aggressive minification
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core — tiny, loaded first, always cached
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          // Router — small, separate cache entry
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
          // Framer Motion — heavy animation lib, separate so it caches independently
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-framer';
          }
          // Supabase — network client, changes rarely
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          // React Query + state management
          if (id.includes('node_modules/@tanstack')) {
            return 'vendor-query';
          }
          // Lucide icons — large icon set
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-lucide';
          }
          // Everything else in node_modules → shared vendor chunk
          if (id.includes('node_modules/')) {
            return 'vendor-misc';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    include: ['tests/**/*.test.{ts,tsx}'],
    css: false,
  },
});


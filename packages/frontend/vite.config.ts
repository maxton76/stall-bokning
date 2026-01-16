import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    open: true,
  },
  preview: {
    port: 5174,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React - loaded on every page
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // Firebase - loaded after auth check
          'firebase-vendor': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage',
          ],

          // TanStack - data fetching and tables
          'query-vendor': ['@tanstack/react-query', '@tanstack/react-table'],

          // Radix UI primitives - lazy loaded with components
          'ui-vendor': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
          ],

          // FullCalendar - heavy, only for schedule pages
          'fullcalendar': [
            '@fullcalendar/core',
            '@fullcalendar/react',
            '@fullcalendar/daygrid',
            '@fullcalendar/timegrid',
            '@fullcalendar/list',
            '@fullcalendar/interaction',
          ],

          // Charts - only for dashboard/reports
          'charts-vendor': ['recharts'],

          // Stripe - only for subscription pages
          'stripe-vendor': ['@stripe/react-stripe-js', '@stripe/stripe-js'],

          // Form handling - common across many pages
          'forms-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],

          // Date utilities and pickers
          'date-vendor': ['date-fns', 'react-day-picker'],

          // Heavy utilities - xlsx for export, loaded on demand
          'export-vendor': ['xlsx'],
        },
      },
    },
  },
})

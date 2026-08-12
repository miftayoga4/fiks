import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          login: path.resolve(__dirname, 'login.html'),
          dashboard: path.resolve(__dirname, 'dashboard.html'),
          transactions: path.resolve(__dirname, 'transactions.html'),
          accounts: path.resolve(__dirname, 'accounts.html'),
          categories: path.resolve(__dirname, 'categories.html'),
          budget: path.resolve(__dirname, 'budget.html'),
          savings: path.resolve(__dirname, 'savings.html'),
          bills: path.resolve(__dirname, 'bills.html'),
          debts: path.resolve(__dirname, 'debts.html'),
          calendar: path.resolve(__dirname, 'calendar.html'),
          analytics: path.resolve(__dirname, 'analytics.html'),
          reports: path.resolve(__dirname, 'reports.html'),
          settings: path.resolve(__dirname, 'settings.html'),
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    // Same-origin proxy so Django's session cookie stays first-party; mirrors vercel.json in production.
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
})

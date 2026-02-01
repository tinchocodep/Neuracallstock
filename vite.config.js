import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy N8N webhook requests to avoid CORS in local development
      '/api/n8n': {
        target: 'https://n8n.neuracall.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/n8n/, ''),
        secure: true
      }
    }
  }
})

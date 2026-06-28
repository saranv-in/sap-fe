import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@monaco-editor') || id.includes('monaco-editor')) {
              return 'monaco';
            }
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            if (id.includes('socket.io-client')) {
              return 'socket';
            }
            if (id.includes('react-resizable-panels')) {
              return 'resizable-panels';
            }
            return 'vendor';
          }
        }
      }
    }
  }
})

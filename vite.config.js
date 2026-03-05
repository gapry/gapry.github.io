import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  build: {
    emptyOutDir: true,
  },

  plugins: [react()],

  base: '/', 
  
  server: {
    open: true, 
    port: 3000, 
  }
})

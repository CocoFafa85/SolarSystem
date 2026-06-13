import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    host: 'localhost',
    open: true
  },
  build: {
    target: 'esnext',
    minify: 'terser'
  }
})

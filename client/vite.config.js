import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Tailscale Serve が localhost のみを中継するため、LANへ直接公開しない。
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:4000',
      '/generated': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000'
    }
  }
});

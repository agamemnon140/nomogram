import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/nomogram/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['pace-apple-touch-icon.png', 'pace-favicon-32.png', 'pace-favicon-48.png', 'pace-icon-192.png', 'pace-icon-512.png'],
      manifest: {
        id: '/nomogram/',
        name: 'Pace Nomogram',
        short_name: 'Pace',
        description: 'Conversor visual de pace, velocidade e tempos de corrida',
        lang: 'pt-BR',
        start_url: '/nomogram/',
        scope: '/nomogram/',
        display: 'standalone',
        background_color: '#f2f2f7',
        theme_color: '#C74E28',
        icons: [
          { src: 'pace-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'pace-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        cacheId: 'pace-nomogram',
        cleanupOutdatedCaches: true,
        navigateFallback: '/nomogram/index.html',
        navigateFallbackAllowlist: [/^\/nomogram(?:\/|$)/],
        globPatterns: ['**/*.{js,css,html,png,webmanifest}'],
      },
    }),
  ],
})

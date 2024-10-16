import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from '@rsbuild/core'
import { pluginMockServer } from 'rspack-plugin-mock/rsbuild'

export default defineConfig({
  html: {
    template: './index.html',
  },
  source: {
    alias: {
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src'),
    },
  },
  server: {
    proxy: {
      '/api/': 'http://localhost:8080',
    },
  },
  plugins: [
    pluginMockServer({
      prefix: '/api-dev/',
      wsPrefix: '/socket.io',
      build: true,
    }),
  ],
})

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from '@rsbuild/core'
import { pluginMockServer } from 'rspack-plugin-mock/rsbuild'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  html: {
    template: './index.html',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
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
      formidableOptions: {
        uploadDir: path.resolve(__dirname, './upload'),
      },
    }),
  ],
})

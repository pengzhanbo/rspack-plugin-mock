import { defineConfig } from '@rsbuild/core'
import { pluginMockServer } from 'rspack-plugin-mock/rsbuild'

export default defineConfig({
  html: {
    template: './index.html',
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  plugins: [
    pluginMockServer({
      wsPrefix: '/socket.io',
      build: true,
    }),
  ],
})

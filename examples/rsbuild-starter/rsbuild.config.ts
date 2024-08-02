import { defineConfig } from '@rsbuild/core'
import { pluginMockServer } from 'rspack-plugin-mock/rsbuild'

export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  plugins: [
    pluginMockServer(),
  ],
})

import { defineConfig } from '@rsbuild/core'
import { pluginMockServer } from 'rspack-plugin-mock/rsbuild'

export default defineConfig({
  html: {
    template: './index.html',
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        onError(err, req, res) {
          console.error('[proxy:error]', err?.stack || err)
          res.statusCode = 500
          res.end()
        },
      },
    },
  },
  plugins: [
    pluginMockServer(),
  ],
})

// @ts-check

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { rspack } from '@rspack/core'
import { MockServerPlugin } from 'rspack-plugin-mock'

const targets = ['chrome >= 87', 'edge >= 88', 'firefox >= 78', 'safari >= 14']
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('@rspack/cli').Configuration} */
export default {
  entry: {
    main: './src/index.ts',
  },
  resolve: {
    extensions: ['.js', '.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  devServer: {
    proxy: [
      {
        context: '/api/',
        target: 'http://localhost:3000',
      },
    ],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'ecmascript',
                },
              },
              env: { targets },
            },
          },
        ],
      },
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                },
              },
              env: { targets },
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new MockServerPlugin({
      prefix: '/api-dev/',
      wsPrefix: '/socket.io',
      build: true,
      formidableOptions: {
        uploadDir: path.resolve(__dirname, './upload'),
      },
    }),
    new rspack.HtmlRspackPlugin({ template: './index.html' }),
  ],
  experiments: {
    css: true,
  },
}

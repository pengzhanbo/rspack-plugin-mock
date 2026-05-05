// @ts-check

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { rspack } from '@rspack/core'
import { MockServerPlugin } from 'rspack-plugin-mock'

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
        target: 'https://localhost:3000',
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

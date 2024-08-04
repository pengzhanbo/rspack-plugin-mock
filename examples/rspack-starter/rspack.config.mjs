// @ts-check

import { rspack } from '@rspack/core'
import { MockServerPlugin } from 'rspack-plugin-mock'

const targets = ['chrome >= 87', 'edge >= 88', 'firefox >= 78', 'safari >= 14']

/** @type {import('@rspack/cli').Configuration} */
export default {
  entry: {
    main: './src/index.ts',
  },
  resolve: {
    extensions: ['.js', '.ts'],
    alias: {
      '@': './src',
    },
  },
  devServer: {
    proxy: [
      {
        context: '/api',
        target: 'http://localhost:3000',
      },
      {
        context: '/socket.io',
        target: 'ws://localhost:3000',
        ws: true,
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
      wsPrefix: '/socket.io',
    }),
    new rspack.HtmlRspackPlugin({ template: './index.html' }),
  ],
  experiments: {
    css: true,
  },
}

# rspack-plugin-mock

[rspack](https://rspack.dev) and [rsbuild](https://rsbuild.dev) plugin for API mock dev server.

Implement a mock-dev-server in `rspack` and `rsbuild` that is fully consistent with [vite-plugin-mock-dev-server](https://github.com/pengzhanbo/vite-plugin-mock-dev-server).

> [!IMPORTANT]
> The plugin is not ready yet and is actively being developed.

## Usage

### Install

```sh
# npm
npm i -D rspack-plugin-mock
# yarn
yarn add rspack-plugin-mock
# pnp
pnpm add -D rspack-plugin-mock
```

### Configuration

**In Rspack**

```ts
// rspack.config.js
import { MockServerPlugin } from 'rspack-plugin-mock'

export default {
  devServer: {
    // The plugin will read the `proxy` option from the `devServer`
    proxy: [
      { context: '/api', target: 'http://example.com' },
    ],
  },
  plugins: [
    new MockServerPlugin(/* pluginOptions */),
  ]
}
```

**In Rsbuild**

```ts
// rsbuild.config.ts
import { defineConfig } from '@rsbuild/core'
import { pluginMockServer } from 'rspack-plugin-mock/rsbuild'

export default defineConfig({
  server: {
    // The plugin will read the `proxy` option from the `server`
    proxy: {
      '/api': 'http://example.com',
    },
  },
  plugins: [
    pluginMockServer(/* pluginOptions */),
  ],
})
```

### Edit Mock file

By default, write mock data in the mock directory of your project's root directory:

`mock/**/*.mock.ts` :

```ts
import { defineMock } from 'rspack-plugin-mock/helper'

export default defineMock({
  url: '/api/test',
  body: { a: 1, b: 2 }
})
```

## PluginOptions

TODO...

## Mock Configuration

TODO...

## Redirect

- [rspack](https://rspack.dev)
- [rsbuild](https://rsbuild.dev)
- [vite-plugin-mock-dev-server](https://github.com/pengzhanbo/vite-plugin-mock-dev-server)

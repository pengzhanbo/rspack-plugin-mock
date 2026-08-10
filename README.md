# rspack-plugin-mock

[Rspack](https://rspack.dev) and [Rsbuild](https://rsbuild.dev) plugin for API mock dev server.

Implement a mock-dev-server in `rspack` and `rsbuild` that is fully consistent with [vite-plugin-mock-dev-server](https://github.com/pengzhanbo/vite-plugin-mock-dev-server).

<p align="center">
  <a href="https://www.npmjs.com/package/rspack-plugin-mock"><img alt="npm" src="https://img.shields.io/npm/v/rspack-plugin-mock?style=flat-square&colorA=564341&colorB=EDED91"></a>
  <img alt="node-current" src="https://img.shields.io/node/v/rspack-plugin-mock?style=flat-square&colorA=564341&colorB=EDED91">
  <img alt="npm peer dependency version" src="https://img.shields.io/npm/dependency-version/rspack-plugin-mock/peer/@rspack/core?style=flat-square&colorA=564341&colorB=EDED91&label=rspack">
  <img alt="npm peer dependency version" src="https://img.shields.io/npm/dependency-version/rspack-plugin-mock/peer/@rsbuild/core?style=flat-square&colorA=564341&colorB=EDED91&label=rsbuild">
  <img alt="npm" src="https://img.shields.io/npm/dm/rspack-plugin-mock?style=flat-square&colorA=564341&colorB=EDED91">
  <img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/pengzhanbo/rspack-plugin-mock/release.yaml?style=flat-square&colorA=564341&colorB=EDED91">
</p>

<p align="center">
<span>English</span> | <a href="./README.zh-CN.md">简体中文</a>
</p>

> [!IMPORTANT]
> Starting from version 2.0 of the plugin, only `rspack@2.x` and `rsbuild@2.x` versions are supported.
>
> If you are using `rspack@1.x` or `rsbuild@1.x`, please use version `rspack-plugin-mock@1.x`.

## Features

- ⚡️ Lightweight, Flexible, Fast.
- 🧲 Not injection-based, non-intrusive to client code.
- 💡 Pure ESModule
- 🦾 Typescript.
- 🔥 HMR
- 🏷 Support `.[cm]?js`/ `.ts` /`.json` / `.json5`.
- 📦 Auto import mock file.
- 🎨 Support any lib, like `mockjs`, or do not use it.
- 📥 Path rule matching, request parameter matching.
- ⚙️ Support Enabled/Disabled any one of the API mock.
- 📀 Supports response body content type such as `text/json/buffer/stream`.
- ⚖️ Use `devServer.proxy` in rspack, or `server.proxy` in rsbuild.
- 🍕 Support `define` in the mock file.
- ⚓️ Support `alias` in the mock file.
- 📤 Support `multipart` content-type, mock upload file.
- 📥 Support mock download file.
- ⚜️ Support `WebSocket Mock` and `Server-Sent Events Mock`
- 📝 Support **recording** and **replay requests**
- 🗂 Support building small independent deployable mock services.

## Install

```sh
# npm
npm i -D rspack-plugin-mock
# yarn
yarn add rspack-plugin-mock
# pnp
pnpm add -D rspack-plugin-mock
```

### Usage

**In Rspack**

```ts
// rspack.config.js
import { MockServerPlugin } from 'rspack-plugin-mock'

export default {
  devServer: {
    // The plugin will read the `proxy` option from the `devServer`
    proxy: [{ context: '/api', target: 'http://example.com' }],
  },
  plugins: [new MockServerPlugin(/* pluginOptions */)],
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
  plugins: [pluginMockServer(/* pluginOptions */)],
})
```

### Edit Mock file

By default, write mock data in the `mock` directory of your project's root directory:

`mock/**/*.mock.ts` :

```ts
import { defineMock } from 'rspack-plugin-mock/helper'

export default defineMock({
  url: '/api/test',
  body: { a: 1, b: 2 },
})
```

You can write using file formats such as `.js, .mjs, .cjs, .ts, .json, .json5`.

## Methods

### MockServerPlugin(pluginOptions)

rspack mock server plugin.

The plugin will read the `devServer` configuration and inject middleware into the http-server of `@rspack/dev-server`.

```js
import { MockServerPlugin } from 'rspack-plugin-mock'

export default {
  devServer: {
    // The plugin will read the `proxy` option from the `devServer`
    proxy: [{ context: '/api', target: 'http://example.com' }],
  },
  plugins: [new MockServerPlugin(/* pluginOptions */)],
}
```

### pluginMockServer(pluginOptions)

rsbuild mock server plugin. **It is only used in `rsbuild`.**

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
  plugins: [pluginMockServer(/* pluginOptions */)],
})
```

### defineMock(options)

- **options:** [`MockOptions | MockOptions[]`](#mock-options)

mock options Type helper

```ts
import { defineMock } from 'rspack-plugin-mock/helper'

export default defineMock({
  url: '/api/test',
  body: { a: 1, b: 2 },
})
```

### createDefineMock(transformer)

- **transformer:** `(mock: MockOptions) => MockOptions`

Return a custom defineMock function to support preprocessing of mock config.

```ts
import { createDefineMock } from 'rspack-plugin-mock/helper'

const definePostMock = createDefineMock((mock) => {
  mock.url = `/api/post/${mock.url}`
})

export default definePostMock({
  url: 'list', // => '/api/post/list'
  body: [{ title: '1' }, { title: '2' }],
})
```

### createSSEStream(req, res)

Create a `Server-sent events` write stream to support mocking `EventSource`.

```ts
import { createSSEStream, defineMock } from 'rspack-plugin-mock/helper'

export default defineMock({
  url: '/api/sse',
  response: (req, res) => {
    const sse = createSSEStream(req, res)
    sse.write({ event: 'message', data: { message: 'hello world' } })
    sse.end()
  },
})
```

## Plugin Options

### enabled

- **Type:** `boolean`
- **Default:** `true`
- **Details:**

  Whether to enable mock server, if set to `false`, the plugin will not work.

### prefix

- **Type:** `string | string[]`
- **Details:**

  To configure the path matching rules for http mock services,
  any request path starting with prefix will be intercepted and proxied.
  If the prefix starts with `^`, it will be recognized as a `RegExp`.

### wsPrefix

- **Type:** `string | string[]`
- **Details:**

  Configure path matching rules for WebSocket mock service.
  Any ws/wss requests with a request path starting with wsPrefix
  will be intercepted by the proxy.
  If wsPrefix starts with `^`, it will be recognized as a `RegExp`.

  Please avoid having the configurations in `wsPrefix` appear in `devServer.proxy` / `server.proxy`, as this may lead to conflicts in the rules.

### cwd

- **Type:** `string`
- **Default:** `process.cwd()`
- **Details:**

  Configure the matching context for `include` and `exclude`.

### dir

- **Type:** `string`
- **Default:** `mock` (relative to [`cwd`](#cwd))
- **Details:**

  Configure the directory where mock files are located

### include

- **Type:** `string | string[]`
- **Default:** `['**/*.mock.{js,ts,cjs,mjs,json,json5}']` (relative to [`dir`](#dir))
- **Details:**

  glob string matching mock includes files. see [picomatch](https://github.com/micromatch/picomatch#globbing-features)

### exclude

- **Type:** `string | string[]`
- **Default:** `[]` (relative to [`dir`](#dir))
- **Details:**

  glob string matching mock excluded files. see [picomatch](https://github.com/micromatch/picomatch#globbing-features)

### log

- **Type:** `boolean | 'info' | 'warn' | 'error' | 'silent' | 'debug'`
- **Default:** `info`
- **Details:**

  Enable log and configure log level

### reload

- **Type:** `boolean`
- **Default:** `false`
- **Details:**

  If you want to refresh the page every time you modify a mock file,
  you can open this option.

### activeScene

- **Type:** `string | string[]`
- **Default:** `''`
- **Details:**

  Active scenario(s) for filtering mocks.

  Only mocks whose [`scene`](#optionsscene) intersects with this value (or have no `scene` configured) will be considered for matching. Can be overridden per-request via the `X-Mock-Scene` header.

### cors

- **Type:** `boolean | CorsOptions`
- **Default:** `true`
- **Details:**

  Configure to [cors](https://github.com/expressjs/cors#configuration-options)

### formidableOptions

- **Type:** `FormidableOptions`
- **Default:** `{ multiples: true }`
- **Details:**

  Configure to [formidable](https://github.com/node-formidable/formidable#options)

### cookiesOptions

- **Type:** `CookiesOptions`
- **Details:**

  Configure to [cookies](https://github.com/pillarjs/cookies#new-cookiesrequest-response--options)

### bodyParserOptions

- **Type:** `BodyParserOptions`
- **Details:**

  Configure to [co-body](https://github.com/cojs/co-body#options)

## build

- **Type:** `boolean | ServerBuildOption`

  ```ts
  interface ServerBuildOption {
    /**
     * Service startup port
     * @default 8080
     */
    serverPort?: number
    /**
     * Service application output directory
     * @default 'mockServer'
     */
    dist?: string

    /**
     * Service application log level
     * @default 'error'
     */
    log?: LogLevel
  }
  ```

- **Default:** `false`
- **Details:**

  When you need to build a small mock service, you can configure this option.

### record

- **Type:** `false | RecordOptions`
- **Default:** `false`
- **Details：**

  Whether to enable the request recording feature. Once enabled, the plugin will record all request data for subsequent request playback.

  Based on `proxy`, the plugin records request data proxied by `http-proxy`.
  After receiving a response, the plugin will record the request data and response data to the specified directory.

  ````ts
  interface RecordOptions {
    /**
     * Whether to enable the record feature
     * - true: Enable, automatically record proxy responses
     * - false: Disable (default)
     * @default false
     */
    enabled?: boolean
    /**
     * Filter requests to record
     * - Function: Custom filter function, return true to record
     * - Object: Include/exclude patterns with glob or path-to-regexp mode
     * @example
     * ```ts
     * // Record all requests
     * filter: (req) => true
     * // Record requests using glob pattern
     * filter: { mode: 'glob', include: '/api/**' }
     * // Record requests using path-to-regexp pattern
     * filter: { mode: 'path-to-regexp', include: '/api/:id' }
     * ```
     */
    filter?:
      | ((req: RecordedReq) => boolean)
      | {
          /**
           * Include the request links that need to be recorded
           *
           * String: Glob pattern or path-to-regexp pattern
           * (Use the mode option to set the mode, default is glob)
           */
          include?: string | string[]
          /**
           * Exclude request links that do not need to be recorded
           *
           * String: Glob pattern or path-to-regexp pattern
           * (Use the mode option to set the mode, default is glob)
           */
          exclude?: string | string[]
          /**
           * Matching mode for include/exclude patterns
           * - 'glob': Glob pattern matching (default)
           * - 'path-to-regexp': Path-to-regexp pattern matching
           */
          mode: 'glob' | 'path-to-regexp'
        }

    /**
     * Directory to store recorded data
     * Relative to project root
     * @default 'mock/.recordings'
     */
    dir?: string
    /**
     * Whether to overwrite existing recorded data
     * - true: Overwrite old data for the same request (default)
     * - false: Keep old data, do not record new data
     * @default true
     */
    overwrite?: boolean
    /**
     * Expiration time for recorded data in seconds
     * - 0: Never expire (default)
     * - Positive number: Expire after specified seconds
     * @default 0
     */
    expires?: number
    /**
     * Status codes to record
     * - Empty array: Record all status codes (default)
     * - Specify one or more status codes to filter
     * @default []
     */
    status?: number | number[]
    /**
     * Should a .gitignore be added to the recording directory
     * - true: Add (default)
     * - false: Do not add
     * @default true
     */
    gitignore?: boolean
  }
  ````

### replay

- **Type:** `boolean`
- **Default:** `false`
- **Details：**

  Whether to enable the request playback feature. Once enabled, the plugin will simulate responses based on the recorded request data.

### priority

- **Type:** `MockMatchPriority`
- **Details:**

  Custom path matching rule priority。[read more](#custom-path-matching-priority)

## Mock Options

**http mock**

```ts
import { defineMock } from 'rspack-plugin-mock/helper'
export default defineMock({
  url: '/api/test',
  body: { message: 'hello world' },
})
```

**websocket mock**

```ts
import { defineMock } from 'rspack-plugin-mock/helper'

export default defineMock({
  url: '/socket.io',
  ws: true,
  setup(wss) {
    wss.on('connection', (ws, req) => {
      console.log('connected')
    })
  },
})
```

### options.url

- **Type:** `string`
- **Details:**

  The interface address that needs to be mocked, supported by [path-to-regexp](https://github.com/pillarjs/path-to-regexp) for path matching.

### options.enabled

- **Type:** `boolean`
- **Default:** `true`
- **Details:**

  Whether to enable mock for this interface. In most scenarios, we only need to mock some interfaces instead of all requests that have been configured with mock.
  Therefore, it is important to be able to configure whether to enable it or not.

### options.scene

- **Type:** `string | string[]`
- **Default:** `''`
- **Details:**

  Scenario identifier for this mock.

  When not configured, the mock is universal and always matches regardless of active scenario.When configured, the mock only matches when at least one of its scenarios matches one of the active scenarios.

### options.method

- **Type:** `Method | Method[]`

  ```ts
  type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | 'HEAD' | 'PATCH'
  ```

- **Default:** `['GET', 'POST']`
- **Details:**

  The interface allows request methods

### options.type

- **Type:** `'text' | 'json' | 'buffer' | string`
- **Details:**

  Response body data type. And also support types included in [mime-db](https://github.com/jshttp/mime-db).

  When the response body returns a file and you are not sure which type to use,
  you can pass the file name as the value. The plugin will internally search for matching
  `content-type` based on the file name suffix.

### options.headers

- **Type:** `object | (request: MockRequest) => object | Promise<object>`
- **Default:** `{ 'Content-Type': 'application/json' }`
- **Details:**

  Configure the response body headers

### options.status

- **Type:** `number`
- **Default:** `200`
- **Details:**

  Configure Response Header Status Code

### options.statusText

- **Type:** `string`
- **Default:** `"OK"`
- **Details:**

  Configure response header status text

### options.delay

- **Type:** `number | [number, number]`
- **Default:** `0`
- **Details:**

  Configure response delay time, If an array is passed in, it represents the range of delay time.

  unit: `ms`

### options.body

- **Type:** `Body | (request: MockRequest) => Body | Promise<Body>`

  ```ts
  type Body = string | object | Buffer | Readable
  ```

- **Details:**

  Configure response body data content. `body` takes precedence over `response`.

### options.response

- **Type:** `(req: MockRequest, res: MockResponse, next: (err?: any) => void) => void | Promise<void>`
- **Details:**

  If you need to set complex response content, you can use the response method,
  which is a middleware. Here, you can get information such as req
  and res of the http request,
  and then return response data through res.write() | res.end().
  Otherwise, you need to execute next() method.
  In `req`, you can also get parsed request information such as
  `query`, `params`, `body` and `refererQuery`.

### options.cookies

- **Type:** `CookiesOptions | (request: MockRequest) => CookiesOptions | Promise<CookiesOptions>`

  ```ts
  type CookiesOptions = Record<string, CookieValue>

  type CookieValue = string | [string, SetCookie]
  ```

- **Details:**

  Configure response body cookies

### options.validator

- **Type:** `Validator | (request: MockRequest) => boolean`

  ```ts
  interface Validator {
    /**
     * The query string located after `?` in the request address has been parsed into JSON.
     */
    query: Record<string, any>
    /**
     * The queryString located after `?` in the referer request has been parsed as JSON.
     */
    refererQuery: Record<string, any>
    /**
     * Body data in the request
     */
    body: Record<string, any>
    /**
     * The params parameter parsed from the `/api/id/:id` in the request address.
     */
    params: Record<string, any>
    /**
     * headers data in the request
     */
    headers: Headers
  }
  ```

- **Details:**

  Request Validator

  Sometimes, for the same API request, data needs to be returned based
  on different request parameters.

  However, if all of this is written in a single mock's body or response,
  the content can become cumbersome and difficult to manage.
  The function of a validator allows you to configure multiple mocks with
  the same URL simultaneously and determine which mock should be used through validation.

### options.ws

- **Type:** `boolean`
- **Default:** `false`
- **Details:**

  Enable WebSocket interface simulation

### options.setup

- **Type:** `(wss: WebSocketServer, ctx: WebSocketSetupContext) => void`
- **Details:**

  Configure Websocket Server

```ts
interface WebSocketSetupContext {
  /**
   * When defining WSS, you may perform some automatic or looping tasks.
   * However, when hot updating, the plugin will re-execute `setup()`,
   * which may result in duplicate registration of listening events and looping tasks
   * such as setTimeout. You can use `onCleanup()` to clear these automatic or looping tasks.
   */
  onCleanup: (cleanup: () => void) => void
}
```

### options.error

- **Type:** `MockErrorConfig | undefined`
- **Details:**

  Configure error simulation, including error probability, error status code, error status text, and custom error response body.

```ts
interface MockErrorConfig {
  /**
   * Error probability (0-1), default is 0.5
   * @default 0.5
   */
  probability?: number
  /**
   * Error status code, default is 500
   * @default 500
   */
  status?: number
  /**
   * Error status text
   */
  statusText?: string
  /**
   * Custom error response body, suitable for when the status is 200, but the response body needs to simulate an error scenario
   * @example
   * { code: 500, msg: 'Internal Server Error', result: null }
   */
  body?: ResponseBody | ResponseBodyFn
}
```

## Request/Response Enhance

When defining methods using `headers`, `body`, and `response`, the plugin adds new content to the `request` and `response` parameters.

**In Request:**

The original type of `request` is [`http.IncomingMessage`](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/connect/index.d.ts). The plugin adds data such as `query`, `params`, `body`, `refererQuery`, and the `getCookie(name)` method for obtaining cookie information on this basis.

```ts
type Request = http.IncomingMessage & {
  query: object
  params: object
  body: any
  refererQuery: object
  getCookie: (name: string, option?: Cookies.GetOption) => string | undefined
}
```

**In Response:**

The original type of `response` is `http.ServerResponse<http.IncomingMessage>`. The plugin adds `setCookie(name, value)` method for configuration cookies on this basis.

```ts
type Response = http.ServerResponse<http.IncomingMessage> & {
  setCookie: (name: string, value?: string | null, option?: Cookies.SetOption) => void
}
```

## Share Mock Data

Due to each `mock` file being compiled as a separate entry point, the local files they depend on are also compiled within. Additionally, each mock file has an independent scope. This means that even if multiple mock files collectively depend on a `data.ts` file, they cannot share data. If one mock file modifies the data in `data.ts`, other mock files will not receive the updated data.

To address this, the plugin offers a `defineMockData` function, which allows using `data.ts` as a shared data source within mock files.

```ts
type defineMockData<T> = (
  key: string, // key
  initialData: T, // initial data
  options?: {
    persistOnHMR?: boolean // persist the data value on HMR
  }, // options
) => [getter, setter] & { value: T }
```

### Examples

`data.ts`

```ts
import { defineMockData } from 'rspack-plugin-mock/helper'

export default defineMockData('posts', [
  { id: '1', title: 'title1', content: 'content1' },
  { id: '2', title: 'title2', content: 'content2' },
])
```

`*.mock.ts`

```ts
import { defineMock } from 'rspack-plugin-mock/helper'
import posts from './data'

export default defineMock([
  {
    url: '/api/posts',
    body: () => posts.value,
  },
  {
    url: '/api/posts/delete/:id',
    body: (params) => {
      const id = params.id
      posts.value = posts.value.filter((post) => post.id !== id)
      return { success: true }
    },
  },
])
```

> **Tips：**
>
> The `defineMockData` function relies solely on the shared data support provided by `memory`.
> If persistent mock data is required, it is recommended to use a `nosql` database like `lowdb` or `level`.

## Custom-Path-Matching-Priority

> Custom rules only affect links with dynamic parameters, such as: `/api/user/:id`

The priority of the path matching rules built into the plugin can already meet most needs, but if you need more flexible customization of the matching rule priority, you can use the `priority` parameter.

Exp：

```ts
import { MockServerPlugin } from 'rspack-plugin-mock'

export default {
  plugins: [
    new MockServerPlugin({
      priority: {
        // The priority of matching rules is global.
        // The rules declared in this option will take priority over the default rules.
        // The higher the position of the rule in the array, the higher the priority.
        global: ['/api/:a/b/c', '/api/a/:b/c', '/api/a/b/:c'],
        // For some special cases where the priority of certain rules needs to be adjusted,
        // this option can be used. For example, when a request matches both Rule A and Rule B,
        // and Rule A has a higher priority than Rule B, but it is desired for Rule B to take effect.
        special: {
          // When both A and B or C match, and B or C is at the top of the sort order,
          // insert A into the top position.
          // The `when` option is used to further constrain the priority adjustment to
          // be effective only for certain requests.
          '/api/:a/:b/c': {
            rules: ['/api/a/:b/:c', '/api/a/b/:c'],
            when: ['/api/a/b/c'],
          },
          // If no `when` is specified, it means that all requests matching the rules need to have their priorities adjusted. It can be abbreviated as `[key]: [...rules]`
          '/api/:a/b': ['/api/a/:b'],
        },
      },
    }),
  ],
}
```

> **Tip:**
>
> `priority` although it can adjust the priority,
> most of the time you do not need to do so. For some special requests,
> you can use static rules instead of `priority`,
> as static rules always have the highest priority.

## Examples

`mock/**/*.mock.{ts,js,mjs,cjs,json,json5}`

See more examples： [example](/example/)

<details>
<summary>Match <code>/api/test</code>, And returns a response body content with empty data</summary>

```ts
export default defineMock({
  url: '/api/test',
})
```

</details>

<details>
<summary>Match <code>/api/test</code> , And returns a static content data</summary>

```ts
export default defineMock({
  url: '/api/test',
  body: { a: 1 },
})
```

</details>

<details>
<summary>Only Support <code>GET</code> Method</summary>

```ts
export default defineMock({
  url: '/api/test',
  method: 'GET',
})
```

</details>

<details>
<summary>In the response header, add a custom header and cookie</summary>

```ts
export default defineMock({
  url: '/api/test',
  headers: { 'X-Custom': '12345678' },
  cookies: { 'my-cookie': '123456789' },
})
```

```ts
export default defineMock({
  url: '/api/test',
  headers({ query, body, params, headers }) {
    return { 'X-Custom': query.custom }
  },
  cookies() {
    return { 'my-cookie': '123456789' }
  },
})
```

</details>

<details>
<summary>Define multiple mock requests for the same URL and match valid rules with validators</summary>

```ts
export default defineMock([
  // Match /api/test?a=1
  {
    url: '/api/test',
    validator: {
      query: { a: 1 },
    },
    body: { message: 'query.a == 1' },
  },
  // Match /api/test?a=2
  {
    url: '/api/test',
    validator: {
      query: { a: 2 },
    },
    body: { message: 'query.a == 2' },
  },
  {
    // `?a=3` will resolve to `validator.query`
    url: '/api/test?a=3',
    body: { message: 'query.a == 3' },
  },
  // Hitting the POST /api/test request, and in the request body,
  // field a is an array that contains items with values of 1 and 2.
  {
    url: '/api/test',
    method: ['POST'],
    validator: { body: { a: [1, 2] } },
  },
])
```

</details>

<details>
<summary>Response Delay</summary>

```ts
export default defineMock({
  url: '/api/test',
  delay: 6000, // delay 6 seconds
})
```

</details>

<details>
<summary>The interface request failed</summary>

```ts
export default defineMock({
  url: '/api/test',
  status: 502,
  statusText: 'Bad Gateway',
})
```

</details>

<details>
<summary>Dynamic route matching</summary>

```ts
export default defineMock({
  url: '/api/user/:userId',
  body({ params }) {
    return { userId: params.userId }
  },
})
```

The `userId` in the route will be resolved into the `request.params` object.

</details>

<details>
<summary>Use the buffer to respond data</summary>

```ts
import { Buffer } from 'node:buffer'

// Since the default value of type is json,
// although buffer is used for body during transmission,
// the content-type is still json.
export default defineMock({
  url: 'api/buffer',
  body: Buffer.from(JSON.stringify({ a: 1 })),
})
```

```ts
// When the type is buffer, the content-type is application/octet-stream.
// The data passed in through body will be converted to a buffer.
export default defineMock({
  url: 'api/buffer',
  type: 'buffer',
  // Convert using Buffer.from(body) for internal use
  body: { a: 1 },
})
```

</details>

<details>
<summary>Response file type</summary>

Simulate file download, and pass in the file reading stream.

```ts
import { createReadStream } from 'node:fs'

export default defineMock({
  url: '/api/download',
  // When you are unsure of the type, you can pass in the file name for internal parsing by the plugin.
  type: 'my-app.dmg',
  body: () => createReadStream('./my-app.dmg'),
})
```

```html
<a href="/api/download" download="my-app.dmg">Download File</a>
```

</details>

<details>
<summary>Use <code>mockjs</code></summary>

```ts
import Mock from 'mockjs'

export default defineMock({
  url: '/api/test',
  body: Mock.mock({
    'list|1-10': [
      {
        'id|+1': 1,
      },
    ],
  }),
})
```

You need install `mockjs`

</details>

<details>

<summary>Use <code>response</code> to customize the response</summary>

```ts
export default defineMock({
  url: '/api/test',
  response(req, res, next) {
    const { query, body, params, headers } = req
    console.log(query, body, params, headers)

    res.status = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        query,
        body,
        params,
      }),
    )
  },
})
```

</details>

<details>
<summary>Use json / json5</summary>

```json
{
  "url": "/api/test",
  "body": {
    "a": 1
  }
}
```

</details>

<details>
<summary>multipart, upload files.</summary>

use [`formidable`](https://www.npmjs.com/package/formidable#readme) to support.

```html
<form action="/api/upload" method="post" enctype="multipart/form-data">
  <p>
    <span>file: </span>
    <input type="file" name="files" multiple="multiple" />
  </p>
  <p>
    <span>name:</span>
    <input type="text" name="name" value="mark" />
  </p>
  <p>
    <input type="submit" value="submit" />
  </p>
</form>
```

fields `files` mapping to `formidable.File`

```ts
export default defineMock({
  url: '/api/upload',
  method: 'POST',
  body(req) {
    const body = req.body
    return {
      name: body.name,
      files: body.files.map((file: any) => file.originalFilename),
    }
  },
})
```

</details>

<details>
<summary>Graphql</summary>

```ts
import { buildSchema, graphql } from 'graphql'

const schema = buildSchema(`
type Query {
  hello: String
}
`)
const rootValue = { hello: () => 'Hello world!' }

export default defineMock({
  url: '/api/graphql',
  method: 'POST',
  body: async (request) => {
    const source = request.body.source
    const { data } = await graphql({ schema, rootValue, source })
    return data
  },
})
```

```ts
fetch('/api/graphql', {
  method: 'POST',
  body: JSON.stringify({ source: '{ hello }' }),
})
```

</details>

<details>
<summary>WebSocket Mock</summary>

```ts
// ws.mock.ts
export default defineMock({
  url: '/socket.io',
  ws: true,
  setup(wss, { onCleanup }) {
    const wsMap = new Map()
    wss.on('connection', (ws, req) => {
      const token = req.getCookie('token')
      wsMap.set(token, ws)
      ws.on('message', (raw) => {
        const data = JSON.parse(String(raw))
        if (data.type === 'ping') return
        // Broadcast
        for (const [_token, _ws] of wsMap.entires()) {
          if (_token !== token) _ws.send(raw)
        }
      })
    })
    wss.on('error', (err) => {
      console.error(err)
    })
    onCleanup(() => wsMap.clear())
  },
})
```

```ts
// app.ts
const ws = new WebSocket('ws://localhost:5173/socket.io')
ws.addEventListener(
  'open',
  () => {
    setInterval(() => {
      // heartbeat
      ws.send(JSON.stringify({ type: 'ping' }))
    }, 1000)
  },
  { once: true },
)
ws.addEventListener('message', (raw) => {
  console.log(raw)
})
```

</details>

<details>
<summary>EventSource Mock</summary>

```ts
// sse.mock.ts
import { createSSEStream, defineMock } from 'rspack-plugin-mock/helper'

export default defineMock({
  url: '/api/sse',
  response(req, res) {
    const sse = createSSEStream(req, res)
    let count = 0
    const timer = setInterval(() => {
      sse.write({
        event: 'count',
        data: { count: ++count },
      })
      if (count >= 10) {
        sse.end()
        clearInterval(timer)
      }
    }, 1000)
  },
})
```

```ts
// app.js
const es = new EventSource('/api/sse')

es.addEventListener('count', (e) => {
  console.log(e.data)
})
```

</details>

## Mock Services

In some scenarios, it may be necessary to use the data provided by mock services for display purposes, but the project may have already been packaged, built and deployed without support from `rspack/rsbuild` and this plugin's mock service. Since this plugin supports importing various node modules in mock files at the design stage, the mock file cannot be inline into client build code.

The plugin support for builds a small independent mock service application that can be deployed to relevant environments during `production build`. This can then be forwarded through other HTTP servers like Nginx to actual ports for mock support.

The default output is built into the directory dist/mockServer, generating files as follows:

```sh
./mockServer
├── index.js
├── mock-data.js
└── package.json
```

In this directory, execute `npm install` to install dependencies, and then execute npm start to start the mock server.

The default port is `8080`.

You can access related mock interfaces through `localhost:8080/`.

## Links

- [rspack](https://rspack.dev)
- [rsbuild](https://rsbuild.dev)
- [vite-plugin-mock-dev-server](https://github.com/pengzhanbo/vite-plugin-mock-dev-server)

## License

rspack-plugin-mock is licensed under the [MIT License](./LICENSE)

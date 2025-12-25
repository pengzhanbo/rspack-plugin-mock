# rspack-plugin-mock

[Rspack](https://rspack.dev) and [Rsbuild](https://rsbuild.dev) plugin for API mock dev server.

Implement a mock-dev-server in `rspack` and `rsbuild` that is fully consistent with [vite-plugin-mock-dev-server](https://github.com/pengzhanbo/vite-plugin-mock-dev-server).

<p align="center">
  <a href="https://www.npmjs.com/package/rspack-plugin-mock"><img alt="npm" src="https://img.shields.io/npm/v/rspack-plugin-mock?style=flat-square&colorA=564341&colorB=EDED91"></a>
  <img alt="node-current" src="https://img.shields.io/node/v/rspack-plugin-mock?style=flat-square&colorA=564341&colorB=EDED91">
  <img alt="npm peer dependency version" src="https://img.shields.io/npm/dependency-version/rspack-plugin-mock/peer/@rspack/core?style=flat-square&colorA=564341&colorB=EDED91&label=rspack">
  <img alt="npm peer dependency version" src="https://img.shields.io/npm/dependency-version/rspack-plugin-mock/peer/@rsbuild/core?style=flat-square&colorA=564341&colorB=EDED91&label=rsbuild">
  <img alt="npm" src="https://img.shields.io/npm/dm/rspack-plugin-mock?style=flat-square&colorA=564341&colorB=EDED91">
  <img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/pengzhanbo/rspack-plugin-mock/lint.yml?style=flat-square&colorA=564341&colorB=EDED91">
</p>

<p align="center">
<span>English</span> | <a href="./README.zh-CN.md">简体中文</a>
</p>

## Features

- ⚡️ Lightweight, Flexible, Fast.
- 🧲 Not injection-based, non-intrusive to client code.
- 💡 ESModule/commonjs.
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

By default, write mock data in the `mock` directory of your project's root directory:

`mock/**/*.mock.ts` :

```ts
import { defineMock } from 'rspack-plugin-mock/helper'

export default defineMock({
  url: '/api/test',
  body: { a: 1, b: 2 }
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
    proxy: [
      { context: '/api', target: 'http://example.com' },
    ],
  },
  plugins: [
    new MockServerPlugin(/* pluginOptions */),
  ]
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
  plugins: [
    pluginMockServer(/* pluginOptions */),
  ],
})
```

### defineMock(options)

- **options:** [`MockOptions | MockOptions[]`](#mock-options)

mock options Type helper

```ts
import { defineMock } from 'rspack-plugin-mock/helper'

export default defineMock({
  url: '/api/test',
  body: { a: 1, b: 2 }
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

``` ts
import { createSSEStream, defineMock } from 'rspack-plugin-mock/helper'

export default defineMock({
  url: '/api/sse',
  response: (req, res) => {
    const sse = createSSEStream(req, res)
    sse.write({ event: 'message', data: { message: 'hello world' } })
    sse.end()
  }
})
```

## Plugin Options

### options.prefix

- **Type:** `string | string[]`
- **Details:**

  To configure the path matching rules for http mock services,
  any request path starting with prefix will be intercepted and proxied.
  If the prefix starts with `^`, it will be recognized as a `RegExp`.

### options.wsPrefix

- **Type:** `string | string[]`
- **Details:**

  Configure path matching rules for WebSocket mock service.
  Any ws/wss requests with a request path starting with wsPrefix
  will be intercepted by the proxy.
  If wsPrefix starts with `^`, it will be recognized as a `RegExp`.

  Please avoid having the configurations in `wsPrefix` appear in `devServer.proxy` / `server.proxy`, as this may lead to conflicts in the rules.

### options.cwd

- **Type:** `string`
- **Default:** `process.cwd()`
- **Details:**

  Configure the matching context for `include` and `exclude`.

### options.dir

- **Type:** `string`
- **Default:** `mock` (relative to [`options.cwd`](#optionscwd))
- **Details:**

  Configure the directory where mock files are located

### options.include

- **Type:** `string | string[]`
- **Default:** `['**/*.mock.{js,ts,cjs,mjs,json,json5}']` (relative to [`options.dir`](#optionsdir))
- **Details:**

  glob string matching mock includes files. see [picomatch](https://github.com/micromatch/picomatch#globbing-features)

### options.exclude

- **Type:** `string | string[]`
- **Default:** `[]`  (relative to [`options.dir`](#optionsdir))
- **Details:**

  glob string matching mock excluded files. see [picomatch](https://github.com/micromatch/picomatch#globbing-features)

### options.log

- **Type:** `boolean | 'info' | 'warn' | 'error' | 'silent' | 'debug'`
- **Default:** `info`
- **Details:**

  Enable log and configure log level

### options.reload

- **Type:** `boolean`
- **Default:** `false`
- **Details:**

  If you want to refresh the page every time you modify a mock file,
  you can open this option.

### options.cors

- **Type:** `boolean | CorsOptions`
- **Default:** `true`
- **Details:**

  Configure to [cors](https://github.com/expressjs/cors#configuration-options)

### options.formidableOptions

- **Type:** `FormidableOptions`
- **Default:** `{ multiples: true }`
- **Details:**

  Configure to [formidable](https://github.com/node-formidable/formidable#options)

### options.cookiesOptions

- **Type:** `CookiesOptions`
- **Details:**

  Configure to [cookies](https://github.com/pillarjs/cookies#new-cookiesrequest-response--options)

### options.bodyParserOptions

- **Type:** `BodyParserOptions`
- **Details:**

  Configure to [co-body](https://github.com/cojs/co-body#options)

## options.build

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

## Mock Options

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

  Configure response body data content.  `body` takes precedence over `response`.

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

### Types

```ts
export type MockRequest = http.IncomingMessage & ExtraRequest

export type MockResponse = http.ServerResponse<http.IncomingMessage> & {
  /**
   * Set cookie in response
   * @see [cookies](https://github.com/pillarjs/cookies#cookiessetname--values--options)
   */
  setCookie: (
    name: string,
    value?: string | null,
    option?: Cookies.SetOption,
  ) => void
}

interface ExtraRequest {
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
  /**
   * Get the cookie carried in the request.
   * @see [cookies](https://github.com/pillarjs/cookies#cookiesgetname--options)
   */
  getCookie: (name: string, option?: Cookies.GetOption) => string | undefined
}
```

## Examples

**exp:** Match `/api/test`, And returns a response body content with empty data

``` ts
export default defineMock({
  url: '/api/test',
})
```

**exp:** Match `/api/test` , And returns a static content data

``` ts
export default defineMock({
  url: '/api/test',
  body: { a: 1 },
})
```

**exp:** Only Support `GET` Method

``` ts
export default defineMock({
  url: '/api/test',
  method: 'GET'
})
```

**exp:** In the response header, add a custom header and cookie

``` ts
export default defineMock({
  url: '/api/test',
  headers: { 'X-Custom': '12345678' },
  cookies: { 'my-cookie': '123456789' },
})
```

``` ts
export default defineMock({
  url: '/api/test',
  headers({ query, body, params, headers }) {
    return { 'X-Custom': query.custom }
  },
  cookies() {
    return { 'my-cookie': '123456789' }
  }
})
```

**exp:** Define multiple mock requests for the same URL and match valid rules with validators

``` ts
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
    body: { message: 'query.a == 3' }
  },
  // Hitting the POST /api/test request, and in the request body,
  // field a is an array that contains items with values of 1 and 2.
  {
    url: '/api/test',
    method: ['POST'],
    validator: { body: { a: [1, 2] } }
  }
])
```

**exp:** Response Delay

``` ts
export default defineMock({
  url: '/api/test',
  delay: 6000, // delay 6 seconds
})
```

**exp:** The interface request failed

``` ts
export default defineMock({
  url: '/api/test',
  status: 502,
  statusText: 'Bad Gateway'
})
```

**exp:** Dynamic route matching

``` ts
export default defineMock({
  url: '/api/user/:userId',
  body({ params }) {
    return { userId: params.userId }
  }
})
```

The `userId` in the route will be resolved into the `request.params` object.

**exp:** Use the buffer to respond data

```ts
import { Buffer } from 'node:buffer'

// Since the default value of type is json,
// although buffer is used for body during transmission,
// the content-type is still json.
export default defineMock({
  url: 'api/buffer',
  body: Buffer.from(JSON.stringify({ a: 1 }))
})
```

``` ts
// When the type is buffer, the content-type is application/octet-stream.
// The data passed in through body will be converted to a buffer.
export default defineMock({
  url: 'api/buffer',
  type: 'buffer',
  // Convert using Buffer.from(body) for internal use
  body: { a: 1 }
})
```

**exp:** Response file type

Simulate file download, and pass in the file reading stream.

``` ts
import { createReadStream } from 'node:fs'

export default defineMock({
  url: '/api/download',
  // When you are unsure of the type, you can pass in the file name for internal parsing by the plugin.
  type: 'my-app.dmg',
  body: () => createReadStream('./my-app.dmg')
})
```

```html
<a href="/api/download" download="my-app.dmg">Download File</a>
```

**exp:** Use `mockjs`:

``` ts
import Mock from 'mockjs'

export default defineMock({
  url: '/api/test',
  body: Mock.mock({
    'list|1-10': [{
      'id|+1': 1
    }]
  })
})
```

You need install `mockjs`

**exp:** Use `response` to customize the response

``` ts
export default defineMock({
  url: '/api/test',
  response(req, res, next) {
    const { query, body, params, headers } = req
    console.log(query, body, params, headers)

    res.status = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      query,
      body,
      params,
    }))
  }
})
```

**exp:** Use json / json5

``` json
{
  "url": "/api/test",
  "body": {
    "a": 1
  }
}
```

**exp:** multipart, upload files.

use [`formidable`](https://www.npmjs.com/package/formidable#readme) to support.

``` html
<form action="/api/upload" method="post" enctype="multipart/form-data">
  <p>
    <span>file: </span>
    <input type="file" name="files" multiple="multiple">
  </p>
  <p>
    <span>name:</span>
    <input type="text" name="name" value="mark">
  </p>
  <p>
    <input type="submit" value="submit">
  </p>
</form>
```

fields `files` mapping to `formidable.File`

``` ts
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

**exp:** Graphql

``` ts
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

``` ts
fetch('/api/graphql', {
  method: 'POST',
  body: JSON.stringify({ source: '{ hello }' })
})
```

**exp:** WebSocket Mock

``` ts
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
        if (data.type === 'ping')
          return
        // Broadcast
        for (const [_token, _ws] of wsMap.entires()) {
          if (_token !== token)
            _ws.send(raw)
        }
      })
    })
    wss.on('error', (err) => {
      console.error(err)
    })
    onCleanup(() => wsMap.clear())
  }
})
```

``` ts
// app.ts
const ws = new WebSocket('ws://localhost:3000/socket.io')
ws.addEventListener('open', () => {
  setInterval(() => {
    // heartbeat
    ws.send(JSON.stringify({ type: 'ping' }))
  }, 1000)
}, { once: true })
ws.addEventListener('message', (raw) => {
  console.log(raw)
})
```

**exp：** EventSource Mock

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

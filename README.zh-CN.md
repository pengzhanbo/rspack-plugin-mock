# rspack-plugin-mock

在 [Rspack](https://rspack.dev) and [Rsbuild](https://rsbuild.dev) 中注入 API mock 服务。

在 `rspack` 和 `rsbuild` 中实现与 [vite-plugin-mock-dev-server](https://github.com/pengzhanbo/vite-plugin-mock-dev-server) 完全一致的模拟开发服务。

<p align="center">
  <a href="https://www.npmjs.com/package/rspack-plugin-mock"><img alt="npm" src="https://img.shields.io/npm/v/rspack-plugin-mock?style=flat-square&colorA=564341&colorB=EDED91"></a>
  <img alt="node-current" src="https://img.shields.io/node/v/rspack-plugin-mock?style=flat-square&colorA=564341&colorB=EDED91">
  <img alt="npm peer dependency version" src="https://img.shields.io/npm/dependency-version/rspack-plugin-mock/peer/@rspack/core?style=flat-square&colorA=564341&colorB=EDED91&label=rspack">
  <img alt="npm peer dependency version" src="https://img.shields.io/npm/dependency-version/rspack-plugin-mock/peer/@rsbuild/core?style=flat-square&colorA=564341&colorB=EDED91&label=rsbuild">
  <img alt="npm" src="https://img.shields.io/npm/dm/rspack-plugin-mock?style=flat-square&colorA=564341&colorB=EDED91">
  <img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/pengzhanbo/rspack-plugin-mock/release.yaml?style=flat-square&colorA=564341&colorB=EDED91">
</p>

<p align="center">
<a href="./README.md">English</a> | <span>简体中文</span>
</p>

> [!IMPORTANT]
> 从插件 2.0 版本开始，仅支持 `rspack@2.x` 版本 和 `rsbuild@2.x` 版本.
>
> 如果您使用的是 `rspack@1.x` 或 `rsbuild@1.x` 版本，请使用 `rspack-plugin-mock@1.x` 版本.

## 特性

- ⚡️ 轻量，灵活，快速
- 🧲 非注入式，对客户端代码无侵入
- 💡 纯 ESModule
- 🦾 Typescript
- 🔥 热更新
- 🏷 支持 `.[cm]?js`/ `.ts` / `json` / `json5` 编写 mock 数据
- 📦 自动加载 mock 文件
- 🎨 可选择你喜欢的任意用于生成mock数据库，如 `mockjs`，或者不使用其他库
- 📥 路径规则匹配，请求参数匹配
- ⚙️ 随意开启或关闭对某个接口的 mock配置
- 📀 支持多种响应体数据类型，包括 `text/json/buffer/stream`.
- ⚖️ rspack 中使用 `devServer.proxy` 配置, rsbuild 中使用 `server.proxy` 配置
- 🍕 支持在 mock 文件中使用 `define`配置
- ⚓️ 支持在 mock 文件中使用 `resolve.alias` 路径别名
- 📤 支持 multipart 类型，模拟文件上传
- 📥 支持模拟文件下载
- ⚜️ 支持模拟 `WebSocket` 和 `Server-Sent Events`
- 🗂 支持构建可独立部署的小型mock服务

## 安装

```sh
# npm
npm i -D rspack-plugin-mock
# yarn
yarn add rspack-plugin-mock
# pnp
pnpm add -D rspack-plugin-mock
```

## 使用

**In Rspack**

```ts
// rspack.config.js
import { MockServerPlugin } from 'rspack-plugin-mock'

export default {
  devServer: {
    // 插件将会读取 `proxy` 配置
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
    // 插件将会读取 `proxy` 配置
    proxy: {
      '/api': 'http://example.com',
    },
  },
  plugins: [
    pluginMockServer(/* pluginOptions */),
  ],
})
```

### 编写 mock 配置文件

插件默认会读取 项目根目录的 `mock` 目录：

`mock/**/*.mock.ts` :

```ts
import { defineMock } from 'rspack-plugin-mock/helper'

export default defineMock({
  url: '/api/test',
  body: { a: 1, b: 2 }
})
```

你可以使用 `.js, .mjs, .cjs, .ts, .json, .json5` 文件格式来编写 mock 配置。

## 方法

### MockServerPlugin(pluginOptions)

rspack mock 服务插件。

插件将会读取 `devServer.proxy` 配置，然后在 `@rspack/dev-server` 中注入中间件。

```js
import { MockServerPlugin } from 'rspack-plugin-mock'

export default {
  devServer: {
    // 插件将会读取 `proxy` 配置
    proxy: [
      { context: '/api', target: 'http://example.com' },
    ],
  },
  plugins: [
    new MockServerPlugin(/* 插件配置 */),
  ]
}
```

### pluginMockServer(pluginOptions)

rsbuild mock 服务插件. **仅适用于 `rsbuild`.**

```ts
// rsbuild.config.ts
import { defineConfig } from '@rsbuild/core'
import { pluginMockServer } from 'rspack-plugin-mock/rsbuild'

export default defineConfig({
  server: {
    // 插件将会读取 `proxy` 配置
    proxy: {
      '/api': 'http://example.com',
    },
  },
  plugins: [
    pluginMockServer(/* 插件配置 */),
  ],
})
```

### defineMock(options)

- **options:** [`MockOptions | MockOptions[]`](#mock-配置)

mock 配置类型帮助函数

```ts
import { defineMock } from 'rspack-plugin-mock/helper'

export default defineMock({
  url: '/api/test',
  body: { a: 1, b: 2 }
})
```

### createDefineMock(transformer)

- **transformer:** `(mock: MockOptions) => MockOptions`

返回一个自定义的 defineMock 函数，以支持对 mock 配置进行预处理。

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

创建一个 `Server-sent events` 写入流，用于支持模拟 `EventSource`。

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

## 插件配置

### options.prefix

- **类型：** `string | string[]`
- **详情：**

  为 http mock 服务配置 路径匹配规则，任何请求路径以 prefix 开头的都将被拦截代理。
  如果 prefix 以 `^` 开头，将被识别为 `RegExp`。

### options.wsPrefix

- **类型：** `string | string[]`
- **详情：**

  为 websocket mock 服务配置 路径匹配规则， 任何请求路径以 wsPrefix 开头的 ws/wss请求，都将被代理拦截。
  如果 wsPrefix 以 `^` 开头，将被识别为 `RegExp`。

  请避免在 `devServer.proxy` / `server.proxy` 中出现 `wsPrefix` 配置中相同的规则，因为这可能会导致规则冲突。

### options.cwd

- **类型：** `string`
- **默认值：** `process.cwd()`
- **详情：**

  配置 `include` 和 `exclude` 的匹配上下文。

### options.dir

- **类型：** `string`
- **默认值：** `mock` (相对于 [`options.cwd`](#optionscwd))
- **详情：**

  配置 mock 包的输出目录，相对于 [`options.cwd`](#optionscwd)

### options.include

- **类型：** `string | string[]`
- **默认值：** `[**/*.mock.{js,ts,cjs,mjs,json,json5}']` (相对于 [`options.dir`](#optionsdir))
- **详情：**

  glob 字符串匹配 mock 包含的文件。 查看 [picomatch](https://github.com/micromatch/picomatch#globbing-features)

### options.exclude

- **类型：** `string | string[]`
- **默认值：** `[]`  (相对于 [`options.dir`](#optionsdir))
- **详情：**

  glob 字符串匹配 mock 排除的文件。 查看 [picomatch](https://github.com/micromatch/picomatch#globbing-features)

### options.log

- **类型：** `boolean | 'info' | 'warn' | 'error' | 'silent' | 'debug'`
- **默认值：** `info`
- **详情：**

  开启日志，或配置 日志级别

### options.reload

- **类型：** `boolean`
- **默认值：** `false`
- **详情：**

  mock资源热更新时，仅更新了数据内容，但是默认不重新刷新页面。
  当你希望每次修改mock文件都刷新页面时，可以打开此选项。

### options.cors

- **类型：** `boolean | CorsOptions`
- **默认值：** `true`
- **详情：**

  配置 [cors](https://github.com/expressjs/cors#configuration-options)

### options.formidableOptions

- **类型：** `FormidableOptions`
- **默认值：** `{ multiples: true }`
- **详情：**

  配置 [formidable](https://github.com/node-formidable/formidable#options)

### options.cookiesOptions

- **类型：** `CookiesOptions`
- **详情：**

  配置 [cookies](https://github.com/pillarjs/cookies#new-cookiesrequest-response--options)

### options.bodyParserOptions

- **类型：** `BodyParserOptions`
- **详情：**

  配置 [co-body](https://github.com/cojs/co-body#options)

## options.build

- **类型：** `boolean | ServerBuildOption`

  ```ts
  interface ServerBuildOption {
    /**
     * 服务启动端口
     * @default 8080
     */
    serverPort?: number
    /**
     * 构建输出目录，相对于 rspack/rsbuild 构建输出目录
     * @default 'mockServer'
     */
    dist?: string

    /**
     * 服务日志级别
     * @default 'error'
     */
    log?: LogLevel
  }
  ```

- **默认值：** `false`
- **详情：**

  当需要构建一个小型mock服务时，可配置此项。插件会在构建生产包时，额外生成一个可部署的node mock 服务包。

## Mock 配置

### options.url

- **类型：** `string`
- **详情：**

  需要进行 mock 的接口地址, 由 [path-to-regexp](https://github.com/pillarjs/path-to-regexp) 提供路径匹配支持。

### options.enabled

- **类型：** `boolean`
- **默认值：** `true`
- **详情：**

  是否启动对该接口的mock，在多数场景下，我们仅需要对部分接口进行 mock，
  而不是对所有配置了mock的请求进行全量mock，所以是否能够配置是否启用很重要

### options.method

- **类型：** `Method | Method[]`

  ```ts
  type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | 'HEAD' | 'PATCH'
  ```

- **默认值：** `['GET', 'POST']`
- **详情：**

  该接口允许的 请求方法，默认同时支持 GET 和 POST

### options.type

- **类型：** `'text' | 'json' | 'buffer' | string`
- **详情：**

  响应体数据类型。 还支持 [mime-db](https://github.com/jshttp/mime-db) 中的包含的类型。

  当响应体返回的是一个文件，而你不确定应该使用哪个类型时，可以将文件名作为值传入，
  插件内部会根据文件名后缀查找匹配的`content-type`。

### options.headers

- **类型：** `object | (request: MockRequest) => object | Promise<object>`
- **默认值：** `{ 'Content-Type': 'application/json' }`
- **详情：**

  配置响应体 headers

### options.status

- **类型：** `number`
- **默认值：** `200`
- **详情：**

  配置 响应头状态码

### options.statusText

- **类型：** `string`
- **默认值：** `"OK"`
- **详情：**

  配置响应头状态文本

### options.delay

- **类型：** `number | [number, number]`
- **默认值：** `0`
- **详情：**

  配置响应延迟时间, 如果传入的是一个数组，则代表延迟时间的范围。

  单位： `ms`

### options.body

- **类型：** `Body | (request: MockRequest) => Body | Promise<Body>`

  ```ts
  type Body = string | object | Buffer | Readable
  ```

- **详情：**

  配置响应体数据内容 `body` 优先级高于 `response`.

### options.response

- **类型：** `(req: MockRequest, res: MockResponse, next: (err?: any) => void) => void | Promise<void>`
- **详情：**

  如果需要设置复杂的响应内容，可以使用 response 方法，
  该方法是一个 middleware，你可以在这里拿到 http 请求的 req、res等信息，
  然后通过 `res.write() | res.end()` 返回响应数据， 否则需要执行 `next()` 方法。
  在 `req` 中，还可以拿到 `query、params、body, refererQuery` 等已解析的请求信息。

### options.cookies

- **类型：** `CookiesOptions | (request: MockRequest) => CookiesOptions | Promise<CookiesOptions>`

  ```ts
  type CookiesOptions = Record<string, CookieValue>

  type CookieValue = string | [string, SetCookie]
  ```

- **详情：**

  配置响应体 cookies

### options.validator

- **类型：** `Validator | (request: MockRequest) => boolean`

  ```ts
  interface Validator {
    /**
     * 请求地址中位于 `?` 后面的 queryString，已解析为 json
     */
    query: Record<string, any>
    /**
     * 请求 referer 中位于 `?` 后面的 queryString
     */
    refererQuery: Record<string, any>
    /**
     * 请求体中 body 数据
     */
    body: Record<string, any>
    /**
     * 请求地址中，`/api/id/:id` 解析后的 params 参数
     */
    params: Record<string, any>
    /**
     * 请求体中 headers
     */
    headers: Headers
  }
  ```

- **详情：**

  请求验证器

  有时候，一个相同的API请求，需要根据不同的请求参数，来决定返回数据，
  但全部都在单个 mock中的 body或者 response 中写，内容会很庞杂，不好管理，
  验证器的功能，允许你同时配置多条相同url的mock，通过验证器来判断使哪个mock生效。

### options.ws

- **类型：** `boolean`
- **默认值：** `false`
- **详情：**

  配置是否开启 WebSocket Mock

### options.setup

- **类型：** `(wss: WebSocketServer, ctx: WebSocketSetupContext) => void`
- **详情：**

  配置 Websocket Server

```ts
interface WebSocketSetupContext {
  /**
   * 当你在定义 WSS 时，可能会执行一些自动任务或循环任务，
   * 但是当热更新时，插件内部会重新执行 setup() ，
   * 这可能导致出现 重复注册监听事件 和 循环任务如 `setTimeout` 等。
   * 通过 `onCleanup()` 可以来清除这些自动任务或循环任务。
   */
  onCleanup: (cleanup: () => void) => void
}
```

### Types

```ts
export type MockRequest = http.IncomingMessage & ExtraRequest

export type MockResponse = http.ServerResponse<http.IncomingMessage> & {
  /**
   * 设置响应体 cookies
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
   * 请求地址中位于 `?` 后面的 queryString，已解析为 json
   */
  query: Record<string, any>
  /**
   * 请求 referer 中位于 `?` 后面的 queryString，已解析为 json
   */
  refererQuery: Record<string, any>
  /**
   * 请求体中 body 数据
   */
  body: Record<string, any>
  /**
   * 请求地址中，`/api/id/:id` 解析后的 params 参数
   */
  params: Record<string, any>
  /**
   * 请求体中 headers
   */
  headers: Headers
  /**
   * 获取 请求中携带的 cookie
   * @see [cookies](https://github.com/pillarjs/cookies#cookiesgetname--options)
   */
  getCookie: (name: string, option?: Cookies.GetOption) => string | undefined
}
```

## Example

`mock/**/*.mock.{ts,js,mjs,cjs,json,json5}`

查看更多示例： [example](/example/)

**exp:** 命中 `/api/test` 请求，并返回一个 数据为空的响应体内容

```ts
export default defineMock({
  url: '/api/test',
})
```

**exp:** 命中 `/api/test` 请求，并返回一个固定内容数据

```ts
export default defineMock({
  url: '/api/test',
  body: { a: 1 },
})
```

```ts
export default defineMock({
  url: '/api/test',
  body: () => ({ a: 1 })
})
```

**exp:** 限定只允许 `GET` 请求

```ts
export default defineMock({
  url: '/api/test',
  method: 'GET'
})
```

**exp:**  在返回的响应头中，添加自定义 header 和 cookie

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
  }
})
```

**exp:**  定义多个相同url请求mock，并使用验证器匹配生效规则

```ts
export default defineMock([
  // 命中 /api/test?a=1
  {
    url: '/api/test',
    validator: {
      query: { a: 1 },
    },
    body: { message: 'query.a === 1' },
  },
  // 命中 /api/test?a=2
  {
    url: '/api/test',
    validator: {
      query: { a: 2 },
    },
    body: { message: 'query.a === 2' },
  },
  {
    // `?a=3` 将会解析到 `validator.query`
    url: '/api/test?a=3',
    body: { message: 'query.a == 3' },
  },
  // 命中 POST /api/test 请求，且 请求体中，字段 a 为数组，且数组包含值为 1， 2 的项
  {
    url: '/api/test',
    method: ['POST'],
    validator: { body: { a: [1, 2] } }
  }
])
```

**exp:**  延迟接口响应：

```ts
export default defineMock({
  url: '/api/test',
  delay: 6000, // 延迟 6秒
})
```

**exp:**  使接口请求失败

```ts
export default defineMock({
  url: '/api/test',
  status: 502,
  statusText: 'Bad Gateway'
})
```

**exp:** 动态路由匹配

```ts
export default defineMock({
  url: '/api/user/:userId',
  body({ params }) {
    return { userId: params.userId }
  }
})
```

路由中的 `userId`将会解析到 `request.params` 对象中.

**exp:** 使用 buffer 响应数据

```ts
import { Buffer } from 'node:buffer'

// 由于 type 默认值是 json，虽然在传输过程中body使用buffer，
// 但是 content-type 还是为 json
export default defineMock({
  url: 'api/buffer',
  body: Buffer.from(JSON.stringify({ a: 1 }))
})
```

```ts
// 当 type 为 buffer 时，content-type 为 application/octet-stream，
// body 传入的数据会被转为 buffer
export default defineMock({
  url: 'api/buffer',
  type: 'buffer',
  // 内部使用 Buffer.from(body) 进行转换
  body: { a: 1 }
})
```

**exp:** 响应文件类型

模拟文件下载，传入文件读取流

```ts
import { createReadStream } from 'node:fs'

export default defineMock({
  url: '/api/download',
  // 当你不确定类型，可传入文件名由插件内部进行解析
  type: 'my-app.dmg',
  body: () => createReadStream('./my-app.dmg')
})
```

```html
<a href="/api/download" download="my-app.dmg">下载文件</a>
```

**exp:** 使用 `mockjs` 生成响应数据:

```ts
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

请先安装 `mockjs`

**exp:** 使用 `response` 自定义响应

```ts
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

**exp:** 使用 json / json5

```json
{
  "url": "/api/test",
  "body": {
    "a": 1
  }
}
```

**exp:** multipart, 文件上传.

通过 [`formidable`](https://www.npmjs.com/package/formidable#readme) 支持。

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

fields `files` 映射为 `formidable.File` 类型。

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
  body: JSON.stringify({ source: '{ hello }' })
})
```

**exp:** WebSocket Mock

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

```ts
// app.ts
const ws = new WebSocket('ws://localhost:5173/socket.io')
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

**示例：** EventSource Mock

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

## 独立部署的小型mock服务

在一些场景中，可能会需要使用mock服务提供的数据支持，用于展示，但可能项目已完成打包构建部署，已脱离 `rspack/rsbuild` 和本插件提供的 mock服务支持。由于本插件在设计之初，支持在mock文件中引入各种 `node` 模块，所以不能将 mock文件打包内联到客户端构建代码中。

为了能够满足这类场景，插件提供了在 `production build` 时，也构建一个可独立部署的小型mock服务应用，可以将这个应用部署到相关的环境，后通过其他http服务器如nginx做代理转发到实际端口实现mock支持。

构建默认输出到 `mockServer` 目录中，并生成如下文件：

```sh
./mockServer
├── index.js
├── mock-data.js
└── package.json
```

在该目录下，执行 `npm install` 安装依赖后，执行 `npm start` 即可启动 mock server。
默认端口为 `8080`。
可通过 `localhost:8080/` 访问相关的 `mock` 接口。

## Links

- [rspack](https://rspack.dev)
- [rsbuild](https://rsbuild.dev)
- [vite-plugin-mock-dev-server](https://github.com/pengzhanbo/vite-plugin-mock-dev-server)

## License

rspack-plugin-mock is licensed under the [MIT License](./LICENSE)

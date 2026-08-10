import type { ProxyOptions } from '@rsbuild/core'
import type { DevServerProxyConfigArrayItem } from '@rspack/core'
import type http from 'node:http'

/** @internal */
export type PathFilter =
  | string
  | ((pathname: string, req: http.IncomingMessage) => boolean | string | RegExpMatchArray | null)

/** @internal */
export type HttpProxyPlugin = NonNullable<
  (DevServerProxyConfigArrayItem & ProxyOptions)['plugins']
>[number]

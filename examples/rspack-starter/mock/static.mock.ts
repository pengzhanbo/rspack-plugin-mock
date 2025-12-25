import { createReadStream } from 'node:fs'
import path from 'node:path'
import * as mime from 'mime-types'
import { defineMock } from 'rspack-plugin-mock/helper'

/**
 * 模拟一个 静态资源服务
 */
export default defineMock({
  url: '/static/*filepath',
  method: 'GET',
  headers(request) {
    const filepath = request.params.filepath.join('/')
    const filename = path.basename(filepath)
    return {
      'Content-Type': mime.lookup(filename) || 'text/plain',
    }
  },
  body(request) {
    const { filepath } = request.params
    return createReadStream(path.join(import.meta.dirname, 'static', filepath))
  },
})

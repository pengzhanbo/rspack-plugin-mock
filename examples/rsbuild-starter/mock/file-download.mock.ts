import { createReadStream } from 'node:fs'
import { join } from 'node:path'
import { defineMock } from 'rspack-plugin-mock/helper'

export default defineMock({
  url: '/api/file-download',
  type: 'shared.js',
  // response file read stream
  body: () => createReadStream(join(import.meta.dirname, 'shared.ts')),
})

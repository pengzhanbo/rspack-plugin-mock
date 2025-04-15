import type { Options } from 'tsup'
import { promises as fsp } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import fg from 'fast-glob'
import { defineConfig } from 'tsup'

const shared: Options = {
  dts: true,
  splitting: true,
  clean: true,
  shims: false,
}

const snippet = 'const result = await Promise.resolve().then(() => _interopRequireWildcard(require(fileUrl)));'

export default defineConfig([{
  ...shared,
  entry: ['src/json5-loader.cts'],
  format: 'cjs',
  dts: false,
}, {
  ...shared,
  entry: ['src/{index,rsbuild,helper,server}.ts'],
  format: ['cjs', 'esm'],
  onSuccess: async () => {
    const files = await fg('dist/chunk-*.cjs', { cwd: process.cwd() })
    for (const file of files) {
      const filepath = path.join(process.cwd(), file)
      const content = await fsp.readFile(filepath, 'utf-8')
      if (content.includes(snippet)) {
        await fsp.writeFile(filepath, content.replace(snippet, 'const result = await import(fileUrl);'), 'utf-8')
      }
    }
  },
}])

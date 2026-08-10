import type { UserConfig } from 'tsdown'
import fs from 'node:fs/promises'
import parse from 'js-tokens'
import { defineConfig } from 'tsdown'

const config: UserConfig[] = defineConfig([{
  entry: ['src/json5-loader.ts'],
  format: 'esm',
  dts: false,
}, {
  entry: {
    index: 'src/index.ts',
    rsbuild: 'src/rsbuild.ts',
    helper: 'src/helpers/index.ts',
    server: 'src/server.ts',
  },
  format: 'esm',
  shims: true,
  sourcemap: false,
  dts: true,
  fixedExtension: false,
  async onSuccess(config) {
    for await (const file of fs.glob('*.js', { cwd: config.outDir })) {
      const filepath = `${config.outDir}/${file}`
      const code = await fs.readFile(filepath, 'utf-8')
      await fs.writeFile(filepath, strip(code))
    }
  },
}])

function strip(code: string): string {
  let result = ''
  const tokens = parse(code)
  for (const token of tokens) {
    if (token.type === 'MultiLineComment' || token.type === 'SingleLineComment') {
      continue
    }
    result += token.value
  }
  return result
}

export default config

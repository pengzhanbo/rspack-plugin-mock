import type { UserConfig } from 'tsdown'
import fs from 'node:fs/promises'
import parse from 'js-tokens'
import { defineConfig } from 'tsdown'

const config: UserConfig[] = defineConfig([
  {
    entry: ['src/json5-loader.ts'],
    format: 'esm',
    dts: false,
  },
  {
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
    exports: true,
    fixedExtension: false,
    async onSuccess(resolvedConfig): Promise<void> {
      for await (const file of fs.glob('*.js', { cwd: resolvedConfig.outDir })) {
        const filepath = `${resolvedConfig.outDir}/${file}`
        const code = await fs.readFile(filepath, 'utf-8')
        await fs.writeFile(filepath, strip(code))
      }
    },
  },
])

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

import type { UserConfig } from 'tsdown'
import { defineConfig } from 'tsdown'

const config: UserConfig[] = defineConfig([{
  entry: ['src/json5-loader.cts'],
  format: 'cjs',
  minify: true,
  dts: false,
}, {
  entry: {
    index: 'src/index.ts',
    rsbuild: 'src/rsbuild.ts',
    helper: 'src/helper/index.ts',
    server: 'src/server.ts',
  },
  format: 'esm',
  shims: true,
  sourcemap: false,
  minify: true,
  dts: true,
}])

export default config

import type { UserConfig } from 'tsdown'
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
}])

export default config

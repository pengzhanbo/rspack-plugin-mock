import type { Options } from 'tsdown'
import { defineConfig } from 'tsdown'

export default defineConfig([{
  entry: ['src/json5-loader.cts'],
  format: 'cjs',
  dts: false,
}, {
  entry: ['src/{index,rsbuild,helper,server}.ts'],
  format: ['cjs', 'esm'],
  dts: true,
}]) as Options

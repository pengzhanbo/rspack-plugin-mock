import type { Options } from 'tsup'

export const tsup: Options = {
  entry: [
    'src/{index,rsbuild,json5-loader,helper,server}.ts',
  ],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  clean: true,
  shims: false,
}

import { type Options, defineConfig } from 'tsup'

const shared: Options = {
  dts: true,
  splitting: true,
  clean: true,
  shims: false,
}

export default defineConfig([{
  ...shared,
  entry: [
    'src/{index,rsbuild,helper,server}.ts',
  ],
  format: ['cjs', 'esm'],
}, {
  ...shared,
  entry: ['src/json5-loader.cts'],
  format: 'cjs',
  dts: false,
}])

import type { ResolvePluginOptions } from '../options'
import type { ServerBuildOption } from '../types'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import ansis from 'ansis'
import { glob } from 'tinyglobby'
import { transformWithRspack } from '../compiler'
import { createMatcher } from '../utils'
import { generatePackageJson } from './packageJson'
import { generatorServerEntryCode } from './serverEntryCode'
import { writeMockEntryFile } from './writeEntryFile'

export async function buildMockServer(
  options: ResolvePluginOptions,
  outputDir: string,
): Promise<void> {
  const entryFile = path.resolve(process.cwd(), 'node_modules/.cache/mock-server/mock-server.ts')
  const { pattern, ignore } = createMatcher(options.include, options.exclude)
  const mockFileList = await glob(pattern, { ignore, cwd: path.join(options.cwd, options.dir) })

  await writeMockEntryFile(entryFile, mockFileList, options.cwd, options.dir)

  const { code, externals } = await transformWithRspack({
    entryFile,
    cwd: options.cwd,
    plugins: options.plugins,
    alias: options.alias,
  })
  await fsp.unlink(entryFile)
  const outputList: { filename: string, source: string }[] = [
    { filename: 'mock-data.js', source: code },
    { filename: 'index.js', source: generatorServerEntryCode(options) },
    { filename: 'package.json', source: generatePackageJson(options, externals) },
  ]
  const dist = path.resolve(outputDir, (options.build as ServerBuildOption).dist!)
  options.logger.info(
    `${ansis.green('✓')} generate mock server in ${ansis.cyan(path.relative(process.cwd(), dist))}`,
  )

  if (!fs.existsSync(dist)) {
    await fsp.mkdir(dist, { recursive: true })
  }

  for (const { filename, source } of outputList) {
    await fsp.writeFile(path.join(dist, filename), source, 'utf8')
    const sourceSize = (source.length / 1024).toFixed(2)
    const space = filename.length < 24 ? ' '.repeat(24 - filename.length) : ''
    options.logger.info(` ${ansis.green(filename)}${space}${ansis.bold.dim(`${sourceSize} kB`)}`)
  }
}

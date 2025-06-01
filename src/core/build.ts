import type { ServerBuildOption } from '../types'
import type { ResolvePluginOptions } from './resolvePluginOptions'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { toArray } from '@pengzhanbo/utils'
import { createFilter } from '@rollup/pluginutils'
import fg from 'fast-glob'
import color from 'picocolors'
import { transformWithRspack } from './createRspackCompiler'
import { lookupFile, normalizePath, packageDir } from './utils'

export async function buildMockServer(
  options: ResolvePluginOptions,
  outputDir: string,
): Promise<void> {
  const entryFile = path.resolve(process.cwd(), 'node_modules/.cache/mock-server/mock-server.ts')
  const mockFileList = await getMockFileList(options)
  await writeMockEntryFile(entryFile, mockFileList, options.cwd)
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
    `${color.green('✓')} generate mock server in ${color.cyan(path.relative(process.cwd(), dist))}`,
  )
  if (!fs.existsSync(dist)) {
    await fsp.mkdir(dist, { recursive: true })
  }
  for (const { filename, source } of outputList) {
    await fsp.writeFile(path.join(dist, filename), source, 'utf8')
    const sourceSize = (source.length / 1024).toFixed(2)
    const space = filename.length < 24 ? ' '.repeat(24 - filename.length) : ''
    options.logger.info(` ${color.green(filename)}${space}${color.bold(color.dim(`${sourceSize} kB`))}`)
  }
}

function generatePackageJson(options: ResolvePluginOptions, externals: string[]): string {
  const deps = getHostDependencies(options.cwd)
  const { name, version } = getPluginPackageInfo()
  const exclude: string[] = [name, 'connect', 'cors']
  const mockPkg = {
    name: 'mock-server',
    type: 'module',
    scripts: {
      start: 'node index.js',
    },
    dependencies: {
      connect: '^3.7.0',
      [name]: `^${version}`,
      cors: '^2.8.5',
    } as Record<string, string>,
  }
  externals.filter(dep => !exclude.includes(dep)).forEach((dep) => {
    mockPkg.dependencies[dep] = deps[dep] || 'latest'
  })
  return JSON.stringify(mockPkg, null, 2)
}

function generatorServerEntryCode({
  proxies,
  wsPrefix,
  cookiesOptions,
  bodyParserOptions,
  priority,
  build,
}: ResolvePluginOptions): string {
  const { serverPort, log } = build as ServerBuildOption
  return `import { createServer } from 'node:http';
import connect from 'connect';
import corsMiddleware from 'cors';
import { 
  baseMiddleware,
  createLogger,
  mockWebSocket,
  transformMockData,
  transformRawData
} from 'rspack-plugin-mock/server';
import rawData from './mock-data.js';

const app = connect();
const server = createServer(app);
const logger = createLogger('mock-server', '${log}');
const proxies = ${JSON.stringify(proxies)};
const wsProxies = ${JSON.stringify(toArray(wsPrefix))};
const cookiesOptions = ${JSON.stringify(cookiesOptions)};
const bodyParserOptions = ${JSON.stringify(bodyParserOptions)};
const priority = ${JSON.stringify(priority)};
const mockConfig = { 
  mockData: transformMockData(transformRawData(rawData)),
  on: () => {},
};

mockWebSocket(mockConfig, server, { wsProxies, cookiesOptions, logger });

app.use(corsMiddleware());
app.use(baseMiddleware(mockConfig, {
  formidableOptions: { multiples: true },
  proxies,
  priority,
  cookiesOptions,
  bodyParserOptions,
  logger,
}));

server.listen(${serverPort});

console.log('listen: http://localhost:${serverPort}');
`
}

async function getMockFileList({ cwd, include, exclude }: {
  cwd: string
  include: string | string[]
  exclude: string | string[]
}): Promise<string[]> {
  const filter = createFilter(include, exclude, { resolve: false })
  return await fg(include, { cwd }).then(files => files.filter(filter))
}

export async function writeMockEntryFile(entryFile: string, files: string[], cwd: string): Promise<void> {
  const importers: string[] = []
  const exporters: string[] = []
  for (const [index, filepath] of files.entries()) {
    const file = normalizePath(path.join(cwd, filepath))
    importers.push(`import * as m${index} from '${file}'`)
    exporters.push(`[m${index}, '${filepath}']`)
  }
  const code = `${importers.join('\n')}\n\nexport default [\n  ${exporters.join(',\n  ')}\n]`
  const dirname = path.dirname(entryFile)

  if (!fs.existsSync(dirname)) {
    await fsp.mkdir(dirname, { recursive: true })
  }
  await fsp.writeFile(entryFile, code, 'utf8')
}

function getPluginPackageInfo() {
  let pkg = {} as Record<string, any>
  try {
    const filepath = path.join(packageDir, '../package.json')
    if (fs.existsSync(filepath)) {
      pkg = JSON.parse(fs.readFileSync(filepath, 'utf8'))
    }
  }
  catch {}

  return {
    name: pkg.name || 'rspack-plugin-mock',
    version: pkg.version || 'latest',
  }
}

function getHostDependencies(context: string): Record<string, string> {
  let pkg = {} as Record<string, any>
  try {
    const content = lookupFile(context, ['package.json'])
    if (content)
      pkg = JSON.parse(content)
  }
  catch {}
  return { ...pkg.dependencies, ...pkg.devDependencies }
}

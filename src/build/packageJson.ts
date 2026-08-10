import type { ResolvePluginOptions } from '../core/options.js'
import { name as __PACKAGE_NAME__, version as __PACKAGE_VERSION__ } from '../../package.json'
import { getPackageDeps } from '../utils/index.js'

export function generatePackageJson(options: ResolvePluginOptions, externals: string[]): string {
  const deps = getPackageDeps(options.context)

  const exclude: string[] = [__PACKAGE_NAME__, 'connect', 'cors']
  const mockPkg = {
    name: 'mock-server',
    type: 'module',
    scripts: {
      start: 'node index.js',
    },
    dependencies: {
      connect: '^3.7.0',
      [__PACKAGE_NAME__]: `^${__PACKAGE_VERSION__}`,
      cors: '^2.8.5',
    } as Record<string, string>,
  }
  externals
    .filter((dep) => !exclude.includes(dep))
    .forEach((dep) => {
      mockPkg.dependencies[dep] = deps[dep] || 'latest'
    })
  return JSON.stringify(mockPkg, null, 2)
}

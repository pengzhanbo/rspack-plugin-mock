import { uniq } from '@pengzhanbo/utils'
import { loadPackageJSONSync } from 'local-pkg'

export function getPackageDeps(cwd?: string): Record<string, string> {
  const { dependencies, devDependencies, peerDependencies, optionalDependencies } = loadPackageJSONSync(cwd) || {}
  const deps = { ...dependencies, ...devDependencies, ...peerDependencies, ...optionalDependencies }
  return deps
}

export function getPackageDepList(cwd?: string): string[] {
  const deps = getPackageDeps(cwd)
  return uniq(Object.keys(deps))
}

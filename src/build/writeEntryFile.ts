import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { normalizePath } from '../utils'

export async function writeMockEntryFile(
  entryFile: string,
  files: string[],
  cwd: string,
  dir: string,
): Promise<void> {
  const importers: string[] = []
  const exporters: string[] = []
  for (const [index, filepath] of files.entries()) {
    const relative = normalizePath(path.join(dir, filepath))
    const file = normalizePath(path.join(cwd, relative))
    importers.push(`import * as m${index} from '${file}'`)
    exporters.push(`[m${index}, '${relative}']`)
  }
  const code = `${importers.join('\n')}\n\nexport default [\n  ${exporters.join(',\n  ')}\n]`
  const dirname = path.dirname(entryFile)

  if (!fs.existsSync(dirname)) {
    await fsp.mkdir(dirname, { recursive: true })
  }
  await fsp.writeFile(entryFile, code, 'utf8')
}

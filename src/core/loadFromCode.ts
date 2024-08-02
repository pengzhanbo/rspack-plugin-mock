import path from 'node:path'
import fs, { promises as fsp } from 'node:fs'

interface LoadFromCodeOptions {
  filepath: string
  code: string
  isESM: boolean
  cwd: string
}

export async function loadFromCode<T = any>({
  filepath,
  code,
  isESM,
  cwd,
}: LoadFromCodeOptions): Promise<T> {
  filepath = path.resolve(cwd, filepath)
  const fileBase = `${filepath}.timestamp-${Date.now()}`
  const ext = isESM ? '.mjs' : '.cjs'
  const fileNameTmp = `${fileBase}${ext}`
  await fsp.writeFile(fileNameTmp, code, 'utf8')
  try {
    const result = await import(fileNameTmp)
    return result.default || result
  }
  finally {
    try {
      fs.unlinkSync(fileNameTmp)
    }
    catch {}
  }
}

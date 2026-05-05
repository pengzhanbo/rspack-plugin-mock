import JSON5 from 'json5'

export default function json5Loader(content: string): string {
  if (!content)
    return 'export default {}'

  return `export default ${JSON.stringify(JSON5.parse(content))}`
}

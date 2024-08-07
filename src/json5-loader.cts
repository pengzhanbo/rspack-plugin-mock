import JSON5 from 'json5'

module.exports = function (content: string): string {
  if (!content)
    return 'export default {}'

  return `export default ${JSON.stringify(JSON5.parse(content))}`
}

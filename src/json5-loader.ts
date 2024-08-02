import JSON5 from 'json5'
import type { LoaderDefinitionFunction } from '@rspack/core'

const json5Loader: LoaderDefinitionFunction = function (content) {
  if (!content)
    return 'export default {}'

  return `export default ${JSON.stringify(JSON5.parse(content))}`
}

export default json5Loader

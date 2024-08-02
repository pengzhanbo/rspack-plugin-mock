import { defineMock } from 'rspack-plugin-mock/helper'

export default defineMock({
  url: '/api/es-module-js',
  body: {
    message: 'Write mock configuration using a ESModule js file.',
  },
})

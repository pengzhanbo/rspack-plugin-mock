import { defineMock } from 'rspack-plugin-mock/helper'

export default defineMock([
  {
    url: '/api/typescript',
    body: {
      message: 'Write mock configuration using a typescript file.',
    },
  },
])

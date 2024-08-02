import { defineMock } from 'rspack-plugin-mock/helper'

export default defineMock({
  url: '/api/javascript',
  body: {
    message: 'Write mock configuration using a js file.',
  },
})

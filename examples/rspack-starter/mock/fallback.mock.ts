import { defineMock } from 'rspack-plugin-mock/helper'

export default defineMock({
  url: '/api/(.*)',
  body: {
    message: 'This request fallback',
  },
})

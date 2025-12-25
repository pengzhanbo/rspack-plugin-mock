import { defineMock } from 'rspack-plugin-mock/helper'

export default defineMock({
  url: '/api{/*rest}',
  body: {
    message: 'This request fallback',
  },
})

import { defineMock } from 'rspack-plugin-mock/helper'

export default defineMock({
  url: '/api/fail',
  status: 404,
})

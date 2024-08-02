import { defineMock } from 'rspack-plugin-mock/helper'

export default defineMock({
  url: '/api-dev/list/get',
  body: {
    message: 'api-dev list get',
  },
})

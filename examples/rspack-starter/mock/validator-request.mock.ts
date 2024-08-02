import { defineMock } from 'rspack-plugin-mock/helper'

export default defineMock([
  {
    url: '/api/validator-check-cookie',
    validator(request) {
      const token = request.getCookie('token')
      return !token
    },
    body: {
      message: 'token expired.',
    },
  },
  {
    url: '/api/validator-body-include',
    validator(request) {
      const ids = request.body.ids || []
      return !ids.includes('1001')
    },
    body: {
      code: 200,
      message: 'ids must be include 1001',
    },
  },
])

import { defineMock } from 'rspack-plugin-mock/helper'

export default defineMock([
  {
    url: '/api/only-get-method',
    method: 'GET',
    body: {
      message: 'Only get request methods are allowed',
    },
  },
  {
    url: '/api/allow-get-and-post',
    method: ['GET', 'POST'],
    body: {
      message: 'Allow get and post request methods',
    },
  },
])

import { defineMock } from 'rspack-plugin-mock/helper'

export default defineMock([
  {
    url: '/api/post-update',
    validator: {
      body: {
        shouldUpdate: true,
      },
    },
    body: {
      code: 200,
      message: 'success',
      result: { updated: true },
    },
  },
  {
    url: '/api/post-update',
    validator: {
      body: {
        shouldUpdate: false,
      },
    },
    body: {
      code: 200,
      message: 'success',
      result: { updated: false },
    },
  },
])

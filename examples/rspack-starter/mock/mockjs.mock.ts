import Mock from 'mockjs'
import { defineMock } from 'rspack-plugin-mock/helper'

export default defineMock({
  url: '/api/mockjs',
  body: Mock.mock({
    'list|1-10': [
      {
        'id|+1': 1,
      },
    ],
  }),
})

import post from './data/post.js'
import { defineAPIMock } from './shared.js'

/**
 * 定义单个接口
 */
export const fetchPostList = defineAPIMock({
  url: '/post/delete/:index',
  method: 'POST',
  body({ params }) {
    post.splice(params.index, 1)
    return {
      code: 200,
      message: 'success',
      result: {
        list: post,
      },
    }
  },
})

import { deepClone, deepEqual, isFunction } from '@pengzhanbo/utils'

const mockDataCache = new Map<string, CacheImpl<any>>()
const responseCache = new WeakMap<CacheImpl, MockData>()
const staleInterval = 70

class CacheImpl<T = any> {
  value: T
  // 初始化数据的备份，用于 判断 传入的初始化数据是否发生变更
  #initialValue: T
  #lastUpdate: number

  constructor(value: T) {
    this.value = value
    this.#initialValue = deepClone(value)
    this.#lastUpdate = Date.now()
  }

  hotUpdate(value: T) {
    // 用于针对重复编译时，如果是通过 `mockjs` 或 `faker-js` 等
    // 生成的随机数据，由于随机性带来的可能的不同mock文件关联的接口数据不一致的情况
    // 由于编译加载的时间必然远小于用户修改的间隔，因此这里设置了一个缓存时间
    if (Date.now() - this.#lastUpdate < staleInterval)
      return

    // 文件变更重新编译加载后，当 两个初始化的数据 不相等时，
    // 重新初始化为新的编译后的数据
    if (!deepEqual(value, this.#initialValue)) {
      this.value = value
      this.#initialValue = deepClone(value)
      this.#lastUpdate = Date.now()
    }
  }
}

export type MockData<T = any> = readonly [
  /**
   * getter
   */
  () => T,
  /**
   * setter
   */
  (val: T | ((val: T) => T | void)) => void,
] & {
  value: T
}

export function defineMockData<T = any>(
  key: string,
  initialData: T,
): MockData<T> {
  if (!mockDataCache.has(key))
    mockDataCache.set(key, new CacheImpl(initialData))

  const cache = mockDataCache.get(key)! as CacheImpl<T>

  cache.hotUpdate(initialData)

  if (responseCache.has(cache))
    return responseCache.get(cache)!

  const res = [
    () => cache.value,
    (val) => {
      if (isFunction(val))
        val = val(cache.value) ?? cache.value

      cache.value = val
    },
  ] as const as MockData<T>

  Object.defineProperty(res, 'value', {
    get() {
      return cache.value
    },

    set(val: T) {
      cache.value = val
    },
  })

  responseCache.set(cache, res)

  return res
}

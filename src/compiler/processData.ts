import type { MockHttpItem, MockOptions, MockWebsocketItem } from '../types'
import {
  isEmptyObject,
  isFunction,
  isPlainObject,
  sortBy,
  toArray,
} from '@pengzhanbo/utils'
import { isObjectSubset, urlParse } from '../utils'

export function processRawData(
  rawData: (readonly [any, string])[],
): (MockHttpItem | MockWebsocketItem | MockOptions)[] {
  return rawData.filter(item => item[0]).map(([raw, __filepath__]) => {
    let mockConfig
    if (raw.default) {
      if (Array.isArray(raw.default)) {
        mockConfig = raw.default.map((item: any) => ({ ...item, __filepath__ }))
      }
      else {
        mockConfig = { ...raw.default, __filepath__ }
      }
    }
    else if ('url' in raw) {
      mockConfig = { ...raw, __filepath__ }
    }
    else {
      mockConfig = []
      Object.keys(raw || {}).forEach((key) => {
        if (Array.isArray(raw[key])) {
          mockConfig.push(...raw[key].map(item => ({ ...item, __filepath__ })))
        }
        else {
          mockConfig.push({ ...raw[key], __filepath__ })
        }
      })
    }
    return mockConfig
  })
}

export function processMockData(
  mockList: (MockHttpItem | MockWebsocketItem | MockOptions)[],
): Record<string, MockOptions> {
  const list: MockOptions = []
  for (const [, handle] of mockList.entries()) {
    if (handle)
      list.push(...toArray(handle))
  }

  const mocks: Record<string, MockOptions> = {}

  list
    .filter(mock => isPlainObject(mock) && mock.enabled !== false && mock.url)
    .forEach((mock) => {
      const { pathname, query } = urlParse(mock.url)
      const list = (mocks[pathname!] ??= [])

      const current = { ...mock, url: pathname! }
      if (current.ws !== true) {
        const validator = current.validator
        if (!isEmptyObject(query)) {
          if (isFunction(validator)) {
            current.validator = function (request) {
              return isObjectSubset(request.query, query) && validator(request)
            }
          }
          else if (validator) {
            current.validator = { ...validator }
            current.validator.query = current.validator.query
              ? { ...query, ...current.validator.query }
              : query
          }
          else {
            current.validator = { query }
          }
        }
      }
      list.push(current)
    })

  Object.keys(mocks).forEach((key) => {
    mocks[key] = sortByValidator(mocks[key])
  })
  return mocks
}

export function sortByValidator(mocks: MockOptions): (MockHttpItem | MockWebsocketItem)[] {
  return sortBy(mocks, (item) => {
    if (item.ws === true)
      return 0
    const { validator } = item
    // fix: #28
    if (!validator || isEmptyObject(validator))
      return 2
    if (isFunction(validator))
      return 0
    const count = Object.keys(validator).reduce(
      (prev, key) => prev + keysCount(validator[key as keyof typeof validator]),
      0,
    )
    return 1 / count
  })
}

function keysCount(obj?: object): number {
  if (!obj)
    return 0
  return Object.keys(obj).length
}

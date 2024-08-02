import {
  isEmptyObject,
  isFunction,
  isObject,
  sortBy,
  toArray,
} from '@pengzhanbo/utils'
import type { MockHttpItem, MockOptions, MockWebsocketItem } from '../types'
import { urlParse } from './utils'
import { isObjectSubset } from './validator'

export function transformMockData(
  mockList:
    | Map<string, MockHttpItem | MockWebsocketItem | MockOptions>
    | (MockHttpItem | MockWebsocketItem | MockOptions)[],
) {
  const list: MockOptions = []
  for (const [, handle] of mockList.entries()) {
    if (handle)
      list.push(...toArray(handle))
  }

  const mocks: Record<string, MockOptions> = {}

  list
    .filter(mock => isObject(mock) && mock.enabled !== false && mock.url)
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

export function sortByValidator(mocks: MockOptions) {
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

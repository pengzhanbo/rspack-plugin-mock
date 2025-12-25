export function waitingFor<T>(
  onSuccess: (value: T) => void,
  maxRetry = 5,
): (getter: () => T | null | undefined, retry?: number) => void {
  return function wait(getter, retry = 0) {
    const value = getter()
    if (value) {
      onSuccess(value)
    }
    else if (retry < maxRetry) {
      setTimeout(() => wait(getter, retry + 1), 100)
    }
  }
}

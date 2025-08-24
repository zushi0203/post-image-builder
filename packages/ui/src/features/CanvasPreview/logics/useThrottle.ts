import { useRef, useCallback } from 'react'

/**
 * スロットリング処理を提供するフック
 */
export const useThrottle = <T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T => {
  const lastCall = useRef<number>(0)
  const timeoutId = useRef<number | null>(null)

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now()

    // クリアが必要な場合はタイムアウトをクリア
    if (timeoutId.current) {
      clearTimeout(timeoutId.current)
      timeoutId.current = null
    }

    // 前回の実行から十分な時間が経過している場合は即座に実行
    if (now - lastCall.current >= delay) {
      lastCall.current = now
      callback(...args)
    } else {
      // そうでなければ遅延実行
      const remainingTime = delay - (now - lastCall.current)
      timeoutId.current = window.setTimeout(() => {
        lastCall.current = Date.now()
        callback(...args)
        timeoutId.current = null
      }, remainingTime)
    }
  }, [callback, delay]) as T
}

/**
 * デバウンス処理を提供するフック
 */
export const useDebounce = <T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T => {
  const timeoutId = useRef<number | null>(null)

  return useCallback((...args: Parameters<T>) => {
    // 前回のタイムアウトをクリア
    if (timeoutId.current) {
      clearTimeout(timeoutId.current)
    }

    // 新しいタイムアウトを設定
    timeoutId.current = window.setTimeout(() => {
      callback(...args)
      timeoutId.current = null
    }, delay)
  }, [callback, delay]) as T
}
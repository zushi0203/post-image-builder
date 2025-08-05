import type { GifFrame, GifInfo } from './types.js'

/**
 * GIF情報を読みやすい形式でログ出力
 */
export function logGifInfo(gifInfo: GifInfo): void {
  console.group(`🎬 GIF Information`)
  console.log(`📐 Size: ${gifInfo.width}×${gifInfo.height}px`)
  console.log(`🔄 Loop Count: ${gifInfo.loopCount === 0 ? 'Infinite' : gifInfo.loopCount}`)
  console.log(`⏱️  Total Duration: ${gifInfo.totalDuration}ms (${(gifInfo.totalDuration / 1000).toFixed(1)}s)`)
  console.log(`🎞️  Frame Count: ${gifInfo.frames.length}`)
  
  if (gifInfo.frames.length > 0) {
    console.group(`📋 Frame Details`)
    gifInfo.frames.forEach((frame, index) => {
      console.log(`Frame ${index}: ${frame.width}×${frame.height}px, ${frame.delay}ms delay`)
    })
    console.groupEnd()
  }
  console.groupEnd()
}

/**
 * フレームレートを計算
 */
export function calculateFrameRate(frames: GifFrame[]): number {
  if (frames.length === 0) return 0
  
  const totalDelay = frames.reduce((sum, frame) => sum + frame.delay, 0)
  const averageDelay = totalDelay / frames.length
  
  // FPS = 1000ms / 平均遅延時間
  return Math.round(1000 / averageDelay * 100) / 100
}

/**
 * ファイルサイズを人間が読める形式に変換
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

/**
 * フレームデータの統計情報を取得
 */
export function getFrameStats(frames: GifFrame[]): {
  minDelay: number
  maxDelay: number
  avgDelay: number
  totalSize: number
  uniqueSizes: Array<{ width: number; height: number; count: number }>
} {
  if (frames.length === 0) {
    return {
      minDelay: 0,
      maxDelay: 0,
      avgDelay: 0,
      totalSize: 0,
      uniqueSizes: []
    }
  }
  
  const delays = frames.map(f => f.delay)
  const minDelay = Math.min(...delays)
  const maxDelay = Math.max(...delays)
  const avgDelay = delays.reduce((sum, delay) => sum + delay, 0) / delays.length
  
  // サイズの統計
  const sizeMap = new Map<string, { width: number; height: number; count: number }>()
  let totalSize = 0
  
  frames.forEach(frame => {
    const key = `${frame.width}x${frame.height}`
    const existing = sizeMap.get(key)
    
    if (existing) {
      existing.count++
    } else {
      sizeMap.set(key, { width: frame.width, height: frame.height, count: 1 })
    }
    
    totalSize += frame.width * frame.height * 4 // RGBA = 4 bytes per pixel
  })
  
  return {
    minDelay,
    maxDelay,
    avgDelay: Math.round(avgDelay * 100) / 100,
    totalSize,
    uniqueSizes: Array.from(sizeMap.values())
  }
}

/**
 * プログレス表示用のユーティリティ
 */
export function createProgressBar(current: number, total: number, width: number = 30): string {
  const progress = Math.min(current / total, 1)
  const filled = Math.floor(progress * width)
  const empty = width - filled
  
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  const percentage = Math.round(progress * 100)
  
  return `${bar} ${percentage}%`
}

/**
 * フレームをPNG画像としてダウンロード
 */
export function downloadFrame(frame: GifFrame, fileName?: string): void {
  frame.canvas.toBlob((blob) => {
    if (!blob) {
      console.error('Failed to create blob from canvas')
      return
    }
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName || `${frame.id}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  })
}

/**
 * 全フレームをZipファイルとしてダウンロード（将来的な機能拡張用）
 */
export async function downloadAllFrames(frames: GifFrame[], baseName: string = 'frames'): Promise<void> {
  console.log('Downloading all frames feature not implemented yet')
  // TODO: JSZipなどのライブラリを使用してZipファイル作成
}
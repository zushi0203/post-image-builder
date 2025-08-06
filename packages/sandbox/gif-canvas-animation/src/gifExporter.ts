// @ts-ignore - gif.js doesn't have proper TypeScript definitions
import GIF from 'gif.js'
import type { GifInfo } from './types.js'
import { drawFrame } from './animation.js'

export interface ExportOptions {
  quality?: number
  workers?: number
  workerScript?: string
}

export const exportToGif = async (
  gifInfo: GifInfo,
  options: ExportOptions = {}
): Promise<Blob> => {
  const { quality = 10, workers = 2, workerScript = '/node_modules/gif.js/dist/gif.worker.js' } = options

  return new Promise((resolve, reject) => {
    try {
      // GIF.js インスタンス作成
      const gif = new GIF({
        workers,
        quality,
        workerScript,
        width: 500,
        height: 500
      })

      // 各フレームを500x500のCanvasに描画してGIFに追加
      gifInfo.frames.forEach((frame) => {
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = 500
        tempCanvas.height = 500

        // フレームを500x500のCanvasに描画
        drawFrame(tempCanvas, frame)

        // GIFにフレーム追加
        gif.addFrame(tempCanvas, {
          delay: frame.delay,
          copy: true
        })
      })

      // GIF生成完了時のイベント
      gif.on('finished', (blob: Blob) => {
        console.log('✅ GIF export completed')
        resolve(blob)
      })

      // エラーハンドリング
      gif.on('error', (error: Error) => {
        console.error('❌ GIF export error:', error)
        reject(error)
      })

      // 進捗表示
      gif.on('progress', (progress: number) => {
        console.log(`🔄 GIF export progress: ${Math.round(progress * 100)}%`)
      })

      console.log(`🚀 Starting GIF export: ${gifInfo.frames.length} frames`)
      
      // GIF生成開始
      gif.render()
      
    } catch (error) {
      console.error('❌ GIF export setup error:', error)
      reject(error)
    }
  })
}

export const downloadGif = (blob: Blob, filename: string = 'animation.gif'): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  console.log(`💾 GIF downloaded: ${filename}`)
}
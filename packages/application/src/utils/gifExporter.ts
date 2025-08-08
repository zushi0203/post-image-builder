// @ts-ignore - gif.js doesn't have proper TypeScript definitions
import GIF from 'gif.js'
import type { ImageLayer, CanvasSettings } from '../store/types'

export interface GifExportOptions {
  quality?: number
  workers?: number
  workerScript?: string
}

export interface GifExportProgress {
  current: number
  total: number
  phase: 'analyzing' | 'rendering' | 'encoding'
}

/**
 * 出力領域の座標を計算（CanvasPreviewConstants相当）
 */
const CANVAS_CONSTANTS = {
  OUTPUT_SIZE: {
    WIDTH: 500,
    HEIGHT: 500,
  },
  OPACITY: {
    OUTSIDE_FRAME: 0.3,
  },
} as const

/**
 * 描画用の画像ソースを取得（GIF対応）
 */
const getImageSource = (layer: ImageLayer): CanvasImageSource | null => {
  if (layer.type === 'gif' && layer.gifInfo && layer.gifInfo.frames.length > 0) {
    const frameIndex = layer.currentFrameIndex || 0
    const validIndex = Math.max(0, Math.min(frameIndex, layer.gifInfo.frames.length - 1))
    const currentFrame = layer.gifInfo.frames[validIndex]
    return currentFrame ? currentFrame.canvas : layer.imageData
  }
  
  return layer.imageData
}

/**
 * 画像ソースのサイズを取得
 */
const getImageSize = (imageSource: CanvasImageSource): { width: number; height: number } => {
  if (imageSource instanceof HTMLImageElement) {
    return {
      width: imageSource.naturalWidth,
      height: imageSource.naturalHeight
    }
  } else if (imageSource instanceof HTMLCanvasElement) {
    return {
      width: imageSource.width,
      height: imageSource.height
    }
  }
  
  return { width: 0, height: 0 }
}

/**
 * レイヤーから最大アニメーションフレーム数を取得
 */
const getMaxFrameCount = (layers: ImageLayer[]): number => {
  const gifLayers = layers.filter(layer => layer.type === 'gif' && layer.gifInfo)
  if (gifLayers.length === 0) return 1

  return Math.max(...gifLayers.map(layer => layer.gifInfo?.frames.length || 1))
}

/**
 * 特定フレーム時点でのレイヤー状態を取得
 */
const getLayerStateAtFrame = (layer: ImageLayer, frameIndex: number): ImageLayer => {
  if (layer.type !== 'gif' || !layer.gifInfo) {
    return layer
  }

  const totalFrames = layer.gifInfo.frames.length
  if (totalFrames === 0) return layer

  const currentFrameIndex = frameIndex % totalFrames

  return {
    ...layer,
    currentFrameIndex
  }
}

/**
 * フレームの遅延時間を取得
 */
const getFrameDelay = (layers: ImageLayer[], frameIndex: number): number => {
  const gifLayers = layers.filter(layer => layer.type === 'gif' && layer.gifInfo)
  if (gifLayers.length === 0) return 1000

  const delays = gifLayers.map(layer => {
    const frames = layer.gifInfo!.frames
    if (frames.length === 0) return 1000
    
    const currentFrame = frames[frameIndex % frames.length]
    return currentFrame.delay
  })

  return Math.min(...delays)
}

/**
 * 単一レイヤーをCanvasに描画（シンプル版）
 */
const drawLayerToCanvas = (
  ctx: CanvasRenderingContext2D,
  layer: ImageLayer,
  canvasWidth: number,
  canvasHeight: number
): void => {
  if (!layer.visible) return

  const imageSource = getImageSource(layer)
  if (!imageSource) return

  const { width, height } = getImageSize(imageSource)
  const scaledWidth = width * layer.scale
  const scaledHeight = height * layer.scale

  // GIFフレームの場合、フレーム位置オフセットを適用
  let offsetX = 0
  let offsetY = 0
  
  if (layer.type === 'gif' && layer.gifInfo && layer.gifInfo.frames.length > 0) {
    const frameIndex = layer.currentFrameIndex || 0
    const validIndex = Math.max(0, Math.min(frameIndex, layer.gifInfo.frames.length - 1))
    const currentFrame = layer.gifInfo.frames[validIndex]
    
    if (currentFrame) {
      const gifWidth = layer.gifInfo.width * layer.scale
      const gifHeight = layer.gifInfo.height * layer.scale
      
      const gifX = layer.position.x - gifWidth / 2
      const gifY = layer.position.y - gifHeight / 2
      
      offsetX = gifX + (currentFrame.left * layer.scale)
      offsetY = gifY + (currentFrame.top * layer.scale)
    }
  }
  
  const x = layer.type === 'gif' ? offsetX : layer.position.x - scaledWidth / 2
  const y = layer.type === 'gif' ? offsetY : layer.position.y - scaledHeight / 2

  ctx.save()
  
  // 回転処理
  if (layer.rotation !== 0) {
    const radians = (layer.rotation * Math.PI) / 180
    ctx.translate(layer.position.x, layer.position.y)
    ctx.rotate(radians)
    ctx.translate(-layer.position.x, -layer.position.y)
  }

  ctx.globalAlpha = layer.opacity
  ctx.drawImage(imageSource, x, y, scaledWidth, scaledHeight)

  ctx.restore()
}

/**
 * 出力サイズのフレームを生成
 */
const renderOutputFrame = (
  layers: ImageLayer[],
  canvasSettings: CanvasSettings,
  frameIndex: number
): HTMLCanvasElement => {
  // 出力サイズのCanvasを作成
  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = canvasSettings.width
  outputCanvas.height = canvasSettings.height

  const outputCtx = outputCanvas.getContext('2d')
  if (!outputCtx) throw new Error('Failed to create output canvas context')

  // 背景色を設定
  if (canvasSettings.backgroundColor) {
    outputCtx.fillStyle = canvasSettings.backgroundColor
    outputCtx.fillRect(0, 0, canvasSettings.width, canvasSettings.height)
  }

  // 大きめの一時Canvasを作成（レイヤー描画用）
  const tempCanvas = document.createElement('canvas')
  const tempWidth = Math.max(canvasSettings.width * 2, 1000)
  const tempHeight = Math.max(canvasSettings.height * 2, 1000)
  tempCanvas.width = tempWidth
  tempCanvas.height = tempHeight

  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) throw new Error('Failed to create temp canvas context')

  // 背景をクリア
  tempCtx.clearRect(0, 0, tempWidth, tempHeight)
  if (canvasSettings.backgroundColor) {
    tempCtx.fillStyle = canvasSettings.backgroundColor
    tempCtx.fillRect(0, 0, tempWidth, tempHeight)
  }

  // フレーム時点でのレイヤー状態を取得
  const frameLayerStates = layers.map(layer => getLayerStateAtFrame(layer, frameIndex))

  // レイヤーをzIndexの順序でソートして描画
  const visibleLayers = frameLayerStates
    .filter(layer => layer.visible && layer.imageData)
    .sort((a, b) => a.zIndex - b.zIndex)

  // 各レイヤーを描画
  visibleLayers.forEach(layer => {
    drawLayerToCanvas(tempCtx, layer, tempWidth, tempHeight)
  })

  // 出力領域を計算（Canvas中央に配置）
  const outputX = (tempWidth - canvasSettings.width) / 2
  const outputY = (tempHeight - canvasSettings.height) / 2

  // 出力領域のみを抽出
  outputCtx.drawImage(
    tempCanvas,
    outputX, outputY, canvasSettings.width, canvasSettings.height,
    0, 0, canvasSettings.width, canvasSettings.height
  )

  return outputCanvas
}

/**
 * レイヤーをGIFにエクスポート
 */
export const exportLayersToGif = async (
  layers: ImageLayer[],
  canvasSettings: CanvasSettings,
  options: GifExportOptions = {},
  onProgress?: (progress: GifExportProgress) => void
): Promise<Blob> => {
  const { 
    quality = 10, 
    workers = 2,
    workerScript = '/gif.worker.js' 
  } = options

  return new Promise((resolve, reject) => {
    try {
      onProgress?.({ current: 0, total: 100, phase: 'analyzing' })

      const maxFrames = getMaxFrameCount(layers)
      console.log(`🎬 Generating GIF: ${maxFrames} frames, ${canvasSettings.width}×${canvasSettings.height}px`)

      onProgress?.({ current: 10, total: 100, phase: 'rendering' })

      // GIF.js インスタンス作成（publicフォルダのworkerScriptを使用）
      const gif = new GIF({
        workers,
        quality,
        workerScript,
        width: canvasSettings.width,
        height: canvasSettings.height
      })

      // 各フレームを生成してGIFに追加
      for (let frameIndex = 0; frameIndex < maxFrames; frameIndex++) {
        const frameCanvas = renderOutputFrame(layers, canvasSettings, frameIndex)
        const frameDelay = getFrameDelay(layers, frameIndex)

        gif.addFrame(frameCanvas, {
          delay: frameDelay,
          copy: true
        })

        const renderProgress = 10 + (frameIndex + 1) / maxFrames * 40
        onProgress?.({ current: renderProgress, total: 100, phase: 'rendering' })
      }

      onProgress?.({ current: 50, total: 100, phase: 'encoding' })

      gif.on('finished', (blob: Blob) => {
        console.log('✅ GIF export completed successfully')
        onProgress?.({ current: 100, total: 100, phase: 'encoding' })
        resolve(blob)
      })

      gif.on('error', (error: Error) => {
        console.error('❌ GIF export error:', error)
        reject(error)
      })

      gif.on('progress', (progress: number) => {
        const encodingProgress = 50 + progress * 50
        onProgress?.({ current: encodingProgress, total: 100, phase: 'encoding' })
      })

      console.log('🚀 Starting GIF encoding...')
      gif.render()
      
    } catch (error) {
      console.error('❌ GIF export setup error:', error)
      reject(error)
    }
  })
}

/**
 * GIFをダウンロード
 */
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
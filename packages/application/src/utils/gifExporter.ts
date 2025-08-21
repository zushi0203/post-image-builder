// @ts-ignore - gif.js doesn't have proper TypeScript definitions
import GIF from 'gif.js'
import type { ImageLayer, CanvasSettings } from '../store/types'

export interface GifExportOptions {
  quality?: number
  workers?: number
  workerScript?: string
  fps?: number // デフォルト29.97fps
}

export interface GifExportProgress {
  current: number
  total: number
  phase: 'analyzing' | 'rendering' | 'encoding'
}

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
 * 出力予定のディレイ情報を計算
 */
export const calculateOutputInfo = (layers: ImageLayer[]) => {
  const maxFrames = getMaxFrameCount(layers)

  if (maxFrames === 0) {
    return {
      hasGifLayers: false,
      frameCount: 0,
      averageDelayMs: 0,
      totalDurationMs: 0,
      estimatedFps: 0
    }
  }

  // 各フレームのディレイを計算
  const frameDelays: number[] = []
  for (let frameIndex = 0; frameIndex < maxFrames; frameIndex++) {
    const delay = getFrameDelay(layers, frameIndex)
    frameDelays.push(delay)
  }

  const totalDuration = frameDelays.reduce((sum, delay) => sum + delay, 0)
  const averageDelay = totalDuration / frameDelays.length
  const estimatedFps = Math.round(1000 / averageDelay * 10) / 10

  // GIFレイヤーが存在するかチェック
  const hasGifLayers = layers.some(layer => layer.type === 'gif' && layer.gifInfo)

  return {
    hasGifLayers,
    frameCount: maxFrames,
    averageDelayMs: Math.round(averageDelay),
    totalDurationMs: Math.round(totalDuration),
    estimatedFps,
    frameDelays // 詳細情報として各フレームのディレイも含める
  }
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
  const DEFAULT_DELAY = Math.round(1000 / 29.97) // 約33ms (29.97fps)
  const MIN_DELAY = 10 // 最小10ms（100fps相当）

  // GIFレイヤーから現在のフレームでの遅延時間を収集
  const gifDelays: number[] = []

  layers.forEach(layer => {
    if (layer.type === 'gif' && layer.gifInfo && layer.gifInfo.frames.length > 0) {
      // 各GIFレイヤーの現在フレームでの遅延時間を取得
      const layerFrameIndex = frameIndex % layer.gifInfo.frames.length
      const currentFrame = layer.gifInfo.frames[layerFrameIndex]
      if (currentFrame && currentFrame.delay > 0) {
        // processFrameで適切に処理された遅延時間をそのまま使用
        gifDelays.push(currentFrame.delay)
      }
    }
  })

  // GIFレイヤーが存在する場合
  if (gifDelays.length > 0) {
    // 複数のGIFがある場合は最小遅延時間を使用（最も頻繁に更新が必要なレイヤーに合わせる）
    const minGifDelay = Math.min(...gifDelays)
    // 最小制限を適用
    return Math.max(minGifDelay, MIN_DELAY)
  }

  // GIFレイヤーが存在しない場合はデフォルトを使用
  return DEFAULT_DELAY
}

/**
 * 単一レイヤーをCanvasに描画（シンプル版）
 */
const drawLayerToCanvas = (
  ctx: CanvasRenderingContext2D,
  layer: ImageLayer,
  tempCanvasWidth: number,
  tempCanvasHeight: number,
  canvasSettings: CanvasSettings
): void => {
  if (!layer.visible) return

  const imageSource = getImageSource(layer)
  if (!imageSource) {
    return
  }

  // 一時canvasの中央を基準とした座標に変換
  const tempCenterX = tempCanvasWidth / 2
  const tempCenterY = tempCanvasHeight / 2

  // 元のcanvasサイズの中央を基準とした座標系から一時canvasへの変換
  const originalCenterX = canvasSettings.width / 2
  const originalCenterY = canvasSettings.height / 2

  // レイヤーの実際の位置を計算（中央からの相対位置として）
  const relativeX = layer.position.x - originalCenterX
  const relativeY = layer.position.y - originalCenterY

  // GIFレイヤーの場合は、GIF全体サイズを基準とした統一計算
  if (layer.type === 'gif' && layer.gifInfo && layer.gifInfo.frames.length > 0) {
    const frameIndex = layer.currentFrameIndex || 0
    const validIndex = Math.max(0, Math.min(frameIndex, layer.gifInfo.frames.length - 1))
    const currentFrame = layer.gifInfo.frames[validIndex]

    if (currentFrame) {
      // GIF全体サイズを基準とした計算（プレビューと統一）
      const gifWidth = layer.gifInfo.width * layer.scale
      const gifHeight = layer.gifInfo.height * layer.scale

      // GIF全体を基準とした中央配置の起点
      const gifX = tempCenterX + relativeX - gifWidth / 2
      const gifY = tempCenterY + relativeY - gifHeight / 2

      // フレームのオフセット位置（スケール適用）
      const frameOffsetX = gifX + (currentFrame.left * layer.scale)
      const frameOffsetY = gifY + (currentFrame.top * layer.scale)

      // フレーム固有のサイズを取得
      const { width: frameWidth, height: frameHeight } = getImageSize(imageSource)
      const scaledFrameWidth = frameWidth * layer.scale
      const scaledFrameHeight = frameHeight * layer.scale

      console.log(`🎬 GIF Frame ${frameIndex}: GIF(${layer.gifInfo.width}×${layer.gifInfo.height}), Frame(${frameWidth}×${frameHeight}), Offset(${currentFrame.left}, ${currentFrame.top})`)

      ctx.save()

      // 回転処理（回転中心はGIF全体の中心）
      if (layer.rotation !== 0) {
        const radians = (layer.rotation * Math.PI) / 180
        const rotationCenterX = tempCenterX + relativeX
        const rotationCenterY = tempCenterY + relativeY
        ctx.translate(rotationCenterX, rotationCenterY)
        ctx.rotate(radians)
        ctx.translate(-rotationCenterX, -rotationCenterY)
      }

      ctx.globalAlpha = layer.opacity
      ctx.drawImage(imageSource, frameOffsetX, frameOffsetY, scaledFrameWidth, scaledFrameHeight)
      ctx.restore()
    }
  } else {
    // 通常の画像レイヤーの場合
    const { width, height } = getImageSize(imageSource)
    const scaledWidth = width * layer.scale
    const scaledHeight = height * layer.scale

    const finalX = tempCenterX + relativeX - scaledWidth / 2
    const finalY = tempCenterY + relativeY - scaledHeight / 2

    ctx.save()

    // 回転処理
    if (layer.rotation !== 0) {
      const radians = (layer.rotation * Math.PI) / 180
      const rotationCenterX = tempCenterX + relativeX
      const rotationCenterY = tempCenterY + relativeY
      ctx.translate(rotationCenterX, rotationCenterY)
      ctx.rotate(radians)
      ctx.translate(-rotationCenterX, -rotationCenterY)
    }

    ctx.globalAlpha = layer.opacity
    ctx.drawImage(imageSource, finalX, finalY, scaledWidth, scaledHeight)
    ctx.restore()
  }
}

/**
 * 出力サイズのフレームを生成
 */
const renderOutputFrame = (
  layers: ImageLayer[],
  canvasSettings: CanvasSettings,
  frameIndex: number
): HTMLCanvasElement => {


  // 出力サイズは固定1280x720px
  const OUTPUT_WIDTH = 1280
  const OUTPUT_HEIGHT = 720

  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = OUTPUT_WIDTH
  outputCanvas.height = OUTPUT_HEIGHT

  const outputCtx = outputCanvas.getContext('2d')
  if (!outputCtx) throw new Error('Failed to create output canvas context')

  // 背景色を設定
  if (canvasSettings.backgroundColor) {
    outputCtx.fillStyle = canvasSettings.backgroundColor
    outputCtx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT)

  }

  // 大きめの一時Canvasを作成（レイヤー描画用）
  const tempCanvas = document.createElement('canvas')
  const tempWidth = Math.max(canvasSettings.width * 2, 2000)
  const tempHeight = Math.max(canvasSettings.height * 2, 2000)
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
    drawLayerToCanvas(tempCtx, layer, tempWidth, tempHeight, canvasSettings)
  })

  // Canvas中央から1280x720pxの領域を抽出
  const centerX = tempWidth / 2
  const centerY = tempHeight / 2
  const extractX = centerX - OUTPUT_WIDTH / 2
  const extractY = centerY - OUTPUT_HEIGHT / 2



  // 中央1280x720px領域を出力Canvasにコピー
  outputCtx.drawImage(
    tempCanvas,
    extractX, extractY, OUTPUT_WIDTH, OUTPUT_HEIGHT,
    0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT
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
    quality = 1,
    workers = 2,
    workerScript = '/gif.worker.js'
  } = options

  return new Promise((resolve, reject) => {
    try {
      onProgress?.({ current: 0, total: 100, phase: 'analyzing' })

      const maxFrames = getMaxFrameCount(layers)
      console.log(`🎬 Generating GIF: ${maxFrames} frames, 1280×720px`)

      // レイヤー位置情報をデバッグ出力
      layers.forEach(layer => {
        console.log(`Layer "${layer.name}": position(${layer.position.x}, ${layer.position.y}), scale: ${layer.scale}`)
      })

      onProgress?.({ current: 10, total: 100, phase: 'rendering' })

      // 全フレームを事前に生成してグローバルパレット用のサンプリングを準備
      const allFrameCanvases: HTMLCanvasElement[] = []
      for (let frameIndex = 0; frameIndex < maxFrames; frameIndex++) {
        const frameCanvas = renderOutputFrame(layers, canvasSettings, frameIndex)
        allFrameCanvases.push(frameCanvas)
      }

      // GIF.js インスタンス作成（publicフォルダのworkerScriptを使用）
      const gif = new GIF({
        workers,
        quality,
        workerScript,
        width: 1280,
        height: 720,
        globalPalette: true // グローバルパレット有効化
      })

      // 事前生成したフレームをGIFに追加
      allFrameCanvases.forEach((frameCanvas, frameIndex) => {
        const frameDelay = getFrameDelay(layers, frameIndex)

        gif.addFrame(frameCanvas, {
          delay: frameDelay,
          copy: true
        })

        const renderProgress = 10 + (frameIndex + 1) / maxFrames * 40
        onProgress?.({ current: renderProgress, total: 100, phase: 'rendering' })
      })

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
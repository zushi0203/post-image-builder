import type { 
  ImageLayer, 
  CanvasSettings, 
  LayerDrawParams,
  CanvasCoordinates
} from '../defs/CanvasPreviewTypes'
import { CANVAS_CONSTANTS } from '../defs/canvasPreviewConstants'

/**
 * キャンバスを初期化し、背景色を設定
 */
export const initializeCanvas = (
  canvas: HTMLCanvasElement,
  canvasSettings: CanvasSettings
): CanvasRenderingContext2D | null => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // キャンバスサイズを設定
  canvas.width = canvasSettings.width
  canvas.height = canvasSettings.height

  // キャンバスをクリア
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 背景色を設定
  if (canvasSettings.backgroundColor) {
    ctx.fillStyle = canvasSettings.backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  return ctx
}

/**
 * 出力サイズの座標を計算
 */
export const calculateOutputBounds = (canvas: HTMLCanvasElement) => {
  const { WIDTH: outputWidth, HEIGHT: outputHeight } = CANVAS_CONSTANTS.OUTPUT_SIZE
  const centerX = canvas.width / 2
  const centerY = canvas.height / 2
  const outputX = centerX - outputWidth / 2
  const outputY = centerY - outputHeight / 2

  return {
    outputX,
    outputY,
    outputWidth,
    outputHeight,
  }
}

/**
 * 単一レイヤーを描画（枠外部分：半透明）
 */
const drawLayerOutside = (
  ctx: CanvasRenderingContext2D,
  layer: ImageLayer
): void => {
  if (!layer.imageData) return

  const scaledWidth = layer.imageData.naturalWidth * layer.scale
  const scaledHeight = layer.imageData.naturalHeight * layer.scale
  const x = layer.position.x - scaledWidth / 2
  const y = layer.position.y - scaledHeight / 2

  ctx.save()
  ctx.globalAlpha = layer.opacity * CANVAS_CONSTANTS.OPACITY.OUTSIDE_FRAME

  if (layer.rotation !== 0) {
    ctx.translate(layer.position.x, layer.position.y)
    ctx.rotate((layer.rotation * Math.PI) / 180)
    ctx.translate(-layer.position.x, -layer.position.y)
  }

  ctx.drawImage(
    layer.imageData,
    x,
    y,
    scaledWidth,
    scaledHeight
  )

  ctx.restore()
}

/**
 * 単一レイヤーを描画（枠内部分：クリッピング適用）
 */
const drawLayerInside = (
  ctx: CanvasRenderingContext2D,
  params: LayerDrawParams
): void => {
  const { layer, outputX, outputY, outputWidth, outputHeight } = params
  if (!layer.imageData) return

  const scaledWidth = layer.imageData.naturalWidth * layer.scale
  const scaledHeight = layer.imageData.naturalHeight * layer.scale
  const x = layer.position.x - scaledWidth / 2
  const y = layer.position.y - scaledHeight / 2

  ctx.save()

  // 出力範囲でクリッピング
  ctx.beginPath()
  ctx.rect(outputX, outputY, outputWidth, outputHeight)
  ctx.clip()

  ctx.globalAlpha = layer.opacity

  if (layer.rotation !== 0) {
    ctx.translate(layer.position.x, layer.position.y)
    ctx.rotate((layer.rotation * Math.PI) / 180)
    ctx.translate(-layer.position.x, -layer.position.y)
  }

  ctx.drawImage(
    layer.imageData,
    x,
    y,
    scaledWidth,
    scaledHeight
  )

  ctx.restore()
}

/**
 * 全レイヤーを描画
 */
export const drawLayers = (
  ctx: CanvasRenderingContext2D,
  layers: ImageLayer[],
  outputBounds: {
    outputX: number
    outputY: number
    outputWidth: number
    outputHeight: number
  }
): void => {
  // レイヤーをzIndexの順序で描画
  const visibleLayers = layers
    .filter(layer => layer.visible)
    .sort((a, b) => a.zIndex - b.zIndex)

  const { outputX, outputY, outputWidth, outputHeight } = outputBounds

  visibleLayers.forEach(layer => {
    // 1. 枠外部分を半透明で描画
    drawLayerOutside(ctx, layer)

    // 2. 枠内部分を不透明で描画
    drawLayerInside(ctx, {
      layer,
      outputX,
      outputY,
      outputWidth,
      outputHeight,
    })
  })
}

/**
 * 出力サイズの枠線とラベルを描画
 */
export const drawOutputFrame = (
  ctx: CanvasRenderingContext2D,
  outputBounds: {
    outputX: number
    outputY: number
    outputWidth: number
    outputHeight: number
  }
): void => {
  const { outputX, outputY, outputWidth, outputHeight } = outputBounds
  const { OUTPUT_FRAME, LABEL } = CANVAS_CONSTANTS.STYLES

  ctx.save()
  
  // 枠線を描画
  ctx.strokeStyle = OUTPUT_FRAME.STROKE_COLOR
  ctx.lineWidth = OUTPUT_FRAME.LINE_WIDTH
  ctx.setLineDash(OUTPUT_FRAME.LINE_DASH)
  ctx.strokeRect(outputX, outputY, outputWidth, outputHeight)
  
  // ラベルを描画
  ctx.fillStyle = LABEL.COLOR
  ctx.font = LABEL.FONT
  ctx.textAlign = 'left'
  ctx.fillText(
    `出力サイズ: ${outputWidth}×${outputHeight}px`,
    outputX,
    outputY - 5
  )
  
  ctx.restore()
}

/**
 * 選択されたレイヤーのバウンディングボックスを描画
 */
export const drawSelectionBox = (
  ctx: CanvasRenderingContext2D,
  selectedLayer: ImageLayer
): void => {
  if (!selectedLayer.imageData || !selectedLayer.visible) return

  const scaledWidth = selectedLayer.imageData.naturalWidth * selectedLayer.scale
  const scaledHeight = selectedLayer.imageData.naturalHeight * selectedLayer.scale
  const x = selectedLayer.position.x - scaledWidth / 2
  const y = selectedLayer.position.y - scaledHeight / 2

  const { SELECTION_BOX } = CANVAS_CONSTANTS.STYLES

  ctx.save()
  
  // バウンディングボックスを描画
  ctx.strokeStyle = SELECTION_BOX.STROKE_COLOR
  ctx.lineWidth = SELECTION_BOX.LINE_WIDTH
  ctx.setLineDash(SELECTION_BOX.LINE_DASH)
  ctx.strokeRect(x, y, scaledWidth, scaledHeight)

  // コーナーハンドルを描画
  const handleSize = SELECTION_BOX.HANDLE_SIZE
  const handles: CanvasCoordinates[] = [
    { x: x - handleSize/2, y: y - handleSize/2 }, // 左上
    { x: x + scaledWidth - handleSize/2, y: y - handleSize/2 }, // 右上
    { x: x - handleSize/2, y: y + scaledHeight - handleSize/2 }, // 左下
    { x: x + scaledWidth - handleSize/2, y: y + scaledHeight - handleSize/2 }, // 右下
  ]

  ctx.fillStyle = SELECTION_BOX.STROKE_COLOR
  handles.forEach(handle => {
    ctx.fillRect(handle.x, handle.y, handleSize, handleSize)
  })

  ctx.restore()
}
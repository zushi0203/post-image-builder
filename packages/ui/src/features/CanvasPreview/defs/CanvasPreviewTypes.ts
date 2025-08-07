export interface ImageLayer {
  id: string
  name: string
  type: 'image' | 'background' | 'gif'
  file: File
  imageData: HTMLImageElement | null
  visible: boolean
  zIndex: number
  position: {
    x: number
    y: number
  }
  scale: number
  opacity: number
  rotation: number
  // GIF用フレーム情報
  frames?: Array<{
    id: string
    imageData: HTMLImageElement
    delay: number
    width: number
    height: number
  }>
  currentFrameIndex?: number
}

export interface CanvasSettings {
  width: number
  height: number
  backgroundColor: string
  outputFormat: 'png' | 'gif' | 'apng'
  quality: number
}

export interface CanvasPreviewProps {
  layers: ImageLayer[]
  canvasSettings: CanvasSettings
  onLayerPositionChange?: (layerId: string, position: { x: number; y: number }) => void
}

export interface CanvasCoordinates {
  x: number
  y: number
}

export interface DragState {
  isDragging: boolean
  selectedLayerId: string | null
  dragOffset: CanvasCoordinates
}

export interface DrawingContext {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  canvasSettings: CanvasSettings
}

export interface LayerDrawParams {
  layer: ImageLayer
  outputX: number
  outputY: number
  outputWidth: number
  outputHeight: number
}
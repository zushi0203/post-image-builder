export interface GifFrame {
  /** フレームの一意ID */
  id: string
  /** フレーム画像データ（Canvas要素） */
  canvas: HTMLCanvasElement
  /** フレーム画像データ（ImageData） */
  imageData: ImageData
  /** フレーム表示時間（ミリ秒） */
  delay: number
  /** フレーム幅 */
  width: number
  /** フレーム高さ */
  height: number
  /** フレーム位置 X座標 */
  left: number
  /** フレーム位置 Y座標 */
  top: number
  /** 透明色インデックス */
  transparentIndex?: number
  /** 廃棄方法 */
  disposalMethod: number
}

export interface GifInfo {
  /** 全フレーム配列 */
  frames: GifFrame[]
  /** GIF全体の幅 */
  width: number
  /** GIF全体の高さ */
  height: number
  /** ループ回数（0は無限ループ） */
  loopCount: number
  /** 総再生時間（ミリ秒） */
  totalDuration: number
}

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
  // GIF用情報
  gifInfo?: GifInfo
  currentFrameIndex?: number
}

export interface CanvasSettings {
  width: number
  height: number
  backgroundColor: string
  outputFormat: 'png' | 'gif' | 'apng'
  quality: number
}

export interface CanvasPreviewRef {
  commitOptimisticState: () => boolean
}

export interface CanvasPreviewProps {
  layers: ImageLayer[]
  canvasSettings: CanvasSettings
  onLayerPositionChange?: (layerId: string, position: { x: number; y: number }) => void
  onLayerSelect?: (layerId: string | null) => void
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

export interface OptimisticLayerState {
  layerId: string
  tempPosition: CanvasCoordinates
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
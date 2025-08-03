export interface ImageLayer {
  id: string
  name: string
  type: 'image' | 'background'
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
}

export interface CanvasSettings {
  width: number
  height: number
  backgroundColor: string
  outputFormat: 'png' | 'gif' | 'apng'
  quality: number
}

export interface AppState {
  layers: ImageLayer[]
  selectedLayerId: string | null
  canvasSettings: CanvasSettings
  previewMode: boolean
  isGenerating: boolean
}

export interface OutputSettings {
  format: 'png' | 'gif' | 'apng'
  width: number
  height: number
  quality: number
  fps?: number // for GIF/APNG
  duration?: number // for GIF/APNG
}

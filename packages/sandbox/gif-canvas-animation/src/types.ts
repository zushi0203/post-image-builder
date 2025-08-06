export interface GifFrame {
  canvas: HTMLCanvasElement
  delay: number
  width: number
  height: number
}

export interface GifInfo {
  frames: GifFrame[]
  width: number
  height: number
  totalDuration: number
  loopCount: number
}

export interface AnimationState {
  isPlaying: boolean
  currentFrameIndex: number
  lastFrameTime: number
  elapsedTime: number
}

export interface AnimationConfig {
  targetFPS: number
  frameInterval: number
}

export interface LoadGifOptions {
  maxFrames?: number
  maxSize?: number
  onProgress?: (current: number, total: number) => void
}
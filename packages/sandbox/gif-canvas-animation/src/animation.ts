import type { GifFrame, GifInfo, AnimationState, AnimationConfig } from './types.js'

const TARGET_FPS = 30
const FRAME_INTERVAL = 1000 / TARGET_FPS

export const createAnimationConfig = (): AnimationConfig => ({
  targetFPS: TARGET_FPS,
  frameInterval: FRAME_INTERVAL
})

export const createAnimationState = (): AnimationState => ({
  isPlaying: false,
  currentFrameIndex: 0,
  lastFrameTime: 0,
  elapsedTime: 0
})

export const drawFrame = (
  canvas: HTMLCanvasElement, 
  frame: GifFrame
): void => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Canvas を 500x500px に固定
  canvas.width = 500
  canvas.height = 500
  
  // 背景をクリア
  ctx.clearRect(0, 0, 500, 500)
  
  // 画像全体を500x500Canvasに適切にスケール/配置
  const scaleX = 500 / frame.width
  const scaleY = 500 / frame.height
  const scale = Math.min(scaleX, scaleY) // アスペクト比を保持
  
  const scaledWidth = frame.width * scale
  const scaledHeight = frame.height * scale
  
  // 500x500Canvas内での中央配置
  const offsetX = (500 - scaledWidth) / 2
  const offsetY = (500 - scaledHeight) / 2
  
  ctx.drawImage(
    frame.canvas,
    0, 0, frame.width, frame.height, // 元画像全体
    offsetX, offsetY, scaledWidth, scaledHeight // 500x500Canvas内の描画位置とサイズ
  )
}

export const updateAnimationState = (
  state: AnimationState,
  gifInfo: GifInfo,
  currentTime: number,
  config: AnimationConfig
): AnimationState => {
  if (!state.isPlaying || gifInfo.frames.length === 0) {
    return state
  }

  const deltaTime = currentTime - state.lastFrameTime
  
  if (deltaTime < config.frameInterval) {
    return state
  }

  const currentFrame = gifInfo.frames[state.currentFrameIndex]
  const newElapsedTime = state.elapsedTime + deltaTime

  if (newElapsedTime >= currentFrame.delay) {
    const nextFrameIndex = (state.currentFrameIndex + 1) % gifInfo.frames.length
    
    return {
      ...state,
      currentFrameIndex: nextFrameIndex,
      lastFrameTime: currentTime,
      elapsedTime: 0
    }
  }

  return {
    ...state,
    lastFrameTime: currentTime,
    elapsedTime: newElapsedTime
  }
}

export const startAnimation = (state: AnimationState): AnimationState => ({
  ...state,
  isPlaying: true,
  lastFrameTime: performance.now()
})

export const pauseAnimation = (state: AnimationState): AnimationState => ({
  ...state,
  isPlaying: false
})

export const resetAnimation = (state: AnimationState): AnimationState => ({
  ...state,
  isPlaying: false,
  currentFrameIndex: 0,
  elapsedTime: 0,
  lastFrameTime: 0
})

export const createAnimationLoop = (
  canvas: HTMLCanvasElement,
  gifInfo: GifInfo,
  initialState: AnimationState,
  config: AnimationConfig,
  onStateChange: (state: AnimationState) => void
) => {
  let currentState = initialState
  let animationId: number | null = null

  const loop = (currentTime: number) => {
    currentState = updateAnimationState(currentState, gifInfo, currentTime, config)
    
    if (currentState.isPlaying && gifInfo.frames.length > 0) {
      const currentFrame = gifInfo.frames[currentState.currentFrameIndex]
      drawFrame(canvas, currentFrame)
    }
    
    onStateChange(currentState)
    
    if (currentState.isPlaying) {
      animationId = requestAnimationFrame(loop)
    }
  }

  const start = () => {
    if (animationId === null) {
      currentState = startAnimation(currentState)
      animationId = requestAnimationFrame(loop)
    }
  }

  const pause = () => {
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
    currentState = pauseAnimation(currentState)
    onStateChange(currentState)
  }

  const reset = () => {
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
    currentState = resetAnimation(currentState)
    
    if (gifInfo.frames.length > 0) {
      drawFrame(canvas, gifInfo.frames[0])
    }
    
    onStateChange(currentState)
  }

  const getState = () => currentState

  return {
    start,
    pause,
    reset,
    getState
  }
}
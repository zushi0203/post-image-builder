import { parseGIF, decompressFrames } from 'gifuct-js'
import type { GifFrame, GifInfo, LoadGifOptions } from './types.js'

const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

const processFrame = async (rawFrame: any, gifWidth: number, gifHeight: number): Promise<GifFrame> => {
  // 画像全体サイズのCanvasを作成
  const canvas = document.createElement('canvas')
  canvas.width = gifWidth
  canvas.height = gifHeight
  
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // 背景を透明でクリア
  ctx.clearRect(0, 0, gifWidth, gifHeight)

  // フレームデータのImageDataを作成
  const frameImageData = ctx.createImageData(rawFrame.dims.width, rawFrame.dims.height)
  frameImageData.data.set(rawFrame.patch)
  
  // フレームを正しい位置に描画
  ctx.putImageData(frameImageData, rawFrame.dims.left, rawFrame.dims.top)

  return {
    canvas,
    delay: rawFrame.delay || 100,
    width: gifWidth,
    height: gifHeight,
    left: rawFrame.dims.left,
    top: rawFrame.dims.top
  }
}

export const loadGifFrames = async (
  file: File,
  options: LoadGifOptions = {}
): Promise<GifInfo> => {
  const { maxFrames = 100, maxSize = 2048, onProgress } = options

  try {
    const arrayBuffer = await fileToArrayBuffer(file)
    onProgress?.(1, 4)
    
    const gif = parseGIF(arrayBuffer)
    onProgress?.(2, 4)
    
    const rawFrames = decompressFrames(gif, true)
    onProgress?.(3, 4)
    
    if (rawFrames.length === 0) {
      throw new Error('No frames found in GIF')
    }
    
    const framesToProcess = rawFrames.slice(0, maxFrames)
    const frames: GifFrame[] = []
    let totalDuration = 0
    
    for (let i = 0; i < framesToProcess.length; i++) {
      const rawFrame = framesToProcess[i]
      
      if (rawFrame.dims.width > maxSize || rawFrame.dims.height > maxSize) {
        console.warn(`Frame ${i} exceeds size limit`)
        continue
      }
      
      const frame = await processFrame(rawFrame, gif.lsd.width, gif.lsd.height)
      frames.push(frame)
      totalDuration += frame.delay
    }
    
    onProgress?.(4, 4)
    
    return {
      frames,
      width: gif.lsd.width,
      height: gif.lsd.height,
      totalDuration,
      loopCount: (gif as any).gce?.loopCount || 0
    }
  } catch (error) {
    console.error('Error loading GIF frames:', error)
    throw error
  }
}
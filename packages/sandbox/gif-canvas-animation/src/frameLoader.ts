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

const processFrame = async (rawFrame: any, index: number): Promise<GifFrame> => {
  const canvas = document.createElement('canvas')
  canvas.width = rawFrame.dims.width
  canvas.height = rawFrame.dims.height
  
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  const imageData = ctx.createImageData(rawFrame.dims.width, rawFrame.dims.height)
  imageData.data.set(rawFrame.patch)
  ctx.putImageData(imageData, 0, 0)

  return {
    canvas,
    delay: rawFrame.delay || 100,
    width: rawFrame.dims.width,
    height: rawFrame.dims.height
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
      
      const frame = await processFrame(rawFrame, i)
      frames.push(frame)
      totalDuration += frame.delay
    }
    
    onProgress?.(4, 4)
    
    return {
      frames,
      width: gif.lsd.width,
      height: gif.lsd.height,
      totalDuration,
      loopCount: gif.gce?.loopCount || 0
    }
  } catch (error) {
    console.error('Error loading GIF frames:', error)
    throw error
  }
}
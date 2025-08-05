import { parseGIF, decompressFrames } from 'gifuct-js'
import type { GifFrame, GifInfo, ParseOptions } from './types.js'

/**
 * GIFファイルを解析してフレーム情報を抽出する
 * @param file GIFファイル
 * @param options 解析オプション
 * @returns GIF情報
 */
export async function extractGifFrames(
  file: File,
  options: ParseOptions = {}
): Promise<GifInfo> {
  const { maxFrames = 100, maxSize = 2048, onProgress } = options

  try {
    // ファイルをArrayBufferとして読み込み
    const arrayBuffer = await fileToArrayBuffer(file)
    
    // GIFを解析
    const gif = parseGIF(arrayBuffer)
    onProgress?.(1, 4)
    
    // フレームを展開
    const rawFrames = decompressFrames(gif, true)
    onProgress?.(2, 4)
    
    if (rawFrames.length === 0) {
      throw new Error('No frames found in GIF')
    }
    
    // フレーム数制限
    const framesToProcess = rawFrames.slice(0, maxFrames)
    
    // 各フレームを処理
    const frames: GifFrame[] = []
    let totalDuration = 0
    
    for (let i = 0; i < framesToProcess.length; i++) {
      const rawFrame = framesToProcess[i]
      
      // サイズ制限チェック
      if (rawFrame.dims.width > maxSize || rawFrame.dims.height > maxSize) {
        console.warn(`Frame ${i} exceeds size limit: ${rawFrame.dims.width}x${rawFrame.dims.height}`)
        continue
      }
      
      try {
        const frame = await processFrame(rawFrame, i, file.name)
        frames.push(frame)
        totalDuration += frame.delay
        
        onProgress?.(2 + (i + 1) / framesToProcess.length, 4)
      } catch (error) {
        console.error(`Failed to process frame ${i}:`, error)
      }
    }
    
    onProgress?.(4, 4)
    
    return {
      frames,
      width: gif.lsd.width,
      height: gif.lsd.height,
      loopCount: getLoopCount(gif),
      totalDuration,
    }
  } catch (error) {
    throw new Error(`Failed to extract GIF frames: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 単一フレームを処理してGifFrame形式に変換
 */
async function processFrame(
  rawFrame: any,
  index: number,
  fileName: string
): Promise<GifFrame> {
  const { dims, patch } = rawFrame
  
  // キャンバスを作成
  const canvas = document.createElement('canvas')
  canvas.width = dims.width
  canvas.height = dims.height
  
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }
  
  // ImageDataを作成
  const imageData = new ImageData(patch, dims.width, dims.height)
  
  // キャンバスに描画
  ctx.putImageData(imageData, 0, 0)
  
  // 遅延時間（centisecondsをミリ秒に変換）
  const delay = rawFrame.delay ? rawFrame.delay * 10 : 100
  
  return {
    id: `${fileName}-frame-${index}`,
    canvas,
    imageData,
    delay,
    width: dims.width,
    height: dims.height,
    left: dims.left,
    top: dims.top,
    transparentIndex: rawFrame.transparentIndex,
    disposalMethod: rawFrame.disposalType || 0,
  }
}

/**
 * GIFのループ回数を取得
 */
function getLoopCount(gif: any): number {
  // Netscape Application Extension を探す
  for (const frame of gif.frames) {
    if (frame.applicationExtension?.identifier === 'NETSCAPE' && 
        frame.applicationExtension?.authenticationCode === '2.0') {
      const data = frame.applicationExtension.data
      if (data && data.length >= 3) {
        // バイト1は必ず1、バイト2-3がループ回数（リトルエンディアン）
        return data[1] | (data[2] << 8)
      }
    }
  }
  // デフォルトは1回再生
  return 1
}

/**
 * FileをArrayBufferに変換
 */
function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

/**
 * フレームからHTMLImageElementを生成（本体アプリとの互換性のため）
 */
export function frameToImage(frame: GifFrame): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    
    // CanvasをBlobに変換してURL作成
    frame.canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to create blob from canvas'))
        return
      }
      img.src = URL.createObjectURL(blob)
    })
  })
}

/**
 * パフォーマンス測定用のユーティリティ
 */
export class PerformanceMonitor {
  private startTime: number = 0
  private startMemory: number = 0
  
  start() {
    this.startTime = performance.now()
    this.startMemory = (performance as any).memory?.usedJSHeapSize || 0
  }
  
  end() {
    const endTime = performance.now()
    const endMemory = (performance as any).memory?.usedJSHeapSize || 0
    
    return {
      executionTime: endTime - this.startTime,
      memoryDelta: endMemory - this.startMemory,
    }
  }
}
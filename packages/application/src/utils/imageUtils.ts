/**
 * 画像ファイルをHTMLImageElementに変換
 */
export const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Failed to load image: ${file.name}`))
    }

    img.src = url
  })
}

/**
 * ファイル名から拡張子なしの名前を取得
 */
export const getFileNameWithoutExtension = (fileName: string): string => {
  return fileName.replace(/\.[^/.]+$/, '')
}

/**
 * ファイルサイズを人間が読める形式に変換
 */
export const formatFileSize = (bytes: number): string => {
  const sizes = ['B', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 B'

  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = bytes / Math.pow(1024, i)

  return `${size.toFixed(1)} ${sizes[i]}`
}

/**
 * 画像の推奨サイズを計算（最大サイズに収まるように）
 */
export const calculateOptimalSize = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number; scale: number } => {
  const scaleX = maxWidth / originalWidth
  const scaleY = maxHeight / originalHeight
  const scale = Math.min(scaleX, scaleY, 1) // 拡大はしない

  return {
    width: Math.round(originalWidth * scale),
    height: Math.round(originalHeight * scale),
    scale,
  }
}

/**
 * 画像の種類を判定
 */
export const getImageType = (file: File): 'image' | 'background' | 'gif' => {
  // ファイル名から背景判定
  const fileName = file.name.toLowerCase()
  if (fileName.includes('bg') || fileName.includes('background')) {
    return 'background'
  }

  // MIMEタイプでGIF判定
  if (file.type === 'image/gif') {
    return 'gif'
  }

  return 'image'
}

/**
 * サポートされている画像フォーマットかチェック
 */
export const isSupportedImageFormat = (file: File): boolean => {
  const supportedTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ]

  return supportedTypes.includes(file.type)
}

/**
 * GIFファイルを解析してフレーム情報を取得
 */
export const parseGifFrames = async (
  file: File,
  options: import('../store/types').ParseOptions = {}
): Promise<import('../store/types').GifInfo> => {
  const { parseGIF, decompressFrames } = await import('gifuct-js')
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
    const frames: import('../store/types').GifFrame[] = []
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
const processFrame = async (
  rawFrame: any,
  index: number,
  fileName: string
): Promise<import('../store/types').GifFrame> => {
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
const getLoopCount = (gif: any): number => {
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
const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
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
export const frameToImage = (frame: import('../store/types').GifFrame): Promise<HTMLImageElement> => {
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
 * GIF情報を読みやすい形式でログ出力
 */
export const logGifInfo = (gifInfo: import('../store/types').GifInfo): void => {
  console.group(`🎬 GIF Information`)
  console.log(`📐 Size: ${gifInfo.width}×${gifInfo.height}px`)
  console.log(`🔄 Loop Count: ${gifInfo.loopCount === 0 ? 'Infinite' : gifInfo.loopCount}`)
  console.log(`⏱️  Total Duration: ${gifInfo.totalDuration}ms (${(gifInfo.totalDuration / 1000).toFixed(1)}s)`)
  console.log(`🎞️  Frame Count: ${gifInfo.frames.length}`)
  
  if (gifInfo.frames.length > 0) {
    console.group(`📋 Frame Details`)
    gifInfo.frames.forEach((frame, index) => {
      console.log(`Frame ${index}: ${frame.width}×${frame.height}px, ${frame.delay}ms delay`)
    })
    console.groupEnd()
  }
  console.groupEnd()
}

/**
 * フレームレートを計算
 */
export const calculateFrameRate = (frames: import('../store/types').GifFrame[]): number => {
  if (frames.length === 0) return 0
  
  const totalDelay = frames.reduce((sum, frame) => sum + frame.delay, 0)
  const averageDelay = totalDelay / frames.length
  
  // FPS = 1000ms / 平均遅延時間
  return Math.round(1000 / averageDelay * 100) / 100
}

/**
 * フレームデータの統計情報を取得
 */
export const getFrameStats = (frames: import('../store/types').GifFrame[]): {
  minDelay: number
  maxDelay: number
  avgDelay: number
  totalSize: number
  uniqueSizes: Array<{ width: number; height: number; count: number }>
} => {
  if (frames.length === 0) {
    return {
      minDelay: 0,
      maxDelay: 0,
      avgDelay: 0,
      totalSize: 0,
      uniqueSizes: []
    }
  }
  
  const delays = frames.map(f => f.delay)
  const minDelay = Math.min(...delays)
  const maxDelay = Math.max(...delays)
  const avgDelay = delays.reduce((sum, delay) => sum + delay, 0) / delays.length
  
  // サイズの統計
  const sizeMap = new Map<string, { width: number; height: number; count: number }>()
  let totalSize = 0
  
  frames.forEach(frame => {
    const key = `${frame.width}x${frame.height}`
    const existing = sizeMap.get(key)
    
    if (existing) {
      existing.count++
    } else {
      sizeMap.set(key, { width: frame.width, height: frame.height, count: 1 })
    }
    
    totalSize += frame.width * frame.height * 4 // RGBA = 4 bytes per pixel
  })
  
  return {
    minDelay,
    maxDelay,
    avgDelay: Math.round(avgDelay * 100) / 100,
    totalSize,
    uniqueSizes: Array.from(sizeMap.values())
  }
}

/**
 * プログレス表示用のユーティリティ
 */
export const createProgressBar = (current: number, total: number, width: number = 30): string => {
  const progress = Math.min(current / total, 1)
  const filled = Math.floor(progress * width)
  const empty = width - filled
  
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  const percentage = Math.round(progress * 100)
  
  return `${bar} ${percentage}%`
}

/**
 * フレームをPNG画像としてダウンロード
 */
export const downloadFrame = (frame: import('../store/types').GifFrame, fileName?: string): void => {
  frame.canvas.toBlob((blob) => {
    if (!blob) {
      console.error('Failed to create blob from canvas')
      return
    }
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName || `${frame.id}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  })
}

/**
 * パフォーマンス測定用のユーティリティ（関数ベース）
 */
export const createPerformanceMonitor = () => {
  let startTime = 0
  let startMemory = 0
  
  const start = () => {
    startTime = performance.now()
    startMemory = (performance as any).memory?.usedJSHeapSize || 0
  }
  
  const end = () => {
    const endTime = performance.now()
    const endMemory = (performance as any).memory?.usedJSHeapSize || 0
    
    return {
      executionTime: endTime - startTime,
      memoryDelta: endMemory - startMemory,
    }
  }
  
  return { start, end }
}

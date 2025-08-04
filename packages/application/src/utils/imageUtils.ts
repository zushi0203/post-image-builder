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
export const parseGifFrames = async (file: File): Promise<Array<{
  id: string
  imageData: HTMLImageElement
  delay: number
  width: number
  height: number
}>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      try {
        const arrayBuffer = reader.result as ArrayBuffer
        const frames = extractGifFrames(arrayBuffer, file.name)
        resolve(frames)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('Failed to read GIF file'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * GIFのArrayBufferからフレーム情報を抽出（簡易実装）
 */
const extractGifFrames = (buffer: ArrayBuffer, fileName: string): Array<{
  id: string
  imageData: HTMLImageElement
  delay: number
  width: number
  height: number
}> => {
  // 簡易実装：とりあえず1フレームとして扱う
  // 本格的な実装には gif-frames ライブラリなどの使用を推奨
  const blob = new Blob([buffer], { type: 'image/gif' })
  const url = URL.createObjectURL(blob)

  const img = new Image()
  img.src = url

  // 仮のフレームデータを返す（実際のGIF解析は複雑）
  return [{
    id: `${fileName}-frame-0`,
    imageData: img,
    delay: 100, // デフォルト100ms
    width: img.naturalWidth || 0,
    height: img.naturalHeight || 0,
  }]
}

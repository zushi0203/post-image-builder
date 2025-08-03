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
export const getImageType = (file: File): 'image' | 'background' => {
  // ファイル名やサイズから判定ロジックを実装
  // 現在は簡単な実装
  const fileName = file.name.toLowerCase()

  if (fileName.includes('bg') || fileName.includes('background')) {
    return 'background'
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

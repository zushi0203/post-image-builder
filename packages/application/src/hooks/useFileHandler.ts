import { useCallback } from 'react'
import { useAtom, useSetAtom } from 'jotai'
import { addLayerAtom, canvasSettingsAtom } from '../store/atoms'
import {
  loadImageFromFile,
  getFileNameWithoutExtension,
  getImageType,
  isSupportedImageFormat,
  calculateOptimalSize,
  parseGifFrames,
  logGifInfo,
  createPerformanceMonitor
} from '../utils/imageUtils'
import type { ImageLayer } from '../store/types'

export const useFileHandler = () => {
  const [canvasSettings] = useAtom(canvasSettingsAtom)
  const addLayer = useSetAtom(addLayerAtom)

  const handleFiles = useCallback(async (files: File[]) => {
    const validFiles = files.filter(isSupportedImageFormat)

    if (validFiles.length === 0) {
      console.warn('No supported image files found')
      return
    }

    // ファイルを並列で処理
    const layerPromises = validFiles.map(async (file) => {
      try {
        const imageData = await loadImageFromFile(file)
        const imageType = getImageType(file)

        console.log(`Processing file: ${file.name}, type: ${file.type}, detected as: ${imageType}`)

        // 画像サイズを計算
        const { scale } = calculateOptimalSize(
          imageData.naturalWidth,
          imageData.naturalHeight,
          canvasSettings.width,
          canvasSettings.height
        )

        const newLayer: Omit<ImageLayer, 'id' | 'zIndex'> = {
          name: getFileNameWithoutExtension(file.name),
          type: imageType,
          file,
          imageData,
          visible: true,
          position: {
            x: canvasSettings.width / 2,
            y: canvasSettings.height / 2,
          },
          scale,
          opacity: 1,
          rotation: 0,
        }

        // GIFの場合はフレーム情報を追加
        if (imageType === 'gif') {
          try {
            const monitor = createPerformanceMonitor()
            monitor.start()
            
            const gifInfo = await parseGifFrames(file, {
              maxFrames: 200, // フレーム数上限を拡張
              maxSize: 4096,  // サイズ制限を拡張
              onProgress: (current, total) => {
                console.log(`GIF processing progress: ${Math.round((current / total) * 100)}%`)
              }
            })
            
            const performance = monitor.end()
            console.log(`GIF processing completed in ${performance.executionTime.toFixed(2)}ms`)
            
            newLayer.gifInfo = gifInfo
            newLayer.currentFrameIndex = 0
            
            // 詳細情報をログ出力
            logGifInfo(gifInfo)
            
            console.log(`GIF successfully processed: ${gifInfo.frames.length} frames, ${gifInfo.totalDuration}ms duration`)
          } catch (error) {
            console.warn('Failed to parse GIF frames, treating as static image:', error)
            // フレーム解析に失敗した場合は静止画として扱う
            newLayer.type = 'image'
          }
        }

        return addLayer(newLayer)
      } catch (error) {
        console.error(`Failed to process file ${file.name}:`, error)
        return null
      }
    })

    try {
      const results = await Promise.all(layerPromises)
      const successCount = results.filter(Boolean).length

      console.log(`Successfully processed ${successCount} of ${validFiles.length} files`)

      if (successCount < validFiles.length) {
        // TODO: ユーザーに通知する仕組みを追加
        console.warn(`${validFiles.length - successCount} files failed to process`)
      }
    } catch (error) {
      console.error('Error processing files:', error)
    }
  }, [addLayer, canvasSettings])

  return {
    handleFiles,
  }
}

import { useMemo } from 'react'
import type { ImageLayer } from '../defs/CanvasPreviewTypes'

/**
 * レイヤーの座標計算結果をキャッシュするフック
 */
export interface LayerBounds {
  layerId: string
  scaledWidth: number
  scaledHeight: number
  x: number
  y: number
  left: number
  top: number
  right: number
  bottom: number
}

export const useCoordinateCache = (layers: ImageLayer[]): Map<string, LayerBounds> => {
  return useMemo(() => {
    const cache = new Map<string, LayerBounds>()

    layers.forEach(layer => {
      if (!layer.imageData) return

      const scaledWidth = layer.imageData.naturalWidth * layer.scale
      const scaledHeight = layer.imageData.naturalHeight * layer.scale
      const x = layer.position.x - scaledWidth / 2
      const y = layer.position.y - scaledHeight / 2

      cache.set(layer.id, {
        layerId: layer.id,
        scaledWidth,
        scaledHeight,
        x,
        y,
        left: x,
        top: y,
        right: x + scaledWidth,
        bottom: y + scaledHeight,
      })
    })

    return cache
  }, [layers])
}

/**
 * 出力サイズの座標をキャッシュするフック
 */
export interface OutputBounds {
  outputX: number
  outputY: number
  outputWidth: number
  outputHeight: number
}

export const useOutputBoundsCache = (
  canvasWidth: number,
  canvasHeight: number,
  outputWidth: number,
  outputHeight: number
): OutputBounds => {
  return useMemo(() => {
    const centerX = canvasWidth / 2
    const centerY = canvasHeight / 2
    const outputX = centerX - outputWidth / 2
    const outputY = centerY - outputHeight / 2

    return {
      outputX,
      outputY,
      outputWidth,
      outputHeight,
    }
  }, [canvasWidth, canvasHeight, outputWidth, outputHeight])
}

/**
 * レイヤーのヒットテスト用最適化キャッシュ
 */
export const useHitTestCache = (layers: ImageLayer[]): ((x: number, y: number) => ImageLayer | null) => {
  const coordinateCache = useCoordinateCache(layers)

  return useMemo(() => {
    // zIndexの逆順でソート済みのレイヤー配列をキャッシュ
    const sortedVisibleLayers = layers
      .filter(layer => layer.visible && layer.imageData)
      .sort((a, b) => b.zIndex - a.zIndex)

    return (x: number, y: number): ImageLayer | null => {
      for (const layer of sortedVisibleLayers) {
        const bounds = coordinateCache.get(layer.id)
        if (!bounds) continue

        if (
          x >= bounds.left &&
          x <= bounds.right &&
          y >= bounds.top &&
          y <= bounds.bottom
        ) {
          return layer
        }
      }
      return null
    }
  }, [layers, coordinateCache])
}
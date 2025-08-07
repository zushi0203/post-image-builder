import { useState, useCallback } from 'react'
import type { ImageLayer, CanvasCoordinates } from '../defs/CanvasPreviewTypes'

/**
 * レイヤーインタラクション（選択、ドラッグ）を管理するカスタムフック
 */
export const useLayerInteraction = (
  layers: ImageLayer[],
  onLayerPositionChange?: (layerId: string, position: CanvasCoordinates) => void
) => {
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState<CanvasCoordinates>({ x: 0, y: 0 })

  /**
   * 指定座標でクリックされたレイヤーを取得
   */
  const getClickedLayer = useCallback((x: number, y: number): ImageLayer | null => {
    // zIndexの逆順（上から）で判定
    const visibleLayers = layers
      .filter(layer => layer.visible && layer.imageData)
      .sort((a, b) => b.zIndex - a.zIndex)

    for (const layer of visibleLayers) {
      if (!layer.imageData) continue

      const scaledWidth = layer.imageData.naturalWidth * layer.scale
      const scaledHeight = layer.imageData.naturalHeight * layer.scale
      const layerX = layer.position.x - scaledWidth / 2
      const layerY = layer.position.y - scaledHeight / 2

      if (
        x >= layerX &&
        x <= layerX + scaledWidth &&
        y >= layerY &&
        y <= layerY + scaledHeight
      ) {
        return layer
      }
    }
    return null
  }, [layers])

  /**
   * マウスダウンイベント処理
   */
  const handleMouseDown = useCallback((coordinates: CanvasCoordinates) => {
    const { x, y } = coordinates
    const clickedLayer = getClickedLayer(x, y)

    if (clickedLayer) {
      setSelectedLayerId(clickedLayer.id)
      setIsDragging(true)
      setDragOffset({
        x: x - clickedLayer.position.x,
        y: y - clickedLayer.position.y,
      })
    } else {
      setSelectedLayerId(null)
    }
  }, [getClickedLayer])

  /**
   * マウスムーブイベント処理
   */
  const handleMouseMove = useCallback((coordinates: CanvasCoordinates) => {
    if (!isDragging || !selectedLayerId || !onLayerPositionChange) return

    const { x, y } = coordinates
    const newPosition = {
      x: x - dragOffset.x,
      y: y - dragOffset.y,
    }

    onLayerPositionChange(selectedLayerId, newPosition)
  }, [isDragging, selectedLayerId, dragOffset, onLayerPositionChange])

  /**
   * マウスアップイベント処理
   */
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  /**
   * 選択されたレイヤーを取得
   */
  const selectedLayer = selectedLayerId 
    ? layers.find(layer => layer.id === selectedLayerId) || null
    : null

  return {
    selectedLayerId,
    selectedLayer,
    isDragging,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  }
}
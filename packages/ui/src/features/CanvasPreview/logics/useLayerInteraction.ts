import { useState, useCallback } from 'react'
import type { ImageLayer, CanvasCoordinates } from '../defs/CanvasPreviewTypes'
import { useThrottle, useDebounce } from './useThrottle'
import { useHitTestCache } from './useCoordinateCache'

/**
 * レイヤーインタラクション（選択、ドラッグ）を管理するカスタムフック
 */
export const useLayerInteraction = (
  layers: ImageLayer[],
  onDragPositionChange?: (layerId: string, position: CanvasCoordinates) => void,
  onDragComplete?: (layerId: string, position: CanvasCoordinates) => void
) => {
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState<CanvasCoordinates>({ x: 0, y: 0 })

  // スロットリングされた位置更新（16ms = 60FPS制限）
  const throttledPositionChange = useThrottle((layerId: string, position: CanvasCoordinates) => {
    onDragPositionChange?.(layerId, position)
  }, 16)

  // デバウンスされた最終位置更新（ドラッグ終了後の確定）
  const debouncedPositionChange = useDebounce((layerId: string, position: CanvasCoordinates) => {
    onDragComplete?.(layerId, position)
  }, 100)

  // ヒットテスト用の最適化されたキャッシュ
  const hitTest = useHitTestCache(layers)

  /**
   * マウスダウンイベント処理
   */
  const handleMouseDown = useCallback((coordinates: CanvasCoordinates) => {
    const { x, y } = coordinates
    const clickedLayer = hitTest(x, y)

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
  }, [hitTest])

  /**
   * マウスムーブイベント処理（スロットリング適用）
   */
  const handleMouseMove = useCallback((coordinates: CanvasCoordinates) => {
    if (!isDragging || !selectedLayerId) return

    const { x, y } = coordinates
    const newPosition = {
      x: x - dragOffset.x,
      y: y - dragOffset.y,
    }

    // ドラッグ中は高頻度でスロットリング更新
    throttledPositionChange(selectedLayerId, newPosition)
  }, [isDragging, selectedLayerId, dragOffset, throttledPositionChange])

  /**
   * マウスアップイベント処理（即座同期 + デバウンス適用）
   */
  const handleMouseUp = useCallback((finalPosition?: CanvasCoordinates) => {
    if (isDragging && selectedLayerId && finalPosition) {
      // 最終位置を計算
      const newPosition = {
        x: finalPosition.x - dragOffset.x,
        y: finalPosition.y - dragOffset.y,
      }
      
      console.log(`🎯 Layer "${selectedLayerId}" drag completed. Final position:`, newPosition)
      
      // ドラッグ状態を先にクリアしてから完了処理を実行
      setIsDragging(false)
      
      // 即座にドラッグ完了処理を実行（GIF生成などの即座処理用）
      onDragComplete?.(selectedLayerId, newPosition)
      
      // デバウンス更新もスケジュール（重複防止のため後続処理）
      debouncedPositionChange(selectedLayerId, newPosition)
    } else {
      setIsDragging(false)
    }
  }, [isDragging, selectedLayerId, dragOffset, onDragComplete, debouncedPositionChange])

  /**
   * 楽観的状態を即座に確定する関数（外部から呼び出し可能）
   */
  const commitOptimisticState = useCallback(() => {
    if (isDragging && selectedLayerId) {
      console.log(`⚡ Force committing optimistic state for layer: ${selectedLayerId}`)
      setIsDragging(false)
      return true
    }
    return false
  }, [isDragging, selectedLayerId])

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
    commitOptimisticState, // 新しく追加
  }
}
import { useState, useMemo, useCallback } from 'react'
import type { ImageLayer, CanvasCoordinates, OptimisticLayerState } from '../defs/CanvasPreviewTypes'

/**
 * 楽観的UI更新を管理するカスタムフック
 * ドラッグ中は描画専用の一時状態を使用し、正式状態とは分離する
 */
export const useOptimisticState = (baseLayers: ImageLayer[]) => {
  const [optimisticStates, setOptimisticStates] = useState<OptimisticLayerState[]>([])

  /**
   * 楽観的状態を適用したレイヤー配列を計算
   */
  const optimisticLayers = useMemo(() => {
    if (optimisticStates.length === 0) return baseLayers

    return baseLayers.map(layer => {
      const optimisticState = optimisticStates.find(state => state.layerId === layer.id)
      if (optimisticState) {
        return {
          ...layer,
          position: optimisticState.tempPosition,
        }
      }
      return layer
    })
  }, [baseLayers, optimisticStates])

  /**
   * 楽観的状態を更新
   */
  const updateOptimisticPosition = useCallback((layerId: string, position: CanvasCoordinates) => {
    setOptimisticStates(prev => {
      const existingIndex = prev.findIndex(state => state.layerId === layerId)
      
      if (existingIndex >= 0) {
        // 既存の楽観的状態を更新
        const updated = [...prev]
        updated[existingIndex] = { layerId, tempPosition: position }
        return updated
      } else {
        // 新しい楽観的状態を追加
        return [...prev, { layerId, tempPosition: position }]
      }
    })
  }, [])

  /**
   * 楽観的状態をクリア
   */
  const clearOptimisticState = useCallback((layerId?: string) => {
    setOptimisticStates(prev => {
      if (layerId) {
        return prev.filter(state => state.layerId !== layerId)
      } else {
        return []
      }
    })
  }, [])

  /**
   * 楽観的状態を全てクリア
   */
  const clearAllOptimisticStates = useCallback(() => {
    setOptimisticStates([])
  }, [])

  return {
    optimisticLayers,
    updateOptimisticPosition,
    clearOptimisticState,
    clearAllOptimisticStates,
    hasOptimisticState: optimisticStates.length > 0,
  }
}
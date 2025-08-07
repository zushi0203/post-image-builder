import React, { useRef } from 'react'
import type { CanvasPreviewProps } from './defs/CanvasPreviewTypes'
import { useCanvasRenderer } from './logics/useCanvasRenderer'
import { useLayerInteraction } from './logics/useLayerInteraction'
import { useCanvasCoordinates } from './logics/useCanvasCoordinates'
import { useOptimisticState } from './logics/useOptimisticState'
import './CanvasPreview.css'

export const CanvasPreview: React.FC<CanvasPreviewProps> = ({
  layers,
  canvasSettings,
  onLayerPositionChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 楽観的UI更新の管理
  const {
    optimisticLayers,
    updateOptimisticPosition,
    clearOptimisticState,
    hasOptimisticState,
  } = useOptimisticState(layers)

  // カスタムフックで機能を分離
  const { getCanvasCoordinates } = useCanvasCoordinates(canvasRef)
  
  // 楽観的状態更新を含むレイヤーインタラクション
  const {
    selectedLayerId,
    isDragging,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  } = useLayerInteraction(optimisticLayers, (layerId, position) => {
    // ドラッグ中は楽観的状態のみ更新
    if (isDragging) {
      updateOptimisticPosition(layerId, position)
    } else {
      // ドラッグ完了時は正式状態を更新し、楽観的状態をクリア
      onLayerPositionChange?.(layerId, position)
      clearOptimisticState(layerId)
    }
  })

  // キャンバス描画の管理（楽観的レイヤーを使用）
  const displayLayers = hasOptimisticState ? optimisticLayers : layers
  const displaySelectedLayer = selectedLayerId 
    ? displayLayers.find(layer => layer.id === selectedLayerId) || null
    : null

  const { scheduleRedraw } = useCanvasRenderer(
    canvasRef, 
    displayLayers, 
    canvasSettings, 
    displaySelectedLayer, 
    isDragging
  )

  // マウスイベントハンドラー
  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coordinates = getCanvasCoordinates(e)
    handleMouseDown(coordinates)
  }

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coordinates = getCanvasCoordinates(e)
    handleMouseMove(coordinates)
    
    // ドラッグ中の再描画スケジューリング
    if (isDragging) {
      scheduleRedraw()
    }
  }

  const onMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coordinates = getCanvasCoordinates(e)
    handleMouseUp(coordinates)
  }

  // カーソルの状態を決定
  const getCursorStyle = () => {
    if (isDragging) return 'grabbing'
    if (selectedLayerId) return 'grab'
    return 'default'
  }

  return (
    <div className="canvas-preview">
      <canvas
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{
          border: '1px solid #ccc',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          cursor: getCursorStyle(),
        }}
      />
    </div>
  )
}

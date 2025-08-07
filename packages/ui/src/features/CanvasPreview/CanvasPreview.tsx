import React, { useRef } from 'react'
import type { CanvasPreviewProps } from './defs/CanvasPreviewTypes'
import { useCanvasRenderer } from './logics/useCanvasRenderer'
import { useLayerInteraction } from './logics/useLayerInteraction'
import { useCanvasCoordinates } from './logics/useCanvasCoordinates'
import './CanvasPreview.css'

export const CanvasPreview: React.FC<CanvasPreviewProps> = ({
  layers,
  canvasSettings,
  onLayerPositionChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // カスタムフックで機能を分離
  const { getCanvasCoordinates } = useCanvasCoordinates(canvasRef)
  const {
    selectedLayerId,
    selectedLayer,
    isDragging,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  } = useLayerInteraction(layers, onLayerPositionChange)

  // キャンバス描画の管理（useLayoutEffectで自動再描画）
  useCanvasRenderer(canvasRef, layers, canvasSettings, selectedLayer)

  // マウスイベントハンドラー
  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coordinates = getCanvasCoordinates(e)
    handleMouseDown(coordinates)
  }

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coordinates = getCanvasCoordinates(e)
    handleMouseMove(coordinates)
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
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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

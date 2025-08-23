import { useCallback, useLayoutEffect, useEffect } from 'react'
import type { ImageLayer, CanvasSettings } from '../defs/CanvasPreviewTypes'
import type { SnapResult } from './useCanvasSnap'
import { 
  initializeCanvas, 
  calculateOutputBounds, 
  drawLayers, 
  drawOutputFrame, 
  drawSelectionBox,
  drawSnapGuidelines
} from './canvasDrawer'
import { useCanvasSnap } from './useCanvasSnap'
import { useAnimationFrame } from './useAnimationFrame'


/**
 * キャンバス描画を管理するカスタムフック
 * requestAnimationFrameで描画頻度を制御し、パフォーマンスを最適化
 */
export const useCanvasRenderer = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  layers: ImageLayer[],
  canvasSettings: CanvasSettings,
  selectedLayer: ImageLayer | null,
  isDragging: boolean = false,
  currentSnapResult: SnapResult | null = null,
  snapEnabled: boolean = false
) => {
  const { requestFrame, cancelFrame } = useAnimationFrame()
  
  // スナップポイントを取得（視覚的フィードバック用）
  const { snapPoints } = useCanvasSnap(canvasSettings, { enabled: snapEnabled })
  


  /**
   * キャンバスの再描画処理
   */
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = initializeCanvas(canvas, canvasSettings)
    if (!ctx) return

    // 出力サイズの座標を計算
    const outputBounds = calculateOutputBounds(canvas)

    // レイヤーを描画
    drawLayers(ctx, layers, outputBounds)

    // 出力サイズの枠線とラベルを描画
    drawOutputFrame(ctx, outputBounds)

    // 選択されたレイヤーのバウンディングボックスを描画
    if (selectedLayer) {
      drawSelectionBox(ctx, selectedLayer)
    }

    // スナップガイドラインを描画
    if (snapEnabled && currentSnapResult?.snapped) {
      drawSnapGuidelines(ctx, snapPoints, currentSnapResult, canvasSettings)
    }
  }, [canvasRef, layers, canvasSettings, selectedLayer, snapEnabled, currentSnapResult, snapPoints])

  /**
   * アニメーションフレームでスケジューリングされた再描画
   */
  const scheduleRedraw = useCallback(() => {
    requestFrame(redrawCanvas)
  }, [requestFrame, redrawCanvas])

  /**
   * 初回描画とドラッグ終了時の即座再描画
   */
  useLayoutEffect(() => {
    if (!isDragging) {
      redrawCanvas()
    }
  }, [redrawCanvas, isDragging])

  /**
   * ドラッグ中の最適化された再描画
   */
  useEffect(() => {
    if (isDragging) {
      scheduleRedraw()
    }
  }, [scheduleRedraw, isDragging, layers, selectedLayer])



  /**
   * クリーンアップ
   */
  useEffect(() => {
    return () => {
      cancelFrame()
    }
  }, [cancelFrame])

  return {
    redrawCanvas,
    scheduleRedraw,
  }
}
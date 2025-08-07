import { useCallback, useLayoutEffect } from 'react'
import type { ImageLayer, CanvasSettings } from '../defs/CanvasPreviewTypes'
import { 
  initializeCanvas, 
  calculateOutputBounds, 
  drawLayers, 
  drawOutputFrame, 
  drawSelectionBox 
} from './canvasDrawer'

/**
 * キャンバス描画を管理するカスタムフック
 * useLayoutEffectを使用して描画の同期実行を保証
 */
export const useCanvasRenderer = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  layers: ImageLayer[],
  canvasSettings: CanvasSettings,
  selectedLayer: ImageLayer | null
) => {
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
  }, [canvasRef, layers, canvasSettings, selectedLayer])

  /**
   * 依存値の変更時に自動再描画
   * useLayoutEffectで同期実行を保証
   */
  useLayoutEffect(() => {
    redrawCanvas()
  }, [redrawCanvas])

  return {
    redrawCanvas,
  }
}
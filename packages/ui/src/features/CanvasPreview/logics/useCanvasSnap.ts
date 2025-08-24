import { useCallback, useMemo } from 'react'
import type { CanvasCoordinates, CanvasSettings, ImageLayer } from '../defs/CanvasPreviewTypes'
import { CANVAS_CONSTANTS } from '../defs/canvasPreviewConstants'

export interface SnapPoint {
  id: string
  name: string
  x: number
  y: number
}

export interface LayerBounds {
  width: number
  height: number
  // 各辺と角の座標（レイヤー中心からの相対位置）
  topLeft: CanvasCoordinates
  topCenter: CanvasCoordinates
  topRight: CanvasCoordinates
  leftCenter: CanvasCoordinates
  center: CanvasCoordinates
  rightCenter: CanvasCoordinates
  bottomLeft: CanvasCoordinates
  bottomCenter: CanvasCoordinates
  bottomRight: CanvasCoordinates
}

type LayerAnchor = Exclude<keyof LayerBounds, 'width' | 'height'>

export interface SnapCandidate {
  snapPoint: SnapPoint
  layerAnchor: LayerAnchor
  adjustedPosition: CanvasCoordinates
  distance: number
}

export interface SnapResult {
  snapped: boolean
  snapPoint?: SnapPoint
  position: CanvasCoordinates
  distance?: number
  layerAnchor?: LayerAnchor
}

export interface CanvasSnapOptions {
  snapThreshold: number
  enabled: boolean
}

const DEFAULT_SNAP_OPTIONS: CanvasSnapOptions = {
  snapThreshold: 30,
  enabled: true,
}

/**
 * レイヤーのサイズを取得（GIFフレーム考慮）
 */
const getLayerSize = (layer: ImageLayer): { width: number; height: number } => {
  // GIFレイヤーの場合は現在のフレームサイズを使用
  if (layer.type === 'gif' && layer.gifInfo && layer.gifInfo.frames.length > 0) {
    const frameIndex = layer.currentFrameIndex || 0
    const validIndex = Math.max(0, Math.min(frameIndex, layer.gifInfo.frames.length - 1))
    const currentFrame = layer.gifInfo.frames[validIndex]
    
    if (currentFrame) {
      return {
        width: currentFrame.width,
        height: currentFrame.height
      }
    }
    
    // フレーム情報がない場合はGIF全体サイズを使用
    return {
      width: layer.gifInfo.width,
      height: layer.gifInfo.height
    }
  }
  
  // 通常の画像レイヤー
  if (layer.imageData) {
    return {
      width: layer.imageData.naturalWidth || layer.imageData.width,
      height: layer.imageData.naturalHeight || layer.imageData.height
    }
  }
  
  // デフォルトサイズ
  return { width: 100, height: 100 }
}

/**
 * レイヤーのバウンディング情報を計算
 */
const calculateLayerBounds = (layer: ImageLayer): LayerBounds => {
  const { width: rawWidth, height: rawHeight } = getLayerSize(layer)
  const width = rawWidth * layer.scale
  const height = rawHeight * layer.scale
  
  const halfWidth = width / 2
  const halfHeight = height / 2
  const { x: centerX, y: centerY } = layer.position
  
  return {
    width,
    height,
    topLeft: { x: centerX - halfWidth, y: centerY - halfHeight },
    topCenter: { x: centerX, y: centerY - halfHeight },
    topRight: { x: centerX + halfWidth, y: centerY - halfHeight },
    leftCenter: { x: centerX - halfWidth, y: centerY },
    center: { x: centerX, y: centerY },
    rightCenter: { x: centerX + halfWidth, y: centerY },
    bottomLeft: { x: centerX - halfWidth, y: centerY + halfHeight },
    bottomCenter: { x: centerX, y: centerY + halfHeight },
    bottomRight: { x: centerX + halfWidth, y: centerY + halfHeight },
  }
}

export const useCanvasSnap = (
  canvasSettings: CanvasSettings,
  options: Partial<CanvasSnapOptions> = {}
) => {
  const snapOptions = { ...DEFAULT_SNAP_OPTIONS, ...options }

  const snapPoints = useMemo((): SnapPoint[] => {
    const { width: canvasWidth, height: canvasHeight } = canvasSettings
    
    // 出力領域の境界を計算
    const { WIDTH: outputWidth, HEIGHT: outputHeight } = CANVAS_CONSTANTS.OUTPUT_SIZE
    const centerX = canvasWidth / 2
    const centerY = canvasHeight / 2
    const outputLeft = centerX - outputWidth / 2
    const outputRight = centerX + outputWidth / 2
    const outputTop = centerY - outputHeight / 2
    const outputBottom = centerY + outputHeight / 2
    const outputCenterX = centerX
    const outputCenterY = centerY

    return [
      // 出力領域中央（キャンバス中央と同じ）
      { id: 'center', name: 'Center', x: outputCenterX, y: outputCenterY },
      // 出力領域の4つの角
      { id: 'top-left', name: 'Output Top Left', x: outputLeft, y: outputTop },
      { id: 'top-right', name: 'Output Top Right', x: outputRight, y: outputTop },
      { id: 'bottom-left', name: 'Output Bottom Left', x: outputLeft, y: outputBottom },
      { id: 'bottom-right', name: 'Output Bottom Right', x: outputRight, y: outputBottom },
      // 出力領域の4つの辺の中点
      { id: 'top-center', name: 'Output Top Center', x: outputCenterX, y: outputTop },
      { id: 'bottom-center', name: 'Output Bottom Center', x: outputCenterX, y: outputBottom },
      { id: 'left-center', name: 'Output Left Center', x: outputLeft, y: outputCenterY },
      { id: 'right-center', name: 'Output Right Center', x: outputRight, y: outputCenterY },
    ]
  }, [canvasSettings.width, canvasSettings.height])

  const calculateDistance = useCallback((
    point1: CanvasCoordinates, 
    point2: CanvasCoordinates
  ): number => {
    const dx = point1.x - point2.x
    const dy = point1.y - point2.y
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  const findNearestSnapPoint = useCallback((
    position: CanvasCoordinates,
    layer?: ImageLayer
  ): SnapResult => {
    if (!snapOptions.enabled || !layer) {
      return { snapped: false, position }
    }

    // レイヤーのバウンディング情報を計算
    const layerBounds = calculateLayerBounds({ ...layer, position })
    
    // 各スナップポイントに対して対応する候補を生成
    const candidates: SnapCandidate[] = []
    
    // スナップポイントとレイヤーアンカーのマッピング
    const snapMappings: Array<{ snapId: string; layerAnchor: LayerAnchor }> = [
      { snapId: 'center', layerAnchor: 'center' },
      { snapId: 'top-left', layerAnchor: 'topLeft' },
      { snapId: 'top-center', layerAnchor: 'topCenter' },
      { snapId: 'top-right', layerAnchor: 'topRight' },
      { snapId: 'left-center', layerAnchor: 'leftCenter' },
      { snapId: 'right-center', layerAnchor: 'rightCenter' },
      { snapId: 'bottom-left', layerAnchor: 'bottomLeft' },
      { snapId: 'bottom-center', layerAnchor: 'bottomCenter' },
      { snapId: 'bottom-right', layerAnchor: 'bottomRight' },
    ]

    for (const mapping of snapMappings) {
      const snapPoint = snapPoints.find(sp => sp.id === mapping.snapId)
      if (!snapPoint) continue

      const layerAnchorPos = layerBounds[mapping.layerAnchor] as CanvasCoordinates
      const distance = calculateDistance(layerAnchorPos, snapPoint)

      if (distance <= snapOptions.snapThreshold) {
        // スナップポイントに合わせるための位置調整を計算
        const offsetX = layerAnchorPos.x - position.x
        const offsetY = layerAnchorPos.y - position.y
        
        const adjustedPosition: CanvasCoordinates = {
          x: snapPoint.x - offsetX,
          y: snapPoint.y - offsetY
        }

        candidates.push({
          snapPoint,
          layerAnchor: mapping.layerAnchor,
          adjustedPosition,
          distance
        })
      }
    }

    // 最も近い候補を選択
    if (candidates.length > 0) {
      const nearest = candidates.reduce((closest, candidate) =>
        candidate.distance < closest.distance ? candidate : closest
      )

      return {
        snapped: true,
        snapPoint: nearest.snapPoint,
        position: nearest.adjustedPosition,
        distance: nearest.distance,
        layerAnchor: nearest.layerAnchor,
      }
    }

    return { snapped: false, position }
  }, [snapPoints, snapOptions, calculateDistance])

  const getSnapPointById = useCallback((id: string): SnapPoint | undefined => {
    return snapPoints.find(point => point.id === id)
  }, [snapPoints])

  return {
    snapPoints,
    findNearestSnapPoint,
    getSnapPointById,
    snapOptions,
  }
}
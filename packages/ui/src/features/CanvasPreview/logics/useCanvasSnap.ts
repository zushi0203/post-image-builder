import { useCallback, useMemo } from 'react'
import type { CanvasCoordinates, CanvasSettings, ImageLayer } from '../defs/CanvasPreviewTypes'

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
    const { width, height } = canvasSettings
    const halfWidth = width / 2
    const halfHeight = height / 2

    return [
      // Canvas中央
      { id: 'center', name: 'Center', x: halfWidth, y: halfHeight },
      // 4つの角
      { id: 'top-left', name: 'Top Left', x: 0, y: 0 },
      { id: 'top-right', name: 'Top Right', x: width, y: 0 },
      { id: 'bottom-left', name: 'Bottom Left', x: 0, y: height },
      { id: 'bottom-right', name: 'Bottom Right', x: width, y: height },
      // 4つの辺の中点
      { id: 'top-center', name: 'Top Center', x: halfWidth, y: 0 },
      { id: 'bottom-center', name: 'Bottom Center', x: halfWidth, y: height },
      { id: 'left-center', name: 'Left Center', x: 0, y: halfHeight },
      { id: 'right-center', name: 'Right Center', x: width, y: halfHeight },
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
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import type { ImageLayer, CanvasSettings, OutputSettings } from './types'

// レイヤー管理
export const layersAtom = atom<ImageLayer[]>([])

export const selectedLayerIdAtom = atom<string | null>(null)

// 選択されたレイヤーを取得する派生atom
export const selectedLayerAtom = atom((get) => {
  const layers = get(layersAtom)
  const selectedId = get(selectedLayerIdAtom)
  return layers.find(layer => layer.id === selectedId) || null
})

// GIFレイヤーがあるかどうかを判定する派生atom
export const hasGifLayersAtom = atom((get) => {
  const layers = get(layersAtom)
  console.log('Checking for GIF layers:', layers.map(l => ({
    name: l.name,
    type: l.type,
    hasFrames: !!l.gifInfo?.frames,
    frameCount: l.gifInfo?.frames.length || 0
  })))

  const hasGifs = layers.some(layer => {
    const isGif = layer.type === 'gif'
    const hasFrames = layer.gifInfo && layer.gifInfo.frames.length > 0
    console.log(`Layer ${layer.name}: isGif=${isGif}, hasFrames=${hasFrames}`)
    return isGif && hasFrames
  })

  console.log('hasGifLayers result:', hasGifs)
  return hasGifs
})

// タイムライン表示用のレイヤーデータを取得する派生atom
export const timelineLayersAtom = atom((get) => {
  const layers = get(layersAtom)
  return layers
    .filter(layer => layer.type === 'gif' && layer.gifInfo && layer.gifInfo.frames.length > 0)
    .map(layer => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      // GifFrameをFrameInfo互換形式に変換（CanvasからData URLを使用）
      frames: (layer.gifInfo?.frames || []).map(frame => ({
        id: frame.id,
        imageData: (() => {
          const img = new Image()
          img.src = frame.canvas.toDataURL()
          return img
        })(),
        delay: frame.delay,
        width: frame.width,
        height: frame.height,
      })),
      currentFrameIndex: layer.currentFrameIndex || 0,
    }))
})

// キャンバス設定（ローカルストレージに保存）
export const canvasSettingsAtom = atomWithStorage<CanvasSettings>('canvasSettings', {
  width: 1920,
  height: 1080,
  backgroundColor: '#ffffff',
  outputFormat: 'png',
  quality: 100,
})

// 出力設定（ローカルストレージに保存）
export const outputSettingsAtom = atomWithStorage<OutputSettings>('outputSettings', {
  format: 'png',
  width: 1920,
  height: 1080,
  quality: 100,
})

// UI状態
export const previewModeAtom = atom<boolean>(false)
export const isGeneratingAtom = atom<boolean>(false)

// レイヤー操作用のアクション
export const addLayerAtom = atom(
  null,
  (get, set, newLayer: Omit<ImageLayer, 'id' | 'zIndex'>) => {
    const layers = get(layersAtom)
    const maxZIndex = layers.length > 0 ? Math.max(...layers.map(l => l.zIndex)) : -1

    const layer: ImageLayer = {
      ...newLayer,
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      zIndex: maxZIndex + 1,
    }

    set(layersAtom, [...layers, layer])
    set(selectedLayerIdAtom, layer.id)
    return layer
  }
)

export const removeLayerAtom = atom(
  null,
  (get, set, layerId: string) => {
    const layers = get(layersAtom)
    const selectedId = get(selectedLayerIdAtom)

    set(layersAtom, layers.filter(l => l.id !== layerId))

    // 削除されたレイヤーが選択されていた場合、選択を解除
    if (selectedId === layerId) {
      set(selectedLayerIdAtom, null)
    }
  }
)

export const updateLayerAtom = atom(
  null,
  (get, set, layerId: string, updates: Partial<ImageLayer>) => {
    const layers = get(layersAtom)
    set(layersAtom, layers.map(layer =>
      layer.id === layerId ? { ...layer, ...updates } : layer
    ))
  }
)

export const reorderLayerAtom = atom(
  null,
  (get, set, layerId: string, newZIndex: number) => {
    const layers = get(layersAtom)
    const targetLayer = layers.find(l => l.id === layerId)

    if (!targetLayer) return

    // Z-indexを再計算
    const updatedLayers = layers.map(layer => {
      if (layer.id === layerId) {
        return { ...layer, zIndex: newZIndex }
      }

      // 他のレイヤーのz-indexを調整
      if (layer.zIndex >= newZIndex && layer.id !== layerId) {
        return { ...layer, zIndex: layer.zIndex + 1 }
      }

      return layer
    })

    // z-indexでソート
    updatedLayers.sort((a, b) => a.zIndex - b.zIndex)

    set(layersAtom, updatedLayers)
  }
)

// レイヤーの表示/非表示切り替え
export const toggleLayerVisibilityAtom = atom(
  null,
  (get, set, layerId: string) => {
    const layers = get(layersAtom)
    set(layersAtom, layers.map(layer =>
      layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
    ))
  }
)

// GIFレイヤーのフレーム選択
export const setLayerFrameAtom = atom(
  null,
  (get, set, layerId: string, frameIndex: number) => {
    const layers = get(layersAtom)
    set(layersAtom, layers.map(layer =>
      layer.id === layerId ? { ...layer, currentFrameIndex: frameIndex } : layer
    ))
  }
)

// GIFアニメーション制御
export interface AnimationSettings {
  /** アニメーション再生中かどうか */
  isPlaying: boolean
  /** 再生速度倍率（1.0が標準速度） */
  playbackSpeed: number
  /** ループ再生するかどうか */
  loop: boolean
}

export const animationSettingsAtom = atom<AnimationSettings>({
  isPlaying: false,
  playbackSpeed: 1.0,
  loop: true,
})

// アニメーション制御アクション
export const toggleAnimationAtom = atom(
  null,
  (get, set) => {
    const settings = get(animationSettingsAtom)
    set(animationSettingsAtom, { ...settings, isPlaying: !settings.isPlaying })
  }
)

export const setAnimationPlaybackSpeedAtom = atom(
  null,
  (get, set, speed: number) => {
    const settings = get(animationSettingsAtom)
    const validSpeed = Math.max(0.1, Math.min(5.0, speed)) // 0.1x - 5.0x に制限
    set(animationSettingsAtom, { ...settings, playbackSpeed: validSpeed })
  }
)

export const setAnimationLoopAtom = atom(
  null,
  (get, set, loop: boolean) => {
    const settings = get(animationSettingsAtom)
    set(animationSettingsAtom, { ...settings, loop })
  }
)

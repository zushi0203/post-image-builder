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

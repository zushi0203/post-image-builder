import React from 'react'
import './LayerManager.css'

export interface Layer {
  id: string
  name: string
  type: 'image' | 'background'
  visible: boolean
  zIndex: number
}

export interface LayerManagerProps {
  layers: Layer[]
  onLayerSelect?: (layerId: string) => void
  onLayerVisibilityToggle?: (layerId: string) => void
  onLayerReorder?: (layerId: string, newIndex: number) => void
  selectedLayerId?: string
  className?: string
}

export const LayerManager = ({
  layers,
  onLayerSelect,
  onLayerVisibilityToggle,
  onLayerReorder,
  selectedLayerId,
  className = '',
}: LayerManagerProps) => {
  return (
    <div className={`layer-manager ${className}`}>
      <h2 className="layer-manager-title">画像の重なり</h2>
      <div className="layer-list">
        {layers.map((layer) => (
          <LayerItem
            key={layer.id}
            layer={layer}
            isSelected={selectedLayerId === layer.id}
            onSelect={() => onLayerSelect?.(layer.id)}
            onVisibilityToggle={() => onLayerVisibilityToggle?.(layer.id)}
          />
        ))}
        {layers.length === 0 && (
          <div className="layer-list-empty">
            <p>レイヤーがありません</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface LayerItemProps {
  layer: Layer
  isSelected: boolean
  onSelect: () => void
  onVisibilityToggle: () => void
}

const LayerItem = ({ layer, isSelected, onSelect, onVisibilityToggle }: LayerItemProps) => {
  return (
    <div
      className={`layer-item ${isSelected ? 'layer-item-selected' : ''}`}
      onClick={onSelect}
    >
      <span className="layer-icon">
        {layer.type === 'image' ? 'img' : 'bg'}
      </span>
      <span className="layer-name">{layer.name}</span>
      <button
        className={`layer-visibility-btn ${layer.visible ? 'visible' : 'hidden'}`}
        onClick={(e) => {
          e.stopPropagation()
          onVisibilityToggle()
        }}
        aria-label={layer.visible ? 'レイヤーを非表示' : 'レイヤーを表示'}
      >
        {layer.visible ? '👁' : '🚫'}
      </button>
    </div>
  )
}

export default LayerManager

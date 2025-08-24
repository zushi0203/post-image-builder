import { Button } from "../../primitives/Button";
import "./LayerManager.css";

export interface Layer {
  id: string;
  name: string;
  type: "image" | "background" | "gif";
  visible: boolean;
  zIndex: number;
  averageDelayMs?: number; // GIFレイヤーの平均ディレイ（ms）
}

export interface LayerManagerProps {
  layers: Layer[];
  onLayerSelect?: (layerId: string) => void;
  onLayerVisibilityToggle?: (layerId: string) => void;
  selectedLayerId?: string;
  className?: string;
}

export const LayerManager = ({
  layers,
  onLayerSelect,
  onLayerVisibilityToggle,
  selectedLayerId,
  className = "",
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
  );
};

interface LayerItemProps {
  layer: Layer;
  isSelected: boolean;
  onSelect: () => void;
  onVisibilityToggle: () => void;
}

const LayerItem = ({
  layer,
  isSelected,
  onSelect,
  onVisibilityToggle,
}: LayerItemProps) => {
  return (
    <div
      className={`layer-item ${isSelected ? "layer-item-selected" : ""}`}
      onClick={onSelect}
    >
      <span className="layer-icon">
        {layer.type === "gif" ? "🎬" : layer.type === "image" ? "🖼️" : "🎨"}
      </span>
      <div className="layer-info">
        <span className="layer-name">{layer.name}</span>
        {layer.type === "gif" && layer.averageDelayMs && (
          <span className="layer-delay">{layer.averageDelayMs}ms</span>
        )}
      </div>
      <Button
        variant="secondary"
        size="small"
        className={`layer-visibility-btn ${layer.visible ? "visible" : "hidden"}`}
        onPress={(_e) => {
          // e?.stopPropagation?.();
          onVisibilityToggle();
        }}
      >
        {layer.visible ? "👁" : "🚫"}
      </Button>
    </div>
  );
};

export default LayerManager;

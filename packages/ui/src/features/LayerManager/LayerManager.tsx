import { Button } from "../../primitives/Button";
import { ListBox, ListBoxItem, useDragAndDrop } from "react-aria-components";
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
  onLayerReorder?: (
    draggedKeys: string[],
    targetKey: string,
    position: "before" | "after",
  ) => void;
  selectedLayerId?: string;
  className?: string;
}

export const LayerManager = ({
  layers,
  onLayerSelect,
  onLayerVisibilityToggle,
  onLayerReorder,
  selectedLayerId,
  className = "",
}: LayerManagerProps) => {
  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) =>
      [...keys].map((key) => {
        const layer = layers.find((l) => l.id === key);
        return {
          "text/plain": layer?.name || key.toString(),
        };
      }),
    onReorder: (e) => {
      if (!onLayerReorder) return;

      const draggedKeys = [...e.keys].map((key) => key.toString());
      const targetKey = e.target.key.toString();
      const position = e.target.dropPosition;

      console.log("LayerManager drag & drop:", {
        draggedKeys,
        targetKey,
        position,
      });

      // "on"の場合は"after"として扱う
      const normalizedPosition = position === "on" ? "after" : position;
      onLayerReorder(draggedKeys, targetKey, normalizedPosition);
    },
  });

  return (
    <div className={`layer-manager ${className}`}>
      <h2 className="layer-manager-title">画像の重なり</h2>
      {layers.length === 0 ? (
        <div className="layer-list-empty">
          <p>レイヤーがありません</p>
        </div>
      ) : (
        <ListBox
          className="layer-list"
          aria-label="レイヤー一覧"
          selectionMode="single"
          selectedKeys={selectedLayerId ? [selectedLayerId] : []}
          onSelectionChange={(keys) => {
            const key = [...keys][0];
            onLayerSelect?.(key?.toString() || "");
          }}
          items={layers}
          dragAndDropHooks={dragAndDropHooks}
        >
          {(layer) => (
            <ListBoxItem key={layer.id} id={layer.id} className="layer-item">
              <span className="layer-icon">
                {layer.type === "gif"
                  ? "🎬"
                  : layer.type === "image"
                    ? "🖼️"
                    : "🎨"}
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
                  onLayerVisibilityToggle?.(layer.id);
                }}
              >
                {layer.visible ? "👁" : "🚫"}
              </Button>
            </ListBoxItem>
          )}
        </ListBox>
      )}
    </div>
  );
};

export default LayerManager;

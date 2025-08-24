import { useCallback } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  layersAtom,
  selectedLayerIdAtom,
  selectedLayerAtom,
  removeLayerAtom,
  updateLayerAtom,
  toggleLayerVisibilityAtom,
  reorderLayerAtom,
} from "../store/atoms";
import type { ImageLayer } from "../store/types";

export const useLayerManager = () => {
  const [layers] = useAtom(layersAtom);
  const [selectedLayerId, setSelectedLayerId] = useAtom(selectedLayerIdAtom);
  const selectedLayer = useAtomValue(selectedLayerAtom);

  const removeLayer = useSetAtom(removeLayerAtom);
  const updateLayer = useSetAtom(updateLayerAtom);
  const toggleLayerVisibility = useSetAtom(toggleLayerVisibilityAtom);
  const reorderLayer = useSetAtom(reorderLayerAtom);

  const selectLayer = useCallback(
    (layerId: string | null) => {
      setSelectedLayerId(layerId);
    },
    [setSelectedLayerId],
  );

  const duplicateLayer = useCallback(
    (layerId: string) => {
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;

      // 複製したレイヤーを作成
      const duplicatedLayer: Omit<ImageLayer, "id" | "zIndex"> = {
        ...layer,
        name: `${layer.name} (コピー)`,
        position: {
          x: layer.position.x + 20,
          y: layer.position.y + 20,
        },
      };

      // TODO: addLayerAtomを使って追加
      console.log("Duplicate layer:", duplicatedLayer);
    },
    [layers],
  );

  const moveLayerUp = useCallback(
    (layerId: string) => {
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;

      const maxZIndex = Math.max(...layers.map((l) => l.zIndex));
      if (layer.zIndex < maxZIndex) {
        reorderLayer(layerId, layer.zIndex + 1);
      }
    },
    [layers, reorderLayer],
  );

  const moveLayerDown = useCallback(
    (layerId: string) => {
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;

      const minZIndex = Math.min(...layers.map((l) => l.zIndex));
      if (layer.zIndex > minZIndex) {
        reorderLayer(layerId, layer.zIndex - 1);
      }
    },
    [layers, reorderLayer],
  );

  const updateLayerProperty = useCallback(
    <K extends keyof ImageLayer>(
      layerId: string,
      property: K,
      value: ImageLayer[K],
    ) => {
      const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
      console.log(
        `⚙️ [${timestamp}] useLayerManager: Updating ${property} for layer "${layerId}":`,
        value,
      );
      updateLayer(layerId, { [property]: value });
    },
    [updateLayer],
  );

  // レイヤーをz-indexでソート（上から下へ）
  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  return {
    layers: sortedLayers,
    selectedLayerId,
    selectedLayer,
    selectLayer,
    removeLayer,
    duplicateLayer,
    toggleLayerVisibility,
    updateLayerProperty,
    moveLayerUp,
    moveLayerDown,
  };
};

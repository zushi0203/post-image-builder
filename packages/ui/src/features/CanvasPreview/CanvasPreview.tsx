import React, { useRef } from "react";
import type {
  CanvasPreviewProps,
  CanvasPreviewRef,
} from "./defs/CanvasPreviewTypes";
import { useCanvasRenderer } from "./logics/useCanvasRenderer";
import { useLayerInteraction } from "./logics/useLayerInteraction";
import { useCanvasCoordinates } from "./logics/useCanvasCoordinates";
import { useOptimisticState } from "./logics/useOptimisticState";
import "./CanvasPreview.css";

export const CanvasPreview = React.forwardRef<
  CanvasPreviewRef,
  CanvasPreviewProps
>(({ layers, canvasSettings, onLayerPositionChange, onLayerSelect }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 楽観的UI更新の管理
  const {
    optimisticLayers,
    updateOptimisticPosition,
    clearOptimisticState,
    hasOptimisticState,
  } = useOptimisticState(layers);

  // カスタムフックで機能を分離
  const { getCanvasCoordinates } = useCanvasCoordinates(canvasRef);

  // スナップ機能の状態管理
  const [snapEnabled] = React.useState(true);
  const [currentSnapResult, setCurrentSnapResult] = React.useState<any>(null);

  // 楽観的状態更新を含むレイヤーインタラクション（スナップ機能付き）
  const {
    selectedLayerId,
    isDragging,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    commitOptimisticState,
  } = useLayerInteraction(
    optimisticLayers,
    canvasSettings,
    { enabled: snapEnabled },
    // ドラッグ中の処理
    (layerId, position) => {
      updateOptimisticPosition(layerId, position);
    },
    // ドラッグ完了時の処理
    (layerId, position) => {
      onLayerPositionChange?.(layerId, position);
      clearOptimisticState(layerId);
    },
    // スナップ状態変更時の処理
    (snapResult) => {
      setCurrentSnapResult(snapResult);
    },
    // レイヤー選択時の処理（新規追加）
    onLayerSelect,
  );

  // 外部から呼び出し可能な状態確定機能をrefで公開
  React.useImperativeHandle(
    ref,
    () => ({
      commitOptimisticState: () => {
        console.log("📋 CanvasPreview: Committing optimistic state...");
        let committed = false;

        // 進行中のドラッグ操作を即座に確定
        if (commitOptimisticState()) {
          committed = true;
          console.log("✅ Drag state committed");
        }

        // 楽観的状態がある場合は全て確定
        if (hasOptimisticState) {
          optimisticLayers.forEach((layer) => {
            const originalLayer = layers.find((l) => l.id === layer.id);
            if (
              originalLayer &&
              (layer.position.x !== originalLayer.position.x ||
                layer.position.y !== originalLayer.position.y)
            ) {
              console.log(
                `🔄 Committing position for layer "${layer.name}":`,
                layer.position,
              );
              onLayerPositionChange?.(layer.id, layer.position);
              clearOptimisticState(layer.id);
              committed = true;
            }
          });
        }

        return committed;
      },
    }),
    [
      commitOptimisticState,
      hasOptimisticState,
      optimisticLayers,
      layers,
      onLayerPositionChange,
      clearOptimisticState,
    ],
  );

  // キャンバス描画の管理（楽観的レイヤーを使用）
  const displayLayers = hasOptimisticState ? optimisticLayers : layers;
  const displaySelectedLayer = selectedLayerId
    ? displayLayers.find((layer) => layer.id === selectedLayerId) || null
    : null;

  const { scheduleRedraw } = useCanvasRenderer(
    canvasRef,
    displayLayers,
    canvasSettings,
    displaySelectedLayer,
    isDragging,
    currentSnapResult,
    snapEnabled,
  );

  // マウスイベントハンドラー
  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coordinates = getCanvasCoordinates(e);
    handleMouseDown(coordinates);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coordinates = getCanvasCoordinates(e);
    handleMouseMove(coordinates);

    // ドラッグ中の再描画スケジューリング
    if (isDragging) {
      scheduleRedraw();
    }
  };

  const onMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coordinates = getCanvasCoordinates(e);
    handleMouseUp(coordinates);
  };

  // カーソルの状態を決定
  const getCursorStyle = () => {
    if (isDragging) return "grabbing";
    if (selectedLayerId) return "grab";
    return "default";
  };

  return (
    <div className="canvas-preview">
      <canvas
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{
          border: "1px solid #ccc",
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          imageRendering: "pixelated",
          cursor: getCursorStyle(),
        }}
      />
    </div>
  );
});

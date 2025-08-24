import { useState, useCallback } from "react";
import type { ImageLayer, CanvasCoordinates } from "../defs/CanvasPreviewTypes";
import type { CanvasSettings } from "../defs/CanvasPreviewTypes";
import { useThrottle, useDebounce } from "./useThrottle";
import { useHitTestCache } from "./useCoordinateCache";
import {
  useCanvasSnap,
  type SnapResult,
  type CanvasSnapOptions,
} from "./useCanvasSnap";

/**
 * レイヤーインタラクション（選択、ドラッグ）を管理するカスタムフック
 */
export const useLayerInteraction = (
  layers: ImageLayer[],
  canvasSettings: CanvasSettings,
  snapOptions?: Partial<CanvasSnapOptions>,
  onDragPositionChange?: (layerId: string, position: CanvasCoordinates) => void,
  onDragComplete?: (layerId: string, position: CanvasCoordinates) => void,
  onSnapStateChange?: (snapResult: SnapResult) => void,
  onLayerSelect?: (layerId: string | null) => void,
) => {
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<CanvasCoordinates>({
    x: 0,
    y: 0,
  });
  const [currentSnapResult, setCurrentSnapResult] = useState<SnapResult | null>(
    null,
  );

  // スナップ機能の初期化
  const { findNearestSnapPoint } = useCanvasSnap(canvasSettings, snapOptions);

  // スロットリングされた位置更新（16ms = 60FPS制限）
  const throttledPositionChange = useThrottle(
    (layerId: string, position: CanvasCoordinates) => {
      onDragPositionChange?.(layerId, position);
    },
    16,
  );

  // デバウンスされた最終位置更新（ドラッグ終了後の確定）
  const debouncedPositionChange = useDebounce(
    (layerId: string, position: CanvasCoordinates) => {
      onDragComplete?.(layerId, position);
    },
    100,
  );

  // ヒットテスト用の最適化されたキャッシュ
  const hitTest = useHitTestCache(layers);

  /**
   * レイヤー選択の変更を処理し、親コンポーネントに通知
   */
  const handleLayerSelection = useCallback(
    (layerId: string | null) => {
      setSelectedLayerId(layerId);
      onLayerSelect?.(layerId);
    },
    [onLayerSelect],
  );

  /**
   * マウスダウンイベント処理
   */
  const handleMouseDown = useCallback(
    (coordinates: CanvasCoordinates) => {
      const { x, y } = coordinates;
      const clickedLayer = hitTest(x, y);

      if (clickedLayer) {
        handleLayerSelection(clickedLayer.id);
        setIsDragging(true);
        setDragOffset({
          x: x - clickedLayer.position.x,
          y: y - clickedLayer.position.y,
        });
      } else {
        handleLayerSelection(null);
      }
    },
    [hitTest, handleLayerSelection],
  );

  /**
   * マウスムーブイベント処理（スナップ機能付きスロットリング適用）
   */
  const handleMouseMove = useCallback(
    (coordinates: CanvasCoordinates) => {
      if (!isDragging || !selectedLayerId) return;

      const { x, y } = coordinates;
      const rawPosition = {
        x: x - dragOffset.x,
        y: y - dragOffset.y,
      };

      // 選択中のレイヤー情報を取得
      const selectedLayer = layers.find(
        (layer) => layer.id === selectedLayerId,
      );

      // スナップ機能を適用（レイヤー情報を渡す）
      const snapResult = findNearestSnapPoint(rawPosition, selectedLayer);
      setCurrentSnapResult(snapResult);
      onSnapStateChange?.(snapResult);

      // スナップされた位置または元の位置を使用
      const finalPosition = snapResult.snapped
        ? snapResult.position
        : rawPosition;

      // ドラッグ中は高頻度でスロットリング更新
      throttledPositionChange(selectedLayerId, finalPosition);
    },
    [
      isDragging,
      selectedLayerId,
      dragOffset,
      findNearestSnapPoint,
      throttledPositionChange,
      onSnapStateChange,
      layers,
    ],
  );

  /**
   * マウスアップイベント処理（スナップ機能付き即座同期 + デバウンス適用）
   */
  const handleMouseUp = useCallback(
    (finalPosition?: CanvasCoordinates) => {
      if (isDragging && selectedLayerId && finalPosition) {
        // 最終位置を計算
        const rawPosition = {
          x: finalPosition.x - dragOffset.x,
          y: finalPosition.y - dragOffset.y,
        };

        // 選択中のレイヤー情報を取得
        const selectedLayer = layers.find(
          (layer) => layer.id === selectedLayerId,
        );

        // 最終的なスナップ判定（レイヤー情報を渡す）
        const snapResult = findNearestSnapPoint(rawPosition, selectedLayer);
        const newPosition = snapResult.snapped
          ? snapResult.position
          : rawPosition;

        console.log(
          `🎯 Layer "${selectedLayerId}" drag completed. Final position:`,
          newPosition,
        );
        if (snapResult.snapped) {
          console.log(
            `📌 Snapped to ${snapResult.snapPoint?.name} (${snapResult.snapPoint?.id}) via ${snapResult.layerAnchor}`,
          );
        }

        // ドラッグ状態を先にクリアしてから完了処理を実行
        setIsDragging(false);
        setCurrentSnapResult(null);

        // 即座にドラッグ完了処理を実行（GIF生成などの即座処理用）
        onDragComplete?.(selectedLayerId, newPosition);

        // デバウンス更新もスケジュール（重複防止のため後続処理）
        debouncedPositionChange(selectedLayerId, newPosition);
      } else {
        setIsDragging(false);
        setCurrentSnapResult(null);
      }
    },
    [
      isDragging,
      selectedLayerId,
      dragOffset,
      findNearestSnapPoint,
      onDragComplete,
      debouncedPositionChange,
      layers,
    ],
  );

  /**
   * 楽観的状態を即座に確定する関数（外部から呼び出し可能）
   */
  const commitOptimisticState = useCallback(() => {
    if (isDragging && selectedLayerId) {
      console.log(
        `⚡ Force committing optimistic state for layer: ${selectedLayerId}`,
      );
      setIsDragging(false);
      return true;
    }
    return false;
  }, [isDragging, selectedLayerId]);

  /**
   * 選択されたレイヤーを取得
   */
  const selectedLayer = selectedLayerId
    ? layers.find((layer) => layer.id === selectedLayerId) || null
    : null;

  return {
    selectedLayerId,
    selectedLayer,
    isDragging,
    currentSnapResult,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    commitOptimisticState,
  };
};

import { useCallback } from "react";
import type { CanvasCoordinates } from "../defs/CanvasPreviewTypes";

/**
 * キャンバス座標変換を管理するカスタムフック
 */
export const useCanvasCoordinates = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
) => {
  /**
   * マウス座標をキャンバス座標に変換
   */
  const getCanvasCoordinates = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): CanvasCoordinates => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [canvasRef],
  );

  return {
    getCanvasCoordinates,
  };
};

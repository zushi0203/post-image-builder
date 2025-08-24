import { useRef, useCallback } from "react";

/**
 * requestAnimationFrameを使った描画頻度制御フック
 */
export const useAnimationFrame = () => {
  const frameId = useRef<number | null>(null);

  /**
   * アニメーションフレームをキャンセル
   */
  const cancelFrame = useCallback(() => {
    if (frameId.current !== null) {
      cancelAnimationFrame(frameId.current);
      frameId.current = null;
    }
  }, []);

  /**
   * 次のアニメーションフレームで関数を実行
   */
  const requestFrame = useCallback(
    (callback: () => void) => {
      cancelFrame(); // 前回のフレームをキャンセル
      frameId.current = requestAnimationFrame(callback);
    },
    [cancelFrame],
  );

  return {
    requestFrame,
    cancelFrame,
  };
};

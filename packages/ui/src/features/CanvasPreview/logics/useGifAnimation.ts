import { useRef, useCallback, useEffect } from "react";
import type { ImageLayer } from "../defs/CanvasPreviewTypes";

/**
 * アニメーション設定定数
 */
const DEFAULT_TARGET_FPS = 29.97;

/**
 * GIF正規化情報
 */
interface NormalizedGifInfo {
  /** 元GIFの総再生時間（ミリ秒） */
  totalDuration: number;
  /** 指定FPSでの総フレーム数 */
  normalizedFrameCount: number;
  /** 元フレーム数 */
  originalFrameCount: number;
  /** フレームスキップ比率 */
  frameSkipRatio: number;
}

/**
 * GIFアニメーション状態
 */
export interface GifAnimationState {
  /** 再生中かどうか */
  isPlaying: boolean;
  /** 30FPS基準での現在フレームインデックス */
  currentNormalizedFrame: number;
  /** 最後にフレームを更新した時間 */
  lastFrameTime: number;
  /** アニメーション速度倍率 */
  playbackSpeed: number;
  /** 正規化されたGIF情報 */
  normalizedInfo?: NormalizedGifInfo | null;
}

/**
 * アニメーション制御結果
 */
export interface AnimationControl {
  /** 再生開始 */
  play: () => void;
  /** 再生停止 */
  pause: () => void;
  /** 再生/停止トグル */
  togglePlayPause: () => void;
  /** フレームリセット（最初のフレームに戻る） */
  reset: () => void;
  /** 再生速度設定（1.0が標準速度） */
  setPlaybackSpeed: (speed: number) => void;
  /** 手動でフレームを設定 */
  setFrame: (layerId: string, frameIndex: number) => void;
  /** アニメーション状態を取得 */
  getAnimationState: (layerId: string) => GifAnimationState | null;
}

/**
 * GIF情報を指定FPS用に正規化
 */
const normalizeGifInfo = (
  layer: ImageLayer,
  targetFps: number = DEFAULT_TARGET_FPS,
): NormalizedGifInfo | null => {
  if (!layer.gifInfo || layer.gifInfo.frames.length === 0) return null;

  const { frames } = layer.gifInfo;

  // 元GIFの総再生時間を計算
  const totalDuration = frames.reduce((sum, frame) => sum + frame.delay, 0);

  // 指定FPSでの総フレーム数を計算
  const frameInterval = 1000 / targetFps;
  const normalizedFrameCount = Math.ceil(totalDuration / frameInterval);

  // フレームスキップ比率を計算
  const frameSkipRatio = frames.length / Math.max(normalizedFrameCount, 1);

  return {
    totalDuration,
    normalizedFrameCount,
    originalFrameCount: frames.length,
    frameSkipRatio,
  };
};

/**
 * 30FPS正規化フレームから元GIFフレームインデックスを計算
 */
const calculateOriginalFrameIndex = (
  normalizedFrame: number,
  normalizedInfo: NormalizedGifInfo,
): number => {
  const originalIndex = Math.floor(
    normalizedFrame * normalizedInfo.frameSkipRatio,
  );
  return Math.min(originalIndex, normalizedInfo.originalFrameCount - 1);
};

/**
 * GIFアニメーション制御フック
 */
export const useGifAnimation = (
  layers: ImageLayer[],
  fps: number = DEFAULT_TARGET_FPS,
  onFrameUpdate?: (layerId: string, frameIndex: number) => void,
): AnimationControl => {
  // 各レイヤーのアニメーション状態を保持
  const animationStatesRef = useRef<Map<string, GifAnimationState>>(new Map());
  const animationIdRef = useRef<number | null>(null);

  // GIFレイヤーのみを抽出
  const gifLayers = layers.filter(
    (layer) =>
      layer.type === "gif" && layer.gifInfo && layer.gifInfo.frames.length > 0,
  );

  /**
   * アニメーション状態を初期化
   */
  const initializeAnimationState = useCallback(
    (layer: ImageLayer): GifAnimationState => {
      const normalizedInfo = normalizeGifInfo(layer, fps);

      return {
        isPlaying: false,
        currentNormalizedFrame: 0,
        lastFrameTime: 0,
        playbackSpeed: 1.0,
        normalizedInfo,
      };
    },
    [fps],
  );

  /**
   * 特定レイヤーのアニメーション状態を取得
   */
  const getAnimationState = useCallback(
    (layerId: string): GifAnimationState | null => {
      return animationStatesRef.current.get(layerId) || null;
    },
    [],
  );

  /**
   * アニメーションフレームを更新（指定FPS）
   */
  const updateAnimation = useCallback(
    (currentTime: number) => {
      const frameInterval = 1000 / fps;
      const states = animationStatesRef.current;
      let hasActiveAnimation = false;

      for (const layer of gifLayers) {
        const state = states.get(layer.id);
        if (!state || !state.isPlaying || !state.normalizedInfo) continue;

        hasActiveAnimation = true;

        // 初回実行時の時間設定
        if (state.lastFrameTime === 0) {
          state.lastFrameTime = currentTime;
          continue;
        }

        const deltaTime = currentTime - state.lastFrameTime;
        const adjustedDeltaTime = deltaTime * state.playbackSpeed;

        // 指定FPS間隔でフレーム更新
        if (adjustedDeltaTime >= frameInterval) {
          // 次の正規化フレームに進む
          const nextNormalizedFrame =
            (state.currentNormalizedFrame + 1) %
            state.normalizedInfo.normalizedFrameCount;

          // 元GIFフレームインデックスを計算
          const originalFrameIndex = calculateOriginalFrameIndex(
            nextNormalizedFrame,
            state.normalizedInfo,
          );

          // 状態更新
          state.currentNormalizedFrame = nextNormalizedFrame;
          state.lastFrameTime = currentTime;

          // 外部への通知（元GIFのフレームインデックス）
          onFrameUpdate?.(layer.id, originalFrameIndex);
        }
      }

      // アクティブなアニメーションがある場合は次のフレームをリクエスト
      if (hasActiveAnimation) {
        animationIdRef.current = requestAnimationFrame(updateAnimation);
      } else {
        animationIdRef.current = null;
      }
    },
    [gifLayers, onFrameUpdate, fps],
  );

  /**
   * アニメーションループを開始
   */
  const startAnimationLoop = useCallback(() => {
    if (animationIdRef.current !== null) return; // 既に実行中

    animationIdRef.current = requestAnimationFrame(updateAnimation);
  }, [updateAnimation]);

  /**
   * アニメーションループを停止
   */
  const stopAnimationLoop = useCallback(() => {
    if (animationIdRef.current !== null) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
  }, []);

  /**
   * 全てのアニメーションを再生
   */
  const play = useCallback(() => {
    const states = animationStatesRef.current;
    let hasGifLayer = false;

    for (const layer of gifLayers) {
      hasGifLayer = true;
      let state = states.get(layer.id);

      if (!state) {
        state = initializeAnimationState(layer);
        states.set(layer.id, state);
      }

      state.isPlaying = true;
      state.lastFrameTime = 0; // 次の更新で現在時刻が設定される
    }

    if (hasGifLayer) {
      startAnimationLoop();
    }
  }, [gifLayers, initializeAnimationState, startAnimationLoop]);

  /**
   * 全てのアニメーションを停止
   */
  const pause = useCallback(() => {
    const states = animationStatesRef.current;

    for (const layer of gifLayers) {
      const state = states.get(layer.id);
      if (state) {
        state.isPlaying = false;
      }
    }

    stopAnimationLoop();
  }, [gifLayers, stopAnimationLoop]);

  /**
   * 再生/停止をトグル
   */
  const togglePlayPause = useCallback(() => {
    const states = animationStatesRef.current;
    const isAnyPlaying = gifLayers.some((layer) => {
      const state = states.get(layer.id);
      return state?.isPlaying;
    });

    if (isAnyPlaying) {
      pause();
    } else {
      play();
    }
  }, [gifLayers, play, pause]);

  /**
   * 全てのアニメーションをリセット（最初のフレームに戻す）
   */
  const reset = useCallback(() => {
    const states = animationStatesRef.current;

    for (const layer of gifLayers) {
      const state = states.get(layer.id);
      if (state) {
        state.currentNormalizedFrame = 0;
        state.lastFrameTime = 0;

        // 外部への通知（元GIFの最初のフレーム）
        onFrameUpdate?.(layer.id, 0);
      }
    }
  }, [gifLayers, onFrameUpdate]);

  /**
   * 再生速度を設定
   */
  const setPlaybackSpeed = useCallback(
    (speed: number) => {
      const states = animationStatesRef.current;
      const validSpeed = Math.max(0.1, Math.min(5.0, speed)); // 0.1x - 5.0x に制限

      for (const layer of gifLayers) {
        const state = states.get(layer.id);
        if (state) {
          state.playbackSpeed = validSpeed;
        }
      }
    },
    [gifLayers],
  );

  /**
   * 手動でフレームを設定
   */
  const setFrame = useCallback(
    (layerId: string, frameIndex: number) => {
      const layer = gifLayers.find((l) => l.id === layerId);
      if (!layer || !layer.gifInfo) return;

      const states = animationStatesRef.current;
      let state = states.get(layerId);

      if (!state) {
        state = initializeAnimationState(layer);
        states.set(layerId, state);
      }

      const validIndex = Math.max(
        0,
        Math.min(frameIndex, layer.gifInfo.frames.length - 1),
      );

      // 正規化フレームを逆算（手動設定時は元フレーム基準）
      if (state.normalizedInfo) {
        const normalizedFrame = Math.round(
          validIndex / state.normalizedInfo.frameSkipRatio,
        );
        state.currentNormalizedFrame = Math.min(
          normalizedFrame,
          state.normalizedInfo.normalizedFrameCount - 1,
        );
      }

      state.lastFrameTime = 0;

      // 外部への通知
      onFrameUpdate?.(layerId, validIndex);
    },
    [gifLayers, initializeAnimationState, onFrameUpdate],
  );

  /**
   * レイヤー変更時の状態同期
   */
  useEffect(() => {
    const states = animationStatesRef.current;
    const currentLayerIds = new Set(gifLayers.map((l) => l.id));

    // 削除されたレイヤーの状態をクリーンアップ
    for (const [layerId] of states) {
      if (!currentLayerIds.has(layerId)) {
        states.delete(layerId);
      }
    }
  }, [gifLayers]);

  /**
   * アンマウント時のクリーンアップ
   */
  useEffect(() => {
    return () => {
      stopAnimationLoop();
    };
  }, [stopAnimationLoop]);

  return {
    play,
    pause,
    togglePlayPause,
    reset,
    setPlaybackSpeed,
    setFrame,
    getAnimationState,
  };
};

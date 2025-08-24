import type {
  ImageLayer,
  CanvasSettings,
  LayerDrawParams,
} from "../defs/CanvasPreviewTypes";
import type { SnapPoint, SnapResult } from "./useCanvasSnap";
import { CANVAS_CONSTANTS } from "../defs/canvasPreviewConstants";

/**
 * キャンバスを初期化し、背景色を設定
 */
export const initializeCanvas = (
  canvas: HTMLCanvasElement,
  canvasSettings: CanvasSettings,
): CanvasRenderingContext2D | null => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // キャンバスサイズを設定
  canvas.width = canvasSettings.width;
  canvas.height = canvasSettings.height;

  // ドット絵のピクセルパーフェクト表示のためスムージングを無効化
  ctx.imageSmoothingEnabled = false;

  // キャンバスをクリア
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 背景色を設定
  if (canvasSettings.backgroundColor) {
    ctx.fillStyle = canvasSettings.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  return ctx;
};

/**
 * 出力サイズの座標を計算
 */
export const calculateOutputBounds = (canvas: HTMLCanvasElement) => {
  const { WIDTH: outputWidth, HEIGHT: outputHeight } =
    CANVAS_CONSTANTS.OUTPUT_SIZE;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const outputX = centerX - outputWidth / 2;
  const outputY = centerY - outputHeight / 2;

  return {
    outputX,
    outputY,
    outputWidth,
    outputHeight,
  };
};

/**
 * 効率的な回転変換の適用
 */
const applyRotationTransform = (
  ctx: CanvasRenderingContext2D,
  layer: ImageLayer,
): boolean => {
  if (layer.rotation === 0) return false;

  const radians = (layer.rotation * Math.PI) / 180;
  ctx.translate(layer.position.x, layer.position.y);
  ctx.rotate(radians);
  ctx.translate(-layer.position.x, -layer.position.y);
  return true;
};

/**
 * 描画用の画像ソースを取得（通常画像またはGIFフレーム）
 */
const getImageSource = (layer: ImageLayer): CanvasImageSource | null => {
  // GIFレイヤーの場合は現在のフレームを取得
  if (
    layer.type === "gif" &&
    layer.gifInfo &&
    layer.gifInfo.frames.length > 0
  ) {
    const frameIndex = layer.currentFrameIndex || 0;
    const validIndex = Math.max(
      0,
      Math.min(frameIndex, layer.gifInfo.frames.length - 1),
    );
    const currentFrame = layer.gifInfo.frames[validIndex];
    return currentFrame ? currentFrame.canvas : layer.imageData;
  }

  // 通常の画像レイヤー
  return layer.imageData;
};

/**
 * 画像ソースのサイズを取得
 */
const getImageSize = (
  imageSource: CanvasImageSource,
): { width: number; height: number } => {
  if (imageSource instanceof HTMLImageElement) {
    return {
      width: imageSource.naturalWidth,
      height: imageSource.naturalHeight,
    };
  } else if (imageSource instanceof HTMLCanvasElement) {
    return {
      width: imageSource.width,
      height: imageSource.height,
    };
  }

  // デフォルトサイズ
  return { width: 0, height: 0 };
};
/**
 * GIFレイヤーの場合は全体サイズ、通常画像は個別サイズを取得
 * sandboxの実装に合わせ、GIFの統一サイズを使用する
 */
// const getGifCanvasSize = (
//   layer: ImageLayer,
// ): { width: number; height: number } => {
//   // GIFレイヤーの場合はGIF全体のサイズを使用
//   if (layer.type === "gif" && layer.gifInfo) {
//     return {
//       width: layer.gifInfo.width,
//       height: layer.gifInfo.height,
//     };
//   }

//   // 通常の画像レイヤーは個別サイズを使用
//   const imageSource = getImageSource(layer);
//   if (!imageSource) return { width: 0, height: 0 };

//   return getImageSize(imageSource);
// };

/**
 * 単一レイヤーを統合描画（枠外・枠内を一度の処理で）
 */
const drawLayerOptimized = (
  ctx: CanvasRenderingContext2D,
  params: LayerDrawParams,
): void => {
  const { layer, outputX, outputY, outputWidth, outputHeight } = params;

  // 描画用の画像ソースを取得
  const imageSource = getImageSource(layer);
  if (!imageSource) return;

  // 実際の画像サイズを取得（sandboxと同じ：個別フレームサイズを使用）
  const { width, height } = getImageSize(imageSource);
  const scaledWidth = width * layer.scale;
  const scaledHeight = height * layer.scale;

  // GIFフレームの場合、フレーム位置オフセットを適用
  let offsetX = 0;
  let offsetY = 0;

  if (
    layer.type === "gif" &&
    layer.gifInfo &&
    layer.gifInfo.frames.length > 0
  ) {
    const frameIndex = layer.currentFrameIndex || 0;
    const validIndex = Math.max(
      0,
      Math.min(frameIndex, layer.gifInfo.frames.length - 1),
    );
    const currentFrame = layer.gifInfo.frames[validIndex];

    if (currentFrame) {
      // GIF全体サイズとフレームサイズの差を計算
      const gifWidth = layer.gifInfo.width * layer.scale;
      const gifHeight = layer.gifInfo.height * layer.scale;

      // GIF全体を基準とした中央配置の起点
      const gifX = layer.position.x - gifWidth / 2;
      const gifY = layer.position.y - gifHeight / 2;

      // フレームのオフセット位置（スケール適用）
      offsetX = gifX + currentFrame.left * layer.scale;
      offsetY = gifY + currentFrame.top * layer.scale;
    }
  }

  // 最終的な描画位置
  const x = layer.type === "gif" ? offsetX : layer.position.x - scaledWidth / 2;
  const y =
    layer.type === "gif" ? offsetY : layer.position.y - scaledHeight / 2;

  // 1回の save でまとめて処理
  ctx.save();

  // ドット絵のピクセルパーフェクト描画のためスムージングを無効化
  ctx.imageSmoothingEnabled = false;

  // 回転変換を適用（必要時のみ）
  applyRotationTransform(ctx, layer);

  // 枠外部分を半透明で描画
  ctx.globalAlpha = layer.opacity * CANVAS_CONSTANTS.OPACITY.OUTSIDE_FRAME;
  ctx.drawImage(imageSource, x, y, scaledWidth, scaledHeight);

  // 枠内部分を不透明で描画（クリッピングを使用）
  ctx.beginPath();
  ctx.rect(outputX, outputY, outputWidth, outputHeight);
  ctx.clip();

  ctx.globalAlpha = layer.opacity;
  ctx.drawImage(imageSource, x, y, scaledWidth, scaledHeight);

  // 1回の restore でまとめて復元
  ctx.restore();
};

/**
 * 全レイヤーを最適化描画
 */
export const drawLayers = (
  ctx: CanvasRenderingContext2D,
  layers: ImageLayer[],
  outputBounds: {
    outputX: number;
    outputY: number;
    outputWidth: number;
    outputHeight: number;
  },
): void => {
  // レイヤーをzIndexの順序でソート（1回のみ）
  const visibleLayers = layers
    .filter((layer) => layer.visible && layer.imageData)
    .sort((a, b) => a.zIndex - b.zIndex);

  const { outputX, outputY, outputWidth, outputHeight } = outputBounds;

  // 統合描画で各レイヤーを処理
  visibleLayers.forEach((layer) => {
    drawLayerOptimized(ctx, {
      layer,
      outputX,
      outputY,
      outputWidth,
      outputHeight,
    });
  });
};

/**
 * 出力サイズの枠線とラベルを最適化描画
 */
export const drawOutputFrame = (
  ctx: CanvasRenderingContext2D,
  outputBounds: {
    outputX: number;
    outputY: number;
    outputWidth: number;
    outputHeight: number;
  },
): void => {
  const { outputX, outputY, outputWidth, outputHeight } = outputBounds;
  const { OUTPUT_FRAME, LABEL } = CANVAS_CONSTANTS.STYLES;

  // 一度のsave/restoreで枠線とラベルを描画
  ctx.save();

  // 枠線描画
  ctx.strokeStyle = OUTPUT_FRAME.STROKE_COLOR;
  ctx.lineWidth = OUTPUT_FRAME.LINE_WIDTH;
  ctx.setLineDash(OUTPUT_FRAME.LINE_DASH);
  ctx.strokeRect(outputX, outputY, outputWidth, outputHeight);

  // ラベル描画（setLineDashをリセット）
  ctx.setLineDash([]);
  ctx.fillStyle = LABEL.COLOR;
  ctx.font = LABEL.FONT;
  ctx.textAlign = "left";
  ctx.fillText(
    `出力サイズ: ${outputWidth}×${outputHeight}px`,
    outputX,
    outputY - 5,
  );

  ctx.restore();
};

/**
 * 選択されたレイヤーのバウンディングボックスを最適化描画
 */
export const drawSelectionBox = (
  ctx: CanvasRenderingContext2D,
  selectedLayer: ImageLayer,
): void => {
  if (!selectedLayer.imageData || !selectedLayer.visible) return;

  // 描画用の画像ソースを取得
  const imageSource = getImageSource(selectedLayer);
  if (!imageSource) return;

  // 実際の画像サイズを取得（drawLayerOptimizedと同じ基準）
  const { width, height } = getImageSize(imageSource);
  const scaledWidth = width * selectedLayer.scale;
  const scaledHeight = height * selectedLayer.scale;

  // GIFフレームの場合、フレーム位置オフセットを適用
  let offsetX = 0;
  let offsetY = 0;

  if (
    selectedLayer.type === "gif" &&
    selectedLayer.gifInfo &&
    selectedLayer.gifInfo.frames.length > 0
  ) {
    const frameIndex = selectedLayer.currentFrameIndex || 0;
    const validIndex = Math.max(
      0,
      Math.min(frameIndex, selectedLayer.gifInfo.frames.length - 1),
    );
    const currentFrame = selectedLayer.gifInfo.frames[validIndex];

    if (currentFrame) {
      // GIF全体サイズとフレームサイズの差を計算
      const gifWidth = selectedLayer.gifInfo.width * selectedLayer.scale;
      const gifHeight = selectedLayer.gifInfo.height * selectedLayer.scale;

      // GIF全体を基準とした中央配置の起点
      const gifX = selectedLayer.position.x - gifWidth / 2;
      const gifY = selectedLayer.position.y - gifHeight / 2;

      // フレームのオフセット位置（スケール適用）
      offsetX = gifX + currentFrame.left * selectedLayer.scale;
      offsetY = gifY + currentFrame.top * selectedLayer.scale;
    }
  }

  // 最終的なバウンディングボックス位置
  const x =
    selectedLayer.type === "gif"
      ? offsetX
      : selectedLayer.position.x - scaledWidth / 2;
  const y =
    selectedLayer.type === "gif"
      ? offsetY
      : selectedLayer.position.y - scaledHeight / 2;

  const { SELECTION_BOX } = CANVAS_CONSTANTS.STYLES;
  const handleSize = SELECTION_BOX.HANDLE_SIZE;

  ctx.save();

  // バウンディングボックスとハンドルを一度に描画
  ctx.strokeStyle = SELECTION_BOX.STROKE_COLOR;
  ctx.fillStyle = SELECTION_BOX.STROKE_COLOR;
  ctx.lineWidth = SELECTION_BOX.LINE_WIDTH;
  ctx.setLineDash(SELECTION_BOX.LINE_DASH);

  // バウンディングボックス
  ctx.strokeRect(x, y, scaledWidth, scaledHeight);

  // コーナーハンドル（4つまとめて描画）
  ctx.setLineDash([]); // ハンドルは実線
  ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize); // 左上
  ctx.fillRect(
    x + scaledWidth - handleSize / 2,
    y - handleSize / 2,
    handleSize,
    handleSize,
  ); // 右上
  ctx.fillRect(
    x - handleSize / 2,
    y + scaledHeight - handleSize / 2,
    handleSize,
    handleSize,
  ); // 左下
  ctx.fillRect(
    x + scaledWidth - handleSize / 2,
    y + scaledHeight - handleSize / 2,
    handleSize,
    handleSize,
  ); // 右下

  ctx.restore();
};

/**
 * スナップガイドラインを描画
 */
export const drawSnapGuidelines = (
  ctx: CanvasRenderingContext2D,
  _snapPoints: SnapPoint[],
  currentSnapResult: SnapResult | null,
  canvasSettings: CanvasSettings,
): void => {
  if (!currentSnapResult?.snapped || !currentSnapResult.snapPoint) return;

  const activeSnapPoint = currentSnapResult.snapPoint;
  const snapGuideColor = "#4A90E2";
  const snapGuideWidth = 1;
  const snapPointRadius = 4;

  ctx.save();
  ctx.strokeStyle = snapGuideColor;
  ctx.fillStyle = snapGuideColor;
  ctx.lineWidth = snapGuideWidth;
  ctx.setLineDash([4, 4]);

  // アクティブなスナップポイントの種類に応じてガイドラインを描画
  const { x: snapX, y: snapY } = activeSnapPoint;
  const { width, height } = canvasSettings;

  // 中央スナップの場合は十字線を描画
  if (activeSnapPoint.id === "center") {
    // 水平線
    ctx.beginPath();
    ctx.moveTo(0, snapY);
    ctx.lineTo(width, snapY);
    ctx.stroke();

    // 垂直線
    ctx.beginPath();
    ctx.moveTo(snapX, 0);
    ctx.lineTo(snapX, height);
    ctx.stroke();
  }

  // 水平方向の中央スナップ（top-center, bottom-center）
  else if (
    activeSnapPoint.id.includes("center") &&
    activeSnapPoint.x === width / 2
  ) {
    ctx.beginPath();
    ctx.moveTo(snapX, 0);
    ctx.lineTo(snapX, height);
    ctx.stroke();
  }

  // 垂直方向の中央スナップ（left-center, right-center）
  else if (
    activeSnapPoint.id.includes("center") &&
    activeSnapPoint.y === height / 2
  ) {
    ctx.beginPath();
    ctx.moveTo(0, snapY);
    ctx.lineTo(width, snapY);
    ctx.stroke();
  }

  // 角のスナップの場合は角の近くにガイドラインを描画
  else {
    const guideLength = 50;

    // 水平ガイドライン
    if (snapX === 0) {
      ctx.beginPath();
      ctx.moveTo(0, snapY);
      ctx.lineTo(guideLength, snapY);
      ctx.stroke();
    } else if (snapX === width) {
      ctx.beginPath();
      ctx.moveTo(width - guideLength, snapY);
      ctx.lineTo(width, snapY);
      ctx.stroke();
    }

    // 垂直ガイドライン
    if (snapY === 0) {
      ctx.beginPath();
      ctx.moveTo(snapX, 0);
      ctx.lineTo(snapX, guideLength);
      ctx.stroke();
    } else if (snapY === height) {
      ctx.beginPath();
      ctx.moveTo(snapX, height - guideLength);
      ctx.lineTo(snapX, height);
      ctx.stroke();
    }
  }

  // アクティブなスナップポイントを強調表示
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(snapX, snapY, snapPointRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

/**
 * 全スナップポイントを表示（デバッグ用またはヒント用）
 */
export const drawAllSnapPoints = (
  ctx: CanvasRenderingContext2D,
  snapPoints: SnapPoint[],
  showLabels: boolean = false,
): void => {
  const pointColor = "#E2E2E2";
  const pointRadius = 2;
  const labelColor = "#666666";

  ctx.save();
  ctx.fillStyle = pointColor;
  ctx.strokeStyle = pointColor;

  snapPoints.forEach((point) => {
    // スナップポイントを小さな円で描画
    ctx.beginPath();
    ctx.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
    ctx.fill();

    // ラベル表示が有効な場合
    if (showLabels) {
      ctx.fillStyle = labelColor;
      ctx.font = "10px Arial";
      ctx.textAlign = "center";
      ctx.fillText(point.name, point.x, point.y - 8);
      ctx.fillStyle = pointColor;
    }
  });

  ctx.restore();
};

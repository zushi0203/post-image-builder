import { GIFEncoder, quantize, applyPalette } from "gifenc";
import type { ImageLayer, CanvasSettings } from "../store/types";

export interface GifExportOptions {
  quality?: number;
  workers?: number;
  workerScript?: string;
  fps?: number; // デフォルト29.97fps
}

export interface GifExportProgress {
  current: number;
  total: number;
  phase: "analyzing" | "rendering" | "encoding";
}

/**
 * 描画用の画像ソースを取得（GIF対応）
 */
const getImageSource = (layer: ImageLayer): CanvasImageSource | null => {
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

  return { width: 0, height: 0 };
};

/**
 * グラデーション領域を検出する（現在未使用）
 */
// const detectGradientAreas = (
//   pixels: Uint8Array,
//   width: number,
//   height: number,
// ): Uint8Array => {
//   const gradientMask = new Uint8Array(width * height);
//   const threshold = 30; // 色差の閾値

//   for (let y = 1; y < height - 1; y++) {
//     for (let x = 1; x < width - 1; x++) {
//       const idx = (y * width + x) * 4;
//       const r = pixels[idx];
//       const g = pixels[idx + 1];
//       const b = pixels[idx + 2];

//       // 周囲8ピクセルとの色差を計算
//       let gradientIntensity = 0;
//       const neighbors = [
//         [-1, -1],
//         [0, -1],
//         [1, -1],
//         [-1, 0],
//         [1, 0],
//         [-1, 1],
//         [0, 1],
//         [1, 1],
//       ];

//       neighbors.forEach(([dx, dy]) => {
//         const nx = x + dx;
//         const ny = y + dy;
//         const nIdx = (ny * width + nx) * 4;

//         const nr = pixels[nIdx];
//         const ng = pixels[nIdx + 1];
//         const nb = pixels[nIdx + 2];

//         const colorDiff =
//           Math.abs(r - nr) + Math.abs(g - ng) + Math.abs(b - nb);
//         gradientIntensity = Math.max(gradientIntensity, colorDiff);
//       });

//       // グラデーションが検出された場合は1、そうでなければ0
//       gradientMask[y * width + x] = gradientIntensity > threshold ? 1 : 0;
//     }
//   }

//   return gradientMask;
// };

/**
 * スマートディザリング：グラデーション部分のみディザリングを適用
 */
// const applySmartDithering = (
//   pixels: Uint8Array,
//   palette: number[][],
//   width: number,
//   height: number,
// ): Uint8Array => {
//   const result = new Uint8Array(width * height);
//   const rgbaPixels = new Uint8Array(pixels.length);
//   rgbaPixels.set(pixels);

//   // グラデーション領域を検出
//   const gradientMask = detectGradientAreas(pixels, width, height);
//   console.log(
//     `🎨 Detected gradient areas: ${gradientMask.filter((x) => x === 1).length} pixels`,
//   );

//   for (let y = 0; y < height; y++) {
//     for (let x = 0; x < width; x++) {
//       const idx = (y * width + x) * 4;
//       const pixelIndex = y * width + x;
//       const r = rgbaPixels[idx];
//       const g = rgbaPixels[idx + 1];
//       const b = rgbaPixels[idx + 2];

//       // 最も近いパレット色を見つける
//       let bestIndex = 0;
//       let minDistance = Infinity;

//       for (let i = 0; i < palette.length; i++) {
//         const [pr, pg, pb] = palette[i];
//         const distance = Math.sqrt(
//           (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2,
//         );
//         if (distance < minDistance) {
//           minDistance = distance;
//           bestIndex = i;
//         }
//       }

//       const [paletteR, paletteG, paletteB] = palette[bestIndex];
//       result[pixelIndex] = bestIndex;

//       // グラデーション領域のみディザリング適用
//       if (gradientMask[pixelIndex] === 1) {
//         // 誤差を計算
//         const errorR = r - paletteR;
//         const errorG = g - paletteG;
//         const errorB = b - paletteB;

//         // Floyd-Steinberg誤差拡散
//         const positions = [
//           [x + 1, y, 7 / 16],
//           [x - 1, y + 1, 3 / 16],
//           [x, y + 1, 5 / 16],
//           [x + 1, y + 1, 1 / 16],
//         ];

//         positions.forEach(([nx, ny, weight]) => {
//           if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
//             const nIdx = (ny * width + nx) * 4;
//             rgbaPixels[nIdx] = Math.max(
//               0,
//               Math.min(255, rgbaPixels[nIdx] + errorR * weight),
//             );
//             rgbaPixels[nIdx + 1] = Math.max(
//               0,
//               Math.min(255, rgbaPixels[nIdx + 1] + errorG * weight),
//             );
//             rgbaPixels[nIdx + 2] = Math.max(
//               0,
//               Math.min(255, rgbaPixels[nIdx + 2] + errorB * weight),
//             );
//           }
//         });
//       }
//     }
//   }

//   return result;
// };

/**
 * フレーム間の差分を計算して差分領域のマスクを生成
 */
// const calculateFrameDifference = (
//   currentPixels: Uint8Array,
//   previousPixels: Uint8Array,
//   width: number,
//   height: number,
// ): { differenceMask: Uint8Array; changedPixels: number } => {
//   const differenceMask = new Uint8Array(width * height);
//   let changedPixels = 0;
//   const threshold = 10; // 色差の閾値（小さい変化は無視）

//   for (let i = 0; i < width * height; i++) {
//     const idx = i * 4;

//     // RGBAの差分を計算
//     const rDiff = Math.abs(currentPixels[idx] - previousPixels[idx]);
//     const gDiff = Math.abs(currentPixels[idx + 1] - previousPixels[idx + 1]);
//     const bDiff = Math.abs(currentPixels[idx + 2] - previousPixels[idx + 2]);
//     const aDiff = Math.abs(currentPixels[idx + 3] - previousPixels[idx + 3]);

//     const totalDiff = rDiff + gDiff + bDiff + aDiff;

//     if (totalDiff > threshold) {
//       differenceMask[i] = 1;
//       changedPixels++;
//     } else {
//       differenceMask[i] = 0;
//     }
//   }

//   return { differenceMask, changedPixels };
// };

/**
 * 差分フレーム用の最適化されたピクセルデータを生成
 */
// const createDifferenceFrame = (
//   currentPixels: Uint8Array,
//   previousPixels: Uint8Array,
//   palette: number[][],
//   width: number,
//   height: number,
//   isFirstFrame: boolean = false,
// ): { indexedPixels: Uint8Array; compressionRatio: number } => {
//   // 最初のフレームは全体を処理
//   if (isFirstFrame) {
//     const indexedPixels = applySmartDithering(
//       currentPixels,
//       palette,
//       width,
//       height,
//     );
//     return { indexedPixels, compressionRatio: 1.0 };
//   }

//   // 差分を計算
//   const { differenceMask, changedPixels } = calculateFrameDifference(
//     currentPixels,
//     previousPixels,
//     width,
//     height,
//   );

//   const totalPixels = width * height;
//   const compressionRatio = changedPixels / totalPixels;

//   console.log(
//     `🔄 Frame difference: ${changedPixels}/${totalPixels} pixels changed (${(compressionRatio * 100).toFixed(1)}%)`,
//   );

//   // 差分フレーム用のピクセルデータを作成
//   const indexedPixels = new Uint8Array(width * height);
//   const rgbaPixels = new Uint8Array(currentPixels.length);
//   rgbaPixels.set(currentPixels);

//   for (let y = 0; y < height; y++) {
//     for (let x = 0; x < width; x++) {
//       const pixelIndex = y * width + x;
//       const idx = pixelIndex * 4;

//       if (differenceMask[pixelIndex] === 1) {
//         // 変更されたピクセルのみ処理
//         const r = rgbaPixels[idx];
//         const g = rgbaPixels[idx + 1];
//         const b = rgbaPixels[idx + 2];

//         // 最も近いパレット色を見つける
//         let bestIndex = 0;
//         let minDistance = Infinity;

//         for (let i = 0; i < palette.length; i++) {
//           const [pr, pg, pb] = palette[i];
//           const distance = Math.sqrt(
//             (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2,
//           );
//           if (distance < minDistance) {
//             minDistance = distance;
//             bestIndex = i;
//           }
//         }

//         indexedPixels[pixelIndex] = bestIndex;

//         // グラデーション部分の場合はディザリングも適用
//         if (shouldApplyDithering(currentPixels, x, y, width, height)) {
//           const [paletteR, paletteG, paletteB] = palette[bestIndex];
//           const errorR = r - paletteR;
//           const errorG = g - paletteG;
//           const errorB = b - paletteB;

//           // Floyd-Steinberg誤差拡散（限定的）
//           const positions = [
//             [x + 1, y, 7 / 16],
//             [x, y + 1, 5 / 16],
//           ];

//           positions.forEach(([nx, ny, weight]) => {
//             if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
//               const nPixelIndex = ny * width + nx;
//               if (differenceMask[nPixelIndex] === 1) {
//                 // 変更されたピクセルのみに誤差拡散
//                 const nIdx = nPixelIndex * 4;
//                 rgbaPixels[nIdx] = Math.max(
//                   0,
//                   Math.min(255, rgbaPixels[nIdx] + errorR * weight),
//                 );
//                 rgbaPixels[nIdx + 1] = Math.max(
//                   0,
//                   Math.min(255, rgbaPixels[nIdx + 1] + errorG * weight),
//                 );
//                 rgbaPixels[nIdx + 2] = Math.max(
//                   0,
//                   Math.min(255, rgbaPixels[nIdx + 2] + errorB * weight),
//                 );
//               }
//             }
//           });
//         }
//       } else {
//         // 変更されていないピクセルは透明にする（GIFの差分圧縮）
//         indexedPixels[pixelIndex] = 0; // 透明色インデックス
//       }
//     }
//   }

//   return { indexedPixels, compressionRatio };
// };

/**
 * ディザリングを適用すべきかを判定（簡易版）
 */
// const shouldApplyDithering = (
//   pixels: Uint8Array,
//   x: number,
//   y: number,
//   width: number,
//   height: number,
// ): boolean => {
//   const idx = (y * width + x) * 4;
//   const threshold = 20;

//   // 近隣ピクセルとの色差を確認
//   const neighbors = [
//     [0, -1],
//     [1, 0],
//     [0, 1],
//     [-1, 0],
//   ];

//   for (const [dx, dy] of neighbors) {
//     const nx = x + dx;
//     const ny = y + dy;

//     if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
//       const nIdx = (ny * width + nx) * 4;
//       const rDiff = Math.abs(pixels[idx] - pixels[nIdx]);
//       const gDiff = Math.abs(pixels[idx + 1] - pixels[nIdx + 1]);
//       const bDiff = Math.abs(pixels[idx + 2] - pixels[nIdx + 2]);

//       if (rDiff + gDiff + bDiff > threshold) {
//         return true;
//       }
//     }
//   }

//   return false;
// };

/**
 * レイヤーから最大アニメーションフレーム数を取得
 */
const getMaxFrameCount = (layers: ImageLayer[]): number => {
  const gifLayers = layers.filter(
    (layer) => layer.type === "gif" && layer.gifInfo,
  );
  if (gifLayers.length === 0) return 1;

  return Math.max(
    ...gifLayers.map((layer) => layer.gifInfo?.frames.length || 1),
  );
};
/**
 * 出力予定のディレイ情報を計算
 */
export const calculateOutputInfo = (layers: ImageLayer[]) => {
  const maxFrames = getMaxFrameCount(layers);

  if (maxFrames === 0) {
    return {
      hasGifLayers: false,
      frameCount: 0,
      averageDelayMs: 0,
      totalDurationMs: 0,
      estimatedFps: 0,
    };
  }

  // 各フレームのディレイを計算
  const frameDelays: number[] = [];
  for (let frameIndex = 0; frameIndex < maxFrames; frameIndex++) {
    const delay = getFrameDelay(layers, frameIndex);
    frameDelays.push(delay);
  }

  const totalDuration = frameDelays.reduce((sum, delay) => sum + delay, 0);
  const averageDelay = totalDuration / frameDelays.length;
  const estimatedFps = Math.round((1000 / averageDelay) * 10) / 10;

  // GIFレイヤーが存在するかチェック
  const hasGifLayers = layers.some(
    (layer) => layer.type === "gif" && layer.gifInfo,
  );

  return {
    hasGifLayers,
    frameCount: maxFrames,
    averageDelayMs: Math.round(averageDelay),
    totalDurationMs: Math.round(totalDuration),
    estimatedFps,
    frameDelays, // 詳細情報として各フレームのディレイも含める
  };
};

/**
 * 特定フレーム時点でのレイヤー状態を取得
 */
const getLayerStateAtFrame = (
  layer: ImageLayer,
  frameIndex: number,
): ImageLayer => {
  if (layer.type !== "gif" || !layer.gifInfo) {
    return layer;
  }

  const totalFrames = layer.gifInfo.frames.length;
  if (totalFrames === 0) return layer;

  const currentFrameIndex = frameIndex % totalFrames;

  return {
    ...layer,
    currentFrameIndex,
  };
};

/**
 * フレームの遅延時間を取得
 */
const getFrameDelay = (layers: ImageLayer[], frameIndex: number): number => {
  const DEFAULT_DELAY = Math.round(1000 / 29.97); // 約33ms (29.97fps)
  const MIN_DELAY = 10; // 最小10ms（100fps相当）

  // GIFレイヤーから現在のフレームでの遅延時間を収集
  const gifDelays: number[] = [];

  layers.forEach((layer) => {
    if (
      layer.type === "gif" &&
      layer.gifInfo &&
      layer.gifInfo.frames.length > 0
    ) {
      // 各GIFレイヤーの現在フレームでの遅延時間を取得
      const layerFrameIndex = frameIndex % layer.gifInfo.frames.length;
      const currentFrame = layer.gifInfo.frames[layerFrameIndex];
      if (currentFrame && currentFrame.delay > 0) {
        // processFrameで適切に処理された遅延時間をそのまま使用
        gifDelays.push(currentFrame.delay);
      }
    }
  });

  // GIFレイヤーが存在する場合
  if (gifDelays.length > 0) {
    // 複数のGIFがある場合は最小遅延時間を使用（最も頻繁に更新が必要なレイヤーに合わせる）
    const minGifDelay = Math.min(...gifDelays);
    // 最小制限を適用
    return Math.max(minGifDelay, MIN_DELAY);
  }

  // GIFレイヤーが存在しない場合はデフォルトを使用
  return DEFAULT_DELAY;
};

/**
 * 単一レイヤーをCanvasに描画（シンプル版）
 */
const drawLayerToCanvas = (
  ctx: CanvasRenderingContext2D,
  layer: ImageLayer,
  tempCanvasWidth: number,
  tempCanvasHeight: number,
  canvasSettings: CanvasSettings,
): void => {
  if (!layer.visible) return;

  const imageSource = getImageSource(layer);
  if (!imageSource) {
    return;
  }

  // 一時canvasの中央を基準とした座標に変換
  const tempCenterX = tempCanvasWidth / 2;
  const tempCenterY = tempCanvasHeight / 2;

  // 元のcanvasサイズの中央を基準とした座標系から一時canvasへの変換
  const originalCenterX = canvasSettings.width / 2;
  const originalCenterY = canvasSettings.height / 2;

  // レイヤーの実際の位置を計算（中央からの相対位置として）
  const relativeX = layer.position.x - originalCenterX;
  const relativeY = layer.position.y - originalCenterY;

  // GIFレイヤーの場合は、GIF全体サイズを基準とした統一計算
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
      // GIF全体サイズを基準とした計算（プレビューと統一）
      const gifWidth = layer.gifInfo.width * layer.scale;
      const gifHeight = layer.gifInfo.height * layer.scale;

      // GIF全体を基準とした中央配置の起点
      const gifX = tempCenterX + relativeX - gifWidth / 2;
      const gifY = tempCenterY + relativeY - gifHeight / 2;

      // フレームのオフセット位置（スケール適用）
      const frameOffsetX = gifX + currentFrame.left * layer.scale;
      const frameOffsetY = gifY + currentFrame.top * layer.scale;

      // フレーム固有のサイズを取得
      const { width: frameWidth, height: frameHeight } =
        getImageSize(imageSource);
      const scaledFrameWidth = frameWidth * layer.scale;
      const scaledFrameHeight = frameHeight * layer.scale;

      console.log(
        `🎬 GIF Frame ${frameIndex}: GIF(${layer.gifInfo.width}×${layer.gifInfo.height}), Frame(${frameWidth}×${frameHeight}), Offset(${currentFrame.left}, ${currentFrame.top})`,
      );

      ctx.save();

      // ドット絵のピクセルパーフェクト描画のためスムージングを無効化
      ctx.imageSmoothingEnabled = false;

      // 回転処理（回転中心はGIF全体の中心）
      if (layer.rotation !== 0) {
        const radians = (layer.rotation * Math.PI) / 180;
        const rotationCenterX = tempCenterX + relativeX;
        const rotationCenterY = tempCenterY + relativeY;
        ctx.translate(rotationCenterX, rotationCenterY);
        ctx.rotate(radians);
        ctx.translate(-rotationCenterX, -rotationCenterY);
      }

      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(
        imageSource,
        frameOffsetX,
        frameOffsetY,
        scaledFrameWidth,
        scaledFrameHeight,
      );
      ctx.restore();
    }
  } else {
    // 通常の画像レイヤーの場合
    const { width, height } = getImageSize(imageSource);
    const scaledWidth = width * layer.scale;
    const scaledHeight = height * layer.scale;

    const finalX = tempCenterX + relativeX - scaledWidth / 2;
    const finalY = tempCenterY + relativeY - scaledHeight / 2;

    ctx.save();

    // ドット絵のピクセルパーフェクト描画のためスムージングを無効化
    ctx.imageSmoothingEnabled = false;

    // 回転処理
    if (layer.rotation !== 0) {
      const radians = (layer.rotation * Math.PI) / 180;
      const rotationCenterX = tempCenterX + relativeX;
      const rotationCenterY = tempCenterY + relativeY;
      ctx.translate(rotationCenterX, rotationCenterY);
      ctx.rotate(radians);
      ctx.translate(-rotationCenterX, -rotationCenterY);
    }

    ctx.globalAlpha = layer.opacity;
    ctx.drawImage(imageSource, finalX, finalY, scaledWidth, scaledHeight);
    ctx.restore();
  }
};

/**
 * 出力サイズのフレームを生成
 */
const renderOutputFrame = (
  layers: ImageLayer[],
  canvasSettings: CanvasSettings,
  frameIndex: number,
): HTMLCanvasElement => {
  // 出力サイズは固定1280x720px
  const OUTPUT_WIDTH = 1280;
  const OUTPUT_HEIGHT = 720;

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = OUTPUT_WIDTH;
  outputCanvas.height = OUTPUT_HEIGHT;

  const outputCtx = outputCanvas.getContext("2d");
  if (!outputCtx) throw new Error("Failed to create output canvas context");

  // 背景色を設定
  if (canvasSettings.backgroundColor) {
    outputCtx.fillStyle = canvasSettings.backgroundColor;
    outputCtx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  }

  // 大きめの一時Canvasを作成（レイヤー描画用）
  const tempCanvas = document.createElement("canvas");
  const tempWidth = Math.max(canvasSettings.width * 2, 2000);
  const tempHeight = Math.max(canvasSettings.height * 2, 2000);
  tempCanvas.width = tempWidth;
  tempCanvas.height = tempHeight;

  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) throw new Error("Failed to create temp canvas context");

  // 背景をクリア
  tempCtx.clearRect(0, 0, tempWidth, tempHeight);
  if (canvasSettings.backgroundColor) {
    tempCtx.fillStyle = canvasSettings.backgroundColor;
    tempCtx.fillRect(0, 0, tempWidth, tempHeight);
  }

  // フレーム時点でのレイヤー状態を取得
  const frameLayerStates = layers.map((layer) =>
    getLayerStateAtFrame(layer, frameIndex),
  );

  // レイヤーをzIndexの順序でソートして描画
  const visibleLayers = frameLayerStates
    .filter((layer) => layer.visible && layer.imageData)
    .sort((a, b) => a.zIndex - b.zIndex);

  // 各レイヤーを描画
  visibleLayers.forEach((layer) => {
    drawLayerToCanvas(tempCtx, layer, tempWidth, tempHeight, canvasSettings);
  });

  // Canvas中央から1280x720pxの領域を抽出
  const centerX = tempWidth / 2;
  const centerY = tempHeight / 2;
  const extractX = centerX - OUTPUT_WIDTH / 2;
  const extractY = centerY - OUTPUT_HEIGHT / 2;

  // 中央1280x720px領域を出力Canvasにコピー（ピクセルパーフェクト）
  outputCtx.imageSmoothingEnabled = false;
  outputCtx.drawImage(
    tempCanvas,
    extractX,
    extractY,
    OUTPUT_WIDTH,
    OUTPUT_HEIGHT,
    0,
    0,
    OUTPUT_WIDTH,
    OUTPUT_HEIGHT,
  );

  return outputCanvas;
};

/**
 * レイヤーをGIFにエクスポート（gifenc使用）
 */
export const exportLayersToGif = async (
  layers: ImageLayer[],
  canvasSettings: CanvasSettings,
  onProgress?: (progress: GifExportProgress) => void,
): Promise<Blob> => {
  try {
    onProgress?.({ current: 0, total: 100, phase: "analyzing" });

    const maxFrames = getMaxFrameCount(layers);
    console.log(
      `🎬 Generating GIF with gifenc: ${maxFrames} frames, 1280×720px`,
    );

    // レイヤー位置情報をデバッグ出力
    layers.forEach((layer) => {
      console.log(
        `Layer "${layer.name}": position(${layer.position.x}, ${layer.position.y}), scale: ${layer.scale}`,
      );
    });

    onProgress?.({ current: 10, total: 100, phase: "rendering" });

    // 全フレームを事前に生成
    const allFrameCanvases: HTMLCanvasElement[] = [];
    for (let frameIndex = 0; frameIndex < maxFrames; frameIndex++) {
      const frameCanvas = renderOutputFrame(layers, canvasSettings, frameIndex);
      allFrameCanvases.push(frameCanvas);

      const renderProgress = 10 + ((frameIndex + 1) / maxFrames) * 30;
      onProgress?.({ current: renderProgress, total: 100, phase: "rendering" });
    }

    onProgress?.({ current: 40, total: 100, phase: "encoding" });

    // gifencでGIFエンコード
    const gif = GIFEncoder();

    // 全フレームの色情報を収集してグローバルパレット生成
    const allPixelsData: Uint8Array[] = [];
    allFrameCanvases.forEach((canvas) => {
      const ctx = canvas.getContext("2d")!;
      const imageData = ctx.getImageData(0, 0, 1280, 720);
      allPixelsData.push(new Uint8Array(imageData.data));
    });

    // 全フレームの色情報を統合
    const totalPixels = allPixelsData.reduce(
      (total, pixels) => total + pixels.length,
      0,
    );
    const allPixels = new Uint8Array(totalPixels);
    let offset = 0;
    allPixelsData.forEach((pixels) => {
      allPixels.set(pixels, offset);
      offset += pixels.length;
    });

    // gifencでパレット生成（ディザリングなし）
    console.log("🎨 Quantizing colors with gifenc (no dithering)...");
    const palette = quantize(allPixels, 256);

    onProgress?.({ current: 60, total: 100, phase: "encoding" });

    // フレームを追加（gifencの標準ワークフロー）
    allFrameCanvases.forEach((canvas, frameIndex) => {
      const ctx = canvas.getContext("2d")!;
      const imageData = ctx.getImageData(0, 0, 1280, 720);
      const pixels = new Uint8Array(imageData.data);

      // gifencの正しい使用方法：RGBAピクセルをインデックス化
      const indexedPixels = applyPalette(pixels, palette);
      const delay = getFrameDelay(layers, frameIndex);

      gif.writeFrame(indexedPixels, 1280, 720, {
        palette,
        delay: Math.round(delay),
      });

      const encodeProgress = 60 + ((frameIndex + 1) / maxFrames) * 35;
      onProgress?.({ current: encodeProgress, total: 100, phase: "encoding" });
    });

    gif.finish();

    const buffer = gif.bytes();
    const blob = new Blob([buffer], { type: "image/gif" });

    console.log("✅ GIF export completed successfully with gifenc");
    onProgress?.({ current: 100, total: 100, phase: "encoding" });

    return blob;
  } catch (error) {
    console.error("❌ GIF export error:", error);
    throw error;
  }
};

/**
 * GIFをダウンロード
 */
export const downloadGif = (
  blob: Blob,
  filename: string = "animation.gif",
): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  console.log(`💾 GIF downloaded: ${filename}`);
};

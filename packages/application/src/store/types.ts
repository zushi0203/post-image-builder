export interface GifFrame {
  /** フレームの一意ID */
  id: string;
  /** フレーム画像データ（Canvas要素） */
  canvas: HTMLCanvasElement;
  /** フレーム画像データ（ImageData） */
  imageData: ImageData;
  /** フレーム表示時間（ミリ秒） */
  delay: number;
  /** フレーム幅 */
  width: number;
  /** フレーム高さ */
  height: number;
  /** フレーム位置 X座標 */
  left: number;
  /** フレーム位置 Y座標 */
  top: number;
  /** 透明色インデックス */
  transparentIndex?: number;
  /** 廃棄方法 */
  disposalMethod: number;
}

/**
 * GIF解析結果
 */
export interface GifInfo {
  /** 全フレーム配列 */
  frames: GifFrame[];
  /** GIF全体の幅 */
  width: number;
  /** GIF全体の高さ */
  height: number;
  /** ループ回数（0は無限ループ） */
  loopCount: number;
  /** 総再生時間（ミリ秒） */
  totalDuration: number;
}

/**
 * 解析オプション
 */
export interface ParseOptions {
  /** 最大フレーム数制限 */
  maxFrames?: number;
  /** フレームサイズ制限 */
  maxSize?: number;
  /** プログレス通知コールバック */
  onProgress?: (current: number, total: number) => void;
}

export interface ImageLayer {
  id: string;
  name: string;
  type: "image" | "background" | "gif";
  file: File;
  imageData: HTMLImageElement | null;
  visible: boolean;
  zIndex: number;
  position: {
    x: number;
    y: number;
  };
  scale: number;
  opacity: number;
  rotation: number;
  // GIF用情報
  gifInfo?: GifInfo;
  currentFrameIndex?: number;
}

export interface CanvasSettings {
  width: number;
  height: number;
  backgroundColor: string;
  outputFormat: "png" | "gif" | "apng";
  quality: number;
}

export interface AppState {
  layers: ImageLayer[];
  selectedLayerId: string | null;
  canvasSettings: CanvasSettings;
  previewMode: boolean;
  isGenerating: boolean;
}

export interface OutputSettings {
  format: "png" | "gif" | "apng";
  width: number;
  height: number;
  quality: number;
  fps?: number; // for GIF/APNG
  duration?: number; // for GIF/APNG
}

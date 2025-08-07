export const CANVAS_CONSTANTS = {
  // 出力サイズ設定
  OUTPUT_SIZE: {
    WIDTH: 500,
    HEIGHT: 500,
  },
  
  // スタイル設定
  STYLES: {
    OUTPUT_FRAME: {
      STROKE_COLOR: '#007acc',
      LINE_WIDTH: 2,
      LINE_DASH: [5, 5],
    },
    SELECTION_BOX: {
      STROKE_COLOR: '#ff6b35',
      LINE_WIDTH: 2,
      LINE_DASH: [3, 3],
      HANDLE_SIZE: 8,
    },
    LABEL: {
      FONT: '12px Arial',
      COLOR: '#007acc',
    },
  },
  
  // 透明度設定
  OPACITY: {
    OUTSIDE_FRAME: 0.3, // 枠外部分の透明度
  },
} as const
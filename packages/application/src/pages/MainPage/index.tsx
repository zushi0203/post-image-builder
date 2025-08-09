import React from 'react'
import { useAtom, useAtomValue } from 'jotai'
import { ToggleSwitch, Button, LayerManager, FileDropArea, CanvasPreview, AnimationTimeline } from '@post-image-builder/ui'
import {
  previewModeAtom,
  isGeneratingAtom,
  canvasSettingsAtom,
  hasGifLayersAtom,
  timelineLayersAtom,
  setLayerFrameAtom
} from '../../store/atoms'
import { useFileHandler } from '../../hooks/useFileHandler'
import { useLayerManager } from '../../hooks/useLayerManager'
import { exportLayersToGif, downloadGif, type GifExportProgress } from '../../utils/gifExporter'
import './MainPage.css'

const MainPage = () => {
  const [previewMode, setPreviewMode] = useAtom(previewModeAtom)
  const [isGenerating, setIsGenerating] = useAtom(isGeneratingAtom)
  const [canvasSettings] = useAtom(canvasSettingsAtom)
  const [, setLayerFrame] = useAtom(setLayerFrameAtom)

  // GIF生成状態の管理
  const [isExportingGif, setIsExportingGif] = React.useState(false)
  const [exportProgress, setExportProgress] = React.useState<GifExportProgress | null>(null)

  const hasGifLayers = useAtomValue(hasGifLayersAtom)
  const timelineLayers = useAtomValue(timelineLayersAtom)

  const { handleFiles } = useFileHandler()
  const {
    layers,
    selectedLayerId,
    selectLayer,
    toggleLayerVisibility,
    updateLayerProperty,
  } = useLayerManager()

  const handleFileDrop = (files: File[]) => {
    handleFiles(files)
  }

  const handleLayerPositionChange = React.useCallback((layerId: string, position: { x: number; y: number }) => {
    updateLayerProperty(layerId, 'position', position)
  }, [updateLayerProperty])

  const handleFrameSelect = (layerId: string, frameIndex: number) => {
    setLayerFrame(layerId, frameIndex)
  }

  const handleGenerateImage = async () => {
    setIsGenerating(true)
    try {
      // TODO: 画像生成処理を実装
      console.log('Generating image with layers:', layers)
      await new Promise(resolve => setTimeout(resolve, 2000)) // 仮の処理時間
    } catch (error) {
      console.error('Failed to generate image:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExportGif = async () => {
    if (layers.length === 0) return

    setIsExportingGif(true)
    setExportProgress({ current: 0, total: 100, phase: 'analyzing' })

    try {
      const blob = await exportLayersToGif(
        layers,
        canvasSettings,
        {
          quality: 10,
          workers: 2,
          workerScript: '/gif.worker.js'
        },
        (progress) => {
          setExportProgress(progress)
        }
      )

      // GIFをダウンロード
      const filename = `animation_${Date.now()}.gif`
      downloadGif(blob, filename)

      console.log('🎉 GIF export completed successfully')
    } catch (error) {
      console.error('❌ GIF export failed:', error)
      alert('GIF生成に失敗しました。コンソールでエラーを確認してください。')
    } finally {
      setIsExportingGif(false)
      setExportProgress(null)
    }
  }

  // UIコンポーネント用のレイヤーデータに変換（メモ化）
  const uiLayers = React.useMemo(() => layers.map(layer => ({
    id: layer.id,
    name: layer.name,
    type: layer.type,
    visible: layer.visible,
    zIndex: layer.zIndex,
  })), [layers])

  return (
    <div className="main-page">
      {/* ヘッダー */}
      <header className="main-header">
        <h1>Post Image Builder</h1>
        <ToggleSwitch
          isSelected={previewMode}
          onChange={setPreviewMode}
          aria-label="プレビューモード"
        >
          プレビューモード
        </ToggleSwitch>
      </header>

      {/* メインコンテンツ */}
      <main className="main-content">
        {/* 左サイドバー: レイヤー管理 */}
        <aside className="left-sidebar">
          <LayerManager
            layers={uiLayers}
            selectedLayerId={selectedLayerId || undefined}
            onLayerSelect={selectLayer}
            onLayerVisibilityToggle={toggleLayerVisibility}
          />
        </aside>

        {/* 中央: プレビューエリア（全体がドロップ領域） */}
        <section className="center-content">
          <FileDropArea onFileDrop={handleFileDrop} className="full-area-drop">
            <div className="preview-area">
              {layers.length > 0 ? (
                <>
                  <div className="canvas-container">
                    <CanvasPreview
                      layers={layers}
                      canvasSettings={canvasSettings}
                      onLayerPositionChange={handleLayerPositionChange}
                    />
                  </div>
                  <div className="drop-overlay">
                    <div className="drop-hint">
                      <span className="drop-icon">📁</span>
                      <span className="drop-text">画像をドロップして追加</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-canvas">
                  <div className="empty-content">
                    <span className="empty-icon">🖼️</span>
                    <h3>画像をドラッグ&ドロップ</h3>
                    <p>ここに画像ファイルをドロップして開始してください</p>
                  </div>
                </div>
              )}
            </div>

            {/* GIFフレーム表示タイムライン */}
            {hasGifLayers && (
              <AnimationTimeline
                layers={timelineLayers}
                onFrameSelect={handleFrameSelect}
                className="animation-timeline-container"
              />
            )}
          </FileDropArea>
        </section>

        {/* 右サイドバー: 設定パネル */}
        <aside className="right-sidebar">
          <section className="settings-panel">


            <div className="setting-group">
              <h3>ここで拡大率を選択</h3>
              {/* 拡大率設定コントロール */}
            </div>

            <div className="setting-group">
              <h3>ここで出力サイズを指定</h3>
              {/* サイズ設定コントロール */}
            </div>

            <div className="setting-group">
              <h3>ここで出力形式選択</h3>
              {/* 形式選択コントロール */}
            </div>

            <div className="setting-group">
              <h3>ここで出力情報を記録</h3>
              <ul className="output-info">
                <li>• サイズ</li>
                <li>• 画像形式</li>
                <li>• 再生時間</li>
                <li>• ファイル容量</li>
                <li>など</li>
              </ul>
            </div>

            <div className="generation-buttons">
              <Button
                variant="success"
                size="large"
                onPress={handleGenerateImage}
                isDisabled={isGenerating}
              >
                {isGenerating ? '生成中...' : '画像を生成'}
              </Button>

              {/* GIF生成ボタン */}
              <Button
                variant="primary"
                size="large"
                onPress={handleExportGif}
                isDisabled={isExportingGif || layers.length === 0}
              >
                {isExportingGif ? (
                  exportProgress ? (
                    `GIF生成中... ${Math.round(exportProgress.current)}%`
                  ) : (
                    'GIF生成中...'
                  )
                ) : (
                  '🎬 GIF生成'
                )}
              </Button>

              {/* 進捗表示 */}
              {exportProgress && (
                <div className="export-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${exportProgress.current}%` }}
                    />
                  </div>
                  <div className="progress-text">
                    {exportProgress.phase === 'analyzing' && 'フレーム解析中...'}
                    {exportProgress.phase === 'rendering' && 'フレーム描画中...'}
                    {exportProgress.phase === 'encoding' && 'GIFエンコード中...'}
                  </div>
                </div>
              )}
            </div>
          </section>
        </aside>
      </main>
    </div>
  )
}

export default MainPage

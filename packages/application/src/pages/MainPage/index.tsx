import React from 'react'
import { useAtom, useAtomValue } from 'jotai'
import { ToggleSwitch, Button, LayerManager, FileDropArea, CanvasPreview, AnimationTimeline } from '@post-image-builder/ui'
import {
  previewModeAtom,
  isGeneratingAtom,
  canvasSettingsAtom,
  hasGifLayersAtom,
  timelineLayersAtom,
  setLayerFrameAtom,
  animationSettingsAtom,
  toggleAnimationAtom
} from '../../store/atoms'
import { useFileHandler } from '../../hooks/useFileHandler'
import { useLayerManager } from '../../hooks/useLayerManager'
import './MainPage.css'

const MainPage = () => {
  const [previewMode, setPreviewMode] = useAtom(previewModeAtom)
  const [isGenerating, setIsGenerating] = useAtom(isGeneratingAtom)
  const [canvasSettings] = useAtom(canvasSettingsAtom)
  const [, setLayerFrame] = useAtom(setLayerFrameAtom)
  const [, toggleAnimation] = useAtom(toggleAnimationAtom)

  const hasGifLayers = useAtomValue(hasGifLayersAtom)
  const timelineLayers = useAtomValue(timelineLayersAtom)
  const animationSettings = useAtomValue(animationSettingsAtom)

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

  const handleFrameUpdate = React.useCallback((layerId: string, frameIndex: number) => {
    // アニメーション再生中のフレーム自動更新
    setLayerFrame(layerId, frameIndex)
  }, [setLayerFrame])

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
                      isAnimationEnabled={animationSettings.isPlaying}
                      onFrameUpdate={handleFrameUpdate}
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
            {/* GIFアニメーション制御 */}
            {hasGifLayers && (
              <div className="setting-group">
                <h3>GIFアニメーション</h3>
                <Button
                  variant={animationSettings.isPlaying ? "danger" : "primary"}
                  size="medium"
                  onPress={toggleAnimation}
                >
                  {animationSettings.isPlaying ? '⏸️ 停止' : '▶️ 再生'}
                </Button>
                <div className="animation-info">
                  <p>フレームレート: 30FPS固定</p>
                  <p>速度: {animationSettings.playbackSpeed}x</p>
                  <p>ループ: {animationSettings.loop ? 'ON' : 'OFF'}</p>
                </div>
              </div>
            )}

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

            <Button
              variant="success"
              size="large"
              onPress={handleGenerateImage}
              isDisabled={isGenerating}
            >
              {isGenerating ? '生成中...' : '画像を生成'}
            </Button>
          </section>
        </aside>
      </main>
    </div>
  )
}

export default MainPage

import React, { useState } from 'react'
import { ToggleSwitch, Button, LayerManager, FileDropArea, type Layer } from '@post-image-builder/ui'
import './MainPage.css'

const MainPage = () => {
  const [previewMode, setPreviewMode] = useState(false)
  const [layers, setLayers] = useState<Layer[]>([
    { id: '1', name: 'ファイル名1.png', type: 'image', visible: true, zIndex: 1 },
    { id: '2', name: 'ファイル名2.png', type: 'image', visible: true, zIndex: 2 },
    { id: '3', name: 'background.jpg', type: 'background', visible: true, zIndex: 0 },
  ])
  const [selectedLayerId, setSelectedLayerId] = useState<string>()

  const handleFileDrop = (files: File[]) => {
    console.log('Dropped files:', files)
    // TODO: Handle file processing
  }

  const handleLayerVisibilityToggle = (layerId: string) => {
    setLayers(prev => prev.map(layer =>
      layer.id === layerId
        ? { ...layer, visible: !layer.visible }
        : layer
    ))
  }

  const handleGenerateImage = () => {
    console.log('Generate image')
    // TODO: Implement image generation
  }
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
            layers={layers}
            selectedLayerId={selectedLayerId}
            onLayerSelect={setSelectedLayerId}
            onLayerVisibilityToggle={handleLayerVisibilityToggle}
          />
        </aside>

        {/* 中央: プレビューエリア */}
        <section className="center-content">
          <div className="preview-area">
            <div className="canvas-container">
              <FileDropArea onFileDrop={handleFileDrop} />
            </div>
          </div>
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

            <Button variant="success" size="large" onPress={handleGenerateImage}>
              画像を生成
            </Button>
          </section>
        </aside>
      </main>
    </div>
  )
}

export default MainPage

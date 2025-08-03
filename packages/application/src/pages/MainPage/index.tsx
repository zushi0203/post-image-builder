import React from 'react'
import './MainPage.css'

const MainPage = () => {
  return (
    <div className="main-page">
      {/* ヘッダー */}
      <header className="main-header">
        <h1>Post Image Builder</h1>
        <div className="preview-mode-toggle">
          <span>プレビューモード</span>
          <label className="toggle-switch">
            <input type="checkbox" />
            <span className="slider"></span>
          </label>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="main-content">
        {/* 左サイドバー: レイヤー管理 */}
        <aside className="left-sidebar">
          <section className="layer-manager">
            <h2>画像の重なり</h2>
            <div className="layer-list">
              <div className="layer-item">
                <span className="layer-icon">img</span>
                <span className="layer-name">ファイル名</span>
              </div>
              <div className="layer-item">
                <span className="layer-icon">img</span>
                <span className="layer-name">ファイル名</span>
              </div>
              <div className="layer-item">
                <span className="layer-icon">img</span>
                <span className="layer-name">ファイル名</span>
              </div>
              <div className="layer-item">
                <span className="layer-icon">img</span>
                <span className="layer-name">ファイル名</span>
              </div>
            </div>
          </section>
        </aside>

        {/* 中央: プレビューエリア */}
        <section className="center-content">
          <div className="preview-area">
            <div className="canvas-container">
              <div className="drop-zone">
                <div className="drop-zone-content">
                  <div className="image-icon">🖼</div>
                  <p>画像をドラッグ&amp;ドロップ</p>
                  <button className="file-select-button">ファイル選択</button>
                </div>
              </div>
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

            <button className="generate-button">画像を生成</button>
          </section>
        </aside>
      </main>
    </div>
  )
}

export default MainPage

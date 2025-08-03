import React, { useRef, useEffect } from 'react'

interface ImageLayer {
  id: string
  name: string
  type: 'image' | 'background'
  file: File
  imageData: HTMLImageElement | null
  visible: boolean
  zIndex: number
  position: {
    x: number
    y: number
  }
  scale: number
  opacity: number
  rotation: number
}

interface CanvasSettings {
  width: number
  height: number
  backgroundColor: string
  outputFormat: 'png' | 'gif' | 'apng'
  quality: number
}

interface CanvasPreviewProps {
  layers: ImageLayer[]
  canvasSettings: CanvasSettings
}

export const CanvasPreview: React.FC<CanvasPreviewProps> = ({
  layers,
  canvasSettings,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // キャンバスサイズを設定
    canvas.width = canvasSettings.width
    canvas.height = canvasSettings.height

    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 背景色を設定
    if (canvasSettings.backgroundColor) {
      ctx.fillStyle = canvasSettings.backgroundColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    // 出力サイズの設定
    const outputWidth = 500
    const outputHeight = 500
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const outputX = centerX - outputWidth / 2
    const outputY = centerY - outputHeight / 2

    // レイヤーをzIndexの順序で描画
    const visibleLayers = layers
      .filter(layer => layer.visible)
      .sort((a, b) => a.zIndex - b.zIndex)

    visibleLayers.forEach(layer => {
      if (!layer.imageData) return

      // 画像の描画パラメータを計算
      const scaledWidth = layer.imageData.naturalWidth * layer.scale
      const scaledHeight = layer.imageData.naturalHeight * layer.scale
      const x = layer.position.x - scaledWidth / 2
      const y = layer.position.y - scaledHeight / 2

      // 1. 枠外部分を半透明で描画（全体）
      ctx.save()
      ctx.globalAlpha = layer.opacity * 0.3 // 30%の透明度

      if (layer.rotation !== 0) {
        ctx.translate(layer.position.x, layer.position.y)
        ctx.rotate((layer.rotation * Math.PI) / 180)
        ctx.translate(-layer.position.x, -layer.position.y)
      }

      ctx.drawImage(
        layer.imageData,
        x,
        y,
        scaledWidth,
        scaledHeight
      )

      ctx.restore()

      // 2. 枠内部分を不透明で描画（クリッピング適用）
      ctx.save()

      // 出力範囲でクリッピング
      ctx.beginPath()
      ctx.rect(outputX, outputY, outputWidth, outputHeight)
      ctx.clip()

      ctx.globalAlpha = layer.opacity // 元の透明度（通常は100%）

      if (layer.rotation !== 0) {
        ctx.translate(layer.position.x, layer.position.y)
        ctx.rotate((layer.rotation * Math.PI) / 180)
        ctx.translate(-layer.position.x, -layer.position.y)
      }

      ctx.drawImage(
        layer.imageData,
        x,
        y,
        scaledWidth,
        scaledHeight
      )

      ctx.restore()
    })

    // 出力サイズの枠線を描画
    ctx.save()
    ctx.strokeStyle = '#007acc' // 青色の枠線
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5]) // 破線スタイル
    ctx.strokeRect(outputX, outputY, outputWidth, outputHeight)
    ctx.restore()

    // 出力サイズのラベルを描画
    ctx.save()
    ctx.fillStyle = '#007acc'
    ctx.font = '12px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(`出力サイズ: ${outputWidth}×${outputHeight}px`, outputX, outputY - 5)
    ctx.restore()
  }, [layers, canvasSettings])

  return (
    <div className="canvas-preview">
      <canvas
        ref={canvasRef}
        style={{
          border: '1px solid #ccc',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
        }}
      />
    </div>
  )
}

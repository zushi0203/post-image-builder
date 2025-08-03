import React, { useRef, useEffect, useState, useCallback } from 'react'

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
  onLayerPositionChange?: (layerId: string, position: { x: number; y: number }) => void
}

export const CanvasPreview: React.FC<CanvasPreviewProps> = ({
  layers,
  canvasSettings,
  onLayerPositionChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

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

    // 選択されたレイヤーのバウンディングボックスを描画
    if (selectedLayerId) {
      const selectedLayer = layers.find(layer => layer.id === selectedLayerId)
      if (selectedLayer?.imageData && selectedLayer.visible) {
        const scaledWidth = selectedLayer.imageData.naturalWidth * selectedLayer.scale
        const scaledHeight = selectedLayer.imageData.naturalHeight * selectedLayer.scale
        const x = selectedLayer.position.x - scaledWidth / 2
        const y = selectedLayer.position.y - scaledHeight / 2

        ctx.save()
        ctx.strokeStyle = '#ff6b35' // オレンジ色のバウンディングボックス
        ctx.lineWidth = 2
        ctx.setLineDash([3, 3])
        ctx.strokeRect(x, y, scaledWidth, scaledHeight)

        // コーナーハンドルを描画
        const handleSize = 8
        const handles = [
          { x: x - handleSize/2, y: y - handleSize/2 }, // 左上
          { x: x + scaledWidth - handleSize/2, y: y - handleSize/2 }, // 右上
          { x: x - handleSize/2, y: y + scaledHeight - handleSize/2 }, // 左下
          { x: x + scaledWidth - handleSize/2, y: y + scaledHeight - handleSize/2 }, // 右下
        ]

        ctx.fillStyle = '#ff6b35'
        handles.forEach(handle => {
          ctx.fillRect(handle.x, handle.y, handleSize, handleSize)
        })

        ctx.restore()
      }
    }
  }, [layers, canvasSettings, selectedLayerId])

  // マウス座標をキャンバス座標に変換
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  // 画像レイヤーがクリックされたかを判定
  const getClickedLayer = (x: number, y: number): ImageLayer | null => {
    // zIndexの逆順（上から）で判定
    const visibleLayers = layers
      .filter(layer => layer.visible && layer.imageData)
      .sort((a, b) => b.zIndex - a.zIndex)

    for (const layer of visibleLayers) {
      if (!layer.imageData) continue

      const scaledWidth = layer.imageData.naturalWidth * layer.scale
      const scaledHeight = layer.imageData.naturalHeight * layer.scale
      const layerX = layer.position.x - scaledWidth / 2
      const layerY = layer.position.y - scaledHeight / 2

      if (
        x >= layerX &&
        x <= layerX + scaledWidth &&
        y >= layerY &&
        y <= layerY + scaledHeight
      ) {
        return layer
      }
    }
    return null
  }

  // マウスダウンイベント
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e)
    const clickedLayer = getClickedLayer(x, y)

    if (clickedLayer) {
      setSelectedLayerId(clickedLayer.id)
      setIsDragging(true)
      setDragOffset({
        x: x - clickedLayer.position.x,
        y: y - clickedLayer.position.y,
      })
    } else {
      setSelectedLayerId(null)
    }
  }

  // マウスムーブイベント
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedLayerId || !onLayerPositionChange) return

    const { x, y } = getCanvasCoordinates(e)
    const newPosition = {
      x: x - dragOffset.x,
      y: y - dragOffset.y,
    }

    onLayerPositionChange(selectedLayerId, newPosition)
  }

  // マウスアップイベント
  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div className="canvas-preview">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          border: '1px solid #ccc',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          cursor: isDragging ? 'grabbing' : selectedLayerId ? 'grab' : 'default',
        }}
      />
    </div>
  )
}

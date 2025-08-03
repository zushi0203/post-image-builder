import React, { useState, useRef } from 'react'
import { Button } from '../../primitives/Button'
import './FileDropArea.css'

export interface FileDropAreaProps {
  onFileDrop?: (files: File[]) => void
  accept?: string
  multiple?: boolean
  className?: string
  children?: React.ReactNode
}

export const FileDropArea = ({
  onFileDrop,
  accept = 'image/*',
  multiple = true,
  className = '',
  children,
}: FileDropAreaProps) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    // Only set to false if we're leaving the drop area completely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))

    if (imageFiles.length > 0) {
      onFileDrop?.(imageFiles)
    }
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      onFileDrop?.(files)
    }
    // Reset input value to allow selecting the same file again
    e.target.value = ''
  }

  return (
    <div
      className={`file-drop-area ${isDragOver ? 'drag-over' : ''} ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInputChange}
        className="file-input-hidden"
        aria-hidden="true"
      />

      {children || (
        <div className="file-drop-content">
          <div className="file-drop-icon">🖼️</div>
          <p className="file-drop-text">
            画像をドラッグ&ドロップ
          </p>
          <Button variant="primary" onPress={handleFileSelect}>
            ファイル選択
          </Button>
        </div>
      )}
    </div>
  )
}

export default FileDropArea

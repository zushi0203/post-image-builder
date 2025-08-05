import { extractGifFrames, frameToImage, PerformanceMonitor } from './gifFrameExtractor.js'
import { logGifInfo, calculateFrameRate, formatFileSize, getFrameStats, downloadFrame } from './utils.js'
import type { GifInfo, GifFrame } from './types.js'

class GifExtractorApp {
  private uploadArea: HTMLElement
  private fileInput: HTMLInputElement
  private progressBar: HTMLElement
  private progressFill: HTMLElement
  private errorMessage: HTMLElement
  private infoPanel: HTMLElement
  private infoGrid: HTMLElement
  private statsGrid: HTMLElement
  private framesContainer: HTMLElement
  private framesGrid: HTMLElement
  private downloadAllBtn: HTMLElement

  constructor() {
    this.initializeElements()
    this.setupEventListeners()
  }

  private initializeElements(): void {
    this.uploadArea = this.getElement('uploadArea')
    this.fileInput = this.getElement('fileInput') as HTMLInputElement
    this.progressBar = this.getElement('progressBar')
    this.progressFill = this.getElement('progressFill')
    this.errorMessage = this.getElement('errorMessage')
    this.infoPanel = this.getElement('infoPanel')
    this.infoGrid = this.getElement('infoGrid')
    this.statsGrid = this.getElement('statsGrid')
    this.framesContainer = this.getElement('framesContainer')
    this.framesGrid = this.getElement('framesGrid')
    this.downloadAllBtn = this.getElement('downloadAllBtn')
  }

  private getElement(id: string): HTMLElement {
    const element = document.getElementById(id)
    if (!element) {
      throw new Error(`Element with id '${id}' not found`)
    }
    return element
  }

  private setupEventListeners(): void {
    // ファイル選択イベント
    this.fileInput.addEventListener('change', (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files && files.length > 0) {
        this.handleFiles(Array.from(files))
      }
    })

    // ドラッグ&ドロップイベント
    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault()
      this.uploadArea.classList.add('dragover')
    })

    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('dragover')
    })

    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault()
      this.uploadArea.classList.remove('dragover')
      
      const files = Array.from(e.dataTransfer?.files || [])
        .filter(file => file.type === 'image/gif')
      
      if (files.length > 0) {
        this.handleFiles(files)
      } else {
        this.showError('GIFファイルを選択してください')
      }
    })

    // クリックでファイル選択
    this.uploadArea.addEventListener('click', () => {
      this.fileInput.click()
    })
  }

  private async handleFiles(files: File[]): Promise<void> {
    this.clearPreviousResults()
    
    // 最初のGIFファイルのみ処理
    const gifFile = files.find(file => file.type === 'image/gif')
    if (!gifFile) {
      this.showError('GIFファイルが見つかりません')
      return
    }

    console.log(`🎬 Processing GIF: ${gifFile.name}`)
    
    const monitor = new PerformanceMonitor()
    monitor.start()

    try {
      this.showProcessing(true)
      
      const gifInfo = await extractGifFrames(gifFile, {
        maxFrames: 200,
        maxSize: 2048,
        onProgress: (current, total) => {
          this.updateProgress(current / total * 100)
        }
      })

      const performance = monitor.end()
      
      console.log(`⚡ Performance:`)
      console.log(`  Execution time: ${performance.executionTime.toFixed(2)}ms`)
      console.log(`  Memory delta: ${formatFileSize(performance.memoryDelta)}`)
      
      logGifInfo(gifInfo)
      
      this.displayResults(gifInfo, gifFile, performance)
      
    } catch (error) {
      console.error('❌ Error extracting GIF frames:', error)
      this.showError(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      this.showProcessing(false)
    }
  }

  private displayResults(
    gifInfo: GifInfo, 
    file: File, 
    performance: { executionTime: number; memoryDelta: number }
  ): void {
    // 基本情報表示
    this.displayBasicInfo(gifInfo, file, performance)
    
    // 統計情報表示
    this.displayStats(gifInfo)
    
    // フレーム表示
    this.displayFrames(gifInfo.frames)
    
    // パネル表示
    this.infoPanel.style.display = 'block'
    this.framesContainer.style.display = 'block'
  }

  private displayBasicInfo(
    gifInfo: GifInfo, 
    file: File, 
    performance: { executionTime: number; memoryDelta: number }
  ): void {
    const frameRate = calculateFrameRate(gifInfo.frames)
    
    const infoItems = [
      { label: 'ファイル名', value: file.name },
      { label: 'ファイルサイズ', value: formatFileSize(file.size) },
      { label: 'サイズ', value: `${gifInfo.width}×${gifInfo.height}px` },
      { label: 'フレーム数', value: `${gifInfo.frames.length}フレーム` },
      { label: 'ループ回数', value: gifInfo.loopCount === 0 ? '無限ループ' : `${gifInfo.loopCount}回` },
      { label: '再生時間', value: `${(gifInfo.totalDuration / 1000).toFixed(1)}秒` },
      { label: 'フレームレート', value: `${frameRate} FPS` },
      { label: '解析時間', value: `${performance.executionTime.toFixed(1)}ms` },
    ]

    this.infoGrid.innerHTML = infoItems.map(item => `
      <div class="info-item">
        <div class="info-label">${item.label}</div>
        <div class="info-value">${item.value}</div>
      </div>
    `).join('')
  }

  private displayStats(gifInfo: GifInfo): void {
    const stats = getFrameStats(gifInfo.frames)
    
    const statItems = [
      { label: '最小遅延', value: `${stats.minDelay}ms` },
      { label: '最大遅延', value: `${stats.maxDelay}ms` },
      { label: '平均遅延', value: `${stats.avgDelay}ms` },
      { label: 'メモリ使用量', value: formatFileSize(stats.totalSize) },
    ]

    this.statsGrid.innerHTML = statItems.map(item => `
      <div class="stat-item">
        <div class="stat-value">${item.value}</div>
        <div class="stat-label">${item.label}</div>
      </div>
    `).join('')
  }

  private displayFrames(frames: GifFrame[]): void {
    this.framesGrid.innerHTML = ''
    
    frames.forEach((frame, index) => {
      const frameItem = document.createElement('div')
      frameItem.className = 'frame-item'
      
      // キャンバスを複製（表示用）
      const displayCanvas = document.createElement('canvas')
      displayCanvas.className = 'frame-canvas'
      displayCanvas.width = frame.canvas.width
      displayCanvas.height = frame.canvas.height
      
      const ctx = displayCanvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(frame.canvas, 0, 0)
      }
      
      const downloadBtn = document.createElement('button')
      downloadBtn.className = 'btn download-btn'
      downloadBtn.textContent = 'PNG保存'
      downloadBtn.addEventListener('click', () => {
        downloadFrame(frame, `frame-${index + 1}.png`)
      })
      
      frameItem.innerHTML = `
        <div class="frame-info">フレーム ${index + 1}</div>
        <div class="frame-info">${frame.width}×${frame.height}px</div>
        <div class="frame-info">${frame.delay}ms</div>
      `
      
      frameItem.insertBefore(displayCanvas, frameItem.firstChild)
      frameItem.appendChild(downloadBtn)
      
      this.framesGrid.appendChild(frameItem)
    })
    
    // 全フレームダウンロードボタン表示
    if (frames.length > 1) {
      this.downloadAllBtn.style.display = 'inline-block'
    }
  }

  private showProcessing(show: boolean): void {
    if (show) {
      this.uploadArea.classList.add('processing')
      this.progressBar.style.display = 'block'
    } else {
      this.uploadArea.classList.remove('processing')
      this.progressBar.style.display = 'none'
      this.updateProgress(0)
    }
  }

  private updateProgress(percentage: number): void {
    this.progressFill.style.width = `${Math.min(100, Math.max(0, percentage))}%`
  }

  private showError(message: string): void {
    this.errorMessage.textContent = message
    this.errorMessage.style.display = 'block'
    setTimeout(() => {
      this.errorMessage.style.display = 'none'
    }, 5000)
  }

  private clearPreviousResults(): void {
    this.errorMessage.style.display = 'none'
    this.infoPanel.style.display = 'none'
    this.framesContainer.style.display = 'none'
    this.framesGrid.innerHTML = ''
    this.downloadAllBtn.style.display = 'none'
  }
}

// アプリ初期化
document.addEventListener('DOMContentLoaded', () => {
  new GifExtractorApp()
  console.log('🚀 GIF Frame Extractor initialized')
})
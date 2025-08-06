import { loadGifFrames } from './frameLoader.js'
import { 
  createAnimationConfig, 
  createAnimationState, 
  createAnimationLoop,
  drawFrame
} from './animation.js'
import type { GifInfo, AnimationState } from './types.js'

const getElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id) as T
  if (!element) {
    throw new Error(`Element with id '${id}' not found`)
  }
  return element
}

const showError = (message: string): void => {
  const errorElement = getElement('errorMessage')
  errorElement.textContent = message
  errorElement.style.display = 'block'
  setTimeout(() => {
    errorElement.style.display = 'none'
  }, 5000)
}

const updateControlButtons = (state: AnimationState, hasFrames: boolean): void => {
  const playBtn = getElement<HTMLButtonElement>('playBtn')
  const pauseBtn = getElement<HTMLButtonElement>('pauseBtn')
  const resetBtn = getElement<HTMLButtonElement>('resetBtn')

  playBtn.disabled = !hasFrames || state.isPlaying
  pauseBtn.disabled = !hasFrames || !state.isPlaying
  resetBtn.disabled = !hasFrames
}

const displayGifInfo = (gifInfo: GifInfo, fileName: string): void => {
  const infoPanel = getElement('infoPanel')
  const infoGrid = getElement('infoGrid')
  
  const infoItems = [
    { label: 'ファイル名', value: fileName },
    { label: 'サイズ', value: `${gifInfo.width}×${gifInfo.height}px` },
    { label: 'フレーム数', value: `${gifInfo.frames.length}フレーム` },
    { label: '総再生時間', value: `${(gifInfo.totalDuration / 1000).toFixed(1)}秒` },
    { label: 'ループ回数', value: gifInfo.loopCount === 0 ? '無限ループ' : `${gifInfo.loopCount}回` },
    { label: 'アニメーション', value: '30FPS Canvas' }
  ]

  infoGrid.innerHTML = infoItems.map(item => `
    <div class="info-item">
      <div class="info-label">${item.label}</div>
      <div class="info-value">${item.value}</div>
    </div>
  `).join('')
  
  infoPanel.style.display = 'block'
}

const setupFileHandling = (
  canvas: HTMLCanvasElement,
  onGifLoaded: (gifInfo: GifInfo, fileName: string) => void
): void => {
  const uploadArea = getElement('uploadArea')
  const fileInput = getElement<HTMLInputElement>('fileInput')

  const handleFile = async (file: File): Promise<void> => {
    if (file.type !== 'image/gif') {
      showError('GIFファイルを選択してください')
      return
    }

    try {
      console.log(`🎬 Loading GIF: ${file.name}`)
      
      const gifInfo = await loadGifFrames(file, {
        maxFrames: 200,
        maxSize: 2048,
        onProgress: (current, total) => {
          console.log(`Progress: ${current}/${total}`)
        }
      })

      console.log(`✅ Loaded ${gifInfo.frames.length} frames`)
      
      if (gifInfo.frames.length > 0) {
        drawFrame(canvas, gifInfo.frames[0])
      }
      
      onGifLoaded(gifInfo, file.name)
      
    } catch (error) {
      console.error('❌ Error loading GIF:', error)
      showError(error instanceof Error ? error.message : 'Unknown error occurred')
    }
  }

  fileInput.addEventListener('change', (e) => {
    const files = (e.target as HTMLInputElement).files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  })

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault()
    uploadArea.classList.add('dragover')
  })

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover')
  })

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault()
    uploadArea.classList.remove('dragover')
    
    const files = Array.from(e.dataTransfer?.files || [])
      .filter(file => file.type === 'image/gif')
    
    if (files.length > 0) {
      handleFile(files[0])
    } else {
      showError('GIFファイルを選択してください')
    }
  })

  uploadArea.addEventListener('click', () => {
    fileInput.click()
  })
}

const initializeApp = (): void => {
  const canvas = getElement<HTMLCanvasElement>('animationCanvas')
  const playBtn = getElement<HTMLButtonElement>('playBtn')
  const pauseBtn = getElement<HTMLButtonElement>('pauseBtn')
  const resetBtn = getElement<HTMLButtonElement>('resetBtn')
  
  let currentAnimation: ReturnType<typeof createAnimationLoop> | null = null
  let currentState = createAnimationState()
  
  const config = createAnimationConfig()
  
  const onStateChange = (state: AnimationState): void => {
    currentState = state
    updateControlButtons(state, currentAnimation !== null)
  }

  const onGifLoaded = (gifInfo: GifInfo, fileName: string): void => {
    currentAnimation = createAnimationLoop(
      canvas,
      gifInfo,
      createAnimationState(),
      config,
      onStateChange
    )
    
    currentState = currentAnimation.getState()
    updateControlButtons(currentState, true)
    displayGifInfo(gifInfo, fileName)
    
    console.log(`🚀 Animation ready: ${gifInfo.frames.length} frames at 30FPS`)
  }

  playBtn.addEventListener('click', () => {
    currentAnimation?.start()
  })

  pauseBtn.addEventListener('click', () => {
    currentAnimation?.pause()
  })

  resetBtn.addEventListener('click', () => {
    currentAnimation?.reset()
  })

  setupFileHandling(canvas, onGifLoaded)
  updateControlButtons(currentState, false)
}

document.addEventListener('DOMContentLoaded', () => {
  initializeApp()
  console.log('🚀 GIF Canvas Animation POC initialized')
})
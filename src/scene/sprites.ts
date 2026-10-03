import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three'

function canvasTexture(width: number, height: number, draw: (context: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  draw(canvas.getContext('2d')!)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.minFilter = LinearFilter
  texture.generateMipmaps = false
  return texture
}

/** Brilho de estrela: núcleo duro e um halo curto, para somar por cima do céu. */
export const GLOW = canvasTexture(128, 128, (context) => {
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.12, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.32)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 128, 128)
})

export const LABEL_ASPECT = 8

export function labelTexture(text: string) {
  return canvasTexture(640, 640 / LABEL_ASPECT, (context) => {
    context.font = '500 30px "IBM Plex Mono", monospace'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = '#ffffff'
    try {
      context.letterSpacing = '5px'
    } catch {
      // navegadores sem letterSpacing no canvas desenham o rótulo mais apertado
    }
    context.fillText(text.toUpperCase(), 320, 42)
  })
}

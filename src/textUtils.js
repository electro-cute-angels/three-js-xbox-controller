import * as THREE from 'three'

/**
 * Creates a text texture on a canvas, returns a SpriteMaterial.
 */
export function createTextSprite(text, {
  fontSize = 48,
  fontFamily = 'serif',
  fontStyle = '',
  color = '#1a0a00',
  align = 'center',
  bgColor = null,
  padding = 10,
} = {}) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  const font = `${fontStyle} ${fontSize}px ${fontFamily}`.trim()
  ctx.font = font
  const metrics = ctx.measureText(text)
  const textWidth = metrics.width

  canvas.width = Math.ceil(textWidth + padding * 2)
  canvas.height = Math.ceil(fontSize * 1.4 + padding * 2)

  if (bgColor) {
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  ctx.font = font
  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  ctx.textAlign = align === 'center' ? 'center' : 'left'
  const x = align === 'center' ? canvas.width / 2 : padding
  ctx.fillText(text, x, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  texture.needsUpdate = true

  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  })

  const sprite = new THREE.Sprite(spriteMaterial)
  const aspect = canvas.width / canvas.height
  sprite.scale.set(aspect * 0.5, 0.5, 1)

  return sprite
}

/**
 * Creates a text sprite with a specific world-space height.
 */
export function createLabel(text, worldHeight, options = {}) {
  const sprite = createTextSprite(text, options)
  const aspect = sprite.material.map.image.width / sprite.material.map.image.height
  sprite.scale.set(aspect * worldHeight, worldHeight, 1)
  return sprite
}

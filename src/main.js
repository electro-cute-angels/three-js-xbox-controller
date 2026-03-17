import './style.css'
import * as THREE from 'three'
import { ControllerInput } from './controller.js'
import { buildDiagram } from './diagram.js'

// ─── Scene setup ────────────────────────────────────────────────
const canvas = document.createElement('canvas')
document.getElementById('canvas-container').appendChild(canvas)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xf5ebd2) // parchment background

const camera = new THREE.OrthographicCamera(
  -10, 10, 18, -4, 0.1, 100
)
camera.position.z = 10

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)

// ─── Build the diagram ─────────────────────────────────────────
const diagram = buildDiagram()
scene.add(diagram)

// ─── Controller ─────────────────────────────────────────────────
const controller = new ControllerInput()

// ─── Camera state ───────────────────────────────────────────────
let camTarget = new THREE.Vector3(0, 7, 0) // center of the diagram
let camZoom = 1.0
const PAN_SPEED = 0.15
const ZOOM_SPEED = 0.02
const ROTATE_SPEED = 0.03

function updateCameraBounds() {
  const aspect = window.innerWidth / window.innerHeight
  const viewHeight = 22 / camZoom
  const viewWidth = viewHeight * aspect
  camera.left   = camTarget.x - viewWidth / 2
  camera.right  = camTarget.x + viewWidth / 2
  camera.top    = camTarget.y + viewHeight / 2
  camera.bottom = camTarget.y - viewHeight / 2
  camera.updateProjectionMatrix()
}

updateCameraBounds()

// ─── UI Elements ────────────────────────────────────────────────
const statusElement   = document.getElementById('status')
const leftStickEl     = document.getElementById('left-stick')
const rightStickEl    = document.getElementById('right-stick')
const buttonsEl       = document.getElementById('buttons')
const zoomEl          = document.getElementById('zoom-level')

// ─── Highlight system ──────────────────────────────────────────
let highlightedBandIndex = -1
const bandMeshes = []

// Collect fillable band meshes from the diagram
diagram.children.forEach(child => {
  if (child.isMesh && child.material && child.material.color) {
    bandMeshes.push(child)
  }
})

function highlightBand(index) {
  bandMeshes.forEach((mesh, i) => {
    if (mesh.material._origColor === undefined) {
      mesh.material._origColor = mesh.material.color.getHex()
    }
    if (i === index) {
      mesh.material.color.setHex(0xffd700) // golden highlight
    } else {
      mesh.material.color.setHex(mesh.material._origColor)
    }
  })
}

// ─── Resize ─────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  updateCameraBounds()
})

// ─── Animation loop ─────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate)

  controller.update()

  // UI status
  if (controller.connected) {
    statusElement.textContent = '✓ Controller Connected'
    statusElement.style.borderColor = '#00ff00'
  } else {
    statusElement.textContent = '✗ Waiting for controller…'
    statusElement.style.borderColor = '#ff6600'
  }
  leftStickEl.textContent  = `L Stick: (${controller.leftStick.x.toFixed(2)}, ${controller.leftStick.y.toFixed(2)})`
  rightStickEl.textContent = `R Stick: (${controller.rightStick.x.toFixed(2)}, ${controller.rightStick.y.toFixed(2)})`
  const activeButtons = Object.entries(controller.buttons)
    .filter(([_, p]) => p).map(([n]) => n)
  buttonsEl.textContent = `Buttons: ${activeButtons.length ? activeButtons.join(', ') : 'None'}`

  // ── Left stick → pan camera ──
  camTarget.x += controller.leftStick.x * PAN_SPEED
  camTarget.y -= controller.leftStick.y * PAN_SPEED

  // ── Right stick Y → zoom ──
  camZoom += controller.rightStick.y * -ZOOM_SPEED
  camZoom = Math.max(0.3, Math.min(5.0, camZoom))
  if (zoomEl) zoomEl.textContent = `Zoom: ${camZoom.toFixed(2)}x`

  // ── Triggers → rotate diagram ──
  diagram.rotation.z += controller.triggers.right * ROTATE_SPEED
  diagram.rotation.z -= controller.triggers.left  * ROTATE_SPEED

  // ── D-Pad / Bumpers → cycle through bands ──
  if (controller.isPressed('RB') && !controller._rbPrev) {
    highlightedBandIndex = (highlightedBandIndex + 1) % bandMeshes.length
    highlightBand(highlightedBandIndex)
  }
  if (controller.isPressed('LB') && !controller._lbPrev) {
    highlightedBandIndex = (highlightedBandIndex - 1 + bandMeshes.length) % bandMeshes.length
    highlightBand(highlightedBandIndex)
  }
  controller._rbPrev = controller.isPressed('RB')
  controller._lbPrev = controller.isPressed('LB')

  // ── A button → reset view ──
  if (controller.isPressed('A')) {
    camTarget.set(0, 7, 0)
    camZoom = 1.0
    diagram.rotation.z = Math.PI / 2    // original orientation
  }

  // ── Y button → toggle wireframe hint ──
  if (controller.isPressed('Y') && !controller._yPrev) {
    bandMeshes.forEach(m => {
      m.material.wireframe = !m.material.wireframe
    })
  }
  controller._yPrev = controller.isPressed('Y')

  updateCameraBounds()
  renderer.render(scene, camera)
}

animate()

// ─── Cleanup ────────────────────────────────────────────────────
window.addEventListener('beforeunload', () => {
  controller.destroy()
  renderer.dispose()
})

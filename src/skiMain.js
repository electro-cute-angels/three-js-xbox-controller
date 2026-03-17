import './ski.css'
import * as THREE from 'three'
import { ControllerInput } from './controller.js'
import { createTerrain, getHeightAt, createTrees, createSkiLiftPoles } from './terrain.js'
import { SnowSystem, SnowSpray } from './snow.js'
import { createSkier } from './skier.js'

// ─── Renderer ───────────────────────────────────────────────────
const canvas = document.createElement('canvas')
document.getElementById('canvas-container').appendChild(canvas)

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

// ─── Scene & fog ────────────────────────────────────────────────
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xb8c8dd)
scene.fog = new THREE.FogExp2(0xb8c8dd, 0.006)

// ─── Camera ─────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.5, 500)

// ─── Lighting ───────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0x8899bb, 0.8)
scene.add(ambient)

const sun = new THREE.DirectionalLight(0xfff4e0, 1.2)
sun.position.set(50, 80, 30)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.left = -80
sun.shadow.camera.right = 80
sun.shadow.camera.top = 80
sun.shadow.camera.bottom = -80
sun.shadow.camera.far = 200
scene.add(sun)

const hemi = new THREE.HemisphereLight(0x9db8d2, 0x5d7a9e, 0.4)
scene.add(hemi)

// ─── World objects ──────────────────────────────────────────────
const terrain = createTerrain()
scene.add(terrain.mesh)

const trees = createTrees(300)
scene.add(trees)

const skiLift = createSkiLiftPoles(18)
scene.add(skiLift)

// ─── Skier ──────────────────────────────────────────────────────
const skier = createSkier()
scene.add(skier)

// ─── Snow ───────────────────────────────────────────────────────
const snow = new SnowSystem(scene, 10000)
const spray = new SnowSpray(scene, 400)

// ─── Controller ─────────────────────────────────────────────────
const controller = new ControllerInput()

// ─── Skier physics state ────────────────────────────────────────
const skierState = {
  x: 0,
  z: 0,
  y: 0,
  speed: 0,          // forward speed (units/s)
  heading: 0,        // radians, 0 = downhill (-Z)
  lean: 0,           // visual lean angle
  isJumping: false,
  jumpVelocity: 0,
  airY: 0,
}

const GRAVITY = 15
const MAX_SPEED = 45
const ACCELERATION = 8
const DRAG = 0.3
const BRAKE_FORCE = 15
const STEER_SPEED = 2.5
const JUMP_FORCE = 6

// Camera mode
let cameraMode = 0 // 0 = third person behind, 1 = first person, 2 = cinematic side
let cameraLookX = 0
let cameraLookY = 0

// Snow intensity cycling
let snowLevel = 1
const SNOW_LEVELS = [0.3, 1.0, 2.0]

// ─── UI refs ────────────────────────────────────────────────────
const statusEl  = document.getElementById('status')
const leftEl    = document.getElementById('left-stick')
const rightEl   = document.getElementById('right-stick')
const buttonsEl = document.getElementById('buttons')
const speedEl   = document.getElementById('speed-display')
const altEl     = document.getElementById('altitude-display')

// ─── Resize ─────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// ─── Clock ──────────────────────────────────────────────────────
const clock = new THREE.Clock()

// ─── Main loop ──────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate)
  const dt = Math.min(clock.getDelta(), 0.05) // clamp delta

  controller.update()

  // ── UI ──
  if (controller.connected) {
    statusEl.textContent = '✓ Controller Connected'
    statusEl.style.borderColor = 'rgba(100, 255, 100, 0.6)'
  } else {
    statusEl.textContent = '✗ Waiting for controller…'
    statusEl.style.borderColor = 'rgba(255, 150, 50, 0.6)'
  }
  leftEl.textContent  = `L Stick: (${controller.leftStick.x.toFixed(2)}, ${controller.leftStick.y.toFixed(2)})`
  rightEl.textContent = `R Stick: (${controller.rightStick.x.toFixed(2)}, ${controller.rightStick.y.toFixed(2)})`
  const activeButtons = Object.entries(controller.buttons)
    .filter(([_, p]) => p).map(([n]) => n)
  buttonsEl.textContent = `Buttons: ${activeButtons.length ? activeButtons.join(', ') : 'None'}`

  // ══════════════════════════════════════════════════════════════
  // SKIER PHYSICS
  // ══════════════════════════════════════════════════════════════

  // Slope gradient at current position → natural acceleration
  const slopeAhead = getHeightAt(skierState.x, skierState.z - 1) - getHeightAt(skierState.x, skierState.z + 1)
  const slopeAccel = Math.max(0, slopeAhead) * 3 // downhill = positive

  // Tuck (push left stick forward) adds speed
  const tuckInput = Math.max(0, -controller.leftStick.y) // forward = negative Y
  const accelerate = (slopeAccel + tuckInput * ACCELERATION + controller.triggers.right * ACCELERATION * 0.8) * dt

  // Braking
  const brakeInput = controller.triggers.left
  const braking = brakeInput * BRAKE_FORCE * dt

  // Update speed
  skierState.speed += accelerate
  skierState.speed -= braking
  skierState.speed -= skierState.speed * DRAG * dt // air resistance
  skierState.speed = Math.max(0, Math.min(MAX_SPEED, skierState.speed))

  // Steering with left stick horizontal
  const steerInput = controller.leftStick.x
  skierState.heading += steerInput * STEER_SPEED * dt * (0.5 + skierState.speed / MAX_SPEED)
  skierState.lean = steerInput * 0.3

  // Move the skier
  const moveX = Math.sin(skierState.heading) * skierState.speed * dt
  const moveZ = -Math.cos(skierState.heading) * skierState.speed * dt
  skierState.x += moveX
  skierState.z += moveZ

  // Ground height
  const groundY = getHeightAt(skierState.x, skierState.z)

  // Jump
  if (controller.isPressed('A') && !skierState.isJumping) {
    skierState.isJumping = true
    skierState.jumpVelocity = JUMP_FORCE
    skierState.airY = groundY
  }

  if (skierState.isJumping) {
    skierState.jumpVelocity -= GRAVITY * dt
    skierState.airY += skierState.jumpVelocity * dt
    if (skierState.airY <= groundY) {
      skierState.airY = groundY
      skierState.isJumping = false
      skierState.jumpVelocity = 0
      // Landing spray
      spray.emit(
        new THREE.Vector3(skierState.x, groundY, skierState.z),
        new THREE.Vector3(0, 0, 0),
        40
      )
    }
    skierState.y = skierState.airY
  } else {
    skierState.y = groundY
  }

  // Emit snow spray when carving or braking with speed
  if ((Math.abs(steerInput) > 0.3 || brakeInput > 0.2) && skierState.speed > 3 && !skierState.isJumping) {
    const sprayDir = new THREE.Vector3(
      -Math.sin(skierState.heading + steerInput * 0.5) * skierState.speed * 0.1,
      0,
      Math.cos(skierState.heading + steerInput * 0.5) * skierState.speed * 0.1
    )
    spray.emit(
      new THREE.Vector3(skierState.x, skierState.y + 0.1, skierState.z),
      sprayDir,
      Math.floor(skierState.speed * 0.5)
    )
  }

  // Reset position
  if (controller.isPressed('B')) {
    skierState.x = 0
    skierState.z = 0
    skierState.speed = 0
    skierState.heading = 0
    skierState.isJumping = false
  }

  // Toggle snow
  if (controller.isPressed('X') && !controller._xPrev) {
    snowLevel = (snowLevel + 1) % SNOW_LEVELS.length
    snow.setIntensity(SNOW_LEVELS[snowLevel])
  }
  controller._xPrev = controller.isPressed('X')

  // Toggle camera
  if (controller.isPressed('Y') && !controller._yPrev) {
    cameraMode = (cameraMode + 1) % 3
  }
  controller._yPrev = controller.isPressed('Y')

  // ══════════════════════════════════════════════════════════════
  // UPDATE SKIER MESH
  // ══════════════════════════════════════════════════════════════
  skier.position.set(skierState.x, skierState.y, skierState.z)
  skier.rotation.y = skierState.heading
  skier.rotation.z = skierState.lean

  // Tuck pose — lean forward when tucking
  skier.rotation.x = tuckInput * 0.3

  // ══════════════════════════════════════════════════════════════
  // CAMERA
  // ══════════════════════════════════════════════════════════════
  cameraLookX += controller.rightStick.x * 2.0 * dt
  cameraLookY += controller.rightStick.y * 1.5 * dt
  cameraLookY = Math.max(-0.5, Math.min(0.8, cameraLookY))

  const skierPos = new THREE.Vector3(skierState.x, skierState.y, skierState.z)

  if (cameraMode === 0) {
    // Third person behind
    const camDist = 6 + skierState.speed * 0.08
    const camHeight = 3 + skierState.speed * 0.03
    const camAngle = skierState.heading + Math.PI + cameraLookX
    const idealPos = new THREE.Vector3(
      skierState.x + Math.sin(camAngle) * camDist,
      skierState.y + camHeight + cameraLookY * 3,
      skierState.z + Math.cos(camAngle) * camDist
    )
    camera.position.lerp(idealPos, 0.08)
    const lookTarget = new THREE.Vector3(skierState.x, skierState.y + 1.5, skierState.z)
    camera.lookAt(lookTarget)
  } else if (cameraMode === 1) {
    // First person
    camera.position.set(
      skierState.x,
      skierState.y + 1.6,
      skierState.z
    )
    const lookAhead = new THREE.Vector3(
      skierState.x - Math.sin(skierState.heading + cameraLookX) * 10,
      skierState.y + 1 - cameraLookY * 5,
      skierState.z - Math.cos(skierState.heading + cameraLookX) * 10
    )
    camera.lookAt(lookAhead)
  } else {
    // Cinematic side view
    const sideOffset = 12
    const idealPos = new THREE.Vector3(
      skierState.x + sideOffset,
      skierState.y + 5,
      skierState.z + 3
    )
    camera.position.lerp(idealPos, 0.05)
    camera.lookAt(skierPos)
  }

  // Move sun shadow with skier
  sun.position.set(skierState.x + 50, skierState.y + 80, skierState.z + 30)
  sun.target.position.copy(skierPos)
  sun.target.updateMatrixWorld()

  // ══════════════════════════════════════════════════════════════
  // PARTICLES
  // ══════════════════════════════════════════════════════════════
  snow.update(dt, skierPos)
  spray.update(dt)

  // ── HUD ──
  const kmh = skierState.speed * 3.6 // convert units/s to km/h (approx)
  speedEl.textContent = `${Math.round(kmh)} km/h`
  const altitude = Math.round(1200 + skierState.y * 2)
  altEl.textContent = `Alt: ${altitude}m`

  // Change fog density based on snow intensity
  scene.fog.density = 0.004 + snow.intensity * 0.003

  renderer.render(scene, camera)
}

animate()

// ─── Cleanup ────────────────────────────────────────────────────
window.addEventListener('beforeunload', () => {
  controller.destroy()
  renderer.dispose()
})

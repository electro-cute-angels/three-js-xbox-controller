import './style.css'
import * as THREE from 'three'
import { ControllerInput } from './controller.js'

// Scene setup
const canvas = document.createElement('canvas')
document.getElementById('canvas-container').appendChild(canvas)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0a0a)

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = 5

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

// Create a rotating cube
const geometry = new THREE.BoxGeometry(2, 2, 2)
const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 })
const cube = new THREE.Mesh(geometry, material)
scene.add(cube)

// Create a torus to rotate around the cube
const torusGeometry = new THREE.TorusGeometry(3, 0.5, 16, 100)
const torusMaterial = new THREE.MeshPhongMaterial({ color: 0xff6600 })
const torus = new THREE.Mesh(torusGeometry, torusMaterial)
scene.add(torus)

// Create some small spheres
const spheres = []
for (let i = 0; i < 5; i++) {
  const sphereGeometry = new THREE.SphereGeometry(0.3, 32, 32)
  const sphereMaterial = new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff })
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
  
  // Position around the scene
  const angle = (i / 5) * Math.PI * 2
  sphere.position.set(Math.cos(angle) * 4, Math.sin(angle) * 4, 0)
  
  scene.add(sphere)
  spheres.push({ mesh: sphere, angle, distance: 4 })
}

// Controller setup
const controller = new ControllerInput()

// State variables
let cameraRotation = { x: 0, y: 0 }
let selectedObject = cube
let selectedColor = 0x00ff00

// UI Elements
const statusElement = document.getElementById('status')
const leftStickElement = document.getElementById('left-stick')
const rightStickElement = document.getElementById('right-stick')
const buttonsElement = document.getElementById('buttons')

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// Animation loop
function animate() {
  requestAnimationFrame(animate)

  // Update controller input
  controller.update()

  // Update UI
  if (controller.connected) {
    statusElement.textContent = `✓ Controller Connected`
    statusElement.style.background = 'rgba(0, 255, 0, 0.1)'
  } else {
    statusElement.textContent = `✗ Waiting for controller...`
    statusElement.style.background = 'rgba(255, 100, 0, 0.1)'
  }

  // Update stick display
  leftStickElement.textContent = `Left Stick: (${controller.leftStick.x.toFixed(2)}, ${controller.leftStick.y.toFixed(2)})`
  rightStickElement.textContent = `Right Stick: (${controller.rightStick.x.toFixed(2)}, ${controller.rightStick.y.toFixed(2)})`

  // Get active buttons
  const activeButtons = Object.entries(controller.buttons)
    .filter(([_, pressed]) => pressed)
    .map(([name]) => name)
  buttonsElement.textContent = `Buttons: ${activeButtons.length > 0 ? activeButtons.join(', ') : 'None'}`

  // Camera control with right stick
  cameraRotation.x += controller.rightStick.y * 0.05
  cameraRotation.y += controller.rightStick.x * 0.05

  // Clamp vertical rotation
  cameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraRotation.x))

  // Apply camera rotation
  camera.position.x = Math.sin(cameraRotation.y) * 5
  camera.position.y = Math.sin(cameraRotation.x) * 5
  camera.position.z = Math.cos(cameraRotation.y) * 5
  camera.lookAt(0, 0, 0)

  // Rotate cube with left stick
  cube.rotation.x += controller.leftStick.y * 0.05
  cube.rotation.y += controller.leftStick.x * 0.05

  // Torus rotation
  torus.rotation.x += 0.002
  torus.rotation.y += 0.003

  // Update spheres
  spheres.forEach((item, index) => {
    item.angle += 0.01
    item.mesh.position.x = Math.cos(item.angle) * item.distance
    item.mesh.position.y = Math.sin(item.angle) * item.distance
    item.mesh.rotation.x += 0.01
    item.mesh.rotation.y += 0.01
  })

  // Button interactions
  if (controller.isPressed('A')) {
    cube.scale.set(1.2, 1.2, 1.2)
  } else {
    cube.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1)
  }

  if (controller.isPressed('B')) {
    cube.rotation.z += 0.1
  }

  if (controller.isPressed('X')) {
    torus.scale.set(1.1, 1.1, 1.1)
  } else {
    torus.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1)
  }

  if (controller.isPressed('Y')) {
    // Reset all rotations
    cube.rotation.set(0, 0, 0)
  }

  // Trigger controls
  cube.position.z += controller.triggers.right * 0.1
  cube.position.z -= controller.triggers.left * 0.1

  renderer.render(scene, camera)
}

animate()

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  controller.destroy()
  renderer.dispose()
  geometry.dispose()
  material.dispose()
  torusGeometry.dispose()
  torusMaterial.dispose()
  spheres.forEach(item => {
    item.mesh.geometry.dispose()
    item.mesh.material.dispose()
  })
})

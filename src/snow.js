import * as THREE from 'three'

/**
 * Volumetric snow particle system that follows the skier.
 */
export class SnowSystem {
  constructor(scene, count = 8000) {
    this.count = count
    this.scene = scene
    this.intensity = 1.0 // 0 = off, 1 = normal, 2 = blizzard

    // Bounding volume around the camera
    this.boxW = 100
    this.boxH = 40
    this.boxD = 100

    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * this.boxW
      positions[i * 3 + 1] = Math.random() * this.boxH
      positions[i * 3 + 2] = (Math.random() - 0.5) * this.boxD

      velocities[i * 3]     = (Math.random() - 0.5) * 0.3  // drift X
      velocities[i * 3 + 1] = -1.5 - Math.random() * 2.0   // fall speed
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3  // drift Z

      sizes[i] = 0.1 + Math.random() * 0.25
    }

    this.velocities = velocities

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    // Create a soft round snowflake texture
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.3, 'rgba(240,245,255,0.8)')
    gradient.addColorStop(1, 'rgba(200,220,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 32, 32)

    const texture = new THREE.CanvasTexture(canvas)

    const material = new THREE.PointsMaterial({
      map: texture,
      size: 0.3,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: false,
      color: 0xeeeeff,
    })

    this.particles = new THREE.Points(geometry, material)
    scene.add(this.particles)
  }

  /**
   * Update every frame. Anchor keeps snow around the skier position.
   */
  update(dt, anchorPosition) {
    const positions = this.particles.geometry.attributes.position.array
    const halfW = this.boxW / 2
    const halfD = this.boxD / 2

    const windX = Math.sin(Date.now() * 0.0003) * 0.5 * this.intensity
    const windZ = Math.cos(Date.now() * 0.0004) * 0.3 * this.intensity

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3

      // Apply velocity + wind
      positions[i3]     += (this.velocities[i3]     + windX) * dt * this.intensity
      positions[i3 + 1] += this.velocities[i3 + 1] * dt * this.intensity
      positions[i3 + 2] += (this.velocities[i3 + 2] + windZ) * dt * this.intensity

      // Re-centre around anchor
      const relX = positions[i3]     - anchorPosition.x
      const relZ = positions[i3 + 2] - anchorPosition.z

      // Wrap particles that fall below terrain or drift too far
      if (positions[i3 + 1] < anchorPosition.y - 5) {
        positions[i3 + 1] = anchorPosition.y + this.boxH * 0.8 + Math.random() * 5
      }

      if (relX < -halfW) positions[i3]     += this.boxW
      if (relX >  halfW) positions[i3]     -= this.boxW
      if (relZ < -halfD) positions[i3 + 2] += this.boxD
      if (relZ >  halfD) positions[i3 + 2] -= this.boxD
    }

    this.particles.geometry.attributes.position.needsUpdate = true
  }

  setIntensity(level) {
    this.intensity = level
    this.particles.material.opacity = Math.min(1.0, 0.4 + level * 0.4)
    this.particles.material.size = 0.2 + level * 0.15
  }
}

/**
 * Spray snow effect when carving / braking.
 */
export class SnowSpray {
  constructor(scene, count = 300) {
    this.count = count
    this.scene = scene
    this.life = new Float32Array(count)
    this.velocities = new Float32Array(count * 3)

    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = -1000 // hidden
      positions[i * 3 + 2] = 0
      this.life[i] = 0
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const material = new THREE.PointsMaterial({
      size: 0.15,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      color: 0xffffff,
    })

    this.particles = new THREE.Points(geometry, material)
    scene.add(this.particles)
    this.nextIndex = 0
  }

  /**
   * Emit a burst of snow spray from a position
   */
  emit(position, direction, amount = 20) {
    const positions = this.particles.geometry.attributes.position.array

    for (let i = 0; i < amount; i++) {
      const idx = this.nextIndex
      this.nextIndex = (this.nextIndex + 1) % this.count

      const i3 = idx * 3
      positions[i3]     = position.x + (Math.random() - 0.5) * 0.5
      positions[i3 + 1] = position.y + Math.random() * 0.3
      positions[i3 + 2] = position.z + (Math.random() - 0.5) * 0.5

      this.velocities[i3]     = direction.x * (1 + Math.random()) + (Math.random() - 0.5) * 2
      this.velocities[i3 + 1] = 1 + Math.random() * 2
      this.velocities[i3 + 2] = direction.z * (1 + Math.random()) + (Math.random() - 0.5) * 2

      this.life[idx] = 1.0
    }

    this.particles.geometry.attributes.position.needsUpdate = true
  }

  update(dt) {
    const positions = this.particles.geometry.attributes.position.array

    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) continue

      const i3 = i * 3
      positions[i3]     += this.velocities[i3]     * dt
      positions[i3 + 1] += this.velocities[i3 + 1] * dt
      positions[i3 + 2] += this.velocities[i3 + 2] * dt

      // Gravity
      this.velocities[i3 + 1] -= 6 * dt

      this.life[i] -= dt * 1.5
      if (this.life[i] <= 0) {
        positions[i3 + 1] = -1000 // hide
      }
    }

    this.particles.geometry.attributes.position.needsUpdate = true
  }
}

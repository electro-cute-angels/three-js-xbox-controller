import * as THREE from 'three'

/**
 * Simple 2D simplex-like noise using sine combinations.
 * Good enough for terrain — no dependencies needed.
 */
function noise2D(x, z) {
  return (
    Math.sin(x * 0.15 + z * 0.1) * 0.5 +
    Math.sin(x * 0.08 - z * 0.12) * 0.8 +
    Math.sin(x * 0.3 + z * 0.25) * 0.25 +
    Math.sin(x * 0.02 + z * 0.03) * 3.0 +
    Math.cos(x * 0.05 + z * 0.07) * 1.5
  )
}

/**
 * Build a large snowy mountain slope terrain.
 * The slope goes downhill along -Z (the skiing direction).
 */
export function createTerrain() {
  const width = 200
  const depth = 600
  const segW = 200
  const segD = 600

  const geometry = new THREE.PlaneGeometry(width, depth, segW, segD)
  geometry.rotateX(-Math.PI / 2)

  const positions = geometry.attributes.position
  const colors = new Float32Array(positions.count * 3)

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const z = positions.getZ(i)

    // Base downhill slope: terrain drops along -Z
    let y = z * 0.12 // gentle slope going down along -Z

    // Add terrain noise for natural mountain feel
    y += noise2D(x, z)

    // Valley/piste shape — lower in the centre, higher at edges
    const valleyWidth = 25
    const edgeDist = Math.abs(x)
    if (edgeDist > valleyWidth) {
      y += (edgeDist - valleyWidth) * 0.15
    }

    // Moguls closer to the centre
    if (edgeDist < 15) {
      y += Math.sin(z * 0.8) * Math.sin(x * 0.6) * 0.3
    }

    positions.setY(i, y)

    // Color: snow white with slight blue shadows in valleys
    const shade = 0.85 + Math.random() * 0.15
    const blueShift = Math.max(0, 1 - edgeDist / 40) * 0.05
    colors[i * 3]     = shade - blueShift * 0.5  // R
    colors[i * 3 + 1] = shade - blueShift * 0.3  // G
    colors[i * 3 + 2] = shade + blueShift         // B
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()

  const material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true

  return { mesh, geometry, getHeightAt }
}

/**
 * Sample terrain height at world (x, z).
 * Mirrors the same formula used to generate the mesh.
 */
export function getHeightAt(x, z) {
  let y = z * 0.12
  y += noise2D(x, z)

  const valleyWidth = 25
  const edgeDist = Math.abs(x)
  if (edgeDist > valleyWidth) {
    y += (edgeDist - valleyWidth) * 0.15
  }
  if (edgeDist < 15) {
    y += Math.sin(z * 0.8) * Math.sin(x * 0.6) * 0.3
  }
  return y
}

/**
 * Create trees (simple cone+cylinder) scattered along the piste edges.
 */
export function createTrees(count = 250) {
  const group = new THREE.Group()

  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.5, 6)
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3520 })
  const leafGeo  = new THREE.ConeGeometry(1.2, 3, 8)
  const leafMat  = new THREE.MeshLambertMaterial({ color: 0x1a4a2a })

  // Snow-capped version
  const snowLeafMat = new THREE.MeshLambertMaterial({ color: 0x2a6a3a })

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 180
    const z = (Math.random() - 0.5) * 500

    // Only place trees outside the main piste
    if (Math.abs(x) < 18) continue

    const y = getHeightAt(x, z)

    const tree = new THREE.Group()

    const trunk = new THREE.Mesh(trunkGeo, trunkMat)
    trunk.position.y = 0.75
    trunk.castShadow = true
    tree.add(trunk)

    const scale = 0.7 + Math.random() * 0.8
    // Stack 2-3 cone layers
    const layers = 2 + Math.floor(Math.random() * 2)
    for (let l = 0; l < layers; l++) {
      const cone = new THREE.Mesh(leafGeo, l === 0 ? leafMat : snowLeafMat)
      cone.position.y = 2.0 + l * 1.4
      cone.scale.set(1 - l * 0.2, 1 - l * 0.15, 1 - l * 0.2)
      cone.castShadow = true
      tree.add(cone)
    }

    // Snow cap on top
    const snowCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: 0xeeeeff })
    )
    snowCap.position.y = 2.0 + layers * 1.4 - 0.3
    tree.add(snowCap)

    tree.position.set(x, y, z)
    tree.scale.setScalar(scale)
    group.add(tree)
  }

  return group
}

/**
 * Create ski lift poles along the side.
 */
export function createSkiLiftPoles(count = 15) {
  const group = new THREE.Group()
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x666666 })
  const cableMat = new THREE.LineBasicMaterial({ color: 0x333333 })

  const poleX = -22 // left side of slope

  for (let i = 0; i < count; i++) {
    const z = -250 + i * (500 / count)
    const y = getHeightAt(poleX, z)

    // Pole
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 8, 8),
      poleMat
    )
    pole.position.set(poleX, y + 4, z)
    pole.castShadow = true
    group.add(pole)

    // Cross-arm
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.15, 0.15),
      poleMat
    )
    arm.position.set(poleX, y + 8, z)
    group.add(arm)
  }

  // Cable line connecting tops
  const cablePoints = []
  for (let i = 0; i < count; i++) {
    const z = -250 + i * (500 / count)
    const y = getHeightAt(poleX, z) + 8
    cablePoints.push(new THREE.Vector3(poleX, y + 0.3, z))
  }
  const cableGeo = new THREE.BufferGeometry().setFromPoints(cablePoints)
  group.add(new THREE.Line(cableGeo, cableMat))

  return group
}

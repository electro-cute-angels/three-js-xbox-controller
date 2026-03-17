import * as THREE from 'three'

/**
 * Simple skier built from primitives — body, head, skis, poles.
 */
export function createSkier() {
  const group = new THREE.Group()

  const bodyMat   = new THREE.MeshLambertMaterial({ color: 0x2244aa })
  const skinMat   = new THREE.MeshLambertMaterial({ color: 0xf5c5a0 })
  const skiMat    = new THREE.MeshLambertMaterial({ color: 0xcc2222 })
  const poleMat   = new THREE.MeshLambertMaterial({ color: 0x444444 })
  const bootMat   = new THREE.MeshLambertMaterial({ color: 0x222222 })
  const goggleMat = new THREE.MeshLambertMaterial({ color: 0xff8800 })
  const helmetMat = new THREE.MeshLambertMaterial({ color: 0x111133 })

  // Torso
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.8, 0.35),
    bodyMat
  )
  torso.position.y = 1.2
  torso.castShadow = true
  group.add(torso)

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 12, 12),
    skinMat
  )
  head.position.y = 1.85
  head.castShadow = true
  group.add(head)

  // Helmet
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.23, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6),
    helmetMat
  )
  helmet.position.y = 1.9
  group.add(helmet)

  // Goggles
  const goggles = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.08, 0.1),
    goggleMat
  )
  goggles.position.set(0, 1.85, 0.18)
  group.add(goggles)

  // Legs
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.7, 0.25),
      bodyMat
    )
    leg.position.set(side * 0.18, 0.55, 0)
    leg.castShadow = true
    group.add(leg)

    // Boots
    const boot = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.2, 0.35),
      bootMat
    )
    boot.position.set(side * 0.18, 0.15, 0.05)
    group.add(boot)

    // Skis
    const ski = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.04, 2.0),
      skiMat
    )
    ski.position.set(side * 0.2, 0.02, 0.1)
    ski.castShadow = true
    group.add(ski)

    // Poles
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 1.3, 6),
      poleMat
    )
    pole.position.set(side * 0.45, 0.9, -0.05)
    pole.rotation.x = 0.2
    pole.rotation.z = side * 0.15
    group.add(pole)

    // Pole basket
    const basket = new THREE.Mesh(
      new THREE.RingGeometry(0, 0.08, 8),
      poleMat
    )
    basket.position.set(side * 0.48, 0.25, 0.05)
    basket.rotation.x = -Math.PI / 2
    group.add(basket)
  }

  // Arms
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.55, 0.2),
      bodyMat
    )
    arm.position.set(side * 0.42, 1.15, -0.02)
    arm.rotation.z = side * 0.2
    arm.castShadow = true
    group.add(arm)
  }

  group.scale.setScalar(0.8)
  return group
}

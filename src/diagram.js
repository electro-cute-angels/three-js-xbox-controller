import * as THREE from 'three'
import { createLabel } from './textUtils.js'

// ─── Configuration ──────────────────────────────────────────────
// The wedge spans from angle0 to angle1 (radians) — a ~90° sector
const ANGLE_START = -Math.PI / 4   // -45°
const ANGLE_END   =  Math.PI / 4   // +45°
const ANGLE_SPAN  = ANGLE_END - ANGLE_START

// Radii for concentric bands (from apex outward)
// Inner planetary / proportional bands
const INNER_BANDS = [
  { r0: 0,    r1: 0.6,  label: null },          // "Terra" core
  { r0: 0.6,  r1: 1.3,  label: 'A' },
  { r0: 1.3,  r1: 2.0,  label: 'A' },
  { r0: 2.0,  r1: 2.8,  label: 'lg' },
  { r0: 2.8,  r1: 3.7,  label: 'Ig' },
  { r0: 3.7,  r1: 4.7,  label: '40' },
  { r0: 4.7,  r1: 5.8,  label: '24' },
  { r0: 5.8,  r1: 7.0,  label: 'h' },
]

// Outermost labelled band
const SPHAERA_BAND = { r0: 7.0, r1: 8.5, label: 'Sphaera æqualitatis' }

// Empyrean heaven zones (dense hatching, progressively darker)
const EMPYREAN_BANDS = [
  { r0: 8.5,  r1: 10.0, label: '', hierarchy: 'Seraphim · Cherubim · Thrones' },
  { r0: 10.0, r1: 12.0, label: '', hierarchy: 'Dominations · Virtues · Powers' },
  { r0: 12.0, r1: 14.5, label: '', hierarchy: 'Principalities · Archangels · Angels' },
]

const MAX_RADIUS = 14.5

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Build a filled arc (annular sector) as a ShapeGeometry
 */
function makeArcShape(rInner, rOuter, aStart, aEnd, segments = 64) {
  const shape = new THREE.Shape()

  // outer arc (counter-clockwise)
  for (let i = 0; i <= segments; i++) {
    const a = aStart + (i / segments) * (aEnd - aStart)
    const x = Math.cos(a) * rOuter
    const y = Math.sin(a) * rOuter
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }

  // inner arc (clockwise back)
  for (let i = segments; i >= 0; i--) {
    const a = aStart + (i / segments) * (aEnd - aStart)
    const x = Math.cos(a) * rInner
    const y = Math.sin(a) * rInner
    shape.lineTo(x, y)
  }

  shape.closePath()
  return new THREE.ShapeGeometry(shape)
}

/**
 * Create a line arc at given radius
 */
function makeArcLine(radius, aStart, aEnd, segments = 64) {
  const points = []
  for (let i = 0; i <= segments; i++) {
    const a = aStart + (i / segments) * (aEnd - aStart)
    points.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0))
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  return geometry
}

/**
 * Create a radial line from rInner to rOuter at angle a
 */
function makeRadialLine(rInner, rOuter, angle) {
  const points = [
    new THREE.Vector3(Math.cos(angle) * rInner, Math.sin(angle) * rInner, 0),
    new THREE.Vector3(Math.cos(angle) * rOuter, Math.sin(angle) * rOuter, 0),
  ]
  return new THREE.BufferGeometry().setFromPoints(points)
}

/**
 * Create a hatching pattern (horizontal lines) within an arc band,
 * rendered as a canvas texture.
 */
function makeHatchedMaterial(darkness = 0.3, lineSpacing = 4) {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  // parchment base
  ctx.fillStyle = `rgba(245, 235, 210, ${1 - darkness * 0.8})`
  ctx.fillRect(0, 0, size, size)

  // horizontal hatching
  ctx.strokeStyle = `rgba(30, 15, 0, ${darkness})`
  ctx.lineWidth = 1.5
  for (let y = 0; y < size; y += lineSpacing) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(size, y)
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(4, 4)

  return new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    transparent: true,
  })
}

// ─── Main build function ────────────────────────────────────────

export function buildDiagram() {
  const group = new THREE.Group()
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x1a0a00, linewidth: 1 })
  const thinLineMaterial = new THREE.LineBasicMaterial({ color: 0x1a0a00, linewidth: 0.5, transparent: true, opacity: 0.5 })
  const parchment = new THREE.MeshBasicMaterial({ color: 0xf5ebd2, side: THREE.DoubleSide })

  // ── 1. Inner bands (parchment-colored fills) ──
  INNER_BANDS.forEach((band) => {
    if (band.r0 === 0) return // skip core, we'll just label it
    const geo = makeArcShape(band.r0, band.r1, ANGLE_START, ANGLE_END)
    const mesh = new THREE.Mesh(geo, parchment.clone())
    mesh.position.z = -0.01
    group.add(mesh)
  })

  // Sphaera band (lighter parchment)
  {
    const geo = makeArcShape(SPHAERA_BAND.r0, SPHAERA_BAND.r1, ANGLE_START, ANGLE_END)
    const mat = new THREE.MeshBasicMaterial({ color: 0xede0c0, side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.z = -0.01
    group.add(mesh)
  }

  // ── 2. Empyrean bands (hatched fills, progressively darker) ──
  EMPYREAN_BANDS.forEach((band, i) => {
    const darkness = 0.25 + i * 0.2  // 0.25, 0.45, 0.65
    const spacing = Math.max(3, 5 - i)
    const mat = makeHatchedMaterial(darkness, spacing)
    const geo = makeArcShape(band.r0, band.r1, ANGLE_START, ANGLE_END)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.z = -0.005
    group.add(mesh)
  })

  // ── 3. Arc division lines ──
  const allRadii = [
    ...INNER_BANDS.map(b => b.r0),
    ...INNER_BANDS.map(b => b.r1),
    SPHAERA_BAND.r0, SPHAERA_BAND.r1,
    ...EMPYREAN_BANDS.map(b => b.r0),
    ...EMPYREAN_BANDS.map(b => b.r1),
  ]
  const uniqueRadii = [...new Set(allRadii)].filter(r => r > 0).sort((a, b) => a - b)

  uniqueRadii.forEach(r => {
    const geo = makeArcLine(r, ANGLE_START, ANGLE_END, 80)
    group.add(new THREE.Line(geo, lineMaterial))
  })

  // ── 4. Radial edge lines (the two straight edges of the wedge) ──
  {
    const geoLeft = makeRadialLine(0, MAX_RADIUS, ANGLE_START)
    group.add(new THREE.Line(geoLeft, lineMaterial))

    const geoRight = makeRadialLine(0, MAX_RADIUS, ANGLE_END)
    group.add(new THREE.Line(geoRight, lineMaterial))
  }

  // ── 5. Fine radial subdivision lines ──
  const numRadials = 12
  for (let i = 1; i < numRadials; i++) {
    const a = ANGLE_START + (i / numRadials) * ANGLE_SPAN
    const geo = makeRadialLine(0.6, SPHAERA_BAND.r1, a)
    group.add(new THREE.Line(geo, thinLineMaterial))
  }

  // ── 6. Labels ──

  // "Terra" at the apex
  {
    const label = createLabel('Terra', 0.55, {
      fontSize: 56,
      fontStyle: 'italic',
      color: '#1a0a00',
    })
    label.position.set(0, -0.3, 0.02)
    group.add(label)
  }

  // Inner band labels — placed along the mid-angle of the sector
  const midAngle = (ANGLE_START + ANGLE_END) / 2
  INNER_BANDS.forEach(band => {
    if (!band.label) return
    const rMid = (band.r0 + band.r1) / 2
    const label = createLabel(band.label, 0.4, {
      fontSize: 48,
      fontStyle: 'italic',
      color: '#1a0a00',
    })
    label.position.set(
      Math.cos(midAngle) * rMid,
      Math.sin(midAngle) * rMid,
      0.02
    )
    group.add(label)
  })

  // Sphaera æqualitatis — curved label along mid-radius
  {
    const rMid = (SPHAERA_BAND.r0 + SPHAERA_BAND.r1) / 2
    const label = createLabel('Sphaera æqualitatis', 0.45, {
      fontSize: 44,
      fontStyle: 'italic',
      color: '#1a0a00',
    })
    label.position.set(
      Math.cos(midAngle) * rMid,
      Math.sin(midAngle) * rMid,
      0.02
    )
    group.add(label)
  }

  // ── 7. Angelic hierarchy labels along the right edge ──
  EMPYREAN_BANDS.forEach((band) => {
    const rMid = (band.r0 + band.r1) / 2
    const edgeAngle = ANGLE_END + 0.06 // just outside the right edge
    const label = createLabel(band.hierarchy, 0.35, {
      fontSize: 36,
      fontStyle: '',
      color: '#3a1a00',
      align: 'left',
    })
    label.position.set(
      Math.cos(edgeAngle) * rMid + 0.8,
      Math.sin(edgeAngle) * rMid,
      0.02
    )
    group.add(label)

    // bracket line
    const bracketPoints = [
      new THREE.Vector3(
        Math.cos(ANGLE_END) * band.r0 + 0.15,
        Math.sin(ANGLE_END) * band.r0,
        0.01
      ),
      new THREE.Vector3(
        Math.cos(ANGLE_END) * rMid + 0.3,
        Math.sin(ANGLE_END) * rMid,
        0.01
      ),
      new THREE.Vector3(
        Math.cos(ANGLE_END) * band.r1 + 0.15,
        Math.sin(ANGLE_END) * band.r1,
        0.01
      ),
    ]
    const bracketGeo = new THREE.BufferGeometry().setFromPoints(bracketPoints)
    const bracketLine = new THREE.Line(bracketGeo, new THREE.LineBasicMaterial({ color: 0x3a1a00 }))
    group.add(bracketLine)
  })

  // ── 8. Downward-pointing triangle (divine emanation) ──
  // After the group rotates 90° CCW, the +Y axis in local coords
  // maps to -X in world (left), and +X maps to +Y (up).
  // The triangle should appear at the top-left of the fan,
  // with its flat base flush against the upper boundary of the wedge.
  {
    const triSize = 2.0
    const triHeight = triSize * (Math.sqrt(3) / 2)

    // Upper-left corner of the fan in local (pre-rotation) coords:
    // The ANGLE_END edge at max radius points toward upper-left after rotation.
    // Place triangle just outside the outer arc, near the top-left.
    const anchorAngle = ANGLE_END // the "left" edge after rotation
    const anchorR = MAX_RADIUS + 0.15

    // The base of the triangle is flush with the outer arc,
    // pointing downward (toward the apex / Terra).
    const cx = Math.cos(anchorAngle) * (anchorR + triHeight * 0.5) - 1.5
    const cy = Math.sin(anchorAngle) * (anchorR + triHeight * 0.5)

    const triShape = new THREE.Shape()
    // Equilateral triangle pointing "inward" (toward origin = toward -x in local space)
    // Base on the far side, tip toward origin
    triShape.moveTo(cx - triSize / 2, cy + triHeight / 2)  // base left
    triShape.lineTo(cx + triSize / 2, cy + triHeight / 2)  // base right
    triShape.lineTo(cx, cy - triHeight / 2)                 // tip (pointing toward apex)
    triShape.closePath()

    const triGeo = new THREE.ShapeGeometry(triShape)
    const triMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide })
    const triMesh = new THREE.Mesh(triGeo, triMat)
    triMesh.position.z = 0.01
    group.add(triMesh)
  }

  // ── 9. Rotate the whole group so apex is at the bottom ──
  // The sector is centred on the +X axis; rotate so +X points up,
  // making the apex (origin) at the bottom.
  group.rotation.z = Math.PI / 2

  return group
}

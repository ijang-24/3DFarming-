import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { coastX, riverChannel, riverPoints, seaLevel, terrainHeight } from './terrain'
import type { DayPeriod } from './daylight'

type Point = [number, number]
const coast = Array.from({ length: 57 }, (_, i) => { const z = -140 + i * 5; return [coastX(z), z] as Point })
const river: Point[] = riverPoints.map(([x, z]) => [x, z])
const trail: Point[] = [[18, -15], [25, -9], [32, -9], [37, -9], [39, -17], [42, -22]]

function ribbon(controlPoints: Point[], width: number, height: (x: number, z: number) => number, fadeEnds = false) {
  const points = controlPoints.flatMap(([x, z], i) => {
    if (!i) return [[x, z] as Point]
    const [px, pz] = controlPoints[i - 1], steps = Math.ceil(Math.hypot(x - px, z - pz))
    return Array.from({ length: steps }, (_, j) => [px + (x - px) * (j + 1) / steps, pz + (z - pz) * (j + 1) / steps] as Point)
  })
  const vertices: number[] = [], indices: number[] = []
  points.forEach(([x, z], i) => {
    const before = points[Math.max(0, i - 1)], after = points[Math.min(points.length - 1, i + 1)]
    const length = Math.hypot(after[0] - before[0], after[1] - before[1]) || 1
    const halfWidth = width / 2 * (fadeEnds ? Math.min(i / 18, (points.length - 1 - i) / 18, 1) : 1)
    const nx = -(after[1] - before[1]) / length * halfWidth, nz = (after[0] - before[0]) / length * halfWidth
    for (const side of [-1, 1]) vertices.push(x + nx * side, height(x + nx * side, z + nz * side), z + nz * side)
    if (i) { const j = i * 2; indices.push(j - 2, j - 1, j, j - 1, j + 1, j) }
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function Forest({ low }: { low: boolean }) {
  const trunks = useRef<THREE.InstancedMesh>(null), crowns = useRef<THREE.InstancedMesh>(null)
  const count = low ? 36 : 72
  useEffect(() => {
    const dummy = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      const cluster = i % 4, angle = i * 2.39996, radius = 3 + Math.sqrt(i / 4) * 2.7
      const x = [-36, -49, -72, -22][cluster] + Math.cos(angle) * radius
      const z = [-10, -45, -29, -57][cluster] + Math.sin(angle) * radius
      const scale = 0.85 + i % 5 * 0.18, y = terrainHeight(x, z)
      dummy.position.set(x, y + scale * 0.7, z); dummy.scale.set(scale * 0.17, scale * 1.4, scale * 0.17); dummy.updateMatrix()
      trunks.current?.setMatrixAt(i, dummy.matrix)
      dummy.position.y = y + scale * 2.15; dummy.scale.set(scale * 1.2, scale * 3.1, scale * 1.2); dummy.updateMatrix()
      crowns.current?.setMatrixAt(i, dummy.matrix)
      crowns.current?.setColorAt(i, new THREE.Color(i % 3 ? '#6f936e' : '#8da77b'))
    }
    for (const mesh of [trunks.current, crowns.current]) if (mesh) { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.computeBoundingSphere() }
  }, [count])
  return <group name="hillside-tree-clusters">
    <instancedMesh ref={trunks} args={[undefined, undefined, count]}><cylinderGeometry args={[0.8, 1, 1, 5]}/><meshStandardMaterial color="#88745b"/></instancedMesh>
    <instancedMesh ref={crowns} args={[undefined, undefined, count]}><coneGeometry args={[1, 1, 6]}/><meshStandardMaterial roughness={1} flatShading/></instancedMesh>
  </group>
}

function Lighthouse({ night, low, reduced }: { night: boolean; low: boolean; reduced: boolean }) {
  const beam = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (beam.current && !reduced) beam.current.rotation.y += Math.min(dt, 0.05) * 0.22 })
  return <group position={[42, terrainHeight(42, -22), -22]} name="coastal-lighthouse">
    <mesh position={[0, 0.15, 0]}><cylinderGeometry args={[3.4, 3.8, 0.3, 8]}/><meshStandardMaterial color="#a9a58e"/></mesh>
    <mesh position={[0, 3.4, 0]} castShadow><cylinderGeometry args={[1.05, 1.65, 6.6, 10]}/><meshStandardMaterial color="#f3eddb"/></mesh>
    <mesh position={[0, 4.7, 0]}><cylinderGeometry args={[1.22, 1.34, 1.05, 10]}/><meshStandardMaterial color="#bd6653"/></mesh>
    <mesh position={[0, 6.9, 0]}><cylinderGeometry args={[1.75, 1.75, 0.25, 10]}/><meshStandardMaterial color="#647778"/></mesh>
    <mesh position={[0, 7.65, 0]}><cylinderGeometry args={[0.95, 0.95, 1.25, 8]}/><meshStandardMaterial color={night ? '#ffe2a2' : '#a4c8c7'} emissive="#ffd487" emissiveIntensity={night ? 1.4 : 0}/></mesh>
    <mesh position={[0, 8.55, 0]} castShadow><coneGeometry args={[1.55, 0.8, 8]}/><meshStandardMaterial color="#b85d4d"/></mesh>
    {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <mesh key={i} position={[Math.cos(i * Math.PI / 4) * 1.5, 7.25, Math.sin(i * Math.PI / 4) * 1.5]}><boxGeometry args={[0.065, 0.6, 0.065]}/><meshStandardMaterial color="#667675"/></mesh>)}
    <mesh position={[0, 1, 1.5]}><boxGeometry args={[0.7, 1.6, 0.12]}/><meshStandardMaterial color="#6c827a"/></mesh>
    {night && <group ref={beam} position={[0, 7.6, 0]}>
      <mesh position={[8, 0, 0]} rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[2.6, 16, 16, 1, true]}/><meshBasicMaterial color="#ffe8ad" transparent opacity={0.055} depthWrite={false} side={THREE.DoubleSide}/></mesh>
      {!low && <pointLight color="#ffdc94" intensity={7} distance={10} decay={2}/>}
    </group>}
    {[0, 1, 2, 3, 4].map(i => <mesh key={`fence-${i}`} position={[-3.8 + i * 1.8, 0.5, 3.3]}><boxGeometry args={[0.12, 1, 0.12]}/><meshStandardMaterial color="#d7c8a9"/></mesh>)}
    <mesh position={[-0.2, 0.7, 3.3]}><boxGeometry args={[7.5, 0.11, 0.1]}/><meshStandardMaterial color="#d7c8a9"/></mesh>
  </group>
}

export default function CoastalLandscape({ period, low, reduced }: { period: DayPeriod; low: boolean; reduced: boolean }) {
  const night = period === 'night', waves = useRef<THREE.Mesh>(null), boat = useRef<THREE.Group>(null)
  const geometries = useMemo(() => {
    const ground = new THREE.PlaneGeometry(460, 460, 230, 230)
    ground.rotateX(-Math.PI / 2)
    const positions = ground.attributes.position, colors: number[] = []
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), z = positions.getZ(i), y = terrainHeight(x, z)
      positions.setY(i, y)
      const color = new THREE.Color(y < seaLevel + 2.3 ? '#e1cea3' : y < seaLevel + 4 ? '#b9bc8d' : y > 28 ? '#a3b0a8' : y > 12 ? '#7f9a7c' : '#9bb77b')
      colors.push(color.r, color.g, color.b)
    }
    ground.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); ground.computeVertexNormals()
    const shallow = ribbon(coast.map(([x, z]) => [x + 5, z]), 13, () => seaLevel + 0.015, true)
    const foam = ribbon(coast.map(([x, z]) => [x + 0.65, z]), 0.55, () => seaLevel + 0.045, true)
    const stream = ribbon(river, 1.35, (x, z) => Math.max(seaLevel, riverChannel(x, z).height) + 0.04)
    const path = ribbon(trail, 1.2, (x, z) => terrainHeight(x, z) + 0.1)
    return { ground, shallow, foam, stream, path }
  }, [])
  useEffect(() => () => Object.values(geometries).forEach(geometry => geometry.dispose()), [geometries])
  useFrame(({ clock }) => {
    if (reduced) return
    if (waves.current) { waves.current.position.x = Math.sin(clock.elapsedTime * 0.6) * 0.25; (waves.current.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(clock.elapsedTime * 0.6) * 0.13 }
    if (boat.current) { boat.current.position.y = seaLevel + 0.35 + Math.sin(clock.elapsedTime * 0.85) * 0.12; boat.current.rotation.z = Math.sin(clock.elapsedTime * 0.65) * 0.035 }
  })
  const dockX = coastX(18)
  return <group name="coastal-landscape">
    <mesh geometry={geometries.ground} receiveShadow><meshStandardMaterial vertexColors flatShading roughness={1}/></mesh>
    <mesh position={[0, seaLevel, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1800, 1800]}/><meshStandardMaterial color={night ? '#365e78' : '#559eaf'} roughness={0.65}/></mesh>
    <mesh geometry={geometries.shallow}><meshStandardMaterial color={night ? '#4b8c99' : '#72c9c6'} roughness={0.5}/></mesh>
    <mesh ref={waves} geometry={geometries.foam}><meshBasicMaterial color="#e1f2e4" transparent opacity={0.45} depthWrite={false} side={THREE.DoubleSide}/></mesh>
    <mesh geometry={geometries.stream}><meshStandardMaterial color="#7bbec0" roughness={0.45} side={THREE.DoubleSide}/></mesh>
    <mesh geometry={geometries.path}><meshStandardMaterial color="#d8c79f" roughness={1} side={THREE.DoubleSide}/></mesh>
    {[[-95, -90, 26, 25], [-60, -108, 31, 24], [-23, -124, 25, 22]].map(([x, z, height, radius], i) => <mesh key={`distant-peak-${i}`} position={[x, terrainHeight(x, z) + height / 2 - 1, z]} scale={[1.25, 1, 0.85]}><coneGeometry args={[radius, height, 7]}/><meshStandardMaterial color={night ? '#526f7a' : '#a8bbb5'} flatShading roughness={1}/></mesh>)}
    <Forest low={low}/>
    <Lighthouse night={night} low={low} reduced={reduced}/>
    <group position={[32, Math.max(terrainHeight(29.5, -9), terrainHeight(34.5, -9)) + 0.25, -9]} rotation={[0, -0.14, 0]} name="river-footbridge">
      {Array.from({ length: 11 }, (_, i) => <mesh key={i} position={[-2.1 + i * 0.42, 0.18 + Math.sin(i / 10 * Math.PI) * 0.2, 0]}><boxGeometry args={[0.38, 0.16, 1.7]}/><meshStandardMaterial color={i % 2 ? '#bd9d70' : '#d0b68a'}/></mesh>)}
      {[-0.85, 0.85].map(z => <mesh key={z} position={[0, 0.9, z]}><boxGeometry args={[4.8, 0.12, 0.12]}/><meshStandardMaterial color="#d7c6a2"/></mesh>)}
    </group>
    <group position={[dockX - 1, seaLevel + 0.4, 18]} name="seaside-dock">
      {Array.from({ length: 13 }, (_, i) => <mesh key={i} position={[i * 0.45, 0, 0]}><boxGeometry args={[0.4, 0.15, 2.1]}/><meshStandardMaterial color={i % 2 ? '#a78b68' : '#c7aa7b'}/></mesh>)}
      {[0, 5].flatMap(x => [-0.9, 0.9].map(z => <mesh key={`${x}-${z}`} position={[x, -0.6, z]}><cylinderGeometry args={[0.12, 0.15, 1.7, 5]}/><meshStandardMaterial color="#8a765c"/></mesh>))}
    </group>
    <group ref={boat} position={[dockX + 4, seaLevel + 0.35, 21]} rotation={[0, 0.3, 0]} name="moored-boat">
      <mesh scale={[1.7, 0.4, 0.7]}><sphereGeometry args={[1, 6, 4]}/><meshStandardMaterial color="#b97c61" flatShading/></mesh>
      <mesh position={[0, 0.12, 0]}><boxGeometry args={[1.9, 0.1, 0.65]}/><meshStandardMaterial color="#e2cba3"/></mesh>
      <mesh position={[0, 1.1, 0]}><cylinderGeometry args={[0.035, 0.04, 2.1, 5]}/><meshStandardMaterial color="#8b775c"/></mesh>
      <mesh position={[0.35, 1.4, 0]} rotation={[0, 0, -0.35]}><coneGeometry args={[0.65, 1.2, 3]}/><meshStandardMaterial color="#eee5c7" flatShading/></mesh>
    </group>
    {[[66, -23, 1.5], [61, -33, 2], [49, -34, 1.2], [42, 25, 0.7], [-29, 11, 1]].map(([x, z, scale], i) => <mesh key={`rock-${i}`} position={[x, terrainHeight(x, z) + scale * 0.25, z]} scale={[scale * 1.3, scale * 0.8, scale]}><icosahedronGeometry args={[1, 0]}/><meshStandardMaterial color="#9ba59a" flatShading/></mesh>)}
    {[[106, -130, 13], [152, -92, 9], [176, -150, 17]].map(([x, z, height], i) => <mesh key={`island-${i}`} position={[x, seaLevel + height / 2, z]} scale={[1.8, 1, 1.3]}><coneGeometry args={[height, height, 6]}/><meshStandardMaterial color="#91aba7" flatShading/></mesh>)}
  </group>
}

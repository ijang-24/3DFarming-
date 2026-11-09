import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { DayPeriod } from './daylight'
import { agentStatus, currentTask, plots, type Agent, type FarmState, type Plot, type Status } from './types'
import CoastalLandscape from './CoastalLandscape'
import { terrainHeight } from './terrain'

export type Quality = 'low' | 'medium' | 'high'
export interface CameraAction { kind: 'home' | 'zoomIn' | 'zoomOut' | 'rotate' | 'focus'; id?: string; serial: number }
interface Props { farm: FarmState; selected: string | null; onAgent: (id: string) => void; onPlot: (id: string) => void; quality: Quality; period: DayPeriod; cameraAction: CameraAction; onReady: () => void; onLost: () => void }
const positions = new Map<string, THREE.Vector3>()
const c = { grass: '#94b96b', edge: '#ccac7b', dirt: '#846042', path: '#dcccaa', wood: '#a98050', paleWood: '#dec69c', leaf: '#678e4c', leafLight: '#83a45b', trunk: '#86633e', roof: '#cf7658', wall: '#f6e4ba', water: '#7abdc4' }

function Box({ position, size, color, rotation = [0, 0, 0], ...props }: { position: [number, number, number]; size: [number, number, number]; color: string; rotation?: [number, number, number]; onClick?: (e: ThreeEvent<MouseEvent>) => void }) {
  return <mesh position={position} rotation={rotation} castShadow receiveShadow {...props}><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={0.9}/></mesh>
}
function Tree({ x, z, scale = 1, pine = false }: { x: number; z: number; scale?: number; pine?: boolean }) {
  return <group position={[x, 0, z]} scale={scale}>
    <mesh position={[0, 0.8, 0]} castShadow><cylinderGeometry args={[0.14, 0.22, 1.6, 5]}/><meshStandardMaterial color={c.trunk}/></mesh>
    {pine ? [0, 1, 2].map(i => <mesh key={i} position={[0, 1.2 + i * 0.65, 0]} castShadow><coneGeometry args={[1.05 - i * 0.2, 1.65, 6]}/><meshStandardMaterial color={i % 2 ? c.leafLight : c.leaf}/></mesh>) : <>
      <mesh position={[0, 2.1, 0]} castShadow><icosahedronGeometry args={[1.25, 0]}/><meshStandardMaterial color={c.leaf}/></mesh>
      <mesh position={[0.6, 2.4, 0.2]} castShadow><icosahedronGeometry args={[0.8, 0]}/><meshStandardMaterial color={c.leafLight}/></mesh>
    </>}
  </group>
}
function Fence({ x, z, length, rotate = false }: { x: number; z: number; length: number; rotate?: boolean }) {
  return <group position={[x, 0, z]} rotation={[0, rotate ? Math.PI / 2 : 0, 0]}>
    {Array.from({ length: length + 1 }, (_, i) => <Box key={i} position={[i * 1.5, 0.53, 0]} size={[0.13, 1.06, 0.13]} color={c.paleWood}/>)}
    {[0.36, 0.79].map(y => <Box key={y} position={[length * 0.75, y, 0]} size={[length * 1.5, 0.12, 0.09]} color={c.paleWood}/>)}
  </group>
}
function House({ barn = false, night }: { barn?: boolean; night: boolean }) {
  const height = barn ? 3.1 : 2.6, rise = barn ? 1.65 : 1.35
  const roofAngle = Math.atan2(rise, 2.5), roofLength = Math.hypot(2.5, rise)
  const gable = useMemo(() => new THREE.Shape([new THREE.Vector2(-2.15, 0), new THREE.Vector2(2.15, 0), new THREE.Vector2(0, rise)]), [rise])
  return <group position={[barn ? 7 : -6, 0, -7]} name={barn ? 'timber-warehouse' : 'mountain-cottage'}>
    <Box position={[0, 0.15, 0]} size={[4.6, 0.3, 3.8]} color="#aaa18c"/>
    <Box position={[0, height / 2 + 0.15, 0]} size={[4.3, height, 3.5]} color={barn ? '#ac6348' : c.wall}/>
    {[-1, 1].map(side => <group key={side}>
      <mesh position={[0, height + 0.15, side * 1.76]} rotation={[0, side < 0 ? Math.PI : 0, 0]} castShadow><shapeGeometry args={[gable]}/><meshStandardMaterial color={barn ? '#ac6348' : c.wall} side={THREE.DoubleSide}/></mesh>
      <Box position={[side * 1.25, height + 0.15 + rise / 2, 0]} size={[roofLength, 0.17, 4.3]} rotation={[0, 0, -side * roofAngle]} color={barn ? '#526c70' : '#bd654d'}/>
      <Box position={[side * 2.09, height / 2 + 0.15, 1.79]} size={[0.16, height, 0.14]} color={c.paleWood}/>
      <Box position={[side * 2.18, 1.1, -0.35]} size={[0.12, 1.25, 1]} color={barn ? '#764b37' : '#6d9090'}/>
      <Box position={[side * 2.25, 1.1, -0.35]} size={[0.07, 1.35, 0.07]} color={c.paleWood}/>
      <Box position={[side * 2.25, 1.1, -0.35]} size={[0.07, 0.07, 1.1]} color={c.paleWood}/>
    </group>)}
    <Box position={[0, height + 0.15 + rise, 0]} size={[0.18, 0.17, 4.4]} color={barn ? '#3f585c' : '#8d493b'}/>
    <Box position={[0, height + 0.1, 1.85]} size={[4.5, 0.16, 0.16]} color={c.paleWood}/>
    {barn ? <>
      {[-1, 1].map(side => <group key={side}>
        <Box position={[side * 0.63, 1.19, 1.82]} size={[1.22, 2.1, 0.14]} color="#77513a"/>
        {[-1, 1].map(diagonal => <Box key={diagonal} position={[side * 0.63, 1.19, 1.92]} size={[0.095, 2.32, 0.07]} color={c.paleWood} rotation={[0, 0, diagonal * 0.48]}/>)}
        <Box position={[side * 1.35, 1.23, 1.94]} size={[0.15, 2.35, 0.16]} color={c.paleWood}/>
        <Box position={[side * 0.15, 1.15, 1.99]} size={[0.08, 0.28, 0.07]} color="#3e4842"/>
        {[-1, 0, 1].map(i => <Box key={i} position={[side * 2.17, 0.75 + i * 0.45, 0]} size={[0.08, 0.09, 3.5]} color="#c58762"/>)}
      </group>)}
      <Box position={[0, 2.42, 1.96]} size={[2.85, 0.19, 0.2]} color={c.paleWood}/>
      <Box position={[0, 3.48, 1.82]} size={[0.95, 0.83, 0.12]} color="#463e32"/>
      <Box position={[0, 3.48, 1.93]} size={[0.08, 0.9, 0.07]} color={c.paleWood}/>
      <Box position={[0, 3.48, 1.93]} size={[1.02, 0.08, 0.07]} color={c.paleWood}/>
      <Box position={[0, 0.07, 2.32]} size={[3.2, 0.14, 1.1]} color="#b5ab93"/>
      {[0, 1].map(i => <group key={i} position={[3, i * 0.62, 0.75 - i * 0.2]}>
        <Box position={[0, 0.32, 0]} size={[1.3, 0.62, 1]} color={i ? '#e1c472' : '#d2ae59'}/>
        {[-0.35, 0.35].map(x => <Box key={x} position={[x, 0.32, 0]} size={[0.055, 0.65, 1.03]} color="#a68b4a"/>)}
      </group>)}
      <Box position={[-2.85, 0.36, 0.8]} size={[0.85, 0.72, 0.85]} color={c.wood}/>
      <Box position={[-2.85, 0.36, 1.24]} size={[0.95, 0.09, 0.07]} color={c.paleWood} rotation={[0, 0, 0.62]}/>
    </> : <>
      <Box position={[0, 1.13, 1.82]} size={[0.9, 1.95, 0.13]} color="#527b70"/>
      <Box position={[0, 2.16, 1.91]} size={[1.12, 0.12, 0.16]} color={c.paleWood}/>
      <Box position={[0.29, 1.1, 1.92]} size={[0.08, 0.08, 0.08]} color="#d8b566"/>
      {[-1.4, 1.4].map(x => <group key={x}>
        <mesh position={[x, 1.45, 1.82]}><boxGeometry args={[0.72, 0.83, 0.1]}/><meshStandardMaterial color={night ? '#ffda99' : '#81a7a5'} emissive="#ffbb65" emissiveIntensity={night ? 1.5 : 0}/></mesh>
        {[-0.49, 0.49].map(offset => <Box key={offset} position={[x + offset, 1.45, 1.86]} size={[0.2, 0.94, 0.12]} color="#729078"/>)}
        <Box position={[x, 1.45, 1.91]} size={[0.06, 0.92, 0.07]} color={c.wall}/>
        <Box position={[x, 1.45, 1.91]} size={[0.82, 0.06, 0.07]} color={c.wall}/>
        <Box position={[x, 0.9, 1.99]} size={[1.06, 0.23, 0.38]} color={c.wood}/>
        {[-0.32, 0, 0.32].map((offset, i) => <mesh key={offset} position={[x + offset, 1.08, 2.02]}><icosahedronGeometry args={[0.16, 0]}/><meshStandardMaterial color={i % 2 ? '#d89683' : '#8da565'}/></mesh>)}
      </group>)}
      <Box position={[0, 0.13, 2.45]} size={[4.9, 0.26, 1.35]} color={c.paleWood}/>
      <Box position={[0, 0.06, 3.2]} size={[1.5, 0.12, 0.45]} color="#b5ad99"/>
      <Box position={[0, 2.55, 2.4]} size={[5.1, 0.14, 1.6]} color="#bd654d" rotation={[-0.12, 0, 0]}/>
      {[-2.2, 2.2].map(x => <Box key={x} position={[x, 1.3, 2.92]} size={[0.15, 2.4, 0.15]} color={c.paleWood}/>)}
      <Box position={[1.25, 3.65, -0.65]} size={[0.52, 1.65, 0.58]} color="#a29480"/>
      <Box position={[1.25, 4.49, -0.65]} size={[0.7, 0.16, 0.75]} color="#d3c5a9"/>
    </>}
  </group>
}
function Windmill({ reduced }: { reduced: boolean }) {
  const blades = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (blades.current && !reduced) blades.current.rotation.z += dt * 0.28 })
  return <group position={[-11, 0, -5]}>
    <mesh position={[0, 1.8, 0]} castShadow><cylinderGeometry args={[0.6, 1, 3.6, 6]}/><meshStandardMaterial color="#ead8b5"/></mesh>
    <mesh position={[0, 3.9, 0]} castShadow><coneGeometry args={[1.1, 1.2, 6]}/><meshStandardMaterial color="#788b83"/></mesh>
    <group ref={blades} position={[0, 3.4, 0.8]}>{[0, 1, 2, 3].map(i => <group key={i} rotation={[0, 0, i * Math.PI / 2]}><Box position={[0, 1.1, 0]} size={[0.13, 2.6, 0.12]} color={c.wood}/><Box position={[0.22, 1.5, 0]} size={[0.5, 1.2, 0.08]} color="#e5d5b1"/></group>)}<mesh><sphereGeometry args={[0.2, 8, 8]}/><meshStandardMaterial color={c.wood}/></mesh></group>
  </group>
}
function Pond({ reduced }: { reduced: boolean }) {
  const water = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => { if (water.current && !reduced) water.current.position.y = 0.02 + Math.sin(clock.elapsedTime) * 0.025 })
  return <group position={[11, 0, 7]}>
    <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1.4, 1]} receiveShadow><circleGeometry args={[2.7, 12]}/><meshStandardMaterial color="#b9bba0"/></mesh>
    <mesh ref={water} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1.4, 1]}><circleGeometry args={[2.4, 16]}/><meshStandardMaterial color={c.water} roughness={0.28} metalness={0.12}/></mesh>
    {[[-1.3, -1], [1.1, 1.6], [1, -1.7]].map(([x, z], i) => <mesh key={i} position={[x, 0.09, z]} rotation={[-Math.PI / 2, 0, i]}><circleGeometry args={[0.29, 7]}/><meshStandardMaterial color="#64966b"/></mesh>)}
    <group position={[0, 0, 0.3]} rotation={[0, 0.18, 0]}>{Array.from({ length: 10 }, (_, i) => <Box key={i} position={[-1.65 + i * 0.37, 0.3 + Math.sin(i / 9 * Math.PI) * 0.25, 0]} size={[0.34, 0.13, 1.2]} color={i % 2 ? '#bc9461' : '#c7a16d'}/>)}{[-0.65, 0.65].map(z => <Box key={z} position={[0, 0.94, z]} size={[3.8, 0.12, 0.11]} color={c.paleWood}/>)}</group>
    {[-2.5, 2.5].map((x, i) => <group key={x} position={[x, 0, i ? 1 : -1]}>{[0, 1, 2].map(j => <Box key={j} position={[j * 0.14, 0.45 + j * 0.1, 0]} size={[0.05, 0.9 + j * 0.2, 0.05]} color="#6c8a54"/>)}</group>)}
  </group>
}
function Lake({ reduced, quality }: { reduced: boolean; quality: Quality }) {
  const swimmers = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!swimmers.current || reduced) return
    swimmers.current.children.forEach((animal, i) => {
      const angle = clock.elapsedTime * (i < 3 ? 0.12 : -0.19) + i * 2.1
      const radius = i < 3 ? 3.1 + i * 0.3 : 1.6 + (i - 3) * 0.7
      animal.position.set(Math.cos(angle) * radius, i < 3 ? 0.16 + Math.sin(angle * 5) * 0.035 : 0.075, Math.sin(angle) * radius * 0.82)
      animal.rotation.y = Math.atan2(-Math.sin(angle), Math.cos(angle) * 0.82) + (i < 3 ? 0 : Math.PI)
    })
  })
  return <group position={[21, 0, 7]} name="duck-lake">
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]} scale={[1, 1.2, 1]} receiveShadow><circleGeometry args={[6.4, 20]}/><meshStandardMaterial color="#c6c19c"/></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.055, 0]} scale={[1, 1.2, 1]}><circleGeometry args={[5.9, 24]}/><meshStandardMaterial color="#64adb7" roughness={0.3} metalness={0.15}/></mesh>
    {[0, 1, 2, 3].map(i => <group key={i} position={[-3.7 + i * 1.1, 0.09, -3.5 + i % 2 * 0.8]}>
      <mesh rotation={[-Math.PI / 2, 0, i]}><circleGeometry args={[0.45, 7, 0.25, Math.PI * 1.85]}/><meshStandardMaterial color="#64915b" side={THREE.DoubleSide}/></mesh>
      <mesh position={[0.12, 0.12, 0]}><icosahedronGeometry args={[0.15, 0]}/><meshStandardMaterial color={i % 2 ? '#f2becc' : '#fff0c2'}/></mesh>
    </group>)}
    <group ref={swimmers} name="lake-swimmers">
      {Array.from({ length: quality === 'low' ? 3 : 6 }, (_, i) => <group key={i} position={[Math.cos(i * 2.1) * 3, i < 3 ? 0.16 : 0.075, Math.sin(i * 2.1) * 2.5]}>
        {i < 3 ? <>
          <mesh scale={[0.78, 0.65, 1.3]} castShadow><sphereGeometry args={[0.36, 8, 6]}/><meshStandardMaterial color={i ? '#f5e9c6' : '#b8ad96'}/></mesh>
          <mesh position={[0, 0.4, 0.3]} castShadow><sphereGeometry args={[0.22, 8, 6]}/><meshStandardMaterial color={i ? '#fff3d5' : '#47766a'}/></mesh>
          <Box position={[0, 0.36, 0.53]} size={[0.2, 0.09, 0.25]} color="#dfa04b"/>
          {[-0.18, 0.18].map(x => <Box key={x} position={[x, 0.44, 0.4]} size={[0.035, 0.045, 0.035]} color="#283c37"/>)}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.055, -0.3]} scale={[1, 1.6, 1]}><ringGeometry args={[0.5, 0.53, 16]}/><meshBasicMaterial color="#b2d8d4" transparent opacity={0.5}/></mesh>
        </> : <>
          <mesh scale={[0.6, 0.2, 1.5]}><sphereGeometry args={[0.28, 7, 5]}/><meshStandardMaterial color={i % 2 ? '#e4a35d' : '#eddfb5'}/></mesh>
          <mesh position={[0, 0, -0.5]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.21, 0.3, 3]}/><meshStandardMaterial color="#d98c55"/></mesh>
        </>}
      </group>)}
    </group>
    <group position={[-5.8, 0, 2.2]}>
      {Array.from({ length: 9 }, (_, i) => <Box key={i} position={[i * 0.37, 0.3, 0]} size={[0.34, 0.16, 1.8]} color={i % 2 ? c.wood : c.paleWood}/>)}
      {[0, 2.9].map(x => <Box key={x} position={[x, 0.3, 0.75]} size={[0.14, 0.9, 0.14]} color={c.wood}/>)}
    </group>
    {Array.from({ length: 10 }, (_, i) => {
      const angle = i * 2.4, x = Math.cos(angle) * 6.1, z = Math.sin(angle) * 7.2
      return <group key={i} position={[x, 0, z]}>
        <mesh position={[0, 0.17, 0]} scale={[1.5, 0.65, 1]} castShadow><icosahedronGeometry args={[0.38 + i % 3 * 0.1, 0]}/><meshStandardMaterial color={i % 2 ? '#9caa98' : '#b9bca5'}/></mesh>
        {[0, 1, 2].map(j => <group key={j} position={[0.3 + j * 0.15, 0, 0]}><Box position={[0, 0.45, 0]} size={[0.045, 0.9, 0.045]} color="#6d8c4e"/><Box position={[0, 0.93, 0]} size={[0.09, 0.26, 0.09]} color="#92744e"/></group>)}
      </group>
    })}
  </group>
}
function GardenLife({ reduced, night, quality }: { reduced: boolean; night: boolean; quality: Quality }) {
  const insects = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!insects.current || reduced) return
    insects.current.children.forEach((insect, i) => {
      const time = clock.elapsedTime
      insect.position.set(Math.sin(i * 17) * 22 + Math.sin(time * 0.3 + i) * 1.7, 1.2 + Math.sin(time * 0.9 + i) * 0.55, 17 + Math.cos(i * 9) * 5 + Math.cos(time * 0.4 + i) * 1.4)
      if (!night) insect.children.forEach((wing, j) => { wing.rotation.z = (j ? -1 : 1) * (0.3 + Math.sin(time * 9 + i) * 0.65) })
      else insect.scale.setScalar(0.7 + Math.sin(time * 2 + i) * 0.3)
    })
  })
  return <group ref={insects} name={night ? 'fireflies' : 'butterflies'}>
    {Array.from({ length: quality === 'low' ? 4 : night ? 20 : 10 }, (_, i) => <group key={i} position={[Math.sin(i * 17) * 22, 1.2, 17 + Math.cos(i * 9) * 5]}>
      {night ? <mesh><sphereGeometry args={[0.065, 4, 4]}/><meshBasicMaterial color="#e8f5a2"/></mesh> : [-1, 1].map(side => <mesh key={side} position={[side * 0.13, 0, 0]} scale={[1, 0.15, 1.3]}><sphereGeometry args={[0.19, 5, 4]}/><meshStandardMaterial color={i % 2 ? '#e8bd65' : '#d799b6'} side={THREE.DoubleSide}/></mesh>)}
    </group>)}
  </group>
}
function Outskirts() {
  return <group name="orchard-and-picnic">
    <group position={[-21, 0, 7]}>
      <Box position={[0, 0.12, 0]} size={[4.8, 0.25, 4.8]} color={c.paleWood}/>
      {[-2, 2].flatMap(x => [-2, 2].map(z => <Box key={`${x}-${z}`} position={[x, 1.7, z]} size={[0.19, 3.3, 0.19]} color={c.wood}/>))}
      <mesh position={[0, 3.65, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[3.8, 1.6, 4]}/><meshStandardMaterial color="#889b7c"/></mesh>
      <Box position={[0, 0.7, -1.65]} size={[3.7, 0.2, 0.65]} color={c.wood}/>
      <Box position={[0, 1.1, 0]} size={[2.3, 0.18, 1.3]} color={c.wood}/>
      {[-0.8, 0.8].map(x => <Box key={x} position={[x, 0.55, 0]} size={[0.15, 1, 0.8]} color={c.paleWood}/>)}
    </group>
    {[[-22, -9], [-17, -10], [-22, -16], [-17, -17], [-12, -20], [-6, -20]].map(([x, z], i) => <group key={i} position={[x, 0, z]}>
      <Tree x={0} z={0} scale={1.2}/>
      {[0, 1, 2, 3].map(j => <mesh key={j} position={[Math.sin(j * 2.4) * 1.1, 2.2 + j % 2 * 0.5, Math.cos(j * 2.4) * 1.1]} castShadow><icosahedronGeometry args={[0.18, 1]}/><meshStandardMaterial color={i % 2 ? '#e9b25e' : '#ce7759'}/></mesh>)}
      <Box position={[0.8, 0.24, 1.2]} size={[0.8, 0.48, 0.65]} color={c.wood}/>
    </group>)}
    <group position={[14, 0, -13]} rotation={[0, -0.3, 0]}>
      <Box position={[0, 0.8, 0]} size={[2.2, 0.65, 1.4]} color="#b98d5e"/>
      <Box position={[0, 1.15, 0]} size={[2, 0.1, 1.2]} color="#e4c577"/>
      {[-1, 1].flatMap(x => [-0.8, 0.8].map(z => <mesh key={`${x}-${z}`} position={[x * 0.8, 0.44, z]} rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[0.38, 0.1, 5, 10]}/><meshStandardMaterial color="#625b4d"/></mesh>))}
      {[-0.6, 0.6].map(z => <Box key={z} position={[2, 0.55, z]} size={[2.2, 0.1, 0.1]} color={c.wood}/>)}
    </group>
    <group position={[-8, 0, 20]}>
      <Box position={[0, 0.06, 0]} size={[4, 0.08, 3]} color="#d8ad97"/>
      {[-1.5, -0.5, 0.5, 1.5].map(x => <Box key={x} position={[x, 0.11, 0]} size={[0.3, 0.02, 3]} color="#ebd3b1"/>)}
      <Box position={[0.8, 0.35, 0.5]} size={[0.8, 0.5, 0.6]} color={c.wood}/>
      <mesh position={[-0.5, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.35, 10]}/><meshStandardMaterial color="#f4e8d0"/></mesh>
    </group>
    {[-22, -17, -12, 6, 11, 16, 21].map((x, i) => <group key={x} position={[x, 0, 19 + i % 2 * 2]}>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.5, 1, 1]}><circleGeometry args={[1.5, 9]}/><meshStandardMaterial color="#86aa61"/></mesh>
      {Array.from({ length: 7 }, (_, j) => <group key={j} position={[Math.sin(j * 2.4), 0, Math.cos(j * 2.4)]}>
        <Box position={[0, 0.23, 0]} size={[0.04, 0.46, 0.04]} color="#658b47"/>
        <mesh position={[0, 0.5, 0]}><icosahedronGeometry args={[0.17, 0]}/><meshStandardMaterial color={['#eaca73', '#eccebc', '#ce97ae'][i % 3]}/></mesh>
      </group>)}
    </group>)}
  </group>
}
function Crop({ x, z, progress, kind, index }: { x: number; z: number; progress: number; kind: number; index: number }) {
  const size = progress < 5 ? 0 : 0.18 + progress / 100 * 0.85
  if (size === 0) return null
  return <group position={[x, 0.1, z]} scale={size} rotation={[0, index * 2.4, 0]}>
    {kind % 3 === 0 ? <>
      <mesh position={[0, 0.14, 0]} castShadow><coneGeometry args={[0.13, 0.34, 5]}/><meshStandardMaterial color="#e69c4e"/></mesh>
      {[0, 1, 2].map(i => <mesh key={i} position={[Math.sin(i * 2.1) * 0.13, 0.4, Math.cos(i * 2.1) * 0.13]} rotation={[0.4, i * 2.1, 0.35]} castShadow><coneGeometry args={[0.16, 0.65, 3]}/><meshStandardMaterial color={i % 2 ? '#82a649' : '#568e45'}/></mesh>)}
    </> : kind % 3 === 1 ? <>
      <mesh position={[0, 0.28, 0]} castShadow><icosahedronGeometry args={[0.37, 1]}/><meshStandardMaterial color={kind === 4 ? '#dc9c4f' : '#8dab59'}/></mesh>
      <mesh position={[0.13, 0.3, 0.1]} castShadow><icosahedronGeometry args={[0.28, 0]}/><meshStandardMaterial color={kind === 4 ? '#e7b35c' : '#a6c170'}/></mesh>
    </> : <>
      {[0, 1, 2].map(i => <group key={i} position={[(i - 1) * 0.12, 0, 0]}><Box position={[0, 0.45 + i * 0.07, 0]} size={[0.045, 0.9 + i * 0.14, 0.045]} color="#a9a25b"/><mesh position={[0, 0.9 + i * 0.07, 0]} castShadow><capsuleGeometry args={[0.1, 0.2, 2, 4]}/><meshStandardMaterial color={progress > 65 ? '#e1c66f' : '#86a858'}/></mesh></group>)}
    </>}
  </group>
}
function Field({ plot, farm, index, onClick }: { plot: Plot; farm: FarmState; index: number; onClick: () => void }) {
  const agent = farm.agents.find(a => a.plotId === plot.id)
  const task = agent ? currentTask(farm, agent.id) : undefined
  const progress = task?.progress ?? 0
  return <group position={plot.position} onClick={e => { e.stopPropagation(); onClick() }} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = 'auto' }}>
    <Box position={[0, 0.015, 0]} size={[4.65, 0.17, 3.45]} color={c.wood}/>
    <Box position={[0, 0.11, 0]} size={[4.45, 0.14, 3.25]} color={c.dirt}/>
    {[-1.2, -0.4, 0.4, 1.2].map(z => <Box key={z} position={[0, 0.195, z]} size={[4.2, 0.04, 0.1]} color="#6f5039"/>)}
    {Array.from({ length: 24 }, (_, i) => <Crop key={i} index={i} x={-1.8 + i % 6 * 0.7} z={-1.15 + Math.floor(i / 6) * 0.77} progress={progress} kind={index}/>)}
  </group>
}
function ToolModel({ tool }: { tool: Agent['tool'] }) {
  if (tool === 'water') return <group rotation={[0, 0, -0.2]}><mesh><cylinderGeometry args={[0.2, 0.23, 0.32, 8]}/><meshStandardMaterial color="#8caeb0"/></mesh><Box position={[0.26, 0.06, 0]} size={[0.42, 0.08, 0.09]} color="#8caeb0" rotation={[0, 0, 0.4]}/><mesh position={[-0.18, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.15, 0.035, 5, 10]}/><meshStandardMaterial color="#668d90"/></mesh></group>
  if (tool === 'basket') return <group><Box position={[0, 0, 0]} size={[0.52, 0.32, 0.4]} color="#b48b56"/><mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.23, 0.025, 5, 10, Math.PI]}/><meshStandardMaterial color="#87633e"/></mesh><mesh position={[0, 0.19, 0]}><sphereGeometry args={[0.14, 6, 5]}/><meshStandardMaterial color="#dc9c4f"/></mesh></group>
  return <group rotation={[0, 0, -0.35]}><Box position={[0, 0, 0]} size={[0.055, 1.2, 0.055]} color="#a37b48"/><Box position={[0, -0.58, tool === 'hoe' ? 0.13 : 0]} size={tool === 'rake' ? [0.45, 0.09, 0.11] : [0.26, 0.3, 0.08]} color="#8d9c9b"/>{tool === 'rake' && [-0.17, 0, 0.17].map(x => <Box key={x} position={[x, -0.7, 0]} size={[0.04, 0.2, 0.04]} color="#8d9c9b"/>)}</group>
}
function Farmer({ agent, farm, selected, onClick, reduced }: { agent: Agent; farm: FarmState; selected: boolean; onClick: () => void; reduced: boolean }) {
  const root = useRef<THREE.Group>(null), body = useRef<THREE.Group>(null), arm = useRef<THREE.Group>(null)
  const leftLeg = useRef<THREE.Group>(null), rightLeg = useRef<THREE.Group>(null), tail = useRef<THREE.Group>(null)
  const status = agentStatus(farm, agent.id), task = currentTask(farm, agent.id)
  const plot = plots.find(p => p.id === agent.plotId) ?? plots[0]
  const index = farm.agents.indexOf(agent)
  const fur = ['#d7a66c', '#a4a9b0', '#e8dfca', '#655d59', '#bb926b'][index % 5]
  const home: [number, number, number] = [-9 + index % 5 * 2.1, 0.2, -3.4 + Math.floor(index / 5) * 1.1]
  const initial = useRef<[number, number, number]>(['running', 'error', 'paused'].includes(status) ? [plot.position[0] + 1.7, 0.2, plot.position[2] + 0.5] : home)
  const target = new THREE.Vector3(...(['running', 'walking', 'error', 'paused'].includes(status) ? [plot.position[0] + 1.7, 0.2, plot.position[2] + 0.5] as [number, number, number] : status === 'completed' && task && farm.now - task.updatedAt < 16000 ? [7, 0.2, -4.4] : home))
  useEffect(() => () => { positions.delete(agent.id) }, [agent.id])
  useFrame(({ clock }, delta) => {
    if (!root.current || !body.current) return
    const dt = Math.min(delta, 0.05), pos = root.current.position
    const distance = pos.distanceTo(target)
    const moving = distance > 0.08 && !['paused', 'error'].includes(status)
    if (moving) {
      const dir = target.clone().sub(pos).normalize()
      pos.addScaledVector(dir, Math.min(distance, dt * 2.4))
      root.current.rotation.y = THREE.MathUtils.lerp(root.current.rotation.y, Math.atan2(dir.x, dir.z), dt * 8)
    } else if (status === 'running') root.current.rotation.y = -Math.PI / 2
    const time = clock.elapsedTime + index * 2
    body.current.position.y = reduced ? 0 : moving ? Math.abs(Math.sin(time * 9)) * 0.09 : Math.sin(time * 2) * 0.025
    if (leftLeg.current && rightLeg.current) { leftLeg.current.rotation.x = moving && !reduced ? Math.sin(time * 9) * 0.6 : 0; rightLeg.current.rotation.x = -leftLeg.current.rotation.x }
    if (arm.current) arm.current.rotation.x = !reduced && status === 'running' ? -0.6 + Math.sin(time * (agent.tool === 'water' ? 2 : 4)) * 0.55 : 0.1
    if (tail.current) tail.current.rotation.z = reduced ? 0 : Math.sin(time * (moving ? 7 : 2)) * 0.35
    positions.set(agent.id, pos)
  })
  return <group ref={root} position={initial.current} onClick={e => { e.stopPropagation(); onClick() }} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = 'auto' }}>
    {selected && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}><ringGeometry args={[0.52, 0.6, 32]}/><meshBasicMaterial color="#fff9d4" side={THREE.DoubleSide}/></mesh>}
    <group ref={body}>
      <group ref={leftLeg} position={[-0.14, 0.45, 0]}><Box position={[0, -0.17, 0]} size={[0.21, 0.4, 0.23]} color="#45576a"/><Box position={[0, -0.38, 0.06]} size={[0.23, 0.14, 0.34]} color={fur}/></group>
      <group ref={rightLeg} position={[0.14, 0.45, 0]}><Box position={[0, -0.17, 0]} size={[0.21, 0.4, 0.23]} color="#45576a"/><Box position={[0, -0.38, 0.06]} size={[0.23, 0.14, 0.34]} color={fur}/></group>
      <Box position={[0, 0.78, 0]} size={[0.6, 0.65, 0.35]} color={agent.color}/>
      <Box position={[0, 0.67, 0.2]} size={[0.37, 0.36, 0.07]} color="#4c6070"/>
      {[-0.14, 0.14].map(x => <Box key={x} position={[x, 0.94, 0.21]} size={[0.07, 0.36, 0.04]} color="#4c6070"/>)}
      <mesh position={[0, 1.42, 0.03]} scale={[1, 0.9, 0.8]} castShadow><sphereGeometry args={[0.4, 8, 6]}/><meshStandardMaterial color={fur}/></mesh>
      {[-1, 1].map(side => <group key={side}>
        <mesh position={[side * 0.26, 1.82, 0.02]} rotation={[0, 0, side * -0.2]} castShadow><coneGeometry args={[0.19, 0.43, 3]}/><meshStandardMaterial color={fur}/></mesh>
        <mesh position={[side * 0.26, 1.83, 0.13]} rotation={[0, 0, side * -0.2]}><coneGeometry args={[0.1, 0.25, 3]}/><meshStandardMaterial color="#dba6a0"/></mesh>
        <Box position={[side * 0.14, 1.47, 0.32]} size={[0.09, 0.12, 0.035]} color="#355244"/>
        <Box position={[side * 0.14, 1.47, 0.345]} size={[0.025, 0.1, 0.02]} color="#172b27"/>
        <mesh position={[side * 0.09, 1.3, 0.32]} scale={[1, 0.7, 0.6]}><sphereGeometry args={[0.13, 6, 5]}/><meshStandardMaterial color="#f5e9d4"/></mesh>
        {[-1, 1].map(row => <Box key={row} position={[side * 0.3, 1.3 + row * 0.055, 0.3]} size={[0.31, 0.018, 0.018]} rotation={[0, 0, side * row * 0.16]} color="#eee0c7"/>)}
      </group>)}
      <mesh position={[0, 1.35, 0.41]} rotation={[0, 0, Math.PI]}><coneGeometry args={[0.055, 0.065, 3]}/><meshStandardMaterial color="#c78481"/></mesh>
      <group ref={tail} position={[0, 0.65, -0.2]}>
        <mesh position={[0.12, 0.05, -0.35]} rotation={[Math.PI / 2.7, 0, -0.35]} castShadow><capsuleGeometry args={[0.095, 0.6, 3, 6]}/><meshStandardMaterial color={fur}/></mesh>
        <mesh position={[0.26, 0.31, -0.65]} rotation={[0.25, 0, -0.3]} castShadow><capsuleGeometry args={[0.09, 0.36, 3, 6]}/><meshStandardMaterial color={fur}/></mesh>
        <mesh position={[0.32, 0.56, -0.63]}><sphereGeometry args={[0.1, 6, 5]}/><meshStandardMaterial color="#f5e9d4"/></mesh>
      </group>
      <group ref={arm} position={[0.4, 1.02, 0]}><Box position={[0, -0.18, 0]} size={[0.21, 0.45, 0.24]} color={agent.color}/><Box position={[0, -0.4, 0]} size={[0.18, 0.18, 0.21]} color={fur}/><group position={[0.04, -0.4, 0.23]}><ToolModel tool={status === 'completed' ? 'basket' : agent.tool}/></group></group>
      <Box position={[-0.4, 0.82, 0]} size={[0.2, 0.5, 0.23]} color={agent.color}/>
      <Box position={[-0.4, 0.55, 0]} size={[0.18, 0.16, 0.21]} color={fur}/>
    </group>
  </group>
}
function Clouds({ reduced }: { reduced: boolean }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (ref.current && !reduced) ref.current.position.x = Math.sin(clock.elapsedTime * 0.035) * 1.5 })
  return <group ref={ref}>{[[-8, 8, -11], [8, 9, -10]].map((p, i) => <group key={i} position={p as [number, number, number]}>{[-1, 0, 1].map((x, j) => <mesh key={x} position={[x * 0.8, j % 2 * 0.3, 0]} scale={[1.4, 0.5 + j % 2 * 0.3, 0.8]}><icosahedronGeometry args={[0.8, 1]}/><meshStandardMaterial color="#fffaf0" transparent opacity={0.75}/></mesh>)}</group>)}</group>
}
function CameraRig({ action }: { action: CameraAction }) {
  const controls = useRef<OrbitControlsImpl>(null)
  const { camera, size } = useThree()
  const target = useRef<THREE.Vector3 | null>(null)
  const home = () => {
    const center = new THREE.Vector3(7, 2, -9)
    const distance = Math.max(73, 25 / Math.tan(Math.PI / 8) / (size.width / size.height))
    camera.position.set(12, 25, 62).sub(center).normalize().multiplyScalar(distance).add(center)
    target.current = center
  }
  useEffect(home, [camera, size.width, size.height])
  useEffect(() => {
    const ctrl = controls.current
    if (!ctrl) return
    if (action.kind === 'home') home()
    else if (action.kind === 'focus' && action.id) { const p = positions.get(action.id); if (p) target.current = p.clone() }
    else if (action.kind === 'rotate') { const offset = camera.position.clone().sub(ctrl.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4); camera.position.copy(ctrl.target).add(offset); ctrl.update() }
    else if (action.kind === 'zoomIn' || action.kind === 'zoomOut') { const offset = camera.position.clone().sub(ctrl.target); offset.setLength(THREE.MathUtils.clamp(offset.length() * (action.kind === 'zoomIn' ? 0.8 : 1.2), 26, 180)); camera.position.copy(ctrl.target).add(offset); ctrl.update() }
  }, [action, camera, size.width, size.height])
  useFrame((_, delta) => {
    const ctrl = controls.current
    if (!ctrl) return
    if (target.current) {
      const difference = target.current.clone().sub(ctrl.target).multiplyScalar(Math.min(delta * 5, 1))
      camera.position.add(difference); ctrl.target.add(difference)
      if (ctrl.target.distanceTo(target.current) < 0.02) target.current = null
    }
    const floor = Math.max(terrainHeight(camera.position.x, camera.position.z), -9) + 4
    camera.position.y = Math.max(camera.position.y, floor)
    ctrl.update()
  })
  return <OrbitControls ref={controls} target={[7, 2, -9]} makeDefault enablePan={false} enableDamping dampingFactor={0.08} minDistance={26} maxDistance={180} minPolarAngle={0.5} maxPolarAngle={1.3} touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }} onStart={() => { target.current = null }}/>
}
function CoastalSky({ period }: { period: DayPeriod }) {
  const top = period === 'night' ? '#152945' : period === 'evening' ? '#b5b7cb' : '#94bfce'
  const horizon = period === 'night' ? '#6a8291' : period === 'evening' ? '#efd4af' : '#e6e5cf'
  const geometry = useMemo(() => {
    const sphere = new THREE.SphereGeometry(2000, 32, 24), colors: number[] = []
    const upper = new THREE.Color(top), lower = new THREE.Color(horizon)
    for (let i = 0; i < sphere.attributes.position.count; i++) {
      const color = lower.clone().lerp(upper, THREE.MathUtils.smoothstep(sphere.attributes.position.getY(i) / 2000, -0.08, 0.55))
      colors.push(color.r, color.g, color.b)
    }
    sphere.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    return sphere
  }, [top, horizon])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry}><meshBasicMaterial side={THREE.BackSide} vertexColors fog={false} toneMapped={false} depthWrite={false}/></mesh>
}
function World(props: Props) {
  const night = props.period === 'night'
  const morning = props.period === 'morning', evening = props.period === 'evening'
  const sky = night ? '#6a8291' : evening ? '#efd4af' : '#e6e5cf'
  const sunColor = night ? '#b9d2ff' : evening ? '#ffb577' : morning ? '#ffe0a0' : '#fff0d5'
  const sunPosition: [number, number, number] = night ? [8, 20, -8] : evening ? [16, 9, 4] : morning ? [-16, 10, 8] : [-8, 20, 8]
  const [reduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const trees = useMemo(() => [ [-12, -10, 1.1], [-10, -11, 0.9], [-3, -11, 1.1], [0, -12, 1.3], [2.5, -11.5, 1], [11, -10, 1.25], [12, -7, 1], [12, -3, 0.95], [-13, 0, 1.1], [-12, 3, 1.4], [-13, 7, 1], [-11, 10, 0.8], [9, 11, 0.7], [12, 11, 1] ], [])
  useEffect(() => { props.onReady() }, [props.onReady])
  return <>
    <color attach="background" args={[sky]}/>
    <fog attach="fog" args={[sky, 140, 360]}/>
    <ambientLight intensity={night ? 0.55 : 1.3} color={night ? '#a8c3ef' : '#ffffff'}/><hemisphereLight args={[night ? '#9ab8eb' : '#fff1d8', night ? '#34485d' : '#839f72', night ? 0.65 : 1.1]}/>
    <directionalLight position={sunPosition} intensity={night ? 1.1 : evening ? 1.8 : 2.4} color={sunColor} castShadow={props.quality !== 'low'} shadow-mapSize={props.quality === 'high' ? 2048 : 1024} shadow-camera-left={-34} shadow-camera-right={34} shadow-camera-top={34} shadow-camera-bottom={-34} shadow-normalBias={0.07}/>
    <CoastalSky period={props.period}/>
    <CoastalLandscape period={props.period} low={props.quality === 'low'} reduced={reduced}/>
    <Box position={[0, 0.035, -2.7]} size={[22, 0.08, 1.25]} color={c.path}/>
    <Box position={[-3, 0.04, 4]} size={[1.05, 0.08, 13.5]} color={c.path}/>
    <Box position={[3, 0.04, 4]} size={[1.05, 0.08, 13.5]} color={c.path}/>
    <Box position={[0, 0.04, 3.5]} size={[20.4, 0.08, 1.05]} color={c.path}/>
    <Box position={[-6, 0.03, -4]} size={[1.2, 0.08, 3.7]} color={c.path}/>
    <Box position={[7, 0.03, -4.2]} size={[1.2, 0.08, 3.7]} color={c.path}/>
    <House night={night}/><House barn night={night}/><Windmill reduced={reduced}/><Pond reduced={reduced}/>
    {night && <>
      <mesh position={[-4, 10, -10]}><sphereGeometry args={[0.7, 12, 12]}/><meshBasicMaterial color="#fff0c8"/></mesh>
      {Array.from({ length: 28 }, (_, i) => <mesh key={i} position={[Math.sin(i * 12.7) * 15, 7 + (i % 7) * 0.7, -9 - Math.cos(i * 7.3) * 4]}><sphereGeometry args={[i % 3 === 0 ? 0.055 : 0.035, 4, 4]}/><meshBasicMaterial color="#d2e1ff"/></mesh>)}
      {[[-6, -4.8], [7, -4.8], [-3, 3.5], [3, 8.5]].map(([x, z], i) => <group key={i} position={[x, 0, z]}>
        <Box position={[0, 0.85, 0]} size={[0.09, 1.7, 0.09]} color="#685847"/>
        <mesh position={[0, 1.8, 0]}><boxGeometry args={[0.28, 0.34, 0.28]}/><meshStandardMaterial color="#ffdc98" emissive="#ffba56" emissiveIntensity={2}/></mesh>
        <Box position={[0, 2.02, 0]} size={[0.38, 0.07, 0.38]} color="#685847"/>
        {props.quality !== 'low' && <pointLight position={[0, 1.8, 0]} color="#ffd08a" intensity={12} distance={7} decay={2}/>}
      </group>)}
    </>}
    {trees.map(([x, z, s], i) => <Tree key={i} x={x} z={z} scale={s} pine={i % 3 === 0}/>)}
    <Fence x={-21} z={-19.5} length={28}/><Fence x={-21} z={19.5} length={12}/><Fence x={3} z={19.5} length={12}/><Fence x={-21.5} z={19.5} length={26} rotate/>
    <Box position={[0, 0.035, 14]} size={[1.8, 0.08, 14]} color={c.path}/>
    <Box position={[0, 0.035, -15]} size={[36, 0.08, 1.5]} color={c.path}/>
    <Box position={[-16, 0.035, -4]} size={[1.5, 0.08, 22]} color={c.path}/>
    {[-19, -15, -11, -7, -3, 3, 7, 11, 15, 19].map((x, i) => <Tree key={`outer-${i}`} x={x} z={-18 + i % 2 * 0.8} scale={0.9 + i % 3 * 0.18} pine={i % 2 === 0}/>)}
    {[-13, -7, 0, 7, 13].map((z, i) => <Tree key={`west-${i}`} x={-20} z={z} scale={1.1} pine={i % 2 === 0}/>)}
    {[[-16, 10], [-16, 15], [-10, 14], [16, -10], [19, -5], [18, 2], [17, 15], [10, 17], [-7, 18]].map(([x, z], i) => <Tree key={`orchard-${i}`} x={x} z={z} scale={1.2 + i % 2 * 0.2}/>)}
    {[-11, -6, 6, 11].map((x, i) => <group key={`garden-${i}`} position={[x, 0, 13]}>
      <Box position={[0, 0.06, 0]} size={[3.6, 0.15, 3.3]} color={c.dirt}/>
      {Array.from({ length: 16 }, (_, j) => <Crop key={j} x={-1.2 + j % 4 * 0.8} z={-1.2 + Math.floor(j / 4) * 0.8} progress={70} kind={i} index={j}/>)}
    </group>)}
    <group position={[17, 0, 10]}><mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1.5, 1]}><circleGeometry args={[2.2, 12]}/><meshStandardMaterial color={c.water}/></mesh><Box position={[0, 0.13, 0]} size={[1.1, 0.16, 6.8]} color={c.wood}/></group>
    {plots.map((plot, i) => <Field key={plot.id} plot={plot} farm={props.farm} index={i} onClick={() => props.onPlot(plot.id)}/>)}
    {props.farm.agents.map(agent => <Farmer key={agent.id} agent={agent} farm={props.farm} selected={props.selected === agent.id} onClick={() => props.onAgent(agent.id)} reduced={reduced}/>)}
    <Box position={[-2, 0.38, -6.5]} size={[1.1, 0.76, 1.1]} color="#b9a28a"/>
    <mesh position={[-2, 0.8, -6.5]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.4, 12]}/><meshStandardMaterial color={c.water}/></mesh>
    {Array.from({ length: 22 }, (_, i) => { const x = Math.sin(i * 32.1) * 12, z = Math.cos(i * 19.3) * 11; if (Math.abs(x) < 10 && z > -10 && z < 9) return null; return <group key={i} position={[x, 0, z]}><Box position={[0, 0.18, 0]} size={[0.035, 0.36, 0.035]} color="#6b9046"/><mesh position={[0, 0.39, 0]}><icosahedronGeometry args={[0.11, 0]}/><meshStandardMaterial color={i % 2 ? '#f3d484' : '#f1e8bc'}/></mesh></group> })}
    {props.quality !== 'low' && !night && <Clouds reduced={reduced}/>}
    <CameraRig action={props.cameraAction}/>
  </>
}
export default function FarmScene(props: Props) {
  return <Canvas shadows={props.quality !== 'low'} dpr={props.quality === 'low' ? 1 : props.quality === 'medium' ? [1, 1.5] : [1, 2]} gl={{ antialias: props.quality !== 'low', powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); props.onLost() }, { once: true }) }}>
    <PerspectiveCamera makeDefault position={[12, 25, 62]} fov={45} near={0.2} far={3000}/>
    <Suspense fallback={null}><World {...props}/></Suspense>
  </Canvas>
}

import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Rig } from './Rig'
import { Ship } from './Ship'
import { Sky } from './Sky'
import { Stops } from './Stops'
import { SUN } from './layout'
import { useStore } from '../store'

/** Avisa a abertura quando os shaders já compilaram e a cena desenhou de verdade. */
function FirstFrames() {
  const frames = useRef(0)
  useFrame(() => {
    if (frames.current < 0) return
    frames.current += 1
    if (frames.current === 3) {
      frames.current = -1
      useStore.getState().markReady('frame')
    }
  })
  return null
}

export default function Scene() {
  return (
    <Canvas
      className="scene"
      flat
      dpr={[1, 1.75]}
      camera={{ fov: 46, near: 0.1, far: 4000 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={() => useStore.getState().markReady('engine')}
      aria-hidden="true"
    >
      <color attach="background" args={['#04050d']} />
      <ambientLight intensity={0.55} color="#9aa8ff" />
      <directionalLight position={SUN.clone().multiplyScalar(100)} intensity={2.6} color="#fff4e0" />
      <directionalLight position={[60, 20, 80]} intensity={0.35} color="#5ee6d0" />
      <Sky />
      <Stops />
      <Ship />
      <Rig />
      <FirstFrames />
    </Canvas>
  )
}

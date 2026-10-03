import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  Line,
  LineBasicMaterial,
  Quaternion,
  ShaderMaterial,
  Vector3,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type Sprite,
  type Vector3Tuple,
} from 'three'
import { Planet, type PlanetProps } from './Planet'
import { ANCHORS, RELAY, SUN, projectOffset } from './layout'
import { GLOW, LABEL_ASPECT, labelTexture } from './sprites'
import { OUTLINE_THICK, TOON_RAMP } from './toon'
import { MISSION_COUNT, PROJECT_COUNT, SKILL_GROUPS, useContent, useStore, type StageId } from '../store'

const PAPER = '#efe9da'
const AMBER = '#ffb000'
const TEAL = '#5ee6d0'
const HULL = '#27304f'
const PANEL = '#1c3f8f'

const ease = (rate: number, delta: number) => 1 - Math.exp(-rate * delta)

function Toon({ color }: { color: string }) {
  return <meshToonMaterial color={color} gradientMap={TOON_RAMP} />
}

/* ── 01 · Órbita de partida ─────────────────────────────────────────────── */

function Home() {
  return (
    <group position={ANCHORS.inicio}>
      <Planet
        radius={15}
        position={[-5, -15.6, -8]}
        colors={['#0a2a6b', '#1560a8', '#2aa18f', '#e6d49a']}
        thresholds={[0.44, 0.55, 0.63]}
        scale={1.25}
        seed={4.2}
        clouds={0.9}
        shore={1}
        ice={0.86}
        cities={1}
        atmosphere="#58c8ff"
        atmosphereSize={1.09}
        spin={0.012}
        tilt={0.3}
        segments={96}
      />
      <Planet
        radius={1.5}
        position={[9, 6.5, -24]}
        colors={['#3a3d52', '#5b5f78', '#8b8fa6', '#bfc3d4']}
        scale={2.6}
        seed={9}
        craters={6}
        spin={0.03}
      />
    </group>
  )
}

/* ── 02 · Estação orbital ───────────────────────────────────────────────── */

function Station() {
  const wheel = useRef<Group>(null)
  useFrame((_, delta) => {
    if (wheel.current) wheel.current.rotation.z += delta * 0.11
  })
  const windows = useMemo(() => Array.from({ length: 16 }, (_, i) => (i / 16) * Math.PI * 2), [])

  return (
    <group position={ANCHORS.perfil}>
      <group position={[-1.2, 0.4, 0]} rotation={[0.55, -0.62, 0.18]}>
        <group ref={wheel}>
          <mesh>
            <torusGeometry args={[3.5, 0.4, 14, 64]} />
            <Toon color={PAPER} />
          </mesh>
          <mesh material={OUTLINE_THICK}>
            <torusGeometry args={[3.5, 0.4, 14, 64]} />
          </mesh>
          {[0, 1].map((spoke) => (
            <mesh key={spoke} rotation={[0, 0, (spoke * Math.PI) / 2]}>
              <cylinderGeometry args={[0.13, 0.13, 7, 10]} />
              <Toon color={HULL} />
            </mesh>
          ))}
          {windows.map((angle, i) => (
            <mesh key={i} position={[Math.cos(angle) * 3.5, Math.sin(angle) * 3.5, 0.37]}>
              <boxGeometry args={[0.26, 0.26, 0.1]} />
              <meshBasicMaterial color={i % 4 === 0 ? AMBER : TEAL} />
            </mesh>
          ))}
        </group>
        {/* eixo central, que não gira com a roda */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.72, 0.72, 2.6, 20]} />
          <Toon color={PAPER} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={OUTLINE_THICK}>
          <cylinderGeometry args={[0.72, 0.72, 2.6, 20]} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 1.5]}>
          <cylinderGeometry args={[0.45, 0.72, 0.5, 20]} />
          <Toon color={AMBER} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -2.2]}>
          <cylinderGeometry args={[0.1, 0.1, 2.2, 8]} />
          <Toon color={HULL} />
        </mesh>
        {[1, -1].map((side) => (
          <group key={side} position={[0, 0, -3.1]}>
            <mesh position={[side * 2.1, 0, 0]}>
              <boxGeometry args={[3.2, 1.25, 0.06]} />
              <Toon color={PANEL} />
            </mesh>
            {[-1, 0, 1].map((cell) => (
              <mesh key={cell} position={[side * (2.1 + cell * 1.05), 0, 0.04]}>
                <boxGeometry args={[0.05, 1.25, 0.03]} />
                <meshBasicMaterial color="#6f9bff" />
              </mesh>
            ))}
          </group>
        ))}
        <mesh position={[0, 0, 1.95]}>
          <sphereGeometry args={[0.16, 12, 10]} />
          <meshBasicMaterial color={AMBER} />
        </mesh>
      </group>
      <Planet
        radius={4.4}
        position={[-13, 7, -24]}
        colors={['#2e2a4a', '#4a4470', '#7a739c', '#b9b3d1']}
        scale={2.2}
        seed={2}
        craters={5}
        ice={0.8}
        atmosphere="#6a6cff"
        atmosphereSize={1.06}
        spin={0.02}
      />
    </group>
  )
}

/* ── 03 · Campo de constelações ─────────────────────────────────────────── */

const CONSTELLATION_CENTERS: Vector3Tuple[] = [
  [-4.9, 3.6, -1],
  [-0.7, 4.5, -3],
  [3.5, 3.5, -1.5],
  [-5.8, -0.5, -2.5],
  [-1.3, 0.5, 0],
  [3.1, -0.6, -2],
  [-3.3, -3.7, -1],
]

// Gerador determinístico: as constelações saem iguais em toda visita.
function seeded(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function Constellation({ index, count, label }: { index: number; count: number; label: string }) {
  const fontsReady = useStore((state) => state.ready.fonts)
  const stars = useRef<Group>(null)
  const tag = useRef<Sprite>(null)
  const glow = useRef(0)
  const amber = useMemo(() => new Color(AMBER), [])
  const white = useMemo(() => new Color('#ffffff'), [])

  const points = useMemo(() => {
    const random = seeded(index * 97 + 13)
    const start = random() * Math.PI * 2
    return Array.from({ length: count }, (_, i) => {
      const angle = start + (i / count) * Math.PI * 1.7 + (random() - 0.5) * 0.7
      const reach = 0.55 + random() * 0.85
      return new Vector3(Math.cos(angle) * reach * 1.25, Math.sin(angle) * reach * 0.85, (random() - 0.5) * 0.8)
    })
  }, [index, count])

  const line = useMemo(() => {
    const material = new LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, depthWrite: false })
    return new Line(new BufferGeometry().setFromPoints(points), material)
  }, [points])

  const texture = useMemo(() => labelTexture(label), [label, fontsReady])
  useEffect(() => () => texture.dispose(), [texture])

  useFrame((state, delta) => {
    const focused = useStore.getState().skillFocus === index
    glow.current += ((focused ? 1 : 0) - glow.current) * ease(7, delta)
    const k = glow.current
    line.material.opacity = 0.26 + k * 0.6
    line.material.color.copy(white).lerp(amber, k)
    stars.current?.children.forEach((child, i) => {
      const sprite = child as Sprite
      const twinkle = 1 + 0.12 * Math.sin(state.clock.elapsedTime * 1.6 + i * 2.1 + index)
      sprite.scale.setScalar((0.5 + k * 0.42) * twinkle)
      sprite.material.color.copy(white).lerp(amber, k * 0.75)
    })
    if (tag.current) {
      tag.current.material.opacity = 0.5 + k * 0.5
      tag.current.material.color.copy(white).lerp(amber, k)
    }
  })

  return (
    <group position={CONSTELLATION_CENTERS[index]}>
      <primitive object={line} />
      <group ref={stars}>
        {points.map((point, i) => (
          <sprite key={i} position={point}>
            <spriteMaterial map={GLOW} blending={AdditiveBlending} depthWrite={false} transparent />
          </sprite>
        ))}
      </group>
      <sprite ref={tag} position={[0, -1.55, 0]} scale={[3.4, 3.4 / LABEL_ASPECT, 1]}>
        <spriteMaterial map={texture} depthWrite={false} transparent />
      </sprite>
    </group>
  )
}

function Constellations() {
  const skills = useContent().skills
  return (
    <group position={ANCHORS.habilidades}>
      {SKILL_GROUPS.map((count, index) => (
        <Constellation key={index} index={index} count={count} label={skills[index].group} />
      ))}
    </group>
  )
}

/* ── 04 · Gigante dos anéis ─────────────────────────────────────────────── */

const GIANT: Vector3Tuple = [-2.5, 0, -4]
const GIANT_RADIUS = 7
const GIANT_TILT = 0.36

const MOONS: { position: Vector3Tuple; radius: number; planet: Partial<PlanetProps> & Pick<PlanetProps, 'colors'> }[] = [
  { position: [-5.2, 4.6, 5], radius: 0.95, planet: { colors: ['#27506b', '#4f8fb0', '#a6d8ea', '#f2fbff'], seed: 1, scale: 2.4, ice: 0.5 } },
  { position: [0.6, 5.6, 3.5], radius: 0.8, planet: { colors: ['#4a1f14', '#8f3d24', '#cf7a45', '#f1c08a'], seed: 5, scale: 2.8, craters: 5 } },
  { position: [5, 3.1, 6], radius: 0.7, planet: { colors: ['#14382c', '#2a7558', '#7cc79a', '#e6f7c8'], seed: 8, scale: 2.2, shore: 1 } },
]

function Ring() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: DoubleSide,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uInner: { value: 9.2 },
          uOuter: { value: 15.5 },
          uSun: { value: SUN },
          uCenter: { value: new Vector3(...GIANT).add(ANCHORS.experiencia) },
          uRadius: { value: GIANT_RADIUS },
          uC1: { value: new Color('#f6dfae') },
          uC2: { value: new Color('#b0672f') },
        },
        vertexShader: /* glsl */ `
          varying vec3 vObj;
          varying vec3 vWorld;
          void main() {
            vObj = position;
            vec4 world = modelMatrix * vec4(position, 1.0);
            vWorld = world.xyz;
            gl_Position = projectionMatrix * viewMatrix * world;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uInner;
          uniform float uOuter;
          uniform float uRadius;
          uniform vec3 uSun;
          uniform vec3 uCenter;
          uniform vec3 uC1;
          uniform vec3 uC2;
          varying vec3 vObj;
          varying vec3 vWorld;
          void main() {
            float t = (length(vObj.xy) - uInner) / (uOuter - uInner);
            float lane = floor(t * 30.0);
            float h = fract(sin(lane * 91.7 + 3.1) * 43758.5453);
            float alpha = step(0.2, h) * (0.3 + 0.7 * h);
            // a sombra do planeta cai sobre os anéis
            vec3 d = vWorld - uCenter;
            float along = dot(d, uSun);
            float away = length(d - uSun * along);
            float shadow = along < 0.0 ? smoothstep(uRadius - 0.15, uRadius + 0.15, away) : 1.0;
            vec3 col = mix(uC2, uC1, h) * mix(0.1, 1.0, shadow);
            gl_FragColor = vec4(col, alpha * mix(0.75, 1.0, shadow));
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  )
  return (
    <mesh material={material} rotation={[-Math.PI / 2 + 0.2, 0, 0]}>
      <ringGeometry args={[9.2, 15.5, 160, 1]} />
    </mesh>
  )
}

function MoonMarker() {
  const marker = useRef<Mesh>(null)
  const started = useRef(false)
  const goal = useMemo(() => new Vector3(), [])
  useFrame((state, delta) => {
    if (!marker.current) return
    const moon = MOONS[useStore.getState().mission % MISSION_COUNT]
    goal.set(...moon.position)
    if (started.current) marker.current.position.lerp(goal, ease(5, delta))
    else marker.current.position.copy(goal)
    started.current = true
    marker.current.quaternion.copy(state.camera.quaternion)
    const pulse = 1 + 0.07 * Math.sin(state.clock.elapsedTime * 3)
    marker.current.scale.setScalar(moon.radius * 1.75 * pulse)
  })
  return (
    <mesh ref={marker}>
      <ringGeometry args={[0.96, 1, 48]} />
      <meshBasicMaterial color={AMBER} transparent depthWrite={false} side={DoubleSide} />
    </mesh>
  )
}

function Giant() {
  return (
    <group position={ANCHORS.experiencia}>
      <group position={GIANT}>
        <Planet
          radius={GIANT_RADIUS}
          colors={['#7a3a1c', '#c5732e', '#e8b46c', '#f7e4b6']}
          thresholds={[0.3, 0.55, 0.8]}
          banded={1}
          bands={11}
          warp={2.6}
          storm={{ at: [-0.4, -0.12, 0.9], size: 0.2, color: '#b8482a' }}
          scale={1.4}
          seed={3}
          tilt={GIANT_TILT}
          atmosphere="#ffb36b"
          atmosphereSize={1.08}
          spin={0.03}
          segments={96}
        />
        <group rotation={[0, 0, GIANT_TILT]}>
          <Ring />
        </group>
      </group>
      {MOONS.slice(0, MISSION_COUNT).map((moon, index) => (
        <Planet key={index} radius={moon.radius} position={moon.position} spin={0.08} {...moon.planet} />
      ))}
      <MoonMarker />
    </group>
  )
}

/* ── 05 · Sistema de projetos ───────────────────────────────────────────── */

type World = Omit<PlanetProps, 'position'> & { ring?: [string, number]; moon?: boolean }

const WORLDS: World[] = [
  { radius: 2.7, colors: ['#0d3b4a', '#1d7f8c', '#7fd6cf', '#f1fbf7'], atmosphere: '#7fe6dc', clouds: 0.7, shore: 1, ice: 0.8, seed: 1.3, ring: ['#bff3ee', 0.5] },
  { radius: 2.4, colors: ['#5b2413', '#a5482a', '#d98b4f', '#f3d29a'], atmosphere: '#ff9a5c', seed: 6.1, scale: 2, craters: 5 },
  { radius: 2.5, colors: ['#2a1650', '#6b2fa0', '#c35bd1', '#ffc1e8'], thresholds: [0.3, 0.55, 0.8], banded: 1, bands: 9, warp: 3.2, atmosphere: '#d77bff', seed: 2.4, tilt: -0.3, storm: { at: [-0.5, 0.2, 0.85], size: 0.24, color: '#ffc1e8' } },
  { radius: 2.4, colors: ['#0e3320', '#1f6b3a', '#7fb857', '#f2d76b'], atmosphere: '#9be36e', seed: 8.8, scale: 1.9, moon: true },
  { radius: 2.2, colors: ['#064e4c', '#0abab5', '#a7e8e5', '#ffffff'], atmosphere: '#0abab5', clouds: 0.8, seed: 3.7, scale: 1.5 },
  { radius: 2.2, colors: ['#2b0a0a', '#8f1d14', '#f0541e', '#ffd166'], thresholds: [0.42, 0.56, 0.68], atmosphere: '#ff5a2a', seed: 5.5, scale: 2.3 },
  { radius: 2, colors: ['#0b1030', '#1b2a6b', '#ffb000', '#fff1c9'], thresholds: [0.45, 0.62, 0.7], atmosphere: AMBER, seed: 9.9, scale: 2.1, ring: [AMBER, 0.35] },
]

function System() {
  return (
    <group position={ANCHORS.projetos}>
      {WORLDS.slice(0, PROJECT_COUNT).map(({ ring, moon, ...planet }, index) => (
        <group key={index} position={projectOffset(index)}>
          <Planet spin={0.05} {...planet} />
          {ring && (
            <mesh rotation={[-Math.PI / 2 + 0.3, 0, 0.25]}>
              <ringGeometry args={[planet.radius * 1.45, planet.radius * 1.85, 96]} />
              <meshBasicMaterial color={ring[0]} transparent opacity={ring[1]} side={DoubleSide} depthWrite={false} />
            </mesh>
          )}
          {moon && (
            <Planet
              radius={0.45}
              position={[-3.2, 1.7, 1.4]}
              colors={['#5b5132', '#8f8250', '#cdbd7b', '#f6ecb9']}
              scale={3}
              seed={index}
            />
          )}
        </group>
      ))}
    </group>
  )
}

/* ── 06 · Relé de transmissão ───────────────────────────────────────────── */

const PULSES = 3

function Relay() {
  const pulses = useRef<Group>(null)
  const orientation = useMemo(() => new Quaternion().setFromUnitVectors(new Vector3(0, -1, 0), RELAY.beam), [])
  const facing = useMemo(() => new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), RELAY.beam), [])

  useFrame((state) => {
    pulses.current?.children.forEach((child, i) => {
      const phase = (state.clock.elapsedTime * 0.38 + i / PULSES) % 1
      child.position.copy(RELAY.satellite).addScaledVector(RELAY.beam, 0.9 + phase * 5)
      child.scale.setScalar(0.4 + phase * 1.5)
      ;((child as Mesh).material as MeshBasicMaterial).opacity = (1 - phase) * 0.85
    })
  })

  return (
    <group position={ANCHORS.contato}>
      <Planet
        radius={12}
        position={RELAY.planet.toArray()}
        colors={['#1a1238', '#33205e', '#6b3a7a', '#e58a5a']}
        thresholds={[0.42, 0.56, 0.68]}
        scale={1.5}
        seed={12}
        clouds={0.5}
        cities={0.8}
        atmosphere="#ff9a4d"
        atmosphereSize={1.1}
        spin={0.01}
        segments={96}
      />
      <group position={RELAY.satellite} quaternion={orientation}>
        <mesh>
          <sphereGeometry args={[1, 28, 12, 0, Math.PI * 2, 0, 0.95]} />
          <meshToonMaterial color={PAPER} gradientMap={TOON_RAMP} side={DoubleSide} />
        </mesh>
        <mesh position={[0, 0.72, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.75, 8]} />
          <Toon color={HULL} />
        </mesh>
        <mesh position={[0, 0.34, 0]}>
          <sphereGeometry args={[0.1, 12, 10]} />
          <meshBasicMaterial color={AMBER} />
        </mesh>
        <group position={[0, 1.55, 0]}>
          <mesh>
            <boxGeometry args={[0.72, 0.95, 0.72]} />
            <Toon color={PAPER} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[0.76, 0.12, 0.76]} />
            <Toon color={AMBER} />
          </mesh>
          {[1, -1].map((side) => (
            <group key={side}>
              <mesh position={[side * 0.75, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.04, 0.04, 0.8, 8]} />
                <Toon color={HULL} />
              </mesh>
              <mesh position={[side * 2.05, 0, 0]} rotation={[0.5, 0, 0]}>
                <boxGeometry args={[1.9, 0.05, 0.85]} />
                <Toon color={PANEL} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
      <group ref={pulses}>
        {Array.from({ length: PULSES }, (_, i) => (
          <mesh key={i} quaternion={facing}>
            <ringGeometry args={[0.93, 1, 56]} />
            <meshBasicMaterial color={AMBER} transparent depthWrite={false} side={DoubleSide} blending={AdditiveBlending} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** Só desenha a parada quando a câmera está perto: de longe, as outras poluíam o céu. */
function Near({ id, children }: { id: StageId; children: React.ReactNode }) {
  const group = useRef<Group>(null)
  useFrame((state) => {
    if (group.current) group.current.visible = state.camera.position.distanceTo(ANCHORS[id]) < NEAR_DISTANCE
  })
  return <group ref={group}>{children}</group>
}

const NEAR_DISTANCE = 190

export function Stops() {
  return (
    <>
      <Near id="inicio">
        <Home />
      </Near>
      <Near id="perfil">
        <Station />
      </Near>
      <Near id="habilidades">
        <Constellations />
      </Near>
      <Near id="experiencia">
        <Giant />
      </Near>
      <Near id="projetos">
        <System />
      </Near>
      <Near id="contato">
        <Relay />
      </Near>
    </>
  )
}

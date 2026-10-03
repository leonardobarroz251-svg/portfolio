import { useMemo, useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import {
  AdditiveBlending,
  ConeGeometry,
  DoubleSide,
  ExtrudeGeometry,
  LatheGeometry,
  Object3D,
  Quaternion,
  Shape,
  SphereGeometry,
  SplineCurve,
  TorusGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Group,
  type MeshBasicMaterial,
} from 'three'
import { getView } from './layout'
import { OUTLINE, TOON_RAMP } from './toon'
import { useStore } from '../store'

const PAPER = '#efe9da'
const AMBER = '#ffb000'
const HULL = '#27304f'
const TEAL = '#5ee6d0'

/*
 * Foguete retrô: o casco é um perfil torneado (lathe) em volta do eixo Y.
 * Tudo é montado com o nariz para +Y e o grupo inteiro gira para o nariz apontar para +Z,
 * que é para onde o lookAt de um objeto mira.
 */
const lathe = (points: [number, number][], segments = 40) =>
  new LatheGeometry(
    new SplineCurve(points.map(([r, y]) => new Vector2(r, y))).getPoints(segments),
    36,
  )

const fuselage = lathe([
  [0.2, -0.92],
  [0.3, -0.82],
  [0.37, -0.55],
  [0.4, -0.15],
  [0.395, 0.25],
  [0.36, 0.55],
  [0.33, 0.66],
])
const nose = lathe([
  [0.33, 0.66],
  [0.28, 0.86],
  [0.2, 1.02],
  [0.1, 1.16],
  [0.0, 1.23],
])
const bell = lathe(
  [
    [0.16, -0.9],
    [0.165, -0.97],
    [0.2, -1.06],
    [0.245, -1.12],
  ],
  12,
)
const band = new TorusGeometry(0.39, 0.035, 10, 40).rotateX(Math.PI / 2)
const seam = new TorusGeometry(0.335, 0.022, 8, 40).rotateX(Math.PI / 2)
const porthole = new TorusGeometry(0.09, 0.025, 8, 24)
const bulb = new SphereGeometry(0.045, 10, 8)
const flame = new ConeGeometry(0.17, 1, 16, 1, true).rotateX(-Math.PI / 2).translate(0, 0, -0.5)

// aleta varrida para trás, com a ponta caindo além do bocal
const finShape = new Shape()
finShape.moveTo(0, 0.05)
finShape.bezierCurveTo(0.12, -0.2, 0.42, -0.45, 0.5, -0.78)
finShape.lineTo(0.52, -1.08)
finShape.quadraticCurveTo(0.42, -1.02, 0.3, -0.86)
finShape.lineTo(0, -0.74)
finShape.closePath()
const fin = new ExtrudeGeometry(finShape, {
  depth: 0.05,
  bevelEnabled: true,
  bevelThickness: 0.015,
  bevelSize: 0.015,
  bevelSegments: 2,
  curveSegments: 16,
}).translate(0.3, 0, -0.025)

function Part({ geometry, color, ...props }: { geometry: BufferGeometry; color: string } & ThreeElements['group']) {
  return (
    <group {...props}>
      <mesh geometry={geometry}>
        <meshToonMaterial color={color} gradientMap={TOON_RAMP} side={DoubleSide} />
      </mesh>
      <mesh geometry={geometry} material={OUTLINE} />
    </group>
  )
}

/** Escotilha: aro escuro, vidro aceso e um reflexo. `angle` gira em volta do casco. */
function Porthole({ y, angle, size = 1 }: { y: number; angle: number; size?: number }) {
  return (
    <group rotation={[0, angle, 0]}>
      <group position={[0, y, 0.385]} scale={size}>
        <Part geometry={porthole} color={HULL} />
        <mesh>
          <circleGeometry args={[0.09, 24]} />
          <meshBasicMaterial color={TEAL} />
        </mesh>
        <mesh position={[-0.03, 0.03, 0.005]}>
          <circleGeometry args={[0.025, 12]} />
          <meshBasicMaterial color="#e9fffb" />
        </mesh>
      </group>
    </group>
  )
}

// três aletas a 120°: uma para cima e duas abertas para baixo (o "para cima" do casco é -Z local)
const FINS = [0, 1, 2].map((i) => Math.PI / 2 + (i * Math.PI * 2) / 3)
const FIN_LIGHTS = ['#ffb000', '#ff4d5e', '#5cff9d']

export function Ship() {
  const root = useRef<Group>(null)
  const hull = useRef<Group>(null)
  const exhaust = useRef<Group>(null)
  const lights = useRef<Group>(null)
  const position = useRef(new Vector3())
  const previous = useRef(new Vector3())
  const velocity = useRef(new Vector3())
  const started = useRef(false)
  const aim = useMemo(() => new Object3D(), [])
  const target = useMemo(() => new Quaternion(), [])
  const point = useMemo(() => new Vector3(), [])

  useFrame((state, rawDelta) => {
    if (!root.current || !hull.current || !exhaust.current) return
    const delta = Math.min(rawDelta, 0.05)
    const time = state.clock.elapsedTime
    const { stage, project, reducedMotion, booted } = useStore.getState()
    const view = getView(stage, project)

    if (!started.current || reducedMotion) {
      position.current.copy(view.ship)
      if (!started.current) {
        previous.current.copy(view.ship)
        aim.lookAt(view.heading)
        root.current.quaternion.copy(aim.quaternion)
        started.current = true
      }
    } else if (booted) {
      // a nave é mais rápida que a câmera: sai na frente e espera na próxima parada
      position.current.lerp(view.ship, 1 - Math.exp(-2.9 * delta))
    }

    velocity.current.lerp(
      previous.current.subVectors(position.current, previous.current).divideScalar(delta),
      1 - Math.exp(-8 * delta),
    )
    previous.current.copy(position.current)
    const speed = velocity.current.length()

    // em viagem aponta para onde vai; parada, volta para a pose da cena
    aim.position.set(0, 0, 0)
    aim.lookAt(speed > 2.5 ? point.copy(velocity.current).normalize() : view.heading)
    target.copy(aim.quaternion)
    root.current.quaternion.slerp(target, 1 - Math.exp(-(speed > 2.5 ? 7 : 2.2) * delta))
    root.current.position.copy(position.current)

    hull.current.position.y = Math.sin(time * 1.15) * 0.09
    hull.current.rotation.z = Math.sin(time * 0.7) * 0.07
    hull.current.rotation.x = Math.sin(time * 0.9 + 1) * 0.03

    const throttle = Math.min(speed / 30, 1)
    const flicker = 0.9 + 0.1 * Math.sin(time * 38) * Math.sin(time * 23)
    // luzes de navegação piscando fora de fase, e a do nariz pulsando devagar
    lights.current?.children.forEach((child, i) => {
      const material = (child as unknown as { material: MeshBasicMaterial }).material
      material.opacity = i === 0 ? 0.55 + 0.45 * Math.sin(time * 2.4) : Math.sin(time * 3 + i * 2.1) > 0.55 ? 1 : 0.15
    })

    exhaust.current.scale.set(1 + throttle * 0.35, 1 + throttle * 0.35, (0.55 + throttle * 2.6) * flicker)
  })

  return (
    <group ref={root}>
      <group ref={hull} scale={0.82}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <Part geometry={fuselage} color={PAPER} />
          <Part geometry={nose} color={AMBER} />
          <Part geometry={bell} color={HULL} />
          <Part geometry={band} color={AMBER} position={[0, -0.5, 0]} />
          <Part geometry={seam} color={HULL} position={[0, 0.64, 0]} />
          <mesh position={[0, -0.92, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.2, 24]} />
            <meshBasicMaterial color="#ffd36b" side={DoubleSide} />
          </mesh>
          {[Math.PI / 2, -Math.PI / 2].map((side) => (
            <group key={side}>
              <Porthole y={0.28} angle={side} />
              <Porthole y={-0.08} angle={side} size={0.7} />
            </group>
          ))}
          <Porthole y={0.42} angle={Math.PI} size={1.25} />
          {FINS.map((angle) => (
            <group key={angle} rotation={[0, angle, 0]}>
              <Part geometry={fin} color={AMBER} />
            </group>
          ))}
          <group ref={lights}>
            <mesh position={[0, 1.25, 0]} geometry={bulb}>
              <meshBasicMaterial color={AMBER} transparent />
            </mesh>
            {FINS.map((angle, i) => (
              <mesh
                key={angle}
                geometry={bulb}
                scale={0.8}
                position={[Math.cos(angle) * 0.83, -1.1, -Math.sin(angle) * 0.83]}
              >
                <meshBasicMaterial color={FIN_LIGHTS[i]} transparent />
              </mesh>
            ))}
          </group>
        </group>
        <group ref={exhaust} position={[0, 0, -1.04]}>
          <mesh geometry={flame}>
            <meshBasicMaterial color="#ff6a1f" transparent opacity={0.55} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
          </mesh>
          <mesh geometry={flame} scale={[0.72, 0.72, 0.8]}>
            <meshBasicMaterial color={AMBER} transparent opacity={0.85} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
          </mesh>
          <mesh geometry={flame} scale={[0.38, 0.38, 0.55]}>
            <meshBasicMaterial color="#fff6dc" transparent blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

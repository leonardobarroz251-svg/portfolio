import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  ShaderMaterial,
  type Group,
  type Mesh,
} from 'three'
import { NOISE } from './glsl'
import { SUN } from './layout'
import { useStore, type StageId } from '../store'

// Cada parada tinge a nebulosa de um jeito; as cores se misturam durante a viagem.
const TINTS: Record<StageId, [string, string]> = {
  inicio: ['#10306b', '#0c5a66'],
  perfil: ['#1a2a6e', '#3a2a7a'],
  habilidades: ['#0d4a5c', '#273a8a'],
  experiencia: ['#5a3312', '#3a1a4a'],
  projetos: ['#3b1d6e', '#0e4a66'],
  contato: ['#7a3a12', '#5a1f3a'],
}

const STAR_COUNT = 3200

function Stars() {
  const geometry = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3)
    const sizes = new Float32Array(STAR_COUNT)
    const phases = new Float32Array(STAR_COUNT)
    const tints = new Float32Array(STAR_COUNT * 3)
    const palette = [new Color('#ffffff'), new Color('#bcd4ff'), new Color('#ffe2b0'), new Color('#9ff3e4')]
    for (let i = 0; i < STAR_COUNT; i++) {
      // ponto uniforme na esfera
      const y = Math.random() * 2 - 1
      const angle = Math.random() * Math.PI * 2
      const ring = Math.sqrt(1 - y * y)
      positions.set([Math.cos(angle) * ring * 900, y * 900, Math.sin(angle) * ring * 900], i * 3)
      sizes[i] = 1.2 + Math.pow(Math.random(), 7) * 9 + Math.random() * 1.4
      phases[i] = Math.random() * Math.PI * 2
      const color = palette[Math.random() < 0.62 ? 0 : 1 + Math.floor(Math.random() * 3)]
      tints.set([color.r, color.g, color.b], i * 3)
    }
    const buffer = new BufferGeometry()
    buffer.setAttribute('position', new BufferAttribute(positions, 3))
    buffer.setAttribute('aSize', new BufferAttribute(sizes, 1))
    buffer.setAttribute('aPhase', new BufferAttribute(phases, 1))
    buffer.setAttribute('aTint', new BufferAttribute(tints, 3))
    return buffer
  }, [])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
        vertexShader: /* glsl */ `
          attribute float aSize;
          attribute float aPhase;
          attribute vec3 aTint;
          uniform float uTime;
          uniform float uPixelRatio;
          varying vec3 vTint;
          varying float vBig;
          void main() {
            float twinkle = 0.78 + 0.22 * sin(uTime * (0.6 + fract(aPhase) * 1.8) + aPhase);
            vTint = aTint * twinkle;
            vBig = smoothstep(4.5, 7.0, aSize);
            gl_PointSize = aSize * uPixelRatio * (0.9 + 0.1 * twinkle);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vTint;
          varying float vBig;
          void main() {
            vec2 uv = gl_PointCoord - 0.5;
            float d = length(uv);
            float core = smoothstep(0.5, 0.08, d);
            // as estrelas maiores ganham quatro pontas
            float spikes = max(0.0, 1.0 - abs(uv.x * uv.y) * 220.0) * smoothstep(0.5, 0.0, d);
            float alpha = mix(core * core, max(core * core * core, spikes * 0.85), vBig);
            gl_FragColor = vec4(vTint * alpha, alpha);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  )

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime
    material.uniforms.uPixelRatio.value = state.viewport.dpr
  })

  return <points geometry={geometry} material={material} frustumCulled={false} />
}

function Nebula() {
  const stage = useStore((state) => state.stage)
  const targetA = useMemo(() => new Color(), [])
  const targetB = useMemo(() => new Color(), [])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        uniforms: {
          uA: { value: new Color(TINTS.inicio[0]) },
          uB: { value: new Color(TINTS.inicio[1]) },
          uBase: { value: new Color('#04050d') },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uA;
          uniform vec3 uB;
          uniform vec3 uBase;
          varying vec3 vDir;
          ${NOISE}
          void main() {
            vec3 d = normalize(vDir);
            float a = fbm3(d * 1.35 + 3.1) * 0.5 + 0.5;
            float b = fbm3(d * 2.4 + vec3(a * 1.6, 7.3, -2.0)) * 0.5 + 0.5;
            // nuvens em degraus: a nebulosa segue o traço cel dos planetas
            float cloud = smoothstep(0.5, 0.52, a) * 0.42 + smoothstep(0.6, 0.62, a) * 0.3 + smoothstep(0.7, 0.72, a) * 0.28;
            float veil = smoothstep(0.56, 0.58, b) * 0.6 + smoothstep(0.68, 0.7, b) * 0.4;
            vec3 col = uBase + uA * cloud * 0.42 + uB * veil * cloud * 0.5 + uB * veil * 0.06;
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  )

  useFrame((_, delta) => {
    const [a, b] = TINTS[stage]
    const blend = 1 - Math.exp(-1.6 * delta)
    material.uniforms.uA.value.lerp(targetA.set(a), blend)
    material.uniforms.uB.value.lerp(targetB.set(b), blend)
  })

  return (
    <mesh material={material} frustumCulled={false} renderOrder={-10}>
      <sphereGeometry args={[1500, 32, 24]} />
    </mesh>
  )
}

function Sun() {
  const mesh = useRef<Mesh>(null)
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv - 0.5;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          varying vec2 vUv;
          void main() {
            float d = length(vUv) * 2.0;
            float disc = smoothstep(0.105, 0.095, d);
            // coroa em três anéis chapados, depois um brilho longo
            float corona = smoothstep(0.2, 0.19, d) * 0.3 + smoothstep(0.34, 0.33, d) * 0.14 + smoothstep(0.52, 0.51, d) * 0.07;
            float glow = pow(max(0.0, 1.0 - d), 3.0) * 0.5;
            float rays = max(0.0, 1.0 - abs(vUv.x * vUv.y) * 900.0) * pow(max(0.0, 1.0 - d), 2.0) * 0.5;
            vec3 col = vec3(1.0, 0.97, 0.88) * disc + vec3(1.0, 0.72, 0.28) * (corona + glow + rays);
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  )

  useFrame((state) => {
    if (!mesh.current) return
    // o sol fica "no infinito": acompanha a câmera e sempre olha para ela
    mesh.current.position.copy(state.camera.position).addScaledVector(SUN, 1200)
    mesh.current.quaternion.copy(state.camera.quaternion)
  })

  return (
    <mesh ref={mesh} material={material} frustumCulled={false} renderOrder={-5}>
      <planeGeometry args={[520, 520]} />
    </mesh>
  )
}

export function Sky() {
  const backdrop = useRef<Group>(null)
  useFrame((state) => {
    backdrop.current?.position.copy(state.camera.position)
  })
  return (
    <>
      <group ref={backdrop}>
        <Nebula />
        <Stars />
      </group>
      <Sun />
    </>
  )
}

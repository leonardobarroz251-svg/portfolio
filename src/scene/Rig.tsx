import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  LineSegments,
  ShaderMaterial,
  Vector3,
  type PerspectiveCamera,
} from 'three'
import { getView } from './layout'
import { telemetry, useStore } from '../store'

const BASE_FOV = 46
const PORTRAIT_PULLBACK = 1.65
const DUST_COUNT = 260
const DUST_BOX = 70

/** Poeira em volta da câmera: parada é invisível, em viagem vira riscos de velocidade. */
function useDust() {
  return useMemo(() => {
    const base = new Float32Array(DUST_COUNT * 6)
    const tail = new Float32Array(DUST_COUNT * 2)
    for (let i = 0; i < DUST_COUNT; i++) {
      const point = [Math.random() * DUST_BOX, Math.random() * DUST_BOX, Math.random() * DUST_BOX]
      base.set(point, i * 6)
      base.set(point, i * 6 + 3)
      tail[i * 2 + 1] = 1
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(base, 3))
    geometry.setAttribute('aTail', new BufferAttribute(tail, 1))
    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uCam: { value: new Vector3() },
        uVel: { value: new Vector3() },
        uAlpha: { value: 0 },
        uBox: { value: DUST_BOX },
      },
      vertexShader: /* glsl */ `
        attribute float aTail;
        uniform vec3 uCam;
        uniform vec3 uVel;
        uniform float uBox;
        varying float vFade;
        void main() {
          // os grãos se repetem numa caixa que anda junto com a câmera
          vec3 p = uCam + mod(position - uCam + uBox * 0.5, uBox) - uBox * 0.5;
          p -= uVel * aTail;
          vFade = (1.0 - aTail) * smoothstep(uBox * 0.5, uBox * 0.2, distance(p, uCam));
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uAlpha;
        varying float vFade;
        void main() {
          gl_FragColor = vec4(vec3(0.85, 0.93, 1.0) * vFade * uAlpha, 1.0);
          #include <colorspace_fragment>
        }
      `,
    })
    const lines = new LineSegments(geometry, material)
    lines.frustumCulled = false
    return lines
  }, [])
}

export function Rig() {
  const camera = useThree((state) => state.camera) as PerspectiveCamera
  const size = useThree((state) => state.size)
  const pointer = useRef({ x: 0, y: 0 })
  const position = useRef(new Vector3())
  const look = useRef(new Vector3())
  const previous = useRef(new Vector3())
  const velocity = useRef(new Vector3())
  const started = useRef(false)
  const dust = useDust()
  const goal = useRef(new Vector3())

  // A interface ocupa a direita (ou a parte de baixo, no celular): o centro óptico é
  // deslocado para a cena ficar no espaço livre.
  useEffect(() => {
    const narrow = size.width < 900
    camera.setViewOffset(
      size.width,
      size.height,
      narrow ? 0 : size.width * 0.11,
      narrow ? size.height * 0.2 : 0,
      size.width,
      size.height,
    )
    return () => camera.clearViewOffset()
  }, [camera, size])

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const { stage, project, reducedMotion, booted } = useStore.getState()
    const view = getView(stage, project)
    // em tela em pé a cena só tem a faixa de cima: a câmera recua para caber tudo
    const pullback = size.width < size.height ? PORTRAIT_PULLBACK : 1
    const cam = goal.current.subVectors(view.cam, view.look).multiplyScalar(pullback).add(view.look)

    if (!started.current || reducedMotion) {
      position.current.copy(cam)
      look.current.copy(view.look)
      if (!started.current) {
        // a abertura começa um pouco afastada e a câmera chega junto com a interface
        position.current.addScaledVector(cam.clone().sub(view.look).normalize(), 9)
        previous.current.copy(position.current)
        started.current = true
      }
      if (reducedMotion) previous.current.copy(position.current)
    } else if (booted) {
      position.current.lerp(cam, 1 - Math.exp(-2.1 * delta))
      look.current.lerp(view.look, 1 - Math.exp(-2.6 * delta))
    }

    velocity.current.lerp(
      previous.current.subVectors(position.current, previous.current).divideScalar(delta),
      1 - Math.exp(-10 * delta),
    )
    previous.current.copy(position.current)
    const speed = velocity.current.length()
    telemetry.speed = speed

    camera.position.copy(position.current)
    camera.position.x += pointer.current.x * 0.45
    camera.position.y -= pointer.current.y * 0.3
    camera.lookAt(look.current)

    const fov = BASE_FOV + Math.min(speed * 0.16, 20)
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov += (fov - camera.fov) * (1 - Math.exp(-6 * delta))
      camera.updateProjectionMatrix()
    }

    dust.material.uniforms.uCam.value.copy(camera.position)
    dust.material.uniforms.uVel.value.copy(velocity.current).multiplyScalar(0.085)
    dust.material.uniforms.uAlpha.value = Math.min(speed / 45, 0.75)
  })

  return <primitive object={dust} />
}

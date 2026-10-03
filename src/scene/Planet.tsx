import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BackSide, Color, ShaderMaterial, Vector3, type Group, type Vector3Tuple } from 'three'
import { NOISE } from './glsl'
import { SUN } from './layout'

export interface PlanetProps {
  radius: number
  position?: Vector3Tuple
  /** Quatro cores, da mais baixa à mais alta do relevo (ou das faixas). */
  colors: [string, string, string, string]
  thresholds?: [number, number, number]
  scale?: number
  /** 0 = continentes de ruído, 1 = faixas de gigante gasoso. */
  banded?: number
  bands?: number
  warp?: number
  seed?: number
  atmosphere?: string
  atmosphereSize?: number
  clouds?: number
  spin?: number
  tilt?: number
  segments?: number
  /** Linha de espuma na costa e reflexo do sol na água (0 a 1). */
  shore?: number
  /** Latitude onde começam as calotas polares (0 a 1); omitido, sem gelo. */
  ice?: number
  /** Densidade de crateras; 0 desliga. */
  craters?: number
  /** Luzes de cidade no lado da noite (0 a 1). */
  cities?: number
  /** Tempestade de gigante gasoso: direção no planeta, tamanho e cor. */
  storm?: { at: Vector3Tuple; size: number; color: string }
}

const vertexShader = /* glsl */ `
  varying vec3 vObj;
  varying vec3 vNormalW;
  varying vec3 vWorld;
  void main() {
    vObj = position;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const surfaceShader = /* glsl */ `
  uniform vec3 uC1;
  uniform vec3 uC2;
  uniform vec3 uC3;
  uniform vec3 uC4;
  uniform vec3 uT;
  uniform vec3 uSun;
  uniform vec3 uAtmo;
  uniform float uScale;
  uniform float uBanded;
  uniform float uBands;
  uniform float uWarp;
  uniform float uSeed;
  uniform float uClouds;
  uniform float uTime;
  uniform float uShore;
  uniform float uIce;
  uniform float uCraters;
  uniform float uCities;
  uniform vec3 uStormAt;
  uniform float uStormSize;
  uniform vec3 uStormColor;
  varying vec3 vObj;
  varying vec3 vNormalW;
  varying vec3 vWorld;
  ${NOISE}
  void main() {
    vec3 p = normalize(vObj);
    vec3 q = p * uScale + uSeed;
    // distorção de domínio: os continentes ganham baías e penínsulas em vez de manchas redondas
    vec3 w = vec3(fbm3(q + vec3(1.7, 9.2, 0.0)), fbm3(q + vec3(8.3, 2.8, 4.1)), fbm3(q + vec3(3.1, 5.7, 7.3)));
    float n = fbm(q + w * 0.6 * (1.0 - uBanded)) * 0.5 + 0.5;
    // faixas com redemoinhos: uma ondulação fina por cima da grossa
    float swirl = sin(p.y * uBands * 2.7 + w.x * 3.0) * 0.35;
    float band = sin(p.y * uBands + (n - 0.5) * uWarp + swirl) * 0.5 + 0.5;
    float h = mix(n, band, uBanded);
    float aa = fwidth(h) + 0.002;
    vec3 col = uC1;
    col = mix(col, uC2, smoothstep(uT.x - aa, uT.x + aa, h));
    col = mix(col, uC3, smoothstep(uT.y - aa, uT.y + aa, h));
    col = mix(col, uC4, smoothstep(uT.z - aa, uT.z + aa, h));
    float water = 1.0 - smoothstep(uT.y - aa, uT.y + aa, h);

    if (uShore > 0.0) {
      // espuma: um fio claro logo antes da terra
      float edge = uT.y - 0.004;
      float foam = smoothstep(edge - 0.006 - aa, edge - 0.006, h) * (1.0 - smoothstep(edge, edge + aa, h));
      col = mix(col, vec3(0.93, 0.98, 1.0), foam * 0.75 * uShore);
    }

    if (uCraters > 0.0) {
      vec2 c = worley(p * uCraters + uSeed * 1.3);
      float r = 0.28 + c.y * 0.2;
      float ca = fwidth(c.x) + 0.004;
      float pit = 1.0 - smoothstep(r - ca, r + ca, c.x);
      float rim = smoothstep(r - ca, r + ca, c.x) * (1.0 - smoothstep(r + 0.07 - ca, r + 0.07 + ca, c.x));
      // só uma parte das células vira cratera
      float keep = step(0.45, c.y);
      col *= 1.0 - pit * 0.24 * keep;
      col = mix(col, col * 1.25 + 0.03, rim * keep);
    }

    if (uStormSize > 0.0) {
      vec3 d = p - normalize(uStormAt);
      float e = length(d * vec3(0.75, 1.6, 0.75)) / uStormSize;
      float ea = fwidth(e) + 0.01;
      col = mix(col, uStormColor * 0.8, 1.0 - smoothstep(1.0 - ea, 1.0 + ea, e));
      col = mix(col, uStormColor, 1.0 - smoothstep(0.62 - ea, 0.62 + ea, e));
      col = mix(col, uStormColor * 1.15 + 0.08, 1.0 - smoothstep(0.28 - ea, 0.28 + ea, e));
    }

    if (uIce < 1.0) {
      float lat = abs(p.y) + (n - 0.5) * 0.22;
      float ia = fwidth(lat) + 0.002;
      col = mix(col, vec3(0.93, 0.96, 1.0), smoothstep(uIce - ia, uIce + ia, lat));
    }

    if (uClouds > 0.0) {
      float c = fbm3(p * uScale * 1.6 + vec3(uTime * 0.015, uSeed * 3.0, uTime * 0.008)) * 0.5 + 0.5;
      float ca = fwidth(c) + 0.002;
      col = mix(col, vec3(0.97, 0.98, 1.0), smoothstep(0.6 - ca, 0.6 + ca, c) * uClouds);
    }

    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vWorld);
    float ndl = dot(N, uSun);
    // luz em três degraus, como numa pintura cel
    float lit = 0.5 * smoothstep(-0.02, 0.02, ndl) + 0.3 * smoothstep(0.3, 0.34, ndl) + 0.2 * smoothstep(0.64, 0.68, ndl);
    col *= mix(vec3(0.07, 0.085, 0.16), vec3(1.0), lit);

    // reflexo do sol na água: um brilho de borda dura, como numa ilustração
    vec3 H = normalize(uSun + V);
    float spec = smoothstep(0.972, 0.978, dot(N, H)) * water * uShore;
    col += vec3(1.0, 0.95, 0.85) * spec * 0.55;

    // fio morno no terminador, onde o dia vira noite: tinge a cor em vez de clarear
    float dusk = smoothstep(-0.01, 0.01, ndl) * (1.0 - smoothstep(0.03, 0.06, ndl));
    col = mix(col, col * vec3(1.45, 0.82, 0.62) + vec3(0.05, 0.015, 0.0), dusk * 0.5 * step(0.001, dot(uAtmo, uAtmo)));

    if (uCities > 0.0) {
      float night = 1.0 - smoothstep(-0.12, -0.02, ndl);
      float spots = smoothstep(0.62, 0.7, snoise(p * 70.0 + uSeed)) * smoothstep(0.3, 0.6, snoise(p * 9.0 + uSeed));
      col += vec3(1.0, 0.72, 0.32) * spots * night * (1.0 - water) * uCities;
    }

    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.6);
    col += uAtmo * fresnel * (0.1 + 0.9 * smoothstep(-0.3, 0.3, ndl));

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

const haloShader = /* glsl */ `
  uniform vec3 uAtmo;
  uniform vec3 uSun;
  uniform float uEdge;
  varying vec3 vNormalW;
  varying vec3 vWorld;
  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vWorld);
    // 0 na borda de fora do halo, 1 encostado no planeta
    float depth = clamp(-dot(N, V) / uEdge, 0.0, 1.0);
    float day = 0.08 + 0.92 * smoothstep(-0.45, 0.45, dot(N, uSun));
    gl_FragColor = vec4(uAtmo * pow(depth, 2.2) * day, 1.0);
    #include <colorspace_fragment>
  }
`

export function Planet({
  radius,
  position,
  colors,
  thresholds = [0.4, 0.52, 0.64],
  scale = 1.6,
  banded = 0,
  bands = 8,
  warp = 2,
  seed = 0,
  atmosphere,
  atmosphereSize = 1.14,
  clouds = 0,
  spin = 0.02,
  tilt = 0,
  segments = 64,
  shore = 0,
  ice = 1,
  craters = 0,
  cities = 0,
  storm,
}: PlanetProps) {
  const body = useRef<Group>(null)

  const surface = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader: surfaceShader,
        uniforms: {
          uC1: { value: new Color(colors[0]) },
          uC2: { value: new Color(colors[1]) },
          uC3: { value: new Color(colors[2]) },
          uC4: { value: new Color(colors[3]) },
          uT: { value: thresholds },
          uSun: { value: SUN },
          uAtmo: { value: new Color(atmosphere ?? '#000000') },
          uScale: { value: scale },
          uBanded: { value: banded },
          uBands: { value: bands },
          uWarp: { value: warp },
          uSeed: { value: seed },
          uClouds: { value: clouds },
          uTime: { value: 0 },
          uShore: { value: shore },
          uIce: { value: ice },
          uCraters: { value: craters },
          uCities: { value: cities },
          uStormAt: { value: new Vector3(...(storm?.at ?? [0, 0, 1])) },
          uStormSize: { value: storm?.size ?? 0 },
          uStormColor: { value: new Color(storm?.color ?? '#ffffff') },
        },
      }),
    // as props descrevem um planeta fixo: o material só é montado uma vez
    [],
  )

  const halo = useMemo(
    () =>
      atmosphere
        ? new ShaderMaterial({
            vertexShader,
            fragmentShader: haloShader,
            side: BackSide,
            transparent: true,
            blending: AdditiveBlending,
            depthWrite: false,
            uniforms: {
              uAtmo: { value: new Color(atmosphere) },
              uSun: { value: SUN },
              uEdge: { value: Math.sqrt(1 - 1 / (atmosphereSize * atmosphereSize)) },
            },
          })
        : null,
    [],
  )

  useFrame((state, delta) => {
    surface.uniforms.uTime.value = state.clock.elapsedTime
    if (body.current) body.current.rotation.y += spin * delta
  })

  return (
    <group position={position}>
      <group rotation={[0, 0, tilt]}>
        <group ref={body}>
          <mesh material={surface}>
            <sphereGeometry args={[radius, segments, Math.round(segments * 0.75)]} />
          </mesh>
        </group>
      </group>
      {halo && (
        <mesh material={halo}>
          <sphereGeometry args={[radius * atmosphereSize, 48, 32]} />
        </mesh>
      )}
    </group>
  )
}

import { BackSide, DataTexture, NearestFilter, RedFormat, ShaderMaterial, Color } from 'three'

// Rampa de três tons para o MeshToonMaterial: sombra, meio-tom e luz, sem degradê.
const ramp = new DataTexture(new Uint8Array([70, 150, 255]), 3, 1, RedFormat)
ramp.minFilter = NearestFilter
ramp.magFilter = NearestFilter
ramp.needsUpdate = true
export const TOON_RAMP = ramp

/** Contorno: a malha é repetida virada do avesso e inflada ao longo das normais. */
export const outlineMaterial = (thickness = 0.03) =>
  new ShaderMaterial({
    side: BackSide,
    uniforms: { uThickness: { value: thickness }, uColor: { value: new Color('#04050d') } },
    vertexShader: /* glsl */ `
      uniform float uThickness;
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * uThickness, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      void main() {
        gl_FragColor = vec4(uColor, 1.0);
        #include <colorspace_fragment>
      }
    `,
  })

export const OUTLINE = outlineMaterial(0.03)
export const OUTLINE_THICK = outlineMaterial(0.07)

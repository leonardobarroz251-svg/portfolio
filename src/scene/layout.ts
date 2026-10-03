import { Vector3 } from 'three'
import { PROJECT_COUNT, type StageId } from '../store'

/** Direção do sol, igual para o percurso inteiro: os planetas ficam iluminados pela esquerda. */
export const SUN = new Vector3(-0.9, 0.3, -0.15).normalize()

export const ANCHORS: Record<StageId, Vector3> = {
  inicio: new Vector3(0, 0, 0),
  perfil: new Vector3(60, 10, -80),
  habilidades: new Vector3(-30, 40, -190),
  experiencia: new Vector3(70, -10, -300),
  projetos: new Vector3(-40, 0, -420),
  contato: new Vector3(30, 25, -540),
}

const v = (x: number, y: number, z: number) => new Vector3(x, y, z)

export const projectOffset = (index: number) =>
  v((index - (PROJECT_COUNT - 1) / 2) * 13, Math.sin(index * 1.7) * 1.6, Math.cos(index * 2.1) * 2.5)

// No contato a câmera vira de frente para o sol: f aponta para ele, r e u completam o quadro.
const f = SUN.clone()
const r = new Vector3().crossVectors(f, v(0, 1, 0)).normalize()
const u = new Vector3().crossVectors(r, f).normalize()
const frame = (right: number, up: number, forward: number) =>
  v(0, 0, 0).addScaledVector(r, right).addScaledVector(u, up).addScaledVector(f, forward)

export const RELAY = {
  planet: frame(0, -13.4, 7),
  satellite: frame(-3.2, 0.9, 0),
  beam: frame(-0.25, 0.55, -0.8).normalize(),
}

export interface View {
  cam: Vector3
  look: Vector3
  ship: Vector3
  /** Para onde a nave aponta quando está parada. */
  heading: Vector3
}

const AHEAD = v(0.9, 0.06, -0.42).normalize()

const LOCAL: Record<Exclude<StageId, 'projetos'>, View> = {
  inicio: { cam: v(0, 1.2, 15), look: v(0, 0.3, 0), ship: v(-0.4, 0.9, 5.5), heading: AHEAD },
  perfil: { cam: v(0, 1, 14), look: v(0, 0, 0), ship: v(1.6, -2.2, 5), heading: AHEAD },
  habilidades: { cam: v(0, 0, 16), look: v(0, 0, 0), ship: v(1.6, -3, 6), heading: AHEAD },
  experiencia: { cam: v(1.5, 4, 36), look: v(1.5, 0, 0), ship: v(2.5, -3.4, 10), heading: AHEAD },
  contato: {
    cam: frame(0, 0.5, -14),
    look: frame(0, 1.6, 20),
    ship: frame(2.1, -0.9, -6),
    heading: frame(0.5, 0.1, 0.85).normalize(),
  },
}

const cache = new Map<string, View>()

export function getView(stage: StageId, project: number): View {
  const key = stage === 'projetos' ? `projetos:${project}` : stage
  let view = cache.get(key)
  if (!view) {
    const anchor = ANCHORS[stage]
    if (stage === 'projetos') {
      const planet = projectOffset(project)
      view = {
        cam: planet.clone().add(v(0, 1.2, 15)).add(anchor),
        look: planet.clone().add(anchor),
        ship: planet.clone().add(v(1.2, -1.4, 6)).add(anchor),
        heading: AHEAD,
      }
    } else {
      const local = LOCAL[stage]
      view = {
        cam: local.cam.clone().add(anchor),
        look: local.look.clone().add(anchor),
        ship: local.ship.clone().add(anchor),
        heading: local.heading,
      }
    }
    cache.set(key, view)
  }
  return view
}

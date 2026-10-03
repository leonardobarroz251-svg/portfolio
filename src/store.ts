import { create } from 'zustand'
import { pt } from './content/pt'
import { en } from './content/en'
import type { Content } from './content/types'

export const STAGES = ['inicio', 'perfil', 'habilidades', 'experiencia', 'projetos', 'contato'] as const
export type StageId = (typeof STAGES)[number]
export type Lang = 'pt' | 'en'

const CONTENT: Record<Lang, Content> = { pt, en }

export const MISSION_COUNT = pt.missions.length
export const PROJECT_COUNT = pt.projects.length
export const SKILL_GROUPS = pt.skills.map((group) => group.items.length)

function initialStage(): StageId {
  const hash = window.location.hash.slice(1)
  return (STAGES as readonly string[]).includes(hash) ? (hash as StageId) : 'inicio'
}

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('lang')
    if (saved === 'pt' || saved === 'en') return saved
  } catch {
    // armazenamento bloqueado: cai no idioma do navegador
  }
  return navigator.language.toLowerCase().startsWith('pt') ? 'pt' : 'en'
}

function hasWebgl(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2'))
  } catch {
    return false
  }
}

interface State {
  stage: StageId
  lang: Lang
  mission: number
  project: number
  skillFocus: number | null
  /** Progresso de -1 a 1 do "puxão" de scroll que troca de seção. */
  pull: number
  booted: boolean
  webgl: boolean
  ready: { fonts: boolean; engine: boolean; frame: boolean }
  reducedMotion: boolean
  setStage: (stage: StageId) => void
  step: (dir: 1 | -1) => boolean
  setLang: (lang: Lang) => void
  setMission: (index: number) => void
  setProject: (index: number) => void
  setSkillFocus: (index: number | null) => void
  setPull: (pull: number) => void
  setBooted: () => void
  markReady: (key: keyof State['ready']) => void
}

const wrap = (index: number, total: number) => ((index % total) + total) % total

export const useStore = create<State>((set, get) => ({
  stage: initialStage(),
  lang: initialLang(),
  mission: 0,
  project: 0,
  skillFocus: null,
  pull: 0,
  booted: false,
  webgl: hasWebgl(),
  ready: { fonts: false, engine: false, frame: false },
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  setStage: (stage) => {
    if (stage === get().stage) return
    history.replaceState(null, '', stage === 'inicio' ? window.location.pathname : `#${stage}`)
    set({ stage, pull: 0, skillFocus: null })
  },
  step: (dir) => {
    const next = STAGES[STAGES.indexOf(get().stage) + dir]
    if (!next) return false
    get().setStage(next)
    return true
  },
  setLang: (lang) => {
    try {
      localStorage.setItem('lang', lang)
    } catch {
      // sem armazenamento, o idioma vale só para esta visita
    }
    set({ lang })
  },
  setMission: (index) => set({ mission: wrap(index, MISSION_COUNT) }),
  setProject: (index) => set({ project: wrap(index, PROJECT_COUNT) }),
  setSkillFocus: (skillFocus) => set({ skillFocus }),
  setPull: (pull) => set({ pull }),
  setBooted: () => set({ booted: true }),
  markReady: (key) => {
    if (!get().ready[key]) set({ ready: { ...get().ready, [key]: true } })
  },
}))

export const useContent = () => CONTENT[useStore((state) => state.lang)]

/** Leituras que mudam a cada quadro: ficam fora do React para não redesenhar a interface. */
export const telemetry = { speed: 0 }

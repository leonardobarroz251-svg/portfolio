import type { StageId } from '../store'

export interface MenuItem {
  id: StageId
  label: string
  /** Nome do lugar no espaço, mostrado na troca de cena e na barra de status. */
  place: string
}

export interface Metric {
  label: string
  from: string
  to: string
}

export interface Mission {
  company: string
  role: string
  place: string
  period?: string
  metrics?: Metric[]
  highlights: string[]
  stack: string[]
}

export interface Project {
  title: string
  kind: string
  date?: string
  description: string
  stack: string[]
  repo?: string
  demo?: string
  /** Captura da página inteira, rolada dentro do notebook. */
  site?: { image: string; address: string; alt: string; /** Só uma tela: fica parada, sem rolagem. */ still?: boolean }
}

export interface SkillGroup {
  group: string
  items: string[]
}

export interface Content {
  ui: {
    menu: MenuItem[]
    menuAriaLabel: string
    menuHeader: string
    mobileNav: { prev: string; next: string; sections: string }
    back: string
    edgeHint: string
    edgeHintPrev: string
    controlsHint: string
    noWebgl: string
    langLabel: string
    statusBar: { link: string; sector: string; speed: string; location: string }
    boot: {
      kicker: string
      tasks: { fonts: string; engine: string; stars: string; orbit: string }
      done: string
      ariaLabel: string
    }
    hero: { kicker: string; now: string; experience: string; resume: string; scrollHint: string }
    profile: { about: string; education: string; studying: string }
    keys: { name: string; title: string; base: string; focus: string; status: string }
    skills: { hint: string }
    missions: { counter: string; prev: string; next: string; hint: string; telemetry: string }
    projects: { counter: string; prev: string; next: string; repo: string; demo: string; hint: string; screen: string }
    contact: { title: string; lead: string; email: string; github: string; linkedin: string }
  }
  profile: {
    name: string
    title: string
    tagline: string
    focus: string
    location: string
    status: string
    about: string[]
    studying: string
    links: { email: string; github: string; linkedin: string }
  }
  skills: SkillGroup[]
  missions: Mission[]
  projects: Project[]
  education: { course: string; school: string; period: string }[]
}

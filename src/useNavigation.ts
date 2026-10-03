import { useEffect } from 'react'
import { STAGES, useStore, type StageId } from './store'

/** Quanto de scroll "a mais" é preciso para trocar de parada. */
const PULL_THRESHOLD = 170
const PULL_IDLE_MS = 420
const LOCK_MS = 850

export function useNavigation() {
  useEffect(() => {
    let pull = 0
    let lockedUntil = 0
    let idle = 0

    const release = () => {
      pull = 0
      useStore.getState().setPull(0)
    }

    const onWheel = (event: WheelEvent) => {
      const { booted, step, setPull } = useStore.getState()
      if (!booted || event.ctrlKey) return
      const direction = Math.sign(event.deltaY) as 1 | -1 | 0
      if (!direction) return

      // a página aberta no notebook rola por conta própria antes de qualquer outra coisa
      const screen = (event.target as Element | null)?.closest?.('.laptop__page:not(.is-still)')
      if (screen) {
        const atTop = screen.scrollTop <= 0
        const atBottom = screen.scrollTop + screen.clientHeight >= screen.scrollHeight - 1
        if ((direction > 0 && !atBottom) || (direction < 0 && !atTop)) {
          if (pull) release()
          return
        }
      }

      // enquanto o texto do painel ainda rola, o scroll é só dele
      const body = (event.target as Element | null)?.closest?.('.sheet__body')
      if (body) {
        const atTop = body.scrollTop <= 0
        const atBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 1
        if ((direction > 0 && !atBottom) || (direction < 0 && !atTop)) {
          if (pull) release()
          return
        }
      }

      const now = performance.now()
      if (now < lockedUntil) return
      if (Math.sign(pull) !== direction) pull = 0
      const delta = event.deltaMode === 1 ? event.deltaY * 32 : event.deltaY
      pull += Math.max(-120, Math.min(120, delta))

      window.clearTimeout(idle)
      if (Math.abs(pull) >= PULL_THRESHOLD) {
        release()
        if (step(direction)) lockedUntil = now + LOCK_MS
        return
      }
      const index = STAGES.indexOf(useStore.getState().stage)
      if (STAGES[index + direction]) setPull(pull / PULL_THRESHOLD)
      idle = window.setTimeout(release, PULL_IDLE_MS)
    }

    const onKey = (event: KeyboardEvent) => {
      const state = useStore.getState()
      if (!state.booted || event.metaKey || event.ctrlKey || event.altKey) return
      switch (event.key) {
        case 'ArrowDown':
        case 'PageDown':
          state.step(1)
          break
        case 'ArrowUp':
        case 'PageUp':
          state.step(-1)
          break
        case 'ArrowRight':
        case 'ArrowLeft': {
          const direction = event.key === 'ArrowRight' ? 1 : -1
          if (state.stage === 'experiencia') state.setMission(state.mission + direction)
          else if (state.stage === 'projetos') state.setProject(state.project + direction)
          else return
          break
        }
        case 'Home':
        case 'Escape':
          state.setStage('inicio')
          break
        case 'End':
          state.setStage('contato')
          break
        default: {
          const stage: StageId | undefined = STAGES[Number(event.key) - 1]
          if (!stage) return
          state.setStage(stage)
        }
      }
      event.preventDefault()
    }

    const onHash = () => {
      const hash = window.location.hash.slice(1)
      if ((STAGES as readonly string[]).includes(hash)) useStore.getState().setStage(hash as StageId)
    }

    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('keydown', onKey)
    window.addEventListener('hashchange', onHash)
    return () => {
      window.clearTimeout(idle)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('hashchange', onHash)
    }
  }, [])
}

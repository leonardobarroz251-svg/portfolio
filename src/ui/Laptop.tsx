import { useEffect, useRef } from 'react'
import { useStore } from '../store'

const SPEED = 55 // px por segundo, na escala da tela
const HOLD_MS = 1600
const RESUME_MS = 2500

/** Um MacBook com a página do projeto aberta, rolando sozinha como se alguém estivesse lendo. */
export function Laptop({ image, address, alt, hint, still }: { image: string; address: string; alt: string; hint: string; still?: boolean }) {
  const page = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = page.current
    if (!el || still || useStore.getState().reducedMotion) return
    let frame = 0
    let last = performance.now()
    let pausedUntil = performance.now() + HOLD_MS
    let position = 0

    const tick = (now: number) => {
      const delta = Math.min(now - last, 50) / 1000
      last = now
      const max = el.scrollHeight - el.clientHeight
      if (max > 0 && now >= pausedUntil) {
        if (position >= max) {
          // chegou ao rodapé: segura um pouco e volta ao topo
          position = 0
          el.scrollTo({ top: 0, behavior: 'smooth' })
          pausedUntil = now + HOLD_MS * 2
        } else {
          position = Math.min(position + SPEED * delta, max)
          el.scrollTop = position
          if (position >= max) pausedUntil = now + HOLD_MS
        }
      }
      frame = requestAnimationFrame(tick)
    }

    // quando a pessoa mexe, a rolagem automática espera e depois continua de onde ela parou
    const hold = () => {
      pausedUntil = performance.now() + RESUME_MS
    }
    const sync = () => {
      position = el.scrollTop
    }
    el.addEventListener('wheel', hold, { passive: true })
    el.addEventListener('pointerdown', hold)
    el.addEventListener('touchstart', hold, { passive: true })
    el.addEventListener('scroll', sync, { passive: true })
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('wheel', hold)
      el.removeEventListener('pointerdown', hold)
      el.removeEventListener('touchstart', hold)
      el.removeEventListener('scroll', sync)
    }
  }, [image, still])

  return (
    <figure className="laptop">
      <div className="laptop__lid">
        <span className="laptop__camera" aria-hidden="true" />
        <div className="laptop__screen">
          <div className="laptop__bar" aria-hidden="true">
            <span className="laptop__lights">
              <i />
              <i />
              <i />
            </span>
            <span className="laptop__address">{address}</span>
          </div>
          <div
            className={`laptop__page${still ? ' is-still' : ''}`}
            ref={page}
            tabIndex={still ? undefined : 0}
            aria-label={still ? undefined : hint}
          >
            <img src={image} alt={alt} decoding="async" />
          </div>
        </div>
      </div>
      <div className="laptop__base" aria-hidden="true">
        <span className="laptop__notch" />
      </div>
    </figure>
  )
}

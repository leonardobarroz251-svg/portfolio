import { useEffect, useState } from 'react'
import { useContent, useStore } from '../store'

const STEPS = ['fonts', 'engine', 'stars', 'orbit'] as const
const STEP_MS = 260
const LEAVE_MS = 950

export function BootScreen() {
  const content = useContent()
  const ready = useStore((state) => state.ready)
  const webgl = useStore((state) => state.webgl)
  const reducedMotion = useStore((state) => state.reducedMotion)
  const setBooted = useStore((state) => state.setBooted)
  const [step, setStep] = useState(0)
  const [leaving, setLeaving] = useState(false)

  // Cada linha só fecha quando a parte de verdade que ela representa terminou.
  const done = [ready.fonts, !webgl || ready.engine, !webgl || ready.frame, true]
  const current = done[step]

  useEffect(() => {
    if (step >= STEPS.length) {
      const timer = window.setTimeout(() => setLeaving(true), 420)
      return () => window.clearTimeout(timer)
    }
    if (!current) return
    const timer = window.setTimeout(() => setStep((value) => value + 1), STEP_MS)
    return () => window.clearTimeout(timer)
  }, [step, current])

  useEffect(() => {
    if (!leaving) return
    const timer = window.setTimeout(setBooted, reducedMotion ? 0 : LEAVE_MS)
    return () => window.clearTimeout(timer)
  }, [leaving, reducedMotion, setBooted])

  const finished = step >= STEPS.length
  const countdown = finished ? 'T-0' : `T-${STEPS.length - step}`

  return (
    <div className={`boot${leaving ? ' is-leaving' : ''}`} role="status" aria-label={content.ui.boot.ariaLabel}>
      <div className="boot__inner">
        <p className="boot__kicker">{content.ui.boot.kicker}</p>
        <p className="boot__name">{content.profile.name}</p>
        <ul className="boot__tasks" aria-hidden="true">
          {STEPS.map((key, index) =>
            index <= step ? (
              <li key={key} className={index < step ? 'is-done' : ''}>
                <span className="boot__mark">{index < step ? '✓' : '›'}</span>
                {content.ui.boot.tasks[key]}
              </li>
            ) : null,
          )}
        </ul>
        <p className={`boot__status${finished ? ' is-go' : ''}`}>
          <span className="boot__count">{countdown}</span>
          {finished && <span>{content.ui.boot.done}</span>}
        </p>
      </div>
    </div>
  )
}

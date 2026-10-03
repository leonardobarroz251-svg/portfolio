import { useEffect, useRef } from 'react'
import { STAGES, telemetry, useContent, useStore } from '../store'

const pad = (value: number, size = 2) => String(value).padStart(size, '0')

export function StatusBar() {
  const content = useContent()
  const stage = useStore((state) => state.stage)
  const speed = useRef<HTMLSpanElement>(null)
  const clock = useRef<HTMLSpanElement>(null)
  const index = STAGES.indexOf(stage)
  const { statusBar, menu, controlsHint } = content.ui

  // Velocidade e relógio mudam a cada quadro: são escritos direto no DOM.
  useEffect(() => {
    const start = performance.now()
    let frame = 0
    let lastSecond = -1
    let lastSpeed = -1
    const tick = () => {
      const value = Math.round(telemetry.speed * 10)
      if (speed.current && value !== lastSpeed) {
        speed.current.textContent = pad(value, 4)
        lastSpeed = value
      }
      const seconds = Math.floor((performance.now() - start) / 1000)
      if (clock.current && seconds !== lastSecond) {
        clock.current.textContent = `T+${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`
        lastSecond = seconds
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <footer className="statusbar">
      <span className="statusbar__link">{statusBar.link}</span>
      <span>
        {statusBar.sector} {pad(index + 1)}/{pad(STAGES.length)}
      </span>
      <span className="statusbar__place">{menu[index].place}</span>
      <span className="statusbar__wide">
        {statusBar.speed} <span ref={speed}>0000</span>
      </span>
      <span className="statusbar__spacer" />
      <span className="statusbar__wide statusbar__hint">{controlsHint}</span>
      <span className="statusbar__wide">{statusBar.location} · 18.92°S 48.28°W</span>
      <span ref={clock}>T+00:00:00</span>
    </footer>
  )
}

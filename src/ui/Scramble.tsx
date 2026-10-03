import { useEffect, useState } from 'react'
import { useStore } from '../store'

const GLYPHS = 'ABCDEFGHJKLMNOPRSTUVXZ0123456789/+*'
const DURATION = 900

/** Revela o texto letra a letra, com caracteres sorteados no que ainda não chegou. */
export function Scramble({ text }: { text: string }) {
  const reducedMotion = useStore((state) => state.reducedMotion)
  const booted = useStore((state) => state.booted)
  const [shown, setShown] = useState(reducedMotion ? text : '')

  useEffect(() => {
    if (reducedMotion) {
      setShown(text)
      return
    }
    if (!booted) return
    const start = performance.now()
    let frame = 0
    const tick = () => {
      const progress = Math.min((performance.now() - start) / DURATION, 1)
      const settled = Math.floor(progress * text.length)
      setShown(
        text
          .split('')
          .map((char, i) =>
            i < settled || char === ' ' ? char : GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
          )
          .join(''),
      )
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [text, booted, reducedMotion])

  // O texto real fica invisível por baixo: guarda o tamanho e é o que leitores de tela leem.
  return (
    <span className="scramble">
      <span className="scramble__ghost">{text}</span>
      <span className="scramble__live" aria-hidden="true">
        {shown}
      </span>
    </span>
  )
}

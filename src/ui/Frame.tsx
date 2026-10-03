import { useContent, useStore, type Lang } from '../store'

const LANGS: Lang[] = ['pt', 'en']

export function Frame() {
  const content = useContent()
  const lang = useStore((state) => state.lang)
  const setLang = useStore((state) => state.setLang)
  const setStage = useStore((state) => state.setStage)

  return (
    <header className="frame">
      <button className="frame__id" onClick={() => setStage('inicio')} aria-label={content.ui.menu[0].label}>
        <svg className="frame__mark" viewBox="0 0 32 32" aria-hidden="true">
          <ellipse cx="16" cy="16" rx="14" ry="4.6" transform="rotate(-24 16 16)" />
          <circle cx="16" cy="16" r="6" />
        </svg>
        <span className="frame__name">{content.profile.name}</span>
        <span className="frame__role">{content.profile.title}</span>
      </button>
      <div className="lang" role="group" aria-label={content.ui.langLabel}>
        {LANGS.map((code) => (
          <button
            key={code}
            className={`lang__btn${code === lang ? ' is-active' : ''}`}
            aria-pressed={code === lang}
            onClick={() => setLang(code)}
          >
            {code}
          </button>
        ))}
      </div>
    </header>
  )
}

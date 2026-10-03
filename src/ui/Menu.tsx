import { useState } from 'react'
import { STAGES, useContent, useStore } from '../store'

const pad = (value: number) => String(value).padStart(2, '0')

export function Menu() {
  const content = useContent()
  const stage = useStore((state) => state.stage)
  const setStage = useStore((state) => state.setStage)
  const step = useStore((state) => state.step)
  const [open, setOpen] = useState(false)
  const index = STAGES.indexOf(stage)
  const { menu, mobileNav } = content.ui

  return (
    <nav className={`menu${open ? ' is-open' : ''}`} aria-label={content.ui.menuAriaLabel}>
      <p className="menu__header" aria-hidden="true">
        {content.ui.menuHeader}
      </p>
      <ul className="menu__list" id="menu-list">
        {menu.map((item, i) => (
          <li key={item.id}>
            <button
              className={`menu__item${item.id === stage ? ' is-active' : ''}`}
              aria-current={item.id === stage ? 'page' : undefined}
              onClick={() => {
                setStage(item.id)
                setOpen(false)
              }}
            >
              <span className="menu__index">{pad(i + 1)}</span>
              <span className="menu__rule" aria-hidden="true" />
              <span className="menu__label">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
      {/* No celular a lista vira uma barra com anterior, seção atual e próxima. */}
      <div className="menu__bar">
        <button className="menu__step" onClick={() => step(-1)} disabled={index === 0} aria-label={mobileNav.prev}>
          ←
        </button>
        <button
          className="menu__current"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="menu-list"
          aria-label={mobileNav.sections}
        >
          <span className="menu__count">
            {pad(index + 1)}/{pad(STAGES.length)}
          </span>
          {menu[index].label}
          <span className="menu__caret" aria-hidden="true">
            {open ? '▾' : '▴'}
          </span>
        </button>
        <button
          className="menu__step"
          onClick={() => step(1)}
          disabled={index === STAGES.length - 1}
          aria-label={mobileNav.next}
        >
          →
        </button>
      </div>
    </nav>
  )
}

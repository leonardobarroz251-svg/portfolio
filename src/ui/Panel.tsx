import { STAGES, useContent, useStore } from '../store'
import { Contact, Hero, Missions, Profile, Projects, Skills } from './Sections'

const SECTIONS = {
  inicio: Hero,
  perfil: Profile,
  habilidades: Skills,
  experiencia: Missions,
  projetos: Projects,
  contato: Contact,
}

export function Panel() {
  const content = useContent()
  const stage = useStore((state) => state.stage)
  const pull = useStore((state) => state.pull)
  const setStage = useStore((state) => state.setStage)
  const index = STAGES.indexOf(stage)
  const item = content.ui.menu[index]
  const Section = SECTIONS[stage]
  const neighbour = content.ui.menu[index + (pull < 0 ? -1 : 1)]

  return (
    <section className={`panel panel--${stage}`} aria-labelledby="panel-title">
      <div className="sheet">
        <div className="sheet__head">
          <span className="sheet__index">{String(index + 1).padStart(2, '0')}</span>
          <span className="sheet__rule" aria-hidden="true" />
          {stage !== 'inicio' && (
            <button className="sheet__back" onClick={() => setStage('inicio')}>
              <kbd>esc</kbd> {content.ui.back}
            </button>
          )}
        </div>
        <h1 className="panel__title" id="panel-title">
          {stage === 'inicio' ? content.profile.name : item.label}
        </h1>
        <div className="sheet__body" tabIndex={-1}>
          <Section />
        </div>
        <p
          className="panel__pull"
          style={{ '--pull': Math.min(Math.abs(pull), 1) } as React.CSSProperties}
          aria-hidden="true"
        >
          {neighbour && pull !== 0 && (
            <>
              {pull < 0 ? content.ui.edgeHintPrev : content.ui.edgeHint} <b>{neighbour.label}</b>
            </>
          )}
        </p>
      </div>
    </section>
  )
}

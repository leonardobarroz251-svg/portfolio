import { STAGES, useContent, useStore } from '../store'

/** Letreiro que cruza a cena a cada chegada, com o nome do lugar. */
export function CutIn() {
  const content = useContent()
  const stage = useStore((state) => state.stage)
  const index = STAGES.indexOf(stage)
  return (
    <div className="cutin" aria-hidden="true">
      <span className="cutin__index">{String(index + 1).padStart(2, '0')}</span>
      <span className="cutin__place">{content.ui.menu[index].place}</span>
    </div>
  )
}

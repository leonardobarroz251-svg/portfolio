import { lazy, Suspense, useEffect } from 'react'
import { useContent, useStore } from './store'
import { useNavigation } from './useNavigation'
import { BootScreen } from './ui/BootScreen'
import { CutIn } from './ui/CutIn'
import { Frame } from './ui/Frame'
import { Menu } from './ui/Menu'
import { Panel } from './ui/Panel'
import { StatusBar } from './ui/StatusBar'

// O three.js só é baixado depois que a abertura já está na tela.
const Scene = lazy(() => import('./scene/Scene'))

export default function App() {
  const stage = useStore((state) => state.stage)
  const lang = useStore((state) => state.lang)
  const booted = useStore((state) => state.booted)
  const webgl = useStore((state) => state.webgl)
  const content = useContent()
  useNavigation()

  useEffect(() => {
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en'
    document.title = `${content.profile.name} · ${content.profile.title}`
  }, [lang, content])

  return (
    <div className={`app stage--${stage}${booted ? ' is-live' : ''}${webgl ? '' : ' no-webgl'}`}>
      {webgl ? (
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      ) : (
        <div className="backdrop" aria-hidden="true" />
      )}
      <Frame />
      <main className="game">
        <Menu />
        <div className="game__gap">{booted && <CutIn key={stage} />}</div>
        <Panel key={stage} />
      </main>
      <StatusBar />
      {!booted && <BootScreen />}
    </div>
  )
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/unbounded/index.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-500.css'
import '@fontsource/ibm-plex-mono/latin-700.css'
import './styles.css'
import App from './App'
import { useStore } from './store'

// A abertura espera as duas famílias: sem isso o nome pisca na fonte reserva.
Promise.all([
  document.fonts.load('900 1em "Unbounded Variable"'),
  document.fonts.load('500 1em "IBM Plex Mono"'),
])
  .catch(() => undefined)
  .then(() => useStore.getState().markReady('fonts'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

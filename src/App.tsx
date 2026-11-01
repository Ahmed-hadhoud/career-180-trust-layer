import { useEffect, useState } from 'react'
import { Header } from './components/ui'
import { DemoPanel } from './components/DemoPanel'
import { VerifierPage } from './pages/VerifierPage'
import { EvidencePage } from './pages/EvidencePage'
import { LearnerPage } from './pages/LearnerPage'

type Route =
  | { name: 'verify' }
  | { name: 'evidence'; id: string }
  | { name: 'learner' }

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '')
  const [path, id] = hash.split('/')
  if (path === 'evidence' && id) return { name: 'evidence', id }
  if (path === 'learner') return { name: 'learner' }
  return { name: 'verify' }
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash)

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHash())
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    window.addEventListener('hashchange', onHashChange)
    if (!window.location.hash) window.location.hash = '#/verify'
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return (
    <div className="min-h-screen">
      <Header route={route.name} />
      <main>
        {route.name === 'verify' && <VerifierPage />}
        {route.name === 'evidence' && <EvidencePage certificateId={route.id} />}
        {route.name === 'learner' && <LearnerPage />}
      </main>
      <DemoPanel />
    </div>
  )
}

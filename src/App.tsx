import { ViewerCanvas } from './components/canvas/ViewerCanvas'
import { Overlay } from './components/overlay/Overlay'

export default function App() {
  return (
    <div className="relative h-dvh bg-neutral-950">
      <ViewerCanvas />
      <Overlay />
    </div>
  )
}

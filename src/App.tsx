import { ViewerCanvas } from './components/canvas/ViewerCanvas'
import { Overlay } from './components/overlay/Overlay'

export default function App() {
  return (
    <div className="relative h-dvh bg-neutral-950">
      <div className="absolute inset-0 z-0">
        <ViewerCanvas />
      </div>
      <Overlay />
    </div>
  )
}

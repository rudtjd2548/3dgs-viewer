import { OrbitControls } from '@react-three/drei'
import { useLoadStore } from '../../store/useLoadStore'
import { HoverPick } from './HoverPick'
import { SplatModel } from './SplatModel'

export function Scene() {
  const plyUrl = useLoadStore((s) => s.plyUrl)

  return (
    <>
      {plyUrl && <SplatModel url={plyUrl} />}
      <HoverPick />
      <OrbitControls makeDefault />
    </>
  )
}

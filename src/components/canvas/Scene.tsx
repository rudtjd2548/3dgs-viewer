import { OrbitControls } from '@react-three/drei'
import { DEFAULT_PLY_URL } from '../../lib/loadSplat'
import { SplatModel } from './SplatModel'

export function Scene() {
  return (
    <>
      <SplatModel url={DEFAULT_PLY_URL} />
      <OrbitControls makeDefault />
    </>
  )
}

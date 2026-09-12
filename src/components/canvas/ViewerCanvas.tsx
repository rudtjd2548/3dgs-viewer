import { Canvas, extend } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { ThreeToJSXElements } from '@react-three/fiber'
import * as THREE from 'three/webgpu'

declare module '@react-three/fiber' {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}

extend(THREE as never)

export function ViewerCanvas() {
  return (
    <Canvas
      className="h-full w-full"
      camera={{ position: [3, 2, 4], fov: 50 }}
      gl={async ({ canvas, antialias }) => {
        const renderer = new THREE.WebGPURenderer({
          canvas: canvas as HTMLCanvasElement,
          antialias,
          alpha: false,
        })
        await renderer.init()
        return renderer
      }}
    >
      <color attach="background" args={['#0a0a0a']} />
      <mesh>
        <boxGeometry />
        <meshBasicNodeMaterial color="#8a8a8a" />
      </mesh>
      <OrbitControls makeDefault />
    </Canvas>
  )
}

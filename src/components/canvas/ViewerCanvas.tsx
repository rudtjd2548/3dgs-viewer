import { Suspense } from "react";
import { Canvas, extend } from "@react-three/fiber";
import type { ThreeToJSXElements } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { Scene } from "./Scene";

declare module "@react-three/fiber" {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}

extend(THREE as never);

export function ViewerCanvas() {
  return (
    <Canvas
      className="h-full w-full"
      frameloop="demand"
      dpr={[1, 1]}
      camera={{ position: [3, 2, 4], fov: 50, near: 0.1, far: 10000 }}
      gl={async ({ canvas }) => {
        const renderer = new THREE.WebGPURenderer({
          canvas: canvas as HTMLCanvasElement,
          antialias: false,
          alpha: false,
        });
        await renderer.init();
        return renderer;
      }}
    >
      <color attach="background" args={["#0a0a0a"]} />
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  );
}

import { Suspense, useLayoutEffect } from "react";
import { Canvas, extend, useThree } from "@react-three/fiber";
import type { ThreeToJSXElements } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { Scene } from "./Scene";

declare module "@react-three/fiber" {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}

extend(THREE as never);

type RendererCaches = {
  backend?: { get: (o: object) => { descriptor?: unknown } | undefined };
  getCanvasTarget?: () => object;
  _canvasTarget?: object;
  _quadCache?: Map<unknown, { quad: { material: { dispose: () => void } } }>;
  _frameBufferTargets?: Map<unknown, { dispose: () => void }>;
};

function RecoverCanvasOnResize() {
  const gl = useThree((s) => s.gl);
  const w = useThree((s) => s.size.width);
  const h = useThree((s) => s.size.height);

  useLayoutEffect(() => {
    const r = gl as typeof gl & RendererCaches;
    const quads = r._quadCache;
    if (quads) {
      for (const { quad } of quads.values()) quad.material.dispose();
      quads.clear();
    }
    const fbos = r._frameBufferTargets;
    if (fbos) {
      for (const [key, rt] of fbos) {
        rt.dispose();
        fbos.delete(key);
      }
    }
    const target = r.getCanvasTarget?.() ?? r._canvasTarget;
    const data = target && r.backend?.get(target);
    if (data) data.descriptor = undefined;
  }, [gl, w, h]);

  return null;
}

export function ViewerCanvas() {
  return (
    <Canvas
      className="h-full w-full"
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
      <RecoverCanvasOnResize />
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  );
}

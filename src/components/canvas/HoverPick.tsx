import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { PerspectiveCamera, WebGPURenderer } from "three/webgpu";
import { Matrix4 } from "three/webgpu";
import { useMeasureStore } from "../../store/useMeasureStore";
import {
  createPickTarget,
  readPick,
  readPickColor,
  scenePickMRT,
  splatPickMRT,
  splatRef,
  unprojectView,
} from "./pick";
import type { GaussianSplat } from "three/addons/objects/GaussianSplat.js";

type Bag = {
  rt: ReturnType<typeof createPickTarget>;
  mrt: ReturnType<typeof scenePickMRT>;
  splatMrt: ReturnType<typeof splatPickMRT> | null;
  splat: GaussianSplat | null;
  cam: Matrix4;
  proj: Matrix4;
  busy: boolean;
};

function createBag(): Bag {
  return {
    rt: createPickTarget(),
    mrt: scenePickMRT(),
    splatMrt: null,
    splat: null,
    cam: new Matrix4(),
    proj: new Matrix4(),
    busy: false,
  };
}

export function HoverPick() {
  const gl = useThree((s) => s.gl) as unknown as WebGPURenderer;
  const scene = useThree((s) => s.scene);
  const size = useThree((s) => s.size);
  const ptr = useRef({ x: 0, y: 0, on: false, dirty: false });
  const bag = useRef<Bag | null>(null);

  useEffect(() => {
    const el = gl.domElement;
    const p = ptr.current;
    const move = (e: PointerEvent) => {
      p.x = e.offsetX;
      p.y = e.offsetY;
      p.on = true;
      p.dirty = true;
    };
    const leave = () => {
      p.on = false;
      p.dirty = false;
      useMeasureStore.getState().setHoverOn(false);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      bag.current?.rt.dispose();
      bag.current = null;
      gl.setScissorTest(false);
      gl.setMRT(null);
      gl.setRenderTarget(null);
      useMeasureStore.getState().setHoverOn(false);
    };
  }, [gl]);

  useFrame(({ camera }) => {
    const p = ptr.current;
    if (!p.on || !splatRef.current) return;

    const b = (bag.current ??= createBag());
    if (b.busy) return;

    const cam = camera as PerspectiveCamera;
    const w = size.width | 0;
    const h = size.height | 0;
    if (w < 1 || h < 1) return;

    const resized = b.rt.width !== w || b.rt.height !== h;
    if (resized) {
      b.rt.setSize(w, h);
      return;
    }

    const stale =
      p.dirty ||
      !b.cam.equals(cam.matrixWorld) ||
      !b.proj.equals(cam.projectionMatrix);
    if (!stale) return;

    p.dirty = false;
    b.cam.copy(cam.matrixWorld);
    b.proj.copy(cam.projectionMatrix);

    const splat = splatRef.current;
    const mat = splat.material;
    if (b.splat !== splat) {
      b.splat = splat;
      b.splatMrt = splatPickMRT(mat);
    }

    const x = Math.min(w - 1, Math.max(0, p.x | 0));
    const y = Math.min(h - 1, Math.max(0, p.y | 0));
    // splat 크기는 cameraViewport(=RT 크기)에 묶임. 해상도는 유지하고 커서 1px만 scissor
    b.rt.scissor.set(x, y, 1, 1);

    try {
      mat.mrtNode = b.splatMrt;
      gl.setMRT(b.mrt);
      gl.setRenderTarget(b.rt);
      gl.setScissorTest(true);
      gl.render(scene, cam);
    } finally {
      gl.setScissorTest(false);
      gl.setMRT(null);
      gl.setRenderTarget(null);
      mat.mrtNode = null;
    }

    b.busy = true;
    void Promise.all([
      gl.readRenderTargetPixelsAsync(b.rt, x, y, 1, 1, 0),
      gl.readRenderTargetPixelsAsync(b.rt, x, y, 1, 1, 1),
    ]).then(([depth, color]) => {
      b.busy = false;
      const { hover, hoverColor, setHoverOn } = useMeasureStore.getState();
      const viewZ = readPick(depth);
      const rgb = readPickColor(color);
      if (viewZ === null || rgb === null || !ptr.current.on) {
        setHoverOn(false);
        return;
      }
      hover.copy(unprojectView(cam, (x / w) * 2 - 1, 1 - (y / h) * 2, viewZ));
      hoverColor.setRGB(...rgb);
      setHoverOn(true);
    });
  });

  return null;
}

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group, PerspectiveCamera, WebGPURenderer } from "three/webgpu";
import { Matrix4 } from "three/webgpu";
import { usePickStore } from "../../store/usePickStore";
import {
  createPickTarget,
  readPick,
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
  const hoverOn = usePickStore((s) => s.hoverOn);

  useEffect(() => {
    const el = gl.domElement;
    const p = ptr.current;
    const CLICK = 5;
    let down: { x: number; y: number } | null = null;

    const move = (e: PointerEvent) => {
      p.x = e.offsetX;
      p.y = e.offsetY;
      p.on = true;
      p.dirty = true;
    };
    const leave = () => {
      down = null;
      p.on = false;
      p.dirty = false;
      usePickStore.getState().setHoverOn(false);
    };
    const pointerdown = (e: PointerEvent) => {
      if (e.button === 0) down = { x: e.offsetX, y: e.offsetY };
    };
    const pointerup = (e: PointerEvent) => {
      if (!down || e.button !== 0) return;
      const dx = e.offsetX - down.x;
      const dy = e.offsetY - down.y;
      down = null;
      if (dx * dx + dy * dy > CLICK * CLICK) return;
      const { hoverOn, hover, addPoint } = usePickStore.getState();
      if (hoverOn) addPoint(hover);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointerdown", pointerdown);
    el.addEventListener("pointerup", pointerup);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("pointerdown", pointerdown);
      el.removeEventListener("pointerup", pointerup);
      bag.current?.rt.dispose();
      bag.current = null;
      gl.setScissorTest(false);
      gl.setMRT(null);
      gl.setRenderTarget(null);
      usePickStore.getState().setHoverOn(false);
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
    const stale =
      p.dirty || resized || !b.cam.equals(cam.matrixWorld) || !b.proj.equals(cam.projectionMatrix);
    if (!stale) return;

    p.dirty = false;
    b.cam.copy(cam.matrixWorld);
    b.proj.copy(cam.projectionMatrix);
    if (resized) b.rt.setSize(w, h);

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
    void gl.readRenderTargetPixelsAsync(b.rt, x, y, 1, 1).then((texel) => {
      b.busy = false;
      const { hover, setHoverOn } = usePickStore.getState();
      const viewZ = readPick(texel);
      if (viewZ === null || !ptr.current.on) {
        setHoverOn(false);
        return;
      }
      hover.copy(unprojectView(cam, (x / w) * 2 - 1, 1 - (y / h) * 2, viewZ));
      setHoverOn(true);
    });
  });

  return (
    <>
      {hoverOn && <HoverDot />}
      <Pins />
    </>
  );
}

function Pins() {
  const points = usePickStore((s) => s.points);
  return points.map((p, i) => (
    <Html key={i} position={p} center sprite style={{ pointerEvents: "none" }}>
      <div className="size-2.5 rounded-full bg-white shadow-[0_0_0_2px_#052]" />
    </Html>
  ));
}

function HoverDot() {
  const obj = useRef<Group>(null);

  useFrame(() => {
    obj.current?.position.copy(usePickStore.getState().hover);
  });

  return (
    <group
      ref={(g) => {
        obj.current = g;
        if (g) g.position.copy(usePickStore.getState().hover);
      }}
    >
      <Html center sprite style={{ pointerEvents: "none" }}>
        <div className="size-3 rounded-full bg-[#22ff88] shadow-[0_0_0_2px_#052]" />
      </Html>
    </group>
  );
}

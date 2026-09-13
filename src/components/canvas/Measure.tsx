import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { BufferGeometry } from "three/webgpu";
import type { Group, Vector3 } from "three/webgpu";
import { usePickStore } from "../../store/usePickStore";

/** 월드 단위 → m. 실측 보정 전 1:1 */
const WORLD_TO_METER = 1;
const CLICK = 5;

export function Measure() {
  const gl = useThree((s) => s.gl);
  const hoverOn = usePickStore((s) => s.hoverOn);
  const draft = usePickStore((s) => s.draft);
  const sessions = usePickStore((s) => s.sessions);

  useEffect(() => {
    const el = gl.domElement;
    let down: { x: number; y: number } | null = null;

    const pointerdown = (e: PointerEvent) => {
      if (e.button === 0) down = { x: e.offsetX, y: e.offsetY };
    };
    const pointerup = (e: PointerEvent) => {
      if (!down || e.button !== 0) return;
      const dx = e.offsetX - down.x;
      const dy = e.offsetY - down.y;
      down = null;
      if (dx * dx + dy * dy > CLICK * CLICK) return;
      const { hoverOn: on, hover, addPoint } = usePickStore.getState();
      if (on) addPoint(hover);
    };
    const leave = () => {
      down = null;
    };
    el.addEventListener("pointerdown", pointerdown);
    el.addEventListener("pointerup", pointerup);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointerdown", pointerdown);
      el.removeEventListener("pointerup", pointerup);
      el.removeEventListener("pointerleave", leave);
    };
  }, [gl]);

  const paths = [...sessions, draft];

  return (
    <>
      {hoverOn && <HoverDot />}
      {paths.map((pts, si) => (
        <group key={si}>
          {pts.map((p, i) => (
            <Html key={i} position={p} center sprite style={{ pointerEvents: "none" }}>
              <div className="size-2.5 rounded-full bg-white shadow-[0_0_0_2px_#052]" />
            </Html>
          ))}
          {pts.slice(1).map((b, i) => (
            <Segment key={i} a={pts[i]!} b={b} />
          ))}
        </group>
      ))}
    </>
  );
}

function Segment({ a, b }: { a: Vector3; b: Vector3 }) {
  const geom = useMemo(() => new BufferGeometry().setFromPoints([a, b]), [a, b]);
  useEffect(() => () => geom.dispose(), [geom]);

  return (
    <>
      <line geometry={geom}>
        <lineBasicMaterial color="#fff" depthTest={false} />
      </line>
      <Html
        center
        sprite
        position={[(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2]}
        style={{ pointerEvents: "none" }}
      >
        <div className="rounded bg-[#052]/80 px-1.5 py-0.5 text-[11px] text-white tabular-nums">
          {(a.distanceTo(b) * WORLD_TO_METER).toFixed(2)}m
        </div>
      </Html>
    </>
  );
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

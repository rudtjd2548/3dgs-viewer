import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Line2NodeMaterial } from "three/webgpu";
import type { Group, Vector3 } from "three/webgpu";
import { Line2 } from "three/addons/lines/webgpu/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { useMeasureStore } from "../../store/useMeasureStore";

/** 월드 단위 → m. 실측 보정 전 1:1 */
const WORLD_TO_METER = 1;
const CLICK = 5;

const LINE_WIDTH = 2;
const LINE_COLOR = "#fff";
const GHOST_COLOR = "#22ff88";
const GHOST_OPACITY = 0.45;

export function MeasureTool() {
  const gl = useThree((s) => s.gl);
  const hoverOn = useMeasureStore((s) => s.hoverOn);
  const draft = useMeasureStore((s) => s.draft);

  useEffect(() => {
    const el = gl.domElement;
    el.style.cursor = "crosshair";
    let down: { x: number; y: number; button: number } | null = null;
    let dragged = false;

    const pointerdown = (e: PointerEvent) => {
      if (e.button === 0 || e.button === 2)
        down = { x: e.offsetX, y: e.offsetY, button: e.button };
    };
    const pointerup = (e: PointerEvent) => {
      if (!down || e.button !== down.button) return;
      const dx = e.offsetX - down.x;
      const dy = e.offsetY - down.y;
      dragged = dx * dx + dy * dy > CLICK * CLICK;
      down = null;
      if (e.button === 2 && !dragged) useMeasureStore.getState().undo();
    };
    const onClick = (e: MouseEvent) => {
      if (e.ctrlKey || e.detail > 1 || dragged) return;
      const { hoverOn: on, hover, addPoint } = useMeasureStore.getState();
      if (on) addPoint(hover);
    };
    const leave = () => {
      down = null;
    };
    const onContext = (e: MouseEvent) => {
      e.preventDefault();
    };
    const onDblClick = () => {
      useMeasureStore.getState().commit();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") useMeasureStore.getState().commit();
      else if (e.key === "Escape") useMeasureStore.getState().cancel();
    };
    el.addEventListener("pointerdown", pointerdown);
    el.addEventListener("pointerup", pointerup);
    el.addEventListener("click", onClick);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("contextmenu", onContext);
    el.addEventListener("dblclick", onDblClick);
    window.addEventListener("keydown", onKey);
    return () => {
      el.style.cursor = "";
      el.removeEventListener("pointerdown", pointerdown);
      el.removeEventListener("pointerup", pointerup);
      el.removeEventListener("click", onClick);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("contextmenu", onContext);
      el.removeEventListener("dblclick", onDblClick);
      window.removeEventListener("keydown", onKey);
      useMeasureStore.getState().cancel();
    };
  }, [gl]);

  return (
    <>
      {hoverOn && <HoverDot />}
      {hoverOn && draft.length > 0 && <Ghost />}
      <Path pts={draft} />
    </>
  );
}

export function Measurements() {
  const measurements = useMeasureStore((s) => s.measurements);
  return measurements.map((pts, i) => <Path key={i} pts={pts} />);
}

function Path({ pts }: { pts: Vector3[] }) {
  return (
    <group>
      {pts.map((p, i) => (
        <Html
          key={i}
          position={p}
          center
          sprite
          style={{ pointerEvents: "none" }}
        >
          <div className="size-2.5 rounded-full bg-white shadow-[0_0_0_2px_#052]" />
        </Html>
      ))}
      {pts.slice(1).map((b, i) => (
        <Segment key={i} a={pts[i]!} b={b} />
      ))}
    </group>
  );
}

function createFatLine(color: string, opacity = 1) {
  const geometry = new LineGeometry();
  geometry.setPositions([0, 0, 0, 0, 0, 0.001]);
  const material = new Line2NodeMaterial({
    color,
    linewidth: LINE_WIDTH,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    opacity,
  });
  const line = new Line2(geometry, material);
  line.frustumCulled = false;
  line.renderOrder = 10;
  return line;
}

function setSeg(geom: LineGeometry, a: Vector3, b: Vector3) {
  geom.attributes.instanceStart.setXYZ(0, a.x, a.y, a.z);
  geom.attributes.instanceEnd.setXYZ(0, b.x, b.y, b.z);
  geom.attributes.instanceStart.needsUpdate = true;
}

function Segment({ a, b }: { a: Vector3; b: Vector3 }) {
  const line = useMemo(() => createFatLine(LINE_COLOR), []);
  useEffect(
    () => () => {
      line.geometry.dispose();
      line.material.dispose();
    },
    [line],
  );
  useLayoutEffect(() => setSeg(line.geometry, a, b), [a, b, line]);

  return (
    <>
      <primitive object={line} />
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

function Ghost() {
  const label = useRef<Group>(null);
  const text = useRef<HTMLDivElement>(null);
  const line = useMemo(() => createFatLine(GHOST_COLOR, GHOST_OPACITY), []);

  useEffect(
    () => () => {
      line.geometry.dispose();
      line.material.dispose();
    },
    [line],
  );

  useFrame(() => {
    const { draft, hover } = useMeasureStore.getState();
    const a = draft[draft.length - 1];
    if (!a) return;
    setSeg(line.geometry, a, hover);
    label.current?.position.set(
      (a.x + hover.x) / 2,
      (a.y + hover.y) / 2,
      (a.z + hover.z) / 2,
    );
    if (text.current)
      text.current.textContent = `${(a.distanceTo(hover) * WORLD_TO_METER).toFixed(2)}m`;
  });

  return (
    <>
      <primitive object={line} />
      <group ref={label}>
        <Html center sprite style={{ pointerEvents: "none" }}>
          <div
            ref={text}
            className="rounded bg-[#052]/50 px-1.5 py-0.5 text-[11px] text-[#22ff88] tabular-nums"
          />
        </Html>
      </group>
    </>
  );
}

function HoverDot() {
  const obj = useRef<Group>(null);
  const ring = useRef<SVGSVGElement>(null);

  useFrame(() => {
    const { hover, hoverColor } = useMeasureStore.getState();
    obj.current?.position.copy(hover);
    if (ring.current)
      ring.current.style.color = `#${hoverColor.getHexString()}`;
  });

  return (
    <group
      ref={(g) => {
        obj.current = g;
        if (g) g.position.copy(useMeasureStore.getState().hover);
      }}
    >
      <Html center sprite style={{ pointerEvents: "none" }}>
        <svg
          ref={ring}
          width="32"
          height="32"
          viewBox="0 0 32 32"
          className="text-white"
        >
          <circle
            cx="16"
            cy="16"
            r="10"
            fill="none"
            stroke="#052"
            strokeWidth="5"
          />
          <circle
            cx="16"
            cy="16"
            r="10"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M16 8v3.5M24 16h-3.5M16 24v-3.5M8 16h3.5"
            fill="none"
            stroke="#fff"
            strokeWidth="1.25"
          />
        </svg>
      </Html>
    </group>
  );
}

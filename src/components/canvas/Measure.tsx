import { useEffect, useLayoutEffect, useMemo, useRef, type Ref } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Line2NodeMaterial,
  Vector3,
} from "three/webgpu";
import type { Camera, Group } from "three/webgpu";
import { Line2 } from "three/addons/lines/webgpu/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { isClosed, useMeasureStore } from "../../store/useMeasureStore";

/** 월드 단위 → m. 실측 보정 전 1:1 */
const WORLD_TO_METER = 1;
const CLICK = 5;
const CLOSE_PX = 16;

const LINE_WIDTH = 2;
const LINE_COLOR = "#fff";
const GHOST_COLOR = "#22ff88";
const GHOST_OPACITY = 0.45;
const FIRST =
  "size-3 rounded-full bg-white transition-transform shadow-[0_0_0_2px_#22ff88]";
const FIRST_HOT =
  "size-3.5 scale-125 rounded-full bg-white transition-transform shadow-[0_0_0_3px_#22ff88]";
const HTML_Z = [10, 1] as [number, number];

const ptr = { x: 0, y: 0, on: false };
const _ndc = new Vector3();
const _n = new Vector3();
const _u = new Vector3();
const _v = new Vector3();

function screenDist(
  camera: Camera,
  w: number,
  h: number,
  p: Vector3,
  x: number,
  y: number,
) {
  _ndc.copy(p).project(camera);
  return Math.hypot(
    x - (_ndc.x * 0.5 + 0.5) * w,
    y - (-_ndc.y * 0.5 + 0.5) * h,
  );
}

function nearFirst(camera: Camera, w: number, h: number, draft: Vector3[]) {
  return (
    ptr.on &&
    draft.length >= 3 &&
    screenDist(camera, w, h, draft[0]!, ptr.x, ptr.y) < CLOSE_PX
  );
}

function setCursor(el: HTMLElement, cursor: string) {
  el.style.cursor = cursor;
  document.body.style.cursor = cursor;
}

function areaOf(pts: Vector3[]) {
  const n = pts.length;
  if (n < 3) return null;
  _n.set(0, 0, 0);
  for (let i = 0; i < n; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % n]!;
    _n.x += (a.y - b.y) * (a.z + b.z);
    _n.y += (a.z - b.z) * (a.x + b.x);
    _n.z += (a.x - b.x) * (a.y + b.y);
  }
  if (_n.lengthSq() < 1e-20) return null;
  _n.normalize();
  _u.set(+(Math.abs(_n.x) < 0.9), +(Math.abs(_n.x) >= 0.9), 0)
    .cross(_n)
    .normalize();
  _v.copy(_n).cross(_u);
  let twice = 0;
  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % n]!;
    twice += a.dot(_u) * b.dot(_v) - b.dot(_u) * a.dot(_v);
    cx += a.x;
    cy += a.y;
    cz += a.z;
  }
  const pos = new Float32Array((n - 2) * 9);
  for (let i = 0; i < n - 2; i++) {
    const a = pts[0]!;
    const b = pts[i + 1]!;
    const c = pts[i + 2]!;
    pos.set([a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z], i * 9);
  }
  return {
    pos,
    area: Math.abs(twice) * 0.5 * WORLD_TO_METER * WORLD_TO_METER,
    center: [cx / n, cy / n, cz / n] as const,
  };
}

export function MeasureTool() {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const hoverOn = useMeasureStore((s) => s.hoverOn);
  const draft = useMeasureStore((s) => s.draft);
  const first = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = gl.domElement;
    setCursor(el, "crosshair");
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
    const move = (e: PointerEvent) => {
      ptr.x = e.offsetX;
      ptr.y = e.offsetY;
      ptr.on = true;
    };
    const onClick = (e: MouseEvent) => {
      if (e.ctrlKey || e.detail > 1 || dragged) return;
      const { draft: d, hoverOn: on, hover, addPoint, close } =
        useMeasureStore.getState();
      if (
        d.length >= 3 &&
        screenDist(
          camera,
          el.clientWidth,
          el.clientHeight,
          d[0]!,
          e.offsetX,
          e.offsetY,
        ) < CLOSE_PX
      ) {
        close();
        return;
      }
      if (on) addPoint(hover);
    };
    const leave = () => {
      down = null;
      ptr.on = false;
      setCursor(el, "crosshair");
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
    el.addEventListener("pointermove", move);
    el.addEventListener("click", onClick);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("contextmenu", onContext);
    el.addEventListener("dblclick", onDblClick);
    window.addEventListener("keydown", onKey);
    return () => {
      setCursor(el, "");
      el.removeEventListener("pointerdown", pointerdown);
      el.removeEventListener("pointerup", pointerup);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("click", onClick);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("contextmenu", onContext);
      el.removeEventListener("dblclick", onDblClick);
      window.removeEventListener("keydown", onKey);
      useMeasureStore.getState().cancel();
    };
  }, [gl, camera]);

  useFrame(() => {
    const el = gl.domElement;
    const near = nearFirst(
      camera,
      el.clientWidth,
      el.clientHeight,
      useMeasureStore.getState().draft,
    );
    setCursor(el, near ? "pointer" : "crosshair");
    const dot = first.current;
    if (dot) {
      const cls = near ? FIRST_HOT : FIRST;
      if (dot.className !== cls) dot.className = cls;
    }
  });

  return (
    <>
      {hoverOn && <HoverDot />}
      {draft.length > 0 && <Ghost />}
      <Path pts={draft} closable={draft.length >= 3} firstRef={first} />
    </>
  );
}

export function Measurements() {
  const measurements = useMeasureStore((s) => s.measurements);
  return measurements.map((pts, i) => <Path key={i} pts={pts} />);
}

function Path({
  pts,
  closable = false,
  firstRef,
}: {
  pts: Vector3[];
  closable?: boolean;
  firstRef?: Ref<HTMLDivElement>;
}) {
  const closed = isClosed(pts);
  const ring = closed ? pts.slice(0, -1) : pts;
  const segs = closed
    ? ring.map((a, i) => [a, ring[(i + 1) % ring.length]!] as const)
    : ring.slice(1).map((b, i) => [ring[i]!, b] as const);

  return (
    <group>
      {ring.map((p, i) => (
        <Html
          key={i}
          position={p}
          center
          sprite
          zIndexRange={HTML_Z}
          style={{ pointerEvents: "none" }}
        >
          <div
            ref={i === 0 && closable ? firstRef : undefined}
            className={
              i === 0 && closable
                ? FIRST
                : "size-2.5 rounded-full bg-white shadow-[0_0_0_2px_#052]"
            }
          />
        </Html>
      ))}
      {segs.map(([a, b], i) => (
        <Segment key={i} a={a} b={b} />
      ))}
      {closed && <AreaFill pts={pts} />}
    </group>
  );
}

function AreaFill({ pts }: { pts: Vector3[] }) {
  const data = useMemo(
    () => areaOf(isClosed(pts) ? pts.slice(0, -1) : pts),
    [pts],
  );
  const geom = useMemo(() => {
    if (!data) return null;
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(data.pos, 3));
    return g;
  }, [data]);

  useEffect(
    () => () => {
      geom?.dispose();
    },
    [geom],
  );

  if (!data || !geom) return null;

  return (
    <>
      <mesh geometry={geom} frustumCulled={false} renderOrder={9}>
        <meshBasicNodeMaterial
          color="#22ff88"
          transparent
          opacity={0.45}
          depthTest={false}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <Html
        position={data.center}
        center
        sprite
        zIndexRange={HTML_Z}
        style={{ pointerEvents: "none" }}
      >
        <div className="rounded bg-[#320]/85 px-1.5 py-0.5 text-[11px] text-[#fc8] tabular-nums">
          {data.area.toFixed(2)}m²
        </div>
      </Html>
    </>
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
        zIndexRange={HTML_Z}
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
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
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
    const { draft, hover, hoverOn } = useMeasureStore.getState();
    const a = draft[draft.length - 1];
    if (!a) return;
    const el = gl.domElement;
    const near = nearFirst(camera, el.clientWidth, el.clientHeight, draft);
    if (!near && !hoverOn) {
      line.visible = false;
      if (label.current) label.current.visible = false;
      return;
    }
    const b = near ? draft[0]! : hover;
    line.visible = true;
    if (label.current) label.current.visible = true;
    setSeg(line.geometry, a, b);
    label.current?.position.set(
      (a.x + b.x) / 2,
      (a.y + b.y) / 2,
      (a.z + b.z) / 2,
    );
    if (text.current)
      text.current.textContent = `${(a.distanceTo(b) * WORLD_TO_METER).toFixed(2)}m`;
  });

  return (
    <>
      <primitive object={line} />
      <group ref={label}>
        <Html
          center
          sprite
          zIndexRange={HTML_Z}
          style={{ pointerEvents: "none" }}
        >
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
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const obj = useRef<Group>(null);
  const ring = useRef<SVGSVGElement>(null);

  useFrame(() => {
    const { hover, hoverColor, draft } = useMeasureStore.getState();
    const near = nearFirst(
      camera,
      gl.domElement.clientWidth,
      gl.domElement.clientHeight,
      draft,
    );
    obj.current?.position.copy(hover);
    if (ring.current) {
      ring.current.style.display = near ? "none" : "";
      ring.current.style.color = `#${hoverColor.getHexString()}`;
    }
  });

  return (
    <group
      ref={(g) => {
        obj.current = g;
        if (g) g.position.copy(useMeasureStore.getState().hover);
      }}
    >
      <Html
        center
        sprite
        zIndexRange={HTML_Z}
        style={{ pointerEvents: "none" }}
      >
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

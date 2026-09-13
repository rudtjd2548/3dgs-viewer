import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Line2NodeMaterial } from "three/webgpu";
import type { Group } from "three/webgpu";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Line2 } from "three/addons/lines/webgpu/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { useMeasureStore } from "../../store/useMeasureStore";
import { useToolStore } from "../../store/useToolStore";

const CLICK = 5;

function axisLine(color: string, axis: 0 | 1 | 2) {
  const a = [0, 0, 0];
  const b = [0, 0, 0];
  a[axis] = -1;
  b[axis] = 1;
  const geometry = new LineGeometry();
  geometry.setPositions([...a, ...b]);
  const material = new Line2NodeMaterial({
    color,
    linewidth: 2,
    dashed: true,
    dashSize: 0.001,
    gapSize: 0.001,
    depthTest: false,
    depthWrite: false,
    transparent: true,
  });
  const line = new Line2(geometry, material);
  line.computeLineDistances();
  line.frustumCulled = false;
  line.renderOrder = 10;
  return line;
}

export function OrbitPivot() {
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as OrbitControls | null;
  const showAxes = useToolStore((s) => s.showAxes);
  const focusGen = useMeasureStore((s) => s.focusGen);
  const group = useRef<Group>(null);
  const axes = useMemo(
    () => [
      axisLine("#ff3355", 0),
      axisLine("#22cc66", 1),
      axisLine("#3388ff", 2),
    ],
    [],
  );

  useEffect(
    () => () => {
      for (const line of axes) {
        line.geometry.dispose();
        line.material.dispose();
      }
    },
    [axes],
  );

  useFrame(({ camera }) => {
    const g = group.current;
    if (!g || !controls) return;
    g.position.copy(controls.target);
    g.scale.setScalar(camera.position.distanceTo(controls.target) * 4);
  });

  useEffect(() => {
    if (!focusGen || !controls) return;
    controls.target.copy(useMeasureStore.getState().focus);
    controls.update();
  }, [focusGen, controls]);

  useEffect(() => {
    const el = gl.domElement;
    let down: { x: number; y: number } | null = null;
    const pointerdown = (e: PointerEvent) => {
      if (e.button === 0 && e.ctrlKey) down = { x: e.offsetX, y: e.offsetY };
    };
    const pointerup = (e: PointerEvent) => {
      if (!down || e.button !== 0) return;
      const dx = e.offsetX - down.x;
      const dy = e.offsetY - down.y;
      down = null;
      if (dx * dx + dy * dy > CLICK * CLICK) return;
      const { hoverOn, hover } = useMeasureStore.getState();
      if (!hoverOn || !controls) return;
      controls.target.copy(hover);
      controls.update();
    };
    el.addEventListener("pointerdown", pointerdown);
    el.addEventListener("pointerup", pointerup);
    return () => {
      el.removeEventListener("pointerdown", pointerdown);
      el.removeEventListener("pointerup", pointerup);
    };
  }, [gl, controls]);

  if (!showAxes) return null;

  return (
    <group
      ref={(g) => {
        group.current = g;
        if (g && controls) g.position.copy(controls.target);
      }}
    >
      {axes.map((line) => (
        <primitive key={line.uuid} object={line} />
      ))}
    </group>
  );
}

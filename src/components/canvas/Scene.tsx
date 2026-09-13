import { OrbitControls } from "@react-three/drei";
import { useLoadStore } from "../../store/useLoadStore";
import { useToolStore } from "../../store/useToolStore";
import { HoverPick } from "./HoverPick";
import { Measurements, MeasureTool } from "./Measure";
import { OrbitPivot } from "./OrbitPivot";
import { SplatModel } from "./SplatModel";

export function Scene() {
  const plyUrl = useLoadStore((s) => s.plyUrl);
  const measuring = useToolStore((s) => s.tool === "distance");
  const showMeasurements = useToolStore((s) => s.showMeasurements);

  return (
    <>
      {plyUrl && <SplatModel url={plyUrl} />}
      <HoverPick />
      {measuring && <MeasureTool />}
      {showMeasurements && <Measurements />}
      <OrbitPivot />
      <OrbitControls makeDefault />
    </>
  );
}

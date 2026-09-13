import { Axis3d, CircleHelp, Eye, EyeOff, Ruler } from "lucide-react";
import { useToolStore } from "../../store/useToolStore";

const btn = (on: boolean) =>
  `grid size-10 cursor-pointer place-items-center rounded-lg transition ${
    on
      ? "bg-white text-neutral-900"
      : "bg-neutral-900/80 text-neutral-400 hover:text-white"
  }`;

export function Toolbar() {
  const {
    tool,
    showAxes,
    showMeasurements,
    showGuide,
    setTool,
    toggleAxes,
    toggleMeasurements,
    toggleGuide,
  } = useToolStore();
  const measuring = tool === "distance";

  return (
    <div className="pointer-events-auto absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-xl border border-white/10 bg-neutral-950/70 p-1.5 backdrop-blur">
      <button
        type="button"
        className={btn(showAxes)}
        title="XYZ 축 / 궤도 중심"
        onClick={(e) => {
          e.currentTarget.blur();
          toggleAxes();
        }}
      >
        <Axis3d size={18} />
      </button>
      <button
        type="button"
        className={btn(measuring)}
        title="거리 측정"
        onClick={(e) => {
          e.currentTarget.blur();
          setTool(measuring ? "none" : "distance");
        }}
      >
        <Ruler size={18} />
      </button>
      <button
        type="button"
        className={btn(showMeasurements)}
        title="측정 표시/숨김"
        onClick={(e) => {
          e.currentTarget.blur();
          toggleMeasurements();
        }}
      >
        {showMeasurements ? <Eye size={18} /> : <EyeOff size={18} />}
      </button>
      <button
        type="button"
        className={btn(showGuide)}
        title="조작 가이드"
        onClick={(e) => {
          e.currentTarget.blur();
          toggleGuide();
        }}
      >
        <CircleHelp size={18} />
      </button>
    </div>
  );
}

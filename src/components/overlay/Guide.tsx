import type { ReactNode } from "react";
import { useToolStore } from "../../store/useToolStore";

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-neutral-500 px-1.5 py-px font-sans text-[11px] text-neutral-200">
      {children}
    </kbd>
  );
}

const ROWS: { key: ReactNode; desc: string }[] = [
  { key: "좌클릭", desc: "점 선택" },
  { key: "첫 점 클릭", desc: "면적 확정 (3점+)" },
  { key: <>더블클릭 / <Kbd>Enter</Kbd></>, desc: "측정 종료" },
  { key: "우클릭", desc: "직전 점 취소" },
  { key: <Kbd>Esc</Kbd>, desc: "측정 취소" },
  { key: <><Kbd>Ctrl</Kbd> + 좌클릭</>, desc: "궤도 중심 이동" },
  { key: "좌드래그", desc: "회전" },
  { key: "우드래그", desc: "이동" },
  { key: "휠", desc: "줌" },
];

export function Guide() {
  const show = useToolStore((s) => s.showGuide);
  if (!show) return null;

  return (
    <div className="pointer-events-none absolute top-1/2 right-6 -translate-y-1/2 rounded-xl border border-white/10 bg-neutral-900/75 px-5 py-4 backdrop-blur-sm">
      <ul className="grid grid-cols-[auto_auto] gap-x-8 gap-y-2.5">
        {ROWS.map((row, i) => (
          <li key={i} className="col-span-2 grid grid-cols-subgrid items-center">
            <span className="flex items-center gap-1 text-xs leading-5 text-neutral-400">
              {row.key}
            </span>
            <span className="text-sm leading-5 text-neutral-100">{row.desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

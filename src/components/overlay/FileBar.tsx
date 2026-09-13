import { FolderInput } from "lucide-react";
import { useLoadStore } from "../../store/useLoadStore";

export function FileBar({ onFile }: { onFile: (file: File) => void }) {
  const fileName = useLoadStore((s) => s.fileName);

  return (
    <div className="pointer-events-auto grid h-9 cursor-default grid-cols-[minmax(0,1fr)_2.25rem] items-center rounded-xl border border-white/10 bg-neutral-950/70 backdrop-blur">
      <span
        className="truncate px-3 text-xs text-neutral-200"
        title={fileName ?? undefined}
      >
        {fileName}
      </span>
      <label
        className="grid size-9 cursor-pointer place-items-center text-neutral-400 hover:text-white"
        title="PLY 교체"
      >
        <FolderInput size={16} />
        <input
          type="file"
          accept=".ply"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

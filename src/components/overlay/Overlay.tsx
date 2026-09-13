import { useSplatLoader } from "../../hooks/useSplatLoader";
import { useLoadStore } from "../../store/useLoadStore";
import { FilePicker } from "./FilePicker";
import { FileBar } from "./FileBar";
import { SessionList } from "./SessionList";
import { LoadingDonut } from "./LoadingDonut";
import { Guide } from "./Guide";
import { Toolbar } from "./Toolbar";

export function Overlay() {
  const { openFile, checked } = useSplatLoader();
  const plyUrl = useLoadStore((s) => s.plyUrl);
  const progress = useLoadStore((s) => s.progress);
  const error = useLoadStore((s) => s.error);
  const ready = useLoadStore((s) => s.ready);

  if (ready) {
    return (
      <div className="pointer-events-none absolute inset-0 z-20">
        <div className="absolute top-4 left-4 flex w-64 flex-col gap-2">
          <FileBar onFile={openFile} />
          <SessionList />
        </div>
        <Guide />
        <Toolbar />
      </div>
    );
  }

  if (!checked && !plyUrl) return null;

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-neutral-950/80">
      {error || !plyUrl ? (
        <>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <FilePicker onFile={openFile} />
        </>
      ) : (
        <LoadingDonut progress={progress} />
      )}
    </div>
  );
}

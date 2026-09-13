import { useEffect, useRef, useState } from "react";
import { Locate, Pentagon, Spline, Trash2 } from "lucide-react";
import {
  isClosed,
  sessionMetric,
  useMeasureStore,
  type MeasureSession,
} from "../../store/useMeasureStore";

const NAME = "h-5 w-full min-w-0 border-b text-sm leading-5 text-neutral-100";

export function SessionList() {
  const sessions = useMeasureStore((s) => s.sessions);
  if (!sessions.length) return null;

  return (
    <div className="pointer-events-auto flex max-h-128 cursor-default flex-col overflow-hidden rounded-xl border border-white/10 bg-neutral-950/70 backdrop-blur">
      <div className="px-3 py-2 text-xs text-neutral-400">측정</div>
      <ul className="scrollbar-thin overflow-y-auto">
        {sessions.map((s) => (
          <SessionRow key={s.id} session={s} />
        ))}
      </ul>
    </div>
  );
}

function SessionRow({ session }: { session: MeasureSession }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(session.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlur = useRef(false);
  const closed = isClosed(session.points);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const next = value.trim() || session.name;
    if (next !== session.name)
      useMeasureStore.getState().rename(session.id, next);
    setValue(next);
    setEditing(false);
  };

  return (
    <li className="grid grid-cols-[1rem_minmax(0,1fr)_auto_auto] items-center gap-2 px-2.5 py-1.5">
      {closed ? (
        <Pentagon size={14} className="text-[#22ff88]" />
      ) : (
        <Spline size={14} className="text-neutral-300" />
      )}
      {editing ? (
        <input
          ref={inputRef}
          className={NAME + " border-white/70 bg-transparent outline-none"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            if (skipBlur.current) {
              skipBlur.current = false;
              return;
            }
            commit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
            if (e.key === "Escape") {
              e.stopPropagation();
              skipBlur.current = true;
              setValue(session.name);
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          type="button"
          className={
            NAME + " cursor-text truncate border-transparent text-left"
          }
          onClick={() => setEditing(true)}
        >
          {session.name}
        </button>
      )}
      <span className="text-xs tabular-nums text-neutral-400">
        {sessionMetric(session.points) ?? "—"}
      </span>
      <div className="flex">
        <button
          type="button"
          className="grid size-7 cursor-pointer place-items-center text-neutral-500 hover:text-white"
          title="중심으로 이동"
          onClick={() => useMeasureStore.getState().lookAt(session.points)}
        >
          <Locate size={14} />
        </button>
        <button
          type="button"
          className="grid size-7 cursor-pointer place-items-center text-neutral-500 hover:text-red-400"
          title="삭제"
          onClick={() => useMeasureStore.getState().remove(session.id)}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}

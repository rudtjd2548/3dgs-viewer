const R = 30;
const C = 2 * Math.PI * R;

type LoadingDonutProps = {
  progress: number;
};

export function LoadingDonut({ progress }: LoadingDonutProps) {
  const parsing = progress >= 1;
  const pct = Math.round(Math.min(progress, 1) * 100);
  const offset = parsing ? C * 0.28 : C * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        viewBox="0 0 96 96"
        className={`h-20 w-20 ${parsing ? "animate-spin" : ""}`}
        role="progressbar"
        aria-label={parsing ? "파싱 중" : `파일 가져오는 중 ${pct}%`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={parsing ? undefined : pct}
      >
        <circle
          cx="48"
          cy="48"
          r={R}
          fill="none"
          strokeWidth="7"
          className="stroke-neutral-800"
        />
        <circle
          cx="48"
          cy="48"
          r={R}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          transform="rotate(-90 48 48)"
          className={`stroke-neutral-200 ${parsing ? "" : "transition-[stroke-dashoffset] duration-150 ease-linear"}`}
        />
      </svg>
      <p className="text-sm text-neutral-300">
        {parsing ? "파싱 중…" : `파일 가져오는 중 ${pct}%`}
      </p>
    </div>
  );
}

import { Color, Vector3 } from 'three/webgpu'
import { create } from 'zustand'

export type MeasureSession = {
  id: string
  name: string
  points: Vector3[]
}

/** 월드 단위 → m. 실측 보정 전 1:1 */
export const WORLD_TO_METER = 1

export const isClosed = (pts: Vector3[]) =>
  pts.length >= 4 && pts[0]!.equals(pts[pts.length - 1]!)

export function pathLength(pts: Vector3[]) {
  let sum = 0
  for (let i = 1; i < pts.length; i++) sum += pts[i - 1]!.distanceTo(pts[i]!)
  return sum * WORLD_TO_METER
}

export function polygonArea(pts: Vector3[]) {
  const n = pts.length
  if (n < 3) return null
  const normal = new Vector3()
  for (let i = 0; i < n; i++) {
    const a = pts[i]!
    const b = pts[(i + 1) % n]!
    normal.x += (a.y - b.y) * (a.z + b.z)
    normal.y += (a.z - b.z) * (a.x + b.x)
    normal.z += (a.x - b.x) * (a.y + b.y)
  }
  if (normal.lengthSq() < 1e-20) return null
  normal.normalize()
  const u = new Vector3(+(Math.abs(normal.x) < 0.9), +(Math.abs(normal.x) >= 0.9), 0)
    .cross(normal)
    .normalize()
  const v = new Vector3().copy(normal).cross(u)
  let twice = 0
  for (let i = 0; i < n; i++) {
    const a = pts[i]!
    const b = pts[(i + 1) % n]!
    twice += a.dot(u) * b.dot(v) - b.dot(u) * a.dot(v)
  }
  return Math.abs(twice) * 0.5 * WORLD_TO_METER * WORLD_TO_METER
}

export function sessionMetric(pts: Vector3[]) {
  if (isClosed(pts)) {
    const area = polygonArea(pts.slice(0, -1))
    return area == null ? null : `${area.toFixed(2)}m²`
  }
  return `${pathLength(pts).toFixed(2)}m`
}

const session = (seq: number, points: Vector3[]): MeasureSession => ({
  id: crypto.randomUUID(),
  name: `측정 ${seq}`,
  points,
})

type MeasureState = {
  /** 커서 스냅. 좌표·색은 mutate, 구독은 hoverOn만 */
  hover: Vector3
  hoverColor: Color
  hoverOn: boolean
  setHoverOn: (on: boolean) => void

  focus: Vector3
  focusGen: number
  lookAt: (pts: Vector3[]) => void

  draft: Vector3[]
  sessions: MeasureSession[]
  nextSeq: number
  addPoint: (v: Vector3) => void
  commit: () => void
  close: () => void
  cancel: () => void
  undo: () => void
  rename: (id: string, name: string) => void
  remove: (id: string) => void
  clear: () => void
}

export const useMeasureStore = create<MeasureState>((set) => ({
  hover: new Vector3(),
  hoverColor: new Color(),
  hoverOn: false,
  setHoverOn: (hoverOn) => set((s) => (s.hoverOn === hoverOn ? s : { hoverOn })),

  focus: new Vector3(),
  focusGen: 0,
  lookAt: (pts) =>
    set((s) => {
      const ring = isClosed(pts) ? pts.slice(0, -1) : pts
      if (!ring.length) return s
      s.focus.set(0, 0, 0)
      for (const p of ring) s.focus.add(p)
      s.focus.divideScalar(ring.length)
      return { focusGen: s.focusGen + 1 }
    }),

  draft: [],
  sessions: [],
  nextSeq: 1,
  addPoint: (v) => set((s) => ({ draft: [...s.draft, v.clone()] })),
  commit: () =>
    set((s) =>
      s.draft.length < 2
        ? { draft: [] }
        : {
            sessions: [...s.sessions, session(s.nextSeq, s.draft)],
            nextSeq: s.nextSeq + 1,
            draft: [],
          },
    ),
  close: () =>
    set((s) =>
      s.draft.length < 3
        ? s
        : {
            sessions: [
              ...s.sessions,
              session(s.nextSeq, [...s.draft, s.draft[0]!.clone()]),
            ],
            nextSeq: s.nextSeq + 1,
            draft: [],
          },
    ),
  cancel: () => set((s) => (s.draft.length ? { draft: [] } : s)),
  undo: () => set((s) => (s.draft.length ? { draft: s.draft.slice(0, -1) } : s)),
  rename: (id, name) =>
    set((s) => ({
      sessions: s.sessions.map((m) => (m.id === id ? { ...m, name } : m)),
    })),
  remove: (id) =>
    set((s) => ({ sessions: s.sessions.filter((m) => m.id !== id) })),
  clear: () => set({ draft: [], sessions: [], nextSeq: 1 }),
}))

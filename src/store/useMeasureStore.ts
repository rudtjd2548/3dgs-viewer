import { Color, Vector3 } from 'three/webgpu'
import { create } from 'zustand'

export type MeasureSession = {
  id: string
  name: string
  points: Vector3[]
}

export const isClosed = (pts: Vector3[]) =>
  pts.length >= 4 && pts[0]!.equals(pts[pts.length - 1]!)

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

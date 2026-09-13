import { Color, Vector3 } from 'three/webgpu'
import { create } from 'zustand'

export type Measurement = Vector3[]

type MeasureState = {
  /** 커서 스냅. 좌표·색은 mutate, 구독은 hoverOn만 */
  hover: Vector3
  hoverColor: Color
  hoverOn: boolean
  setHoverOn: (on: boolean) => void

  draft: Measurement
  measurements: Measurement[]
  addPoint: (v: Vector3) => void
  commit: () => void
  cancel: () => void
  undo: () => void
}

export const useMeasureStore = create<MeasureState>((set) => ({
  hover: new Vector3(),
  hoverColor: new Color(),
  hoverOn: false,
  setHoverOn: (hoverOn) => set((s) => (s.hoverOn === hoverOn ? s : { hoverOn })),

  draft: [],
  measurements: [],
  addPoint: (v) => set((s) => ({ draft: [...s.draft, v.clone()] })),
  commit: () =>
    set((s) =>
      s.draft.length < 2
        ? { draft: [] }
        : { measurements: [...s.measurements, s.draft], draft: [] },
    ),
  cancel: () => set((s) => (s.draft.length ? { draft: [] } : s)),
  undo: () => set((s) => (s.draft.length ? { draft: s.draft.slice(0, -1) } : s)),
}))

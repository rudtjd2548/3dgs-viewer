import { Vector3 } from 'three/webgpu'
import { create } from 'zustand'

type PickState = {
  /** 커서 스냅. 좌표는 copy로 mutate, 구독은 hoverOn만 */
  hover: Vector3
  hoverOn: boolean
  setHoverOn: (on: boolean) => void
  draft: Vector3[]
  sessions: Vector3[][]
  addPoint: (v: Vector3) => void
  commit: () => void
  cancel: () => void
  undo: () => void
}

export const usePickStore = create<PickState>((set) => ({
  hover: new Vector3(),
  hoverOn: false,
  setHoverOn: (hoverOn) => set((s) => (s.hoverOn === hoverOn ? s : { hoverOn })),
  draft: [],
  sessions: [],
  addPoint: (v) => set((s) => ({ draft: [...s.draft, v.clone()] })),
  commit: () =>
    set((s) =>
      s.draft.length < 2 ? { draft: [] } : { sessions: [...s.sessions, s.draft], draft: [] },
    ),
  cancel: () => set((s) => (s.draft.length ? { draft: [] } : s)),
  undo: () => set((s) => (s.draft.length ? { draft: s.draft.slice(0, -1) } : s)),
}))

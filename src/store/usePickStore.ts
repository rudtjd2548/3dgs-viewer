import { Vector3 } from 'three/webgpu'
import { create } from 'zustand'

type PickState = {
  /** 커서 스냅. 좌표는 copy로 mutate, 구독은 hoverOn만 */
  hover: Vector3
  hoverOn: boolean
  setHoverOn: (on: boolean) => void
  points: Vector3[]
  addPoint: (v: Vector3) => void
}

export const usePickStore = create<PickState>((set) => ({
  hover: new Vector3(),
  hoverOn: false,
  setHoverOn: (hoverOn) => set((s) => (s.hoverOn === hoverOn ? s : { hoverOn })),
  points: [],
  addPoint: (v) => set((s) => ({ points: [...s.points, v.clone()] })),
}))

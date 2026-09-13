import { create } from 'zustand'

export type Tool = 'none' | 'distance'

type ToolState = {
  tool: Tool
  showAxes: boolean
  showMeasurements: boolean
  setTool: (tool: Tool) => void
  toggleAxes: () => void
  toggleMeasurements: () => void
}

export const useToolStore = create<ToolState>((set) => ({
  tool: 'none',
  showAxes: false,
  showMeasurements: true,
  setTool: (tool) => set({ tool }),
  toggleAxes: () => set((s) => ({ showAxes: !s.showAxes })),
  toggleMeasurements: () => set((s) => ({ showMeasurements: !s.showMeasurements })),
}))

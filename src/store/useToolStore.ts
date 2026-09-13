import { create } from 'zustand'

export type Tool = 'none' | 'distance'

type ToolState = {
  tool: Tool
  showAxes: boolean
  showMeasurements: boolean
  showGuide: boolean
  setTool: (tool: Tool) => void
  toggleAxes: () => void
  toggleMeasurements: () => void
  toggleGuide: () => void
}

export const useToolStore = create<ToolState>((set) => ({
  tool: 'none',
  showAxes: false,
  showMeasurements: true,
  showGuide: false,
  setTool: (tool) => set({ tool }),
  toggleAxes: () => set((s) => ({ showAxes: !s.showAxes })),
  toggleMeasurements: () => set((s) => ({ showMeasurements: !s.showMeasurements })),
  toggleGuide: () => set((s) => ({ showGuide: !s.showGuide })),
}))

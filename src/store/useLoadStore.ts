import { create } from 'zustand'

type LoadState = {
  plyUrl: string | null
  progress: number
  error: string | null
  ready: boolean
  open: (url: string) => void
}

export const useLoadStore = create<LoadState>((set) => ({
  plyUrl: null,
  progress: 0,
  error: null,
  ready: false,
  open: (plyUrl) => set({ plyUrl, progress: 0, error: null, ready: false }),
}))

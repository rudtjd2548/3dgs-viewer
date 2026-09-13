import { create } from 'zustand'

type LoadState = {
  plyUrl: string | null
  fileName: string | null
  progress: number
  error: string | null
  ready: boolean
  open: (url: string, fileName: string) => void
}

export const useLoadStore = create<LoadState>((set) => ({
  plyUrl: null,
  fileName: null,
  progress: 0,
  error: null,
  ready: false,
  open: (plyUrl, fileName) =>
    set({ plyUrl, fileName, progress: 0, error: null, ready: false }),
}))

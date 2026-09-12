import { useEffect, useState } from 'react'
import { useLoadStore } from '../store/useLoadStore'

const DEFAULT_PLY_URL = '/sample_scene.ply'

export function useSplatLoader() {
  const [checked, setChecked] = useState(false)
  const open = useLoadStore((s) => s.open)

  useEffect(() => {
    fetch(DEFAULT_PLY_URL, { method: 'HEAD' })
      .then((res) => {
        const type = res.headers.get('content-type') ?? ''
        if (res.ok && !type.includes('text/html')) open(DEFAULT_PLY_URL)
      })
      .finally(() => setChecked(true))
  }, [open])

  const openFile = (file: File) => {
    const prev = useLoadStore.getState().plyUrl
    if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
    open(URL.createObjectURL(file))
  }

  return { openFile, checked }
}

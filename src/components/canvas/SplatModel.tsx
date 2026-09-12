import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { GaussianSplatPLYLoader } from 'three/addons/loaders/GaussianSplatPLYLoader.js'
import { GaussianSplat } from 'three/addons/objects/GaussianSplat.js'
import { useLoadStore } from '../../store/useLoadStore'

type SplatModelProps = {
  url: string
}

export function SplatModel({ url }: SplatModelProps) {
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    let cancelled = false
    let splat: GaussianSplat | null = null

    new GaussianSplatPLYLoader().load(
      url,
      (geometry) => {
        if (cancelled) return
        splat = new GaussianSplat(geometry)
        scene.add(splat)
        useLoadStore.setState({ ready: true })
      },
      (event) => {
        if (cancelled || !event.lengthComputable) return
        useLoadStore.setState({ progress: event.loaded / event.total })
      },
      (error) => {
        if (cancelled) return
        useLoadStore.setState({
          error: error instanceof Error ? error.message : 'PLY 로드 실패',
        })
      },
    )

    return () => {
      cancelled = true
      if (splat) scene.remove(splat)
    }
  }, [url, scene])

  return null
}

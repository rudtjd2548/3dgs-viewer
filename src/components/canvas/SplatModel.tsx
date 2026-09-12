import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { GaussianSplatPLYLoader } from 'three/addons/loaders/GaussianSplatPLYLoader.js'
import { GaussianSplat } from 'three/addons/objects/GaussianSplat.js'

type SplatModelProps = {
  url: string
}

export function SplatModel({ url }: SplatModelProps) {
  const scene = useThree((s) => s.scene)

  useLayoutEffect(() => {
    let cancelled = false
    let splat: GaussianSplat | null = null

    new GaussianSplatPLYLoader().loadAsync(url).then((geometry) => {
      if (cancelled) return
      splat = new GaussianSplat(geometry)
      scene.add(splat)
    }).catch(console.error)

    return () => {
      cancelled = true
      if (splat) scene.remove(splat)
    }
  }, [url, scene])

  return null
}

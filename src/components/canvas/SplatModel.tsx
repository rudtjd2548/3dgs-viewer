import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GaussianSplatPLYLoader } from 'three/addons/loaders/GaussianSplatPLYLoader.js'
import { GaussianSplat } from 'three/addons/objects/GaussianSplat.js'
import { useLoadStore } from '../../store/useLoadStore'

type SplatModelProps = {
  url: string
}

export function SplatModel({ url }: SplatModelProps) {
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const controls = useThree((s) => s.controls) as OrbitControls | null

  useEffect(() => {
    let cancelled = false
    let splat: GaussianSplat | null = null

    new GaussianSplatPLYLoader().load(
      url,
      (geometry) => {
        if (cancelled) return
        splat = new GaussianSplat(geometry)
        scene.add(splat)

        // 로더가 이미 채워 둔 구. fov 절반각으로 전체가 들어오게 거리 계산
        const sphere = splat.splatGeometry.boundingSphere
        if (sphere && controls) {
          const { center, radius } = sphere
          const dist = radius / Math.sin((camera.fov * Math.PI) / 360)
          camera.position.set(center.x, center.y, center.z + dist)
          camera.lookAt(center)
          controls.target.copy(center)
          controls.update()
        }

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
  }, [url, scene, camera, controls])

  return null
}

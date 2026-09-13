import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GaussianSplatPLYLoader } from 'three/addons/loaders/GaussianSplatPLYLoader.js'
import { GaussianSplat } from 'three/addons/objects/GaussianSplat.js'
import { useLoadStore } from '../../store/useLoadStore'
import { splatRef } from './pick'

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
        if (cancelled) {
          geometry.dispose()
          return
        }
        splat = new GaussianSplat(geometry)
        splat.rotation.x = -Math.PI / 2
        splat.raycast = () => {}
        splatRef.current = splat
        scene.add(splat)
        splat.updateMatrixWorld()

        // Z-up PLY → Y-up 월드. 회전 후 중심으로 프레이밍
        const sphere = splat.splatGeometry.boundingSphere
        if (sphere && controls) {
          const center = sphere.center.clone().applyMatrix4(splat.matrixWorld)
          const dist = sphere.radius / Math.sin((camera.fov * Math.PI) / 360)
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
      if (splatRef.current === splat) splatRef.current = null
      if (!splat) return
      scene.remove(splat)
      splat.geometry.dispose()
      splat.material.dispose()
      splat.splatGeometry.dispose()
    }
  }, [url, scene, camera, controls])

  return null
}

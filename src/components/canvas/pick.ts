import { GaussianSplat } from 'three/addons/objects/GaussianSplat.js'
import {
  BlendMode,
  CustomBlending,
  DataUtils,
  HalfFloatType,
  NearestFilter,
  OneFactor,
  OneMinusSrcAlphaFactor,
  RenderTarget,
  SrcAlphaFactor,
  Vector3,
} from 'three/webgpu'
import type { NodeMaterial, PerspectiveCamera } from 'three/webgpu'
import {
  cameraFar,
  cameraNear,
  dot,
  exp,
  mrt,
  perspectiveDepthToViewZ,
  varyingProperty,
  vec4,
  vertexStage,
} from 'three/tsl'

export const splatRef: { current: GaussianSplat | null } = { current: null }

const PICK = 'pick'
const _p = /*@__PURE__*/ new Vector3()

const pickBlend = /*@__PURE__*/ (() => {
  const b = new BlendMode(CustomBlending)
  b.blendSrc = SrcAlphaFactor
  b.blendDst = OneMinusSrcAlphaFactor
  b.blendSrcAlpha = OneFactor
  b.blendDstAlpha = OneMinusSrcAlphaFactor
  return b
})()

export function splatPickMRT(material: NodeMaterial) {
  const clip = material.vertexNode as ReturnType<typeof vec4>
  const uv = varyingProperty('vec2', 'vSplatUv')
  const col = varyingProperty('vec4', 'vSplatColor')
  const alpha = exp(dot(uv, uv).mul(-0.5)).mul(col.a)
  const viewZ = perspectiveDepthToViewZ(vertexStage(clip.z.div(clip.w)), cameraNear, cameraFar)
  return mrt({ [PICK]: vec4(viewZ.negate(), 0, 0, alpha) })
}

export function scenePickMRT() {
  const node = mrt({ [PICK]: vec4(0) })
  node.setBlendMode(PICK, pickBlend)
  node.setClearColor(PICK, 0, 0)
  return node
}

export function createPickTarget() {
  const rt = new RenderTarget(1, 1, { type: HalfFloatType })
  rt.textures[0].name = PICK
  rt.textures[0].minFilter = NearestFilter
  rt.textures[0].magFilter = NearestFilter
  return rt
}

const f = (texel: ArrayLike<number>, i: number) =>
  texel instanceof Float32Array ? texel[i]! : DataUtils.fromHalfFloat(Number(texel[i]))

export function readPick(texel: ArrayLike<number>) {
  const a = f(texel, 3)
  return a < 0.04 ? null : f(texel, 0) / a
}

export function unprojectView(camera: PerspectiveCamera, ndcX: number, ndcY: number, viewZ: number) {
  const e = camera.projectionMatrix.elements
  return _p.set((ndcX * viewZ) / e[0], (ndcY * viewZ) / e[5], -viewZ).applyMatrix4(camera.matrixWorld)
}

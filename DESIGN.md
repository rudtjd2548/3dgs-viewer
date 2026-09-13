# DESIGN

## 아키텍처

Canvas(WebGPU)와 DOM 오버레이를 분리했다. 3D 상태는 store로만 넘긴다.

```
PLY 선택
  → useLoadStore
  → SplatModel (GaussianSplatPLYLoader → GaussianSplat)
HoverPick (1px MRT)
  → useMeasureStore.hover
측정 모드 클릭
  → draft → commit/close → sessions
Overlay
  → 파일 / 세션 목록 / 툴바 / 가이드
```

| 모듈 | 역할 |
| --- | --- |
| `SplatModel.tsx` | PLY 로드, Z-up→Y-up 회전, 프레이밍 |
| `pick.ts` + `HoverPick.tsx` | splat 깊이·색 픽, 월드 좌표 언프로젝션 |
| `Measure.tsx` | 점·선·라벨·면적, 입력(클릭/키) |
| `OrbitPivot.tsx` | XYZ 축, Ctrl+클릭으로 궤도 중심 |
| `useLoadStore` / `useMeasureStore` / `useToolStore` | 로드 / 측정 / UI 토글. 변경 주기가 달라 분리 |

## 렌더링

1. `GaussianSplatPLYLoader`가 PLY를 파싱한다.
2. `GaussianSplat`에 넣고 `rotation.x = -π/2`만 적용한다. 스케일은 건드리지 않는다.
3. bounding sphere로 카메라를 맞춘다.
4. `WebGPURenderer` + R3F `Canvas` (`dpr=[1,1]`).

## 측정 알고리즘

3DGS에는 메시가 없어 `Raycaster`를 쓰지 않는다. `splat.raycast`도 비워 두었다.

대신 **화면에 그린 splat과 같은 패스에서 알파 가중 깊이를 읽고 언프로젝션**한다.

1. 커서 1px만 scissor한 offscreen RT에 MRT를 그린다.
2. splat fragment는 `viewZ`와 `alpha`를 premultiply해 누적한다 (`splatPickMRT`).
3. `readPick`: 누적 알파 < 0.04면 miss, 아니면 `viewZ / alpha`.
4. `unprojectView`: NDC + viewZ → 월드 좌표.
5. 클릭(드래그 5px 이하)이면 그 점을 `draft`에 넣는다.
6. 거리는 `a.distanceTo(b) * WORLD_TO_METER`.

과제 6장의 깊이 언프로젝션과 누적 알파를 같이 쓴 것이다. splat 중심점 탐색은 시각 표면과 어긋나고 공간 인덱스가 필요해서 제외했다.

**한계:** 깊이가 알파 가중이므로 반투명 splat이 겹치면 표면보다 밀리거나 뜰 수 있다. 각도·모서리·저텍스처(검은 화면, 금속)에서 값이 흔들린다. 첫 표면 hit이 아니라 누적 평균이다.

면적은 첫 점을 다시 눌러 닫는다. 판정은 hover 좌표 비교가 아니라 **화면 16px**. 저장은 `draft[0].clone()`을 마지막에 넣어 닫힌 폴리곤으로 표시한다.

## 스케일 / 단위

`WORLD_TO_METER = 1`. 표시는 `Xm` / `Xm²`.

로더에 스케일 변환이 없고, 회전만 하므로 길이가 보존된다. 제공 `sample_scene.ply`는 월드 1 ≈ 1m였다. 근거는 아래 표의 뷰어/실측 비가 1 근처에서만 흩어지고, 공통 배수가 없다는 점이다.

다른 PLY는 임의 스케일일 수 있다. 그때는 알려진 길이로 `WORLD_TO_METER`를 다시 정해야 한다. 캘리브레이션 UI는 없다.

## 자가 검증

### 스케일 보정

| 항목 | 기입 |
| --- | --- |
| 보정 기준으로 사용한 구간 ID | M2-W |
| 보정 방식 | 전역 스케일 없음. `WORLD_TO_METER = 1` (씬 좌표 1.0 = 1m) |
| 그 구간을 선택한 이유 | 평면·직선·양 끝 경계가 뚜렷. 152 / 152.5cm = 0.33%. 구간 비가 1 근처에서만 흩어지고 공통 배수가 없어, 보정이 나머지 오차를 키운다. |

### 측정 결과

| ID | 실측 (cm) | 뷰어 (cm) | 오차 (cm) | 오차율 (%) | 판정 |
| --- | ---: | ---: | ---: | ---: | --- |
| M1-L | 203 | 206 | 3 | 1.48 | O |
| M2-W | 152.5 | 152 | 0.5 | 0.33 | O |
| M2-H | 121.5 | 120 | 1.5 | 1.23 | O |
| M3-W | 146 | 151 | 5 | 3.42 | O |
| M3-H | 83.5 | 85 | 1.5 | 1.80 | O |
| M4-H | 177 | 184 | 7 | 3.95 | O |
| M4-W | 91 | 90 | 1 | 1.10 | O |

7구간 모두 ±5% 이내. 라벨은 0.01m(1cm) 단위라 표는 cm로 반올림했다.

- 최대 오차: **M4-H** (7cm, 3.95%). 금속 반사·조명 때문에 splat이 상단/바닥에서 퍼진 것으로 본다. 다음이 **M3-W** (검은 무광 화면).
- 측정 불가 구간은 없었다.
- 같은 구간을 다시 찍으면 안정 표면(M2)은 수 cm 안, M3/M4는 더 흔들린다. 라벨 분해능이 1cm라 그 이하 편차는 안 보인다.
- 카메라 각도를 바꾸면 누적 깊이가 달라져 값이 변할 수 있다. 정면에서 모서리를 찍는 쪽이 낫다.
- M1-L은 곡면 호 실측 vs 직선 거리라 참고만 했다.

## 성능

FPS·메모리 프로파일은 찍지 않았다. 숫자 없이 선택만 적는다.

- 픽은 전체 화면이 아니라 커서 1px scissor. splat 크기는 RT 해상도에 묶이므로 화면 크기는 유지한다.
- `dpr=[1,1]`, antialias off. splat fill을 우선했다.
- PLY는 메인 스레드 로드. 첫 대기와 파일 교체 시 버벅임은 여기로 본다. Worker/LOD/프로그레시브는 없음.
- 파일 교체·언마운트 때 splat 쿼드·재질·원본 `splatGeometry`를 `dispose`한다.

## 참고 UX와의 차이

부록 A와 조작을 맞추되, 모드는 하나로 합쳤다. 점/폴리라인/면적이 같은 `draft`다. 면적은 첫 점 재클릭.

Ctrl은 축 토글이 아니라 **궤도 중심 이동**이다. 축은 하단 버튼으로 켠다. 측정 중에도 피벗을 옮길 수 있게 하려는 선택이다.

## 라이브러리

과제 힌트의 Spark / GaussianSplats3D 대신 **three r186 `GaussianSplat` + WebGPU**를 썼다. 추가 3DGS 의존성 없이 로더·렌더러가 같고, 픽 MRT를 같은 재질에 붙일 수 있어서다.

R3F/drei는 Canvas·Html 라벨·OrbitControls. zustand는 캔버스와 오버레이 공유 상태.

## 더 있었다면

- 알려진 길이를 입력하는 스케일 UI (`WORLD_TO_METER`만 바꾸면 됨)
- 첫 표면 알파 임계 깊이 (현재는 누적 평균)
- PLY 파싱 Worker
- 측정 세션 저장/불러오기

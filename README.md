# 3DGS Viewer

제공 PLY를 브라우저에서 보고, 화면을 찍어 거리·면적을 잰다. Chrome 최신 (WebGPU).

**데모:** https://3dgs-viewer-eight.vercel.app/

배포본에는 샘플 PLY가 없다. 과제에서 받은 `sample_scene.ply`를 파일 선택으로 연다.

## 실행

```bash
npm install
npm run dev
```

1. `public/sample_scene.ply`가 있으면 자동으로 연다.
2. 없으면 **PLY 파일 선택**. 과제에서 받은 `sample_scene.ply`를 고른다.

`*.ply`는 gitignore다. 클론만으로는 샘플이 없다. 제공 파일을 `public/sample_scene.ply`로 두거나 파일 선택으로 열면 된다.

## 다른 PLY

좌측 상단 폴더 아이콘, 또는 첫 화면의 파일 선택. `.ply`만. 열면 기존 측정은 지워진다.

좌표 단위가 이 샘플과 다르면 숫자 스케일이 틀린다. 스케일 UI는 없다. 처리 방식은 `DESIGN.md`를 본다.

## 조작

| 입력 | 동작 |
| --- | --- |
| 하단 줄자 | 측정 모드 |
| 하단 ? | 조작 가이드 (기본 꺼짐) |
| 좌클릭 | 점 추가 |
| 첫 점 클릭 (3점+) | 면적 확정 |
| 더블클릭 / Enter | 측정 종료 |
| 우클릭 | 직전 점 취소 |
| Esc | 측정 취소 |
| Ctrl + 좌클릭 | 궤도 중심 이동 |
| 좌드래그 / 우드래그 / 휠 | 회전 / 이동 / 줌 |

## 라이브러리

| 패키지 | 버전 |
| --- | --- |
| three | ^0.186.0 |
| @react-three/fiber | ^9.7.0 |
| @react-three/drei | ^10.7.8 |
| react / react-dom | 19.2.8 |
| zustand | ^5.0.15 |
| lucide-react | ^1.45.0 |
| tailwindcss | ^4.3.3 |
| vite | ^8.3.0 |
| typescript | ~6.0.2 |

렌더러는 three `GaussianSplat` + `WebGPURenderer`.

## 기능

**한 것**

- [x] 3DGS 로드·렌더, 궤도 조작, 로딩 표시, 임의 PLY
- [x] 점 선택, 거리, 폴리라인, 종료/취소/되돌리기, 라벨
- [x] XYZ 축 토글, 측정 숨김, 면적, 다중 세션(이름/삭제/바로가기)

**안 한 것**

- [ ] 스케일 캘리브레이션 UI
- [ ] Worker / 프로그레시브 / LOD
- [ ] 측정 저장·불러오기·공유
- [ ] 모바일/터치
- [ ] 테스트 코드

자가 검증 표와 스케일 근거는 `DESIGN.md`. LLM 사용은 `LLM_REPORT.md`.

## 알려진 제약

- WebGPU 없는 브라우저는 안 된다.
- 검은 화면·금속 반사면은 픽이 흔들린다.
- 대용량 PLY는 메인 스레드에서 파싱한다. 첫 로드가 길 수 있다.
- 다른 PLY는 미터 단위가 아닐 수 있다.

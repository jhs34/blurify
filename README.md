# Blurify

브라우저 내부(Client-side 100%)에서 동작하는 정밀 블러 및 픽셀 모자이크 편집 도구입니다. 서버로 사진이 전송되지 않아 개인정보가 포함된 이미지를 안전하게 편집할 수 있습니다.

- **배포 주소**: [https://jhs34.github.io/blurify/](https://jhs34.github.io/blurify/)

## 주요 기능

- **가우시안 블러 & 픽셀 모자이크**: 실시간 강도 조절 및 외곽선 클램핑 처리
- **정밀 마스킹 도구**: 자유 브러쉬(`Shift` 직선 지원), 회전 직사각형, 회전 타원, 선형 그라디언트
- **실시간 페더(Feather) 및 지우개**: 경계면 부드러움 조절, 마스크 색상 오버레이(`O`), 원본 비교 홀드(`\`)
- **데스크톱 & 모바일 최적화**: HiDPI 캔버스, `Space + 드래그` 패닝, 두 손가락 핀치 줌, 최대 20단계 실행 취소/다시 실행
- **다양한 포맷 저장**: `PNG`, `JPG`, `WebP` 즉시 다운로드

## 로컬 실행 및 빌드

```bash
npm install
npm run dev          # 로컬 개발 서버 (http://localhost:3000)
npm run build:pages  # GitHub Pages (/blurify/) 전용 정적 빌드
```

## GitHub Pages 배포 방법 (`jhs34.github.io/blurify`)

1. GitHub에서 `jhs34/blurify` 저장소를 생성하고 이 프로젝트 코드를 `main` 브랜치에 푸시합니다.
2. 저장소의 **Settings → Pages → Build and deployment** 항목에서 **Source**를 **GitHub Actions**로 선택합니다.
3. `.github/workflows/deploy.yml` 워크플로가 자동 실행되며 배포가 완료되면 `https://jhs34.github.io/blurify/`에서 접속할 수 있습니다.

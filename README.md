# Blurify

브라우저 내부(Client-side 100%)에서 동작하는 정밀 블러 및 픽셀 모자이크 편집 도구입니다. 서버로 사진이 전송되지 않아 개인정보가 포함된 이미지를 안전하게 편집할 수 있습니다.

- **배포 주소**: [https://jhs-blurify.web.app](https://jhs-blurify.web.app)

## 주요 기능

- **가우시안 블러 & 픽셀 모자이크**: 실시간 강도 조절 및 외곽선 클램핑 처리
- **정밀 마스킹 도구**: 자유 브러쉬(`Shift` 직선 지원), 회전 직사각형, 회전 타원, 선형 그라디언트
- **실시간 페더(Feather) 및 지우개**: 경계면 부드러움 조절, 마스크 색상 오버레이(`O`), 원본 비교 홀드(`\`)
- **데스크톱 & 모바일 최적화**: HiDPI 캔버스, `Space + 드래그` 패닝, 두 손가락 핀치 줌, 최대 20단계 실행 취소/다시 실행
- **다양한 포맷 저장**: `PNG`, `JPG`, `WebP` 즉시 다운로드

## 로컬 실행 및 배포

```bash
npm install
npm run dev             # 로컬 개발 서버 (http://localhost:3000)
npm run lint            # TypeScript 타입 검사
npm test                # 엔진 단위 테스트 실행
npm run build           # 프로덕션 정적 빌드 (dist/)
npm run preview:deploy  # Firebase Hosting 프리뷰 채널 배포 (7일 만료)
npm run deploy          # Firebase Hosting 프로덕션 배포 (jhs-blurify)
```

## Firebase Hosting 자동 배포 (`jhs-blurify.web.app`)

`main` 브랜치에 변경사항이 푸시되면 `.github/workflows/deploy.yml` GitHub Actions 워크플로가 타입 검사, 단위 테스트, 정적 빌드를 거쳐 Firebase Hosting(`github-jhs` 프로젝트의 `jhs-blurify` 사이트)에 자동 배포합니다.

# 📈 yt-rising-finder

YouTube Data API v3를 활용해 최근 반응이 좋은 롱폼 영상, 작은 채널의 떡상 후보, 콘텐츠 소재 아이디어를 찾는 개인용 리서치 대시보드입니다.

## ✨ 주요 기능

- 🧭 소재 카테고리 기반 검색: 옛 생활사, 조선 호기심, 세계사 호기심, 야담/민담, 사연, 건강, 노후 등
- 🔎 탐색 모드: 떡상 후보, 넓게 탐색, 해외/경쟁 벤치마킹, 키워드 실험, 보관함
- 📊 영상 지표 확인: 조회수, 구독자수, 조회수/구독자, 시간당 조회수, 댓글수, 영상 길이, 업로드일
- 🚀 작은 채널의 반응 좋은 영상을 찾기 위한 떡상지수 계산
- ⭐ 브라우저 localStorage 기반 저장/제외 기능
- 📁 CSV 다운로드 지원

## 🛠 기술 스택

- React 18
- Vite
- Tailwind CSS
- Axios
- date-fns

## 🚀 시작하기

의존성 설치:

```bash
npm install
```

`.env` 파일 생성:

```env
VITE_YOUTUBE_API_KEY=your_youtube_api_key_here
```

개발 서버 실행:

```bash
npm run dev
```

빌드:

```bash
npm run build
```

## ⚠️ YouTube API 사용량 참고

YouTube Data API v3는 요청마다 quota를 사용합니다. 이 앱에서는 검색 키워드 1개당 보통 아래 정도를 사용합니다.

```text
search.list 100 units
videos.list 1 unit
channels.list 1 unit
```

테스트할 때는 검색량을 작게 두고, 필요한 경우에만 넓게 검색하는 것을 권장합니다.

## 🌐 배포

Vercel에 Vite 프로젝트로 배포할 수 있습니다.

공개 배포를 할 경우 YouTube API 키가 브라우저 번들에 노출되지 않도록, API 요청을 Vercel Serverless Function 같은 서버 측 함수로 옮기는 것을 권장합니다.

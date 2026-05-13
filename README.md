# yt-rising-finder

YouTube Data API v3로 작은 채널의 롱폼 기회, 국내 수요, 해외 원형 소재를 찾고 후보를 보관/추적하는 리서치 도구입니다. 🔎

## ✨ 주요 기능

- 작은 채널 롱폼 기회 탐색
  - 최근 90일, 12분 이상, 조회수 1만 이상, 구독자 1만 이하 후보 중심
  - medium + long duration 조합으로 검색
- 국내 수요 탐색
  - 이미 반응이 있는 정보형 롱폼 소재와 제목 패턴 확인
- 해외 원형 참고
  - 영어권, 일본어권, 영어+일본어 옵션
  - 영어권은 US/en, 일본어권은 JP/ja 기준
- 키워드 실험
  - 직접 입력, 질문형, 제목 훅, 긴 이야기 확장 검색
- 후보 판단 지표
  - 후보점수, 조회수, 구독자수, 조회/구독 비율, 시간당 조회수
  - 댓글수, 댓글률, 영상 길이, 업로드 경과일
- 후보 관리
  - 저장, 확인함, 추적 중, 제외
  - 후보 보관함에서 카테고리별 확인, 제외 목록 확인, 복원
- 탭별 검색 결과
  - 탭 전환만으로는 API를 호출하지 않음
  - 다른 탭의 같은 카테고리 결과 중 현재 조건에 맞는 후보를 재활용 표시
- API 캐시
  - IndexedDB 기반 캐시와 캐시 적중/API 호출/quota 표시
- CSV 다운로드
  - 현재 후보 목록을 CSV로 내보내기

## 🗂️ 카테고리

- 노후생활 정보
- 생활심리/관계지혜
- 건강 습관
- 철학/삶의 지혜
- 세계경제/지리
- 근현대 생활사
- 지구역사/고생물
- 조선/옛생활 실험

## 🛠️ 기술 스택

- React 18
- Vite
- Tailwind CSS
- Axios
- date-fns
- idb

## 🚀 시작하기

```bash
npm install
```

`.env` 파일에 YouTube API 키를 넣습니다.

```env
VITE_YOUTUBE_API_KEY=your_youtube_api_key_here
```

```bash
npm run dev
npm run build
```

로컬 바인딩이 필요하면 다음 명령을 사용합니다.

```bash
npm run dev -- --host 127.0.0.1
```

## 💾 데이터 저장

데이터는 현재 브라우저에만 저장됩니다. 💾

- `localStorage`: 저장 영상, 제외 영상, 제외 후보 스냅샷
- IndexedDB `yt-rising-finder`: `apiCache`, `usageLog`, `candidateSnapshots`

## ⚠️ API quota와 보안

YouTube Data API v3 quota 참고:

```text
search.list   100 units
videos.list   1 unit
channels.list 1 unit
```

검색은 키워드 수와 duration 조합에 따라 quota 사용량이 커질 수 있습니다. API quota가 부족할 때는 실제 검색 대신 `npm run build`로 변경 사항을 검증할 수 있습니다.

현재 구조에서는 `VITE_YOUTUBE_API_KEY`가 브라우저 번들에서 사용됩니다. 공개 배포를 한다면 API 키 제한 설정과 백엔드 프록시 또는 서버리스 함수 사용을 권장합니다. 🔐

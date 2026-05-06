# yt-rising-finder

YouTube Data API v3로 작은 채널의 롱폼 기회, 국내 수요, 해외 원형 소재를 찾고 후보를 보관/추적하는 개인 리서치 도구입니다.

## 주요 기능

- 작은 채널 롱폼 기회 탐색
  - 최근 90일 중심
  - 12분 이상 롱폼 중심
  - 조회수 1만 이상
  - 구독자 1만 이하 후보 우선
  - medium + long 검색 duration 조합
- 국내 수요 탐색
  - 국내에서 이미 반응이 있는 정보형 롱폼 소재 확인
- 해외 원형 참고
  - 영어권, 일본어권, 영어+일본어 검색 옵션
  - 영어권은 US/en, 일본어권은 JP/ja 기준
  - 기본값은 영어권만, 가볍게, 20분 이상(long)
- 키워드 실험
  - 직접 키워드 입력
  - 질문형/제목 훅/긴 이야기 확장 검색
- 후보 판단 지표
  - 후보점수
  - 조회수, 구독자수, 조회/구독 비율
  - 시간당 조회수
  - 댓글수, 댓글률
  - 영상 길이, 업로드 경과일
- 후보 보관
  - 저장
  - 확인함
  - 추적 중
  - 제외
- 스냅샷 히스토리
  - 명시적 액션 시점의 후보 스냅샷 저장
  - `usageLog`: 영상별 최신 상태
  - `candidateSnapshots`: `videoId + snapshotAt` 기준 누적 히스토리
- API 캐시
  - IndexedDB 기반 캐시
  - search: 72시간
  - videos: 24시간
  - channels: 7일
  - 캐시 적중/API 호출/quota 표시
  - 캐시 비우기 버튼
- CSV 다운로드
  - 현재 표시 중인 후보 목록을 CSV로 내보내기

## 현재 카테고리

- 노후생활 정보
- 생활심리/관계지혜
- 건강 습관
- 철학/삶의 지혜
- 세계경제/지리
- 근현대 생활사
- 조선/옛생활 실험

## 기술 스택

- React 18
- Vite
- Tailwind CSS
- Axios
- date-fns
- idb

## 시작하기

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

로컬 네트워크 바인딩이 필요하면:

```bash
npm run dev -- --host 127.0.0.1
```

빌드:

```bash
npm run build
```

## 데이터 저장

브라우저 로컬 저장소와 IndexedDB를 사용합니다.

- `localStorage`
  - 저장 영상 목록
  - 제외 영상 목록
- IndexedDB: `yt-rising-finder`
  - `apiCache`
  - `usageLog`
  - `candidateSnapshots`

데이터는 현재 브라우저에만 저장됩니다.

## YouTube API quota 참고

YouTube Data API v3는 요청마다 quota를 사용합니다.

```text
search.list   100 units
videos.list   1 unit
channels.list 1 unit
```

검색은 키워드 수와 duration 조합에 따라 quota 사용량이 커질 수 있습니다. 실제 API quota가 부족할 때는 검색 테스트 대신 `npm run build`로 검증합니다.

## 다음 작업 후보

- 추적 중 후보 재조회
  - `videos.list`만 강제 새로고침
  - 직전 스냅샷 대비 조회수/댓글 증가량 계산
  - 재조회 구간 VPH 계산
  - 가속/유지/둔화/정체 성장 상태 분류
- 보관함 필터
  - 전체 / 저장 / 확인함 / 추적 중
  - 성장 상태별 필터
- CSV 확장
  - 확인함/추적 중/스냅샷 시각/성장 상태 컬럼 추가

## 배포 참고

현재 구조에서는 `VITE_YOUTUBE_API_KEY`가 브라우저 번들에서 사용됩니다. 공개 배포를 할 경우 API 키 노출과 quota 사용을 줄이기 위해 서버리스 함수나 백엔드 프록시를 두는 방식을 권장합니다.

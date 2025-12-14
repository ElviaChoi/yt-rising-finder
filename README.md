# 해피뷰어 - YouTube 키워드 검색 도구

React + Vite + Tailwind CSS로 만든 YouTube 키워드 검색 애플리케이션입니다.

## 기능

- 🔍 키워드 기반 YouTube 비디오 검색
- 📊 다양한 필터 옵션 (기간, 길이, 조회수, 구독자 수 등)
- 📈 시간당 조회수 자동 계산
- 📋 검색 결과 CSV 내보내기
- 🖼️ 비디오 썸네일 미리보기
- 📱 반응형 디자인

## 설치 방법

1. 의존성 설치:
```bash
npm install
```

2. 환경 변수 설정:
`.env` 파일을 생성하고 YouTube Data API 키를 추가하세요:
```
VITE_YOUTUBE_API_KEY=your_youtube_api_key_here
```

YouTube Data API 키 발급 방법:
1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. YouTube Data API v3 활성화
4. 사용자 인증 정보에서 API 키 생성

## 실행 방법

개발 서버 실행:
```bash
npm run dev
```

빌드:
```bash
npm run build
```

## 주요 기술 스택

- React 18
- Vite
- Tailwind CSS
- Axios
- date-fns

## 사용 방법

1. 키워드 검색 탭에서 검색할 키워드를 입력합니다.
2. 원하는 필터 옵션을 설정합니다:
   - 국가코드: 검색할 지역 (KR, US 등)
   - 기간: 검색할 기간 범위
   - 길이: 비디오 길이 필터
   - 최소 조회수: 최소 조회수 조건
   - 구독자 상한: 최대 구독자 수
   - 정렬 기준 및 순서
3. "검색 실행" 버튼을 클릭합니다.
4. 결과가 표시되면 테이블에서 비디오를 클릭하여 상세 정보를 확인할 수 있습니다.
5. "CSV 저장" 버튼을 클릭하여 결과를 CSV 파일로 다운로드할 수 있습니다.

## 주의사항

- YouTube Data API에는 일일 할당량 제한이 있습니다 (기본값: 10,000 units)
- 검색 결과가 많을 경우 API 할당량을 빠르게 소모할 수 있습니다.
- API 키는 안전하게 보관하세요.


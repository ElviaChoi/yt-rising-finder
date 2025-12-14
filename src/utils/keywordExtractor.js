// 한국어 불용어 목록
const KOREAN_STOPWORDS = new Set([
  '이', '가', '을', '를', '에', '의', '와', '과', '은', '는', '도', '로', '으로',
  '에서', '에게', '께', '한테', '에게서', '한테서', '로서', '로써', '으로서', '으로써',
  '만', '부터', '까지', '처럼', '같이', '만큼', '더', '덜', '많이', '적게',
  '그', '그것', '이것', '저것', '그런', '이런', '저런', '그렇게', '이렇게', '저렇게',
  '있다', '없다', '하다', '되다', '하다', '하다', '되다', '있다', '없다',
  '수', '것', '때', '곳', '일', '년', '월', '일', '시', '분', '초',
  '또', '또한', '그리고', '또는', '그런데', '그렇지만', '하지만', '그러나',
  '영상', '비디오', '동영상', '영화', '쇼', '방송', '프로그램'
]);

// 영어 불용어 목록
const ENGLISH_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have',
  'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may',
  'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
  'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'video', 'videos'
]);

// 제목에서 키워드 추출 (2-4글자 단어 또는 구문)
export const extractKeywords = (titles, minCount = 2) => {
  const keywordCount = {};
  const keywordVideos = {};
  
  titles.forEach((title, index) => {
    // 괄호와 특수문자 제거, 공백으로 단어 분리
    const cleanTitle = title
      .replace(/[\[\]()【】『』「」]/g, ' ')
      .replace(/[^\w\s가-힣]/g, ' ')
      .toLowerCase()
      .trim();
    
    // 2-4글자 단어 추출
    const words = cleanTitle.split(/\s+/).filter(word => {
      const wordLength = word.length;
      return wordLength >= 2 && wordLength <= 4 && 
             !KOREAN_STOPWORDS.has(word) && 
             !ENGLISH_STOPWORDS.has(word);
    });
    
    // 단어 조합 (2-3단어 구문)
    for (let i = 0; i < words.length; i++) {
      // 단일 단어
      const word = words[i];
      if (!keywordCount[word]) {
        keywordCount[word] = 0;
        keywordVideos[word] = [];
      }
      keywordCount[word]++;
      if (!keywordVideos[word].includes(index)) {
        keywordVideos[word].push(index);
      }
      
      // 2단어 구문
      if (i < words.length - 1) {
        const phrase2 = `${words[i]} ${words[i + 1]}`;
        if (!keywordCount[phrase2]) {
          keywordCount[phrase2] = 0;
          keywordVideos[phrase2] = [];
        }
        keywordCount[phrase2]++;
        if (!keywordVideos[phrase2].includes(index)) {
          keywordVideos[phrase2].push(index);
        }
      }
      
      // 3단어 구문
      if (i < words.length - 2) {
        const phrase3 = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
        if (!keywordCount[phrase3]) {
          keywordCount[phrase3] = 0;
          keywordVideos[phrase3] = [];
        }
        keywordCount[phrase3]++;
        if (!keywordVideos[phrase3].includes(index)) {
          keywordVideos[phrase3].push(index);
        }
      }
    }
  });
  
  // 최소 등장 횟수 이상인 키워드만 필터링
  return Object.entries(keywordCount)
    .filter(([keyword, count]) => count >= minCount)
    .map(([keyword, count]) => ({
      keyword,
      count,
      videoIndices: keywordVideos[keyword]
    }))
    .sort((a, b) => b.count - a.count);
};

// 제목에서 단어 빈도 추출
export const extractWordFrequency = (titles, topN = 20) => {
  const wordCount = {};
  const wordVideos = {};
  
  titles.forEach((title, index) => {
    const cleanTitle = title
      .replace(/[\[\]()【】『』「」]/g, ' ')
      .replace(/[^\w\s가-힣]/g, ' ')
      .toLowerCase()
      .trim();
    
    const words = cleanTitle.split(/\s+/).filter(word => {
      const wordLength = word.length;
      return wordLength >= 2 && 
             !KOREAN_STOPWORDS.has(word) && 
             !ENGLISH_STOPWORDS.has(word) &&
             !/^\d+$/.test(word); // 숫자만 있는 단어 제외
    });
    
    words.forEach(word => {
      if (!wordCount[word]) {
        wordCount[word] = 0;
        wordVideos[word] = new Set();
      }
      wordCount[word]++;
      wordVideos[word].add(index);
    });
  });
  
  return Object.entries(wordCount)
    .map(([word, count]) => ({
      word,
      count,
      videoCount: wordVideos[word].size
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
};


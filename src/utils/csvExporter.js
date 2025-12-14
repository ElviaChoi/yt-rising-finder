export const exportToCSV = (data, filename = 'youtube_results.csv') => {
  if (!data || data.length === 0) {
    alert('저장할 데이터가 없습니다.');
    return;
  }

  // CSV 헤더
  const headers = [
    '제목',
    '채널명',
    '구독자수',
    '업로드일',
    '조회수',
    '시간당조회수',
    '길이(분)',
    '비디오 URL'
  ];

  // CSV 데이터 생성
  const csvRows = [
    headers.join(','),
    ...data.map(item => [
      `"${String(item.title || '').replace(/"/g, '""')}"`,
      `"${String(item.channelTitle || '').replace(/"/g, '""')}"`,
      item.subscriberCount || 0,
      item.publishedAt || '',
      item.viewCount || 0,
      item.hourlyViews || 0,
      item.duration || 0,
      `https://www.youtube.com/watch?v=${item.videoId || ''}`
    ].join(','))
  ];

  const csvContent = csvRows.join('\n');
  
  // BOM 추가 (Excel에서 한글 깨짐 방지)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};


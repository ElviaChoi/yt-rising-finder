export const exportToCSV = (data, filename = 'youtube_results.csv') => {
  if (!data || data.length === 0) {
    alert('내보낼 데이터가 없습니다.');
    return;
  }

  const headers = [
    '떡상지수',
    '제목',
    '채널명',
    '구독자수',
    '조회수',
    '조회수/구독자',
    '시간당 조회수',
    '댓글수',
    '길이(분)',
    '업로드일',
    '검색키워드',
    'URL',
  ];

  const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

  const csvRows = [
    headers.join(','),
    ...data.map((item) =>
      [
        item.risingScore || 0,
        escapeCell(item.title),
        escapeCell(item.channelTitle),
        item.subscriberCount || 0,
        item.viewCount || 0,
        item.viewSubscriberRatio || 0,
        item.hourlyViews || 0,
        item.commentCount || 0,
        item.duration || 0,
        item.publishedAt || '',
        escapeCell(item.searchedKeyword),
        `https://www.youtube.com/watch?v=${item.videoId || ''}`,
      ].join(',')
    ),
  ];

  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

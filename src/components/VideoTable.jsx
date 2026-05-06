import { formatDate, parseDurationMinSec } from '../utils/dateCalculator';
import { getVideoMetrics } from '../utils/videoMetrics';

const formatNumber = (value) => Number(value || 0).toLocaleString('ko-KR');

const getCandidateSummary = (metrics) => {
  const parts = [];

  if (metrics.hasHiddenSubscribers) {
    parts.push('구독자 미공개');
  } else {
    parts.push(`조회/구독 ${metrics.viewSubscriberRatio.toFixed(1)}배`);
  }

  parts.push(`시간당 ${formatNumber(metrics.hourlyViews)}회`);
  parts.push(`${metrics.daysSinceUpload}일 전`);

  if (metrics.durationMinutes >= 12 && metrics.durationMinutes <= 40) {
    parts.push('12~40분 롱폼');
  }

  if (metrics.commentRate >= 0.002) {
    parts.push('댓글 반응 높음');
  }

  return parts.join(' · ');
};

const VideoTable = ({
  videos,
  onSave,
  onHide,
  onToggleReviewed,
  savedVideoIds = [],
  hiddenVideoIds = [],
  reviewedVideoIds = [],
  emptyMessage,
}) => {
  if (!videos || videos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500">
        {emptyMessage || '검색은 되었지만 현재 필터를 통과한 영상이 없습니다. 조건을 완화해보세요.'}
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="w-full max-w-full overflow-x-auto">
        <table className="min-w-[1240px] divide-y divide-slate-200">
          <thead className="bg-slate-950 text-white">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold">썸네일</th>
              <th className="px-3 py-3 text-left text-xs font-semibold">제목</th>
              <th className="px-3 py-3 text-left text-xs font-semibold">채널</th>
              <th className="px-3 py-3 text-right text-xs font-semibold">반응점수</th>
              <th className="px-3 py-3 text-right text-xs font-semibold">구독자</th>
              <th className="px-3 py-3 text-right text-xs font-semibold">조회수</th>
              <th className="px-3 py-3 text-right text-xs font-semibold">조회/구독</th>
              <th className="px-3 py-3 text-right text-xs font-semibold">시간당</th>
              <th className="px-3 py-3 text-right text-xs font-semibold">댓글</th>
              <th className="px-3 py-3 text-right text-xs font-semibold">길이</th>
              <th className="px-3 py-3 text-left text-xs font-semibold">업로드</th>
              <th className="px-3 py-3 text-left text-xs font-semibold">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {videos.map((video) => {
              const metrics = video.metrics || getVideoMetrics(video);
              const thumbnail =
                video.snippet.thumbnails?.medium ||
                video.snippet.thumbnails?.high ||
                video.snippet.thumbnails?.default;
              const isSaved = savedVideoIds.includes(video.videoId);
              const isHidden = hiddenVideoIds.includes(video.videoId);
              const isReviewed = reviewedVideoIds.includes(video.videoId);

              return (
                <tr key={video.videoId} className={isHidden ? 'bg-slate-100 opacity-60' : 'hover:bg-blue-50/50'}>
                  <td className="px-3 py-3 align-top">
                    {thumbnail && (
                      <a href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noreferrer">
                        <img
                          src={thumbnail.url}
                          alt={video.snippet.title}
                          className="h-[84px] w-[150px] rounded-md object-cover ring-1 ring-slate-200"
                        />
                      </a>
                    )}
                  </td>
                  <td className="max-w-[320px] px-3 py-3 align-top">
                    <a
                      href={`https://www.youtube.com/watch?v=${video.videoId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="line-clamp-3 text-sm font-bold leading-5 text-blue-700 hover:underline"
                    >
                      {video.snippet.title}
                    </a>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {video.searchedKeyword && (
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                          {video.searchedKeyword}
                        </span>
                      )}
                      {metrics.hasHiddenSubscribers && (
                        <span className="rounded bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                          구독자 미공개
                        </span>
                      )}
                      {!metrics.hasHiddenSubscribers && metrics.subscribers <= 10000 && (
                        <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                          1만 이하
                        </span>
                      )}
                      {metrics.daysSinceUpload <= 90 && (
                        <span className="rounded bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700">
                          90일 이내
                        </span>
                      )}
                      {isReviewed && (
                        <span className="rounded bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                          확인함
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{getCandidateSummary(metrics)}</p>
                  </td>
                  <td className="max-w-[150px] px-3 py-3 align-top text-sm text-slate-700">
                    <a
                      href={`https://www.youtube.com/channel/${video.snippet.channelId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="line-clamp-2 hover:text-blue-700 hover:underline"
                    >
                      {video.snippet.channelTitle}
                    </a>
                  </td>
                  <td
                    className="px-3 py-3 text-right align-top text-sm font-black text-rose-600"
                    title="반응점수는 시간당 조회수, 조회수/구독자 비율, 댓글률, 최근성, 영상 길이, 작은 채널 보너스를 합산합니다."
                  >
                    {metrics.risingScore}
                  </td>
                  <td className="px-3 py-3 text-right align-top text-sm">
                    {metrics.hasHiddenSubscribers ? '미공개' : formatNumber(metrics.subscribers)}
                  </td>
                  <td className="px-3 py-3 text-right align-top text-sm font-semibold">{formatNumber(metrics.views)}</td>
                  <td className="px-3 py-3 text-right align-top text-sm">
                    {metrics.hasHiddenSubscribers ? '참고' : `${metrics.viewSubscriberRatio.toFixed(1)}배`}
                  </td>
                  <td className="px-3 py-3 text-right align-top text-sm">{formatNumber(metrics.hourlyViews)}</td>
                  <td className="px-3 py-3 text-right align-top text-sm">{formatNumber(metrics.comments)}</td>
                  <td className="px-3 py-3 text-right align-top text-sm">
                    {parseDurationMinSec(video.contentDetails?.duration || 'PT0M')}
                  </td>
                  <td className="px-3 py-3 align-top text-sm text-slate-600">
                    <div>{formatDate(video.snippet.publishedAt)}</div>
                    <div className="text-xs text-slate-400">{metrics.daysSinceUpload}일 전</div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex flex-wrap gap-2">
                      {onToggleReviewed && (
                        <button
                          type="button"
                          onClick={() => onToggleReviewed(video)}
                          className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                            isReviewed
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-950 text-white hover:bg-slate-800'
                          }`}
                        >
                          {isReviewed ? '확인함' : '확인'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSave(video)}
                        className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                          isSaved
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isSaved ? '저장됨' : '저장'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onHide(video)}
                        className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
                      >
                        제외
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VideoTable;

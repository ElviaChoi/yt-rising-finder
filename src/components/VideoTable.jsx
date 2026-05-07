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
  parts.push(`${metrics.daysSinceUpload}일차`);

  if (metrics.durationMinutes >= 12 && metrics.durationMinutes <= 40) {
    parts.push('12~40분 롱폼');
  }

  if (metrics.commentRate >= 0.002) {
    parts.push('댓글 반응 높음');
  }

  return parts.join(' · ');
};

const CandidateActions = ({
  video,
  isSaved,
  isReviewed,
  isTracked,
  onSave,
  onHide,
  onToggleReviewed,
  onToggleTracked,
}) => (
  <div className="mt-3 flex flex-wrap gap-2">
    {onToggleReviewed && (
      <button
        type="button"
        onClick={() => onToggleReviewed(video)}
        className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
          isReviewed ? 'bg-blue-100 text-blue-800' : 'bg-slate-950 text-white hover:bg-slate-800'
        }`}
      >
        {isReviewed ? '확인함' : '확인'}
      </button>
    )}
    {onToggleTracked && (
      <button
        type="button"
        onClick={() => onToggleTracked(video)}
        className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
          isTracked ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`}
      >
        {isTracked ? '추적 중' : '추적'}
      </button>
    )}
    {onSave && (
      <button
        type="button"
        onClick={() => onSave(video)}
        className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
          isSaved ? 'bg-amber-100 text-amber-800' : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isSaved ? '저장됨' : '저장'}
      </button>
    )}
    {onHide && (
      <button
        type="button"
        onClick={() => onHide(video)}
        className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
      >
        제외
      </button>
    )}
  </div>
);

const MetricItem = ({ label, value, tone = 'slate', title }) => {
  const toneClasses = {
    slate: 'bg-slate-50 text-slate-700',
    rose: 'bg-rose-50 text-rose-700',
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
  };

  return (
    <div className={`rounded-md px-3 py-2 ${toneClasses[tone] || toneClasses.slate}`} title={title}>
      <div className="text-[11px] font-bold text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-black">{value}</div>
    </div>
  );
};

const VideoTable = ({
  videos,
  onSave,
  onHide,
  onToggleReviewed,
  onToggleTracked,
  savedVideoIds = [],
  hiddenVideoIds = [],
  reviewedVideoIds = [],
  trackedVideoIds = [],
  emptyMessage,
}) => {
  if (!videos || videos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500">
        {emptyMessage || '현재 조건을 통과한 영상이 없습니다. 조건을 완화해보세요.'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {videos.map((video) => {
        const metrics = video.metrics || getVideoMetrics(video);
        const thumbnail =
          video.snippet.thumbnails?.medium || video.snippet.thumbnails?.high || video.snippet.thumbnails?.default;
        const isSaved = savedVideoIds.includes(video.videoId) || video.isSaved === true;
        const isHidden = hiddenVideoIds.includes(video.videoId);
        const isReviewed = reviewedVideoIds.includes(video.videoId) || video.isReviewed === true;
        const isTracked = trackedVideoIds.includes(video.videoId) || video.isTracked === true;

        return (
          <article
            key={video.videoId}
            className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition ${
              isHidden ? 'opacity-60' : 'hover:border-blue-200 hover:bg-blue-50/30'
            }`}
          >
            <div className="grid gap-3 lg:grid-cols-[170px_minmax(0,1fr)]">
              {thumbnail && (
                <a
                  href={`https://www.youtube.com/watch?v=${video.videoId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  <img
                    src={thumbnail.url}
                    alt={video.snippet.title}
                    className="aspect-video w-full rounded-md object-cover ring-1 ring-slate-200 lg:w-[170px]"
                  />
                </a>
              )}

              <div className="min-w-0">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <a
                      href={`https://www.youtube.com/watch?v=${video.videoId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="line-clamp-2 text-sm font-black leading-5 text-blue-700 hover:underline"
                    >
                      {video.snippet.title}
                    </a>
                    <a
                      href={`https://www.youtube.com/channel/${video.snippet.channelId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block max-w-full truncate text-xs font-semibold text-slate-500 hover:text-blue-700 hover:underline"
                    >
                      {video.snippet.channelTitle}
                    </a>
                  </div>
                  <CandidateActions
                    video={video}
                    isSaved={isSaved}
                    isReviewed={isReviewed}
                    isTracked={isTracked}
                    onSave={onSave}
                    onHide={onHide}
                    onToggleReviewed={onToggleReviewed}
                    onToggleTracked={onToggleTracked}
                  />
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {video.searchedKeyword && (
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      {video.searchedKeyword}
                    </span>
                  )}
                  {video.searchedLanguageLabel && (
                    <span className="rounded bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">
                      {video.searchedLanguageLabel}
                    </span>
                  )}
                  {metrics.hasHiddenSubscribers && (
                    <span className="rounded bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                      구독자 미공개
                    </span>
                  )}
                  {!metrics.hasHiddenSubscribers && metrics.subscribers <= 10000 && (
                    <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">1만 이하</span>
                  )}
                  {metrics.daysSinceUpload <= 90 && (
                    <span className="rounded bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700">90일 이내</span>
                  )}
                  {isReviewed && (
                    <span className="rounded bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">확인함</span>
                  )}
                  {isTracked && (
                    <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">추적 중</span>
                  )}
                </div>

                {video.searchedKeywordNote && (
                  <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs leading-5 text-amber-800">
                    원형 메모: {video.searchedKeywordNote}
                  </p>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
                  <MetricItem
                    label="후보점수"
                    value={metrics.risingScore}
                    tone="rose"
                    title="시간당 조회수, 조회/구독 비율, 댓글 반응, 최근성, 영상 길이, 작은 채널 보너스를 합산합니다."
                  />
                  <MetricItem label="조회수" value={formatNumber(metrics.views)} tone="blue" />
                  <MetricItem
                    label="구독자"
                    value={metrics.hasHiddenSubscribers ? '미공개' : formatNumber(metrics.subscribers)}
                  />
                  <MetricItem
                    label="조회/구독"
                    value={metrics.hasHiddenSubscribers ? '참고' : `${metrics.viewSubscriberRatio.toFixed(1)}배`}
                  />
                  <MetricItem label="시간당" value={formatNumber(metrics.hourlyViews)} tone="emerald" />
                  <MetricItem label="댓글" value={formatNumber(metrics.comments)} />
                  <MetricItem label="길이" value={parseDurationMinSec(video.contentDetails?.duration || 'PT0M')} />
                  <MetricItem label="업로드" value={`${metrics.daysSinceUpload}일차`} />
                </div>

                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-slate-500">
                  <span>업로드 {formatDate(video.snippet.publishedAt)}</span>
                  <span>{getCandidateSummary(metrics)}</span>
                  {video.snapshotAt && <span>스냅샷 {formatDate(video.snapshotAt)}</span>}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default VideoTable;

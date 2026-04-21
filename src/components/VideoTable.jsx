import { formatDate, parseDurationMinSec } from '../utils/dateCalculator';
import { getVideoMetrics } from '../utils/videoMetrics';

const formatNumber = (value) => Number(value || 0).toLocaleString('ko-KR');

const VideoTable = ({ videos, onSave, onHide, savedVideoIds = [], hiddenVideoIds = [] }) => {
  if (!videos || videos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500">
        조건에 맞는 영상이 없습니다. 카테고리나 최소 조회수를 조금 넓혀보세요.
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="w-full max-w-full overflow-x-auto">
        <table className="min-w-[1180px] divide-y divide-slate-200">
          <thead className="bg-slate-950 text-white">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold">썸네일</th>
              <th className="px-3 py-3 text-left text-xs font-semibold">제목</th>
              <th className="px-3 py-3 text-left text-xs font-semibold">채널</th>
              <th className="px-3 py-3 text-right text-xs font-semibold">떡상지수</th>
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
                      {metrics.subscribers <= 10000 && (
                        <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                          1만 이하
                        </span>
                      )}
                      {metrics.daysSinceUpload <= 90 && (
                        <span className="rounded bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700">
                          90일 이내
                        </span>
                      )}
                    </div>
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
                  <td className="px-3 py-3 text-right align-top text-sm font-black text-rose-600">
                    {metrics.risingScore}
                  </td>
                  <td className="px-3 py-3 text-right align-top text-sm">{formatNumber(metrics.subscribers)}</td>
                  <td className="px-3 py-3 text-right align-top text-sm font-semibold">{formatNumber(metrics.views)}</td>
                  <td className="px-3 py-3 text-right align-top text-sm">
                    {metrics.viewSubscriberRatio.toFixed(1)}배
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
                    <div className="flex gap-2">
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

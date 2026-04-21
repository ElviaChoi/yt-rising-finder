const VideoPreview = ({ video }) => {
  if (!video) return null;

  const thumbnail =
    video.snippet.thumbnails?.maxres ||
    video.snippet.thumbnails?.high ||
    video.snippet.thumbnails?.medium ||
    video.snippet.thumbnails?.default;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex gap-4">
        {thumbnail && (
          <img
            src={thumbnail.url}
            alt={video.snippet.title}
            className="hidden h-28 w-48 rounded-md object-cover ring-1 ring-slate-200 sm:block"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-rose-600">현재 1순위 후보</p>
          <h2 className="mt-1 line-clamp-2 text-lg font-black text-slate-950">{video.snippet.title}</h2>
          <p className="mt-2 text-sm text-slate-600">{video.snippet.channelTitle}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded bg-rose-50 px-2 py-1 text-rose-700">떡상지수 {video.metrics?.risingScore}</span>
            <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">
              조회/구독 {video.metrics?.viewSubscriberRatio.toFixed(1)}배
            </span>
            <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">
              시간당 {video.metrics?.hourlyViews.toLocaleString('ko-KR')}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VideoPreview;

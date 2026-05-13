const VideoPreview = ({ video }) => {
  if (!video) return null;

  const thumbnail =
    video.snippet.thumbnails?.maxres ||
    video.snippet.thumbnails?.high ||
    video.snippet.thumbnails?.medium ||
    video.snippet.thumbnails?.default;

  return (
    <section className="rounded-lg border border-amber-300 bg-amber-50 p-4 shadow-sm ring-1 ring-amber-100">
      <div className="flex gap-4 border-l-4 border-amber-500 pl-3">
        {thumbnail && (
          <img
            src={thumbnail.url}
            alt={video.snippet.title}
            className="hidden h-28 w-48 rounded-md object-cover ring-1 ring-amber-200 sm:block"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">현재 1순위 후보</p>
          <h2 className="mt-1 line-clamp-2 text-lg font-black text-slate-950">{video.snippet.title}</h2>
          <p className="mt-2 text-sm font-semibold text-slate-700">{video.snippet.channelTitle}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded bg-rose-100 px-2 py-1 text-rose-800">반응점수 {video.metrics?.risingScore}</span>
            <span className="rounded bg-white px-2 py-1 text-slate-700 ring-1 ring-amber-100">
              조회/구독 {video.metrics?.hasHiddenSubscribers ? '미공개' : `${video.metrics?.viewSubscriberRatio.toFixed(1)}배`}
            </span>
            <span className="rounded bg-white px-2 py-1 text-slate-700 ring-1 ring-amber-100">
              시간당 {video.metrics?.hourlyViews.toLocaleString('ko-KR')}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VideoPreview;

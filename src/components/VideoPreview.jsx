import { calculateHourlyViews } from '../utils/dateCalculator';

const VideoPreview = ({ video, thumbnailSize }) => {
  if (!video) return null;

  const thumbnail = video.snippet.thumbnails.high || video.snippet.thumbnails.medium || video.snippet.thumbnails.default;
  const views = parseInt(video.statistics?.viewCount || 0);
  const hourlyViews = calculateHourlyViews(views, video.snippet.publishedAt);

  // 썸네일 크기 조정
  const getThumbnailSize = () => {
    const [width, height] = thumbnailSize.split('x').map(Number);
    return { width, height };
  };

  const size = getThumbnailSize();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-shrink-0">
          <img
            src={thumbnail.url}
            alt={video.snippet.title}
            className="rounded-lg border border-gray-300"
            style={{ 
              width: `${size.width}px`, 
              height: `${size.height}px`,
              objectFit: 'cover'
            }}
          />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 line-clamp-2">
            {video.snippet.title}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">채널:</span>
              <p className="font-medium text-gray-900">{video.snippet.channelTitle}</p>
            </div>
            <div>
              <span className="text-gray-600">조회수:</span>
              <p className="font-medium text-gray-900">{views.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-gray-600">시간당 조회수:</span>
              <p className="font-medium text-gray-900">{hourlyViews.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-gray-600">업로드일:</span>
              <p className="font-medium text-gray-900">
                {new Date(video.snippet.publishedAt).toLocaleDateString('ko-KR')}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <a
              href={`https://www.youtube.com/watch?v=${video.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              YouTube에서 보기
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPreview;


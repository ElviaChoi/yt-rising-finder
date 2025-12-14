import { calculateHourlyViews, parseDuration, parseDurationMinSec, formatDate } from '../utils/dateCalculator';

const VideoTable = ({ videos, onVideoSelect, filters }) => {
  if (!videos || videos.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        검색 결과가 없습니다.
      </div>
    );
  }

  const handleRowClick = (video) => {
    if (onVideoSelect) {
      onVideoSelect(video);
    }
  };

  const openVideo = (videoId, e) => {
    e.stopPropagation();
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {filters?.showThumbnail !== false && (
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  썸네일
                </th>
              )}
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px]">
                제목
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                채널명
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                구독자수
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                업로드일
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                조회수
              </th>
              {filters?.showHourlyViews !== false && (
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  시간당조회수
                </th>
              )}
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                길이(분:초)
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                이동
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {videos.map((video) => {
              const views = parseInt(video.statistics?.viewCount || 0);
              const hourlyViews = calculateHourlyViews(views, video.snippet.publishedAt);
              const duration = parseDuration(video.contentDetails?.duration || 'PT0M');
              const durationMinSec = parseDurationMinSec(video.contentDetails?.duration || 'PT0M');
              const subscribers = video.channelSubscribers || 0;

              const thumbnail = video.snippet.thumbnails?.medium || video.snippet.thumbnails?.default;

              return (
                <tr
                  key={video.videoId}
                  onClick={() => handleRowClick(video)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  {filters?.showThumbnail !== false && (
                    <td className="px-3 py-4 whitespace-nowrap">
                      {thumbnail && (
                        <img
                          src={thumbnail.url}
                          alt={video.snippet.title}
                          className="object-cover rounded border border-gray-300"
                          style={
                            filters?.thumbnailSize === 'large' 
                              ? { width: '280px', height: '158px', minWidth: '280px' }
                              : { width: '160px', height: '112px' }
                          }
                        />
                      )}
                    </td>
                  )}
                  <td className="px-3 py-4">
                    <a
                      href={`https://www.youtube.com/watch?v=${video.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline truncate block max-w-[200px]"
                      title={video.snippet.title}
                      style={{ wordBreak: 'break-word' }}
                    >
                      {video.snippet.title}
                    </a>
                  </td>
                  <td className="px-3 py-4">
                    <a
                      href={`https://www.youtube.com/channel/${video.snippet.channelId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate block max-w-[120px]"
                      title={video.snippet.channelTitle}
                      style={{ wordBreak: 'break-word' }}
                    >
                      {video.snippet.channelTitle}
                    </a>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {subscribers.toLocaleString()}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(video.snippet.publishedAt)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {views.toLocaleString()}
                  </td>
                  {filters?.showHourlyViews !== false && (
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {hourlyViews.toLocaleString()}
                    </td>
                  )}
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    {filters?.durationFormat === 'minsec' ? durationMinSec : `${duration}분`}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={(e) => openVideo(video.videoId, e)}
                      className="text-blue-600 hover:text-blue-900 px-3 py-1 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                    >
                      열기
                    </button>
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


import { useSocketStore } from '../../store/socketStore';
import { formatActivityMessage } from '../../utils/index';
import { relativeTime } from '../../utils/date';
import { cn } from '../../utils/index';

interface ActivityFeedProps {
  className?: string;
  maxItems?: number;
}

export function ActivityFeed({ className, maxItems = 20 }: ActivityFeedProps) {
  const { activityFeed, isConnected } = useSocketStore();

  const items = activityFeed.slice(0, maxItems);

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200', className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Live Activity Feed</h3>
        <div className="flex items-center gap-2">
          <div
            className={cn('h-2 w-2 rounded-full', isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-300')}
          />
          <span className="text-xs text-gray-400">{isConnected ? 'Live' : 'Connecting...'}</span>
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        {items.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            {isConnected ? 'No recent activity' : 'Connecting to activity feed...'}
          </div>
        ) : (
          items.map((activity) => (
            <div key={activity.activityId} className="px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="mt-1.5 h-2 w-2 rounded-full bg-brand-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-snug">
                    {formatActivityMessage(activity)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400" title={activity.timestamp}>
                      {relativeTime(activity.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

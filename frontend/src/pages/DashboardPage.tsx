import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import { projectsApi } from '../api';
import { ActivityFeed } from '../components/activity/ActivityFeed';
import { StatusBadge, PriorityBadge, OverdueBadge } from '../components/ui/Badges';
import { PageLoader, ErrorMessage } from '../components/ui/States';
import { formatDate, getDueDateColor } from '../utils/date';
import {
  FolderKanban,
  CheckSquare,
  AlertCircle,
  Users,
  TrendingUp,
} from 'lucide-react';
import { AdminDashboardMetrics, PMDashboardMetrics, DeveloperDashboardMetrics, Task, TaskStatus } from '../types';

export function DashboardPage() {
  const { user } = useAuthStore();
  const { onlineCount, onlineUsers } = useSocketStore();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', user?.id],
    queryFn: () => projectsApi.getDashboardMetrics(),
    select: (res) => res.data.data,
    refetchInterval: 60000,
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorMessage message="Failed to load dashboard" onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good {getGreeting()}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-gray-500 mt-1">
          {user?.role === 'ADMIN'
            ? 'Global agency overview'
            : user?.role === 'PROJECT_MANAGER'
            ? 'Your project summary'
            : 'Your assigned tasks'}
        </p>
      </div>

      {user?.role === 'ADMIN' && data && <AdminDashboard metrics={data as AdminDashboardMetrics} onlineCount={onlineCount} onlineUsers={onlineUsers} />}
      {user?.role === 'PROJECT_MANAGER' && data && <PMDashboard metrics={data as PMDashboardMetrics} />}
      {user?.role === 'DEVELOPER' && data && <DeveloperDashboard metrics={data as DeveloperDashboardMetrics} />}
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function MetricCard({ icon, label, value, subtext, color = 'blue' }: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subtext?: string;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>{icon}</div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
      {subtext && <div className="text-xs text-gray-400 mt-1">{subtext}</div>}
    </div>
  );
}

function AdminDashboard({
  metrics,
  onlineCount,
  onlineUsers,
}: {
  metrics: AdminDashboardMetrics;
  onlineCount: number;
  onlineUsers: Array<{ userId: string; name: string }>;
}) {
  const statusMap = Object.fromEntries(
    metrics.tasksByStatus.map((s: { status: TaskStatus; _count: { id: number } }) => [s.status, s._count.id]),
  );

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<FolderKanban className="h-5 w-5" />} label="Total Projects" value={metrics.totalProjects} color="blue" />
        <MetricCard icon={<CheckSquare className="h-5 w-5" />} label="Total Tasks" value={metrics.totalTasks} color="green" />
        <MetricCard icon={<AlertCircle className="h-5 w-5" />} label="Overdue Tasks" value={metrics.overdueCount} color="red" />
        <MetricCard icon={<Users className="h-5 w-5" />} label="Users Online" value={onlineCount} color="purple" subtext="right now" />
      </div>

      {/* Task breakdown + online users */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Tasks by Status</h3>
          <div className="space-y-3">
            {(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as TaskStatus[]).map((status) => (
              <div key={status} className="flex items-center justify-between">
                <StatusBadge status={status} />
                <span className="text-sm font-semibold text-gray-900">{statusMap[status] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Online users */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            Online Users ({onlineCount})
          </h3>
          <div className="space-y-2">
            {onlineUsers.length === 0 ? (
              <p className="text-gray-400 text-sm">No users online</p>
            ) : (
              onlineUsers.map((u) => (
                <div key={u.userId} className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-medium">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-700">{u.name}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <ActivityFeed className="lg:col-span-1" maxItems={8} />
      </div>

      <ActivityFeed className="lg:hidden" maxItems={15} />
    </div>
  );
}

function PMDashboard({ metrics }: { metrics: PMDashboardMetrics }) {
  const statusMap = Object.fromEntries(
    metrics.tasksByStatus.map((s: { status: TaskStatus; _count: { id: number } }) => [s.status, s._count.id]),
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<FolderKanban className="h-5 w-5" />} label="My Projects" value={metrics.totalProjects} color="blue" />
        <MetricCard icon={<CheckSquare className="h-5 w-5" />} label="Total Tasks" value={metrics.totalTasks} color="green" />
        <MetricCard icon={<AlertCircle className="h-5 w-5" />} label="Overdue Tasks" value={metrics.overdueCount} color="red" />
        <MetricCard icon={<TrendingUp className="h-5 w-5" />} label="In Review" value={statusMap['IN_REVIEW'] ?? 0} color="orange" subtext="awaiting review" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Task Status</h3>
          <div className="space-y-3">
            {(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as TaskStatus[]).map((status) => (
              <div key={status} className="flex items-center justify-between">
                <StatusBadge status={status} />
                <span className="text-sm font-semibold text-gray-900">{statusMap[status] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Due This Week</h3>
          <div className="space-y-2">
            {metrics.upcomingTasks.length === 0 ? (
              <p className="text-gray-400 text-sm">No upcoming tasks this week</p>
            ) : (
              metrics.upcomingTasks.slice(0, 5).map((task: Task) => (
                <div key={task.id} className="flex items-start gap-2 py-1">
                  <PriorityBadge priority={task.priority} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{task.title}</p>
                    <p className={`text-xs ${getDueDateColor(task.dueDate, task.isOverdue)}`}>
                      {formatDate(task.dueDate)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <ActivityFeed maxItems={8} />
      </div>
    </div>
  );
}

function DeveloperDashboard({ metrics }: { metrics: DeveloperDashboardMetrics }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <MetricCard icon={<CheckSquare className="h-5 w-5" />} label="Assigned Tasks" value={metrics.assignedTasks.length} color="blue" />
        <MetricCard icon={<AlertCircle className="h-5 w-5" />} label="Overdue" value={metrics.overdueCount} color="red" />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="In Progress"
          value={metrics.tasksByStatus.find((s: { status: TaskStatus; _count: { id: number } }) => s.status === 'IN_PROGRESS')?._count.id ?? 0}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">My Tasks</h3>
            <p className="text-xs text-gray-400 mt-0.5">Sorted by priority → due date</p>
          </div>
          <div className="divide-y divide-gray-50">
            {metrics.assignedTasks.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">No assigned tasks</div>
            ) : (
              metrics.assignedTasks.map((task: Task) => (
                <div key={task.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                        {task.isOverdue && <OverdueBadge />}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{task.project?.name}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <PriorityBadge priority={task.priority} />
                      <StatusBadge status={task.status} />
                    </div>
                    <div className={`text-xs flex-shrink-0 ${getDueDateColor(task.dueDate, task.isOverdue)}`}>
                      {formatDate(task.dueDate)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <ActivityFeed maxItems={8} />
      </div>
    </div>
  );
}

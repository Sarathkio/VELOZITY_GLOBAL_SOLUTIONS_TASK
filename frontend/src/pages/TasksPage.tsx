import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api';
import { PageLoader, ErrorMessage, EmptyState } from '../components/ui/States';
import { StatusBadge, PriorityBadge, OverdueBadge } from '../components/ui/Badges';
import { useAuthStore } from '../store/authStore';
import { formatDate, getDueDateColor } from '../utils/date';
import { Task, TaskStatus, Priority, TaskFilters } from '../types';
import { Filter, X } from 'lucide-react';

const ALL_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const ALL_PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function TasksPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  // Build filters from URL search params (persisted, shareable)
  const filters: TaskFilters = {
    status: (searchParams.get('status') as TaskStatus) || undefined,
    priority: (searchParams.get('priority') as Priority) || undefined,
    dueFrom: searchParams.get('dueFrom') || undefined,
    dueTo: searchParams.get('dueTo') || undefined,
    isOverdue: searchParams.get('isOverdue') === 'true' ? true : undefined,
    page: Number(searchParams.get('page')) || 1,
    limit: 20,
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => tasksApi.getAll(filters),
    select: (res) => ({
      tasks: res.data.data,
      meta: res.data.meta,
    }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      tasksApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const setFilter = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.delete('page'); // Reset to page 1 on filter change
    setSearchParams(newParams);
  };

  const clearFilters = () => setSearchParams({});

  const hasFilters = searchParams.toString() !== '';

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorMessage message="Failed to load tasks" onRetry={refetch} />;

  const tasks = data?.tasks ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500 mt-1">{meta?.total ?? 0} tasks</p>
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
            hasFilters ? 'border-brand-500 text-brand-600 bg-brand-50' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasFilters && (
            <span className="h-5 w-5 bg-brand-600 text-white rounded-full text-xs flex items-center justify-center">
              !
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Filters</h3>
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700">
                <X className="h-3 w-3" /> Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
              <select
                value={searchParams.get('status') ?? ''}
                onChange={(e) => setFilter('status', e.target.value || null)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">All statuses</option>
                {ALL_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Priority</label>
              <select
                value={searchParams.get('priority') ?? ''}
                onChange={(e) => setFilter('priority', e.target.value || null)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">All priorities</option>
                {ALL_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Due From</label>
              <input
                type="date"
                value={searchParams.get('dueFrom') ?? ''}
                onChange={(e) => setFilter('dueFrom', e.target.value ? new Date(e.target.value).toISOString() : null)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Due To</label>
              <input
                type="date"
                value={searchParams.get('dueTo') ?? ''}
                onChange={(e) => setFilter('dueTo', e.target.value ? new Date(e.target.value).toISOString() : null)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={searchParams.get('isOverdue') === 'true'}
                onChange={(e) => setFilter('isOverdue', e.target.checked ? 'true' : null)}
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              Show overdue only
            </label>
          </div>
        </div>
      )}

      {/* Task list */}
      {tasks.length === 0 ? (
        <EmptyState title="No tasks found" description={hasFilters ? 'Try adjusting your filters' : 'No tasks match your access scope'} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
          {tasks.map((task: Task) => (
            <div key={task.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium text-gray-900">{task.title}</span>
                    {task.isOverdue && <OverdueBadge />}
                  </div>
                  {task.description && (
                    <p className="text-xs text-gray-400 line-clamp-1 mb-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <PriorityBadge priority={task.priority} />
                    <span className="text-xs text-gray-400">
                      {task.project?.name}
                    </span>
                    {task.assignedDeveloper && (
                      <span className="text-xs text-gray-400">→ {task.assignedDeveloper.name}</span>
                    )}
                    {task.dueDate && (
                      <span className={`text-xs ${getDueDateColor(task.dueDate, task.isOverdue)}`}>
                        Due {formatDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {/* Developers can update their own task status; others see status badge */}
                  {user?.role === 'DEVELOPER' ? (
                    <select
                      value={task.status}
                      onChange={(e) => updateMutation.mutate({ id: task.id, status: e.target.value as TaskStatus })}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  ) : (
                    <StatusBadge status={task.status} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setFilter('page', String(page))}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                (filters.page ?? 1) === page
                  ? 'bg-brand-600 text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

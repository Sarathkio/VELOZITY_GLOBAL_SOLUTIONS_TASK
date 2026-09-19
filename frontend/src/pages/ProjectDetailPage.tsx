import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, tasksApi, usersApi } from '../api';
import { PageLoader, ErrorMessage, EmptyState } from '../components/ui/States';
import { StatusBadge, PriorityBadge, OverdueBadge } from '../components/ui/Badges';
import { ActivityFeed } from '../components/activity/ActivityFeed';
import { useAuthStore } from '../store/authStore';
import { formatDate, getDueDateColor } from '../utils/date';
import { Task, Priority, TaskStatus, User } from '../types';
import { Plus, X, ChevronLeft } from 'lucide-react';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignedDeveloperId: '',
    priority: 'MEDIUM' as Priority,
    dueDate: '',
  });
  const [formError, setFormError] = useState('');

  const { data: project, isLoading, error, refetch } = useQuery({
    queryKey: ['projects', id],
    queryFn: () => projectsApi.getById(id!),
    select: (res) => res.data.data,
    enabled: !!id,
  });

  const { data: developers } = useQuery({
    queryKey: ['users', 'DEVELOPER'],
    queryFn: () => usersApi.getAll('DEVELOPER'),
    select: (res) => res.data.data,
    enabled: user?.role !== 'DEVELOPER',
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: typeof taskForm) =>
      tasksApi.createForProject(id!, {
        title: data.title,
        description: data.description || undefined,
        assignedDeveloperId: data.assignedDeveloperId || null,
        priority: data.priority,
        dueDate: data.dueDate || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowCreateTask(false);
      setTaskForm({ title: '', description: '', assignedDeveloperId: '', priority: 'MEDIUM', dueDate: '' });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setFormError(e.response?.data?.error?.message ?? 'Failed to create task');
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      tasksApi.update(taskId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorMessage message="Failed to load project" onRetry={refetch} />;
  if (!project) return <ErrorMessage message="Project not found" />;

  const canManage = user?.role === 'ADMIN' || (user?.role === 'PROJECT_MANAGER' && project.createdById === user.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/projects" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-3">
          <ChevronLeft className="h-4 w-4" /> Projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            {project.description && <p className="text-gray-500 mt-1">{project.description}</p>}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm text-gray-400">Client: <strong className="text-gray-600">{project.client?.name}</strong></span>
              <span className="text-sm text-gray-400">PM: <strong className="text-gray-600">{project.createdBy?.name}</strong></span>
            </div>
          </div>
          {canManage && (
            <button
              onClick={() => setShowCreateTask(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> Add Task
            </button>
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">New Task</h2>
              <button onClick={() => setShowCreateTask(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {formError && (
              <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); setFormError(''); createTaskMutation.mutate(taskForm); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input type="text" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" required minLength={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value as Priority }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input type="datetime-local" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Developer</label>
                <select value={taskForm.assignedDeveloperId} onChange={e => setTaskForm(f => ({ ...f, assignedDeveloperId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Unassigned</option>
                  {developers?.map((d: User) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" rows={3} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateTask(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={createTaskMutation.isPending}
                  className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-60">
                  {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tasks + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Tasks ({project.tasks?.length ?? 0})</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {!project.tasks || project.tasks.length === 0 ? (
              <div className="py-8 text-center">
                <EmptyState title="No tasks yet" description={canManage ? 'Add your first task to get started' : ''} />
              </div>
            ) : (
              project.tasks.map((task: Task) => (
                <div key={task.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium text-gray-900">{task.title}</span>
                        {task.isOverdue && <OverdueBadge />}
                      </div>
                      {task.description && <p className="text-xs text-gray-400 line-clamp-1">{task.description}</p>}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <PriorityBadge priority={task.priority} />
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
                      {canManage ? (
                        <select
                          value={task.status}
                          onChange={(e) => updateTaskMutation.mutate({ taskId: task.id, status: e.target.value as TaskStatus })}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                          {(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as TaskStatus[]).map(s => (
                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                          ))}
                        </select>
                      ) : (
                        <StatusBadge status={task.status} />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <ActivityFeed maxItems={15} />
      </div>
    </div>
  );
}

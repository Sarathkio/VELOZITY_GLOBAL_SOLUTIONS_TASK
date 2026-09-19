import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, clientsApi } from '../api';
import { PageLoader, ErrorMessage, EmptyState } from '../components/ui/States';
import { useAuthStore } from '../store/authStore';
import { FolderKanban, Plus, X, ChevronRight } from 'lucide-react';
import { Project, Client } from '../types';

export function ProjectsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', clientId: '' });
  const [formError, setFormError] = useState('');

  const { data: projects, isLoading, error, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll(),
    select: (res) => res.data.data,
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.getAll(),
    select: (res) => res.data.data,
    enabled: user?.role !== 'DEVELOPER',
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; clientId: string }) =>
      projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowCreate(false);
      setForm({ name: '', description: '', clientId: '' });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setFormError(e.response?.data?.error?.message ?? 'Failed to create project');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.clientId) {
      setFormError('Please select a client');
      return;
    }
    createMutation.mutate({ name: form.name, description: form.description || undefined, clientId: form.clientId });
  };

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorMessage message="Failed to load projects" onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">{projects?.length ?? 0} projects</p>
        </div>
        {(user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER') && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            New Project
          </button>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">New Project</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                  minLength={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                <select
                  value={form.clientId}
                  onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                >
                  <option value="">Select a client</option>
                  {clients?.map((c: Client) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-60"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project list */}
      {!projects || projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description={user?.role !== 'DEVELOPER' ? 'Create your first project to get started' : 'No projects assigned to you'}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project: Project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-brand-200 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="h-9 w-9 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FolderKanban className="h-5 w-5 text-brand-600" />
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-brand-500 transition-colors" />
              </div>

              <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">{project.name}</h3>
              {project.description && (
                <p className="text-xs text-gray-400 line-clamp-2 mb-3">{project.description}</p>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                <span className="text-xs text-gray-400">{project.client?.name}</span>
                <span className="text-xs font-medium text-gray-600">
                  {project._count?.tasks ?? 0} tasks
                </span>
              </div>

              {project.createdBy && (
                <p className="text-xs text-gray-400 mt-1">PM: {project.createdBy.name}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../api';
import { PageLoader, ErrorMessage } from '../../components/ui/States';
import { User, Role } from '../../types';
import { Plus, X, Trash2 } from 'lucide-react';

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  PROJECT_MANAGER: 'Project Manager',
  DEVELOPER: 'Developer',
};

export function UsersPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'DEVELOPER' as Role });
  const [formError, setFormError] = useState('');

  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
    select: (res) => res.data.data,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreate(false);
      setForm({ name: '', email: '', password: '', role: 'DEVELOPER' });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setFormError(e.response?.data?.error?.message ?? 'Failed to create user');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorMessage message="Failed to load users" onRetry={refetch} />;

  const roleGroups: Record<Role, User[]> = {
    ADMIN: users?.filter(u => u.role === 'ADMIN') ?? [],
    PROJECT_MANAGER: users?.filter(u => u.role === 'PROJECT_MANAGER') ?? [],
    DEVELOPER: users?.filter(u => u.role === 'DEVELOPER') ?? [],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">{users?.length ?? 0} users</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> New User
        </button>
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">New User</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            {formError && <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>}
            <form onSubmit={(e) => { e.preventDefault(); setFormError(''); createMutation.mutate(form); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" required minLength={8} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="DEVELOPER">Developer</option>
                  <option value="PROJECT_MANAGER">Project Manager</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-60">
                  {createMutation.isPending ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User groups */}
      {(Object.keys(roleGroups) as Role[]).map((role) => (
        <div key={role} className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">{ROLE_LABELS[role]}s ({roleGroups[role].length})</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {roleGroups[role].length === 0 ? (
              <div className="py-4 text-center text-gray-400 text-sm">No users</div>
            ) : (
              roleGroups[role].map((user) => (
                <div key={user.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Delete user ${user.name}?`)) {
                        deleteMutation.mutate(user.id);
                      }
                    }}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

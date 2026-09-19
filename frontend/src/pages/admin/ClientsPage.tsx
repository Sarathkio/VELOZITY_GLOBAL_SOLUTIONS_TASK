import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '../../api';
import { PageLoader, ErrorMessage, EmptyState } from '../../components/ui/States';
import { Client } from '../../types';
import { Plus, X, Trash2, Building2 } from 'lucide-react';

export function ClientsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', notes: '' });
  const [formError, setFormError] = useState('');

  const { data: clients, isLoading, error, refetch } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.getAll(),
    select: (res) => res.data.data,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => clientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowCreate(false);
      setForm({ name: '', email: '', phone: '', company: '', notes: '' });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setFormError(e.response?.data?.error?.message ?? 'Failed to create client');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      alert(e.response?.data?.error?.message ?? 'Failed to delete client');
    },
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorMessage message="Failed to load clients" onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-1">{clients?.length ?? 0} clients</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> New Client
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">New Client</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            {formError && <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>}
            <form onSubmit={(e) => { e.preventDefault(); setFormError(''); createMutation.mutate(form); }} className="space-y-4">
              {[
                { key: 'name', label: 'Client Name *', type: 'text', required: true },
                { key: 'company', label: 'Company', type: 'text', required: false },
                { key: 'email', label: 'Email', type: 'email', required: false },
                { key: 'phone', label: 'Phone', type: 'tel', required: false },
              ].map(({ key, label, type, required }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} value={(form as Record<string, string>)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" required={required} />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" rows={3} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-60">
                  {createMutation.isPending ? 'Creating...' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!clients || clients.length === 0 ? (
        <EmptyState title="No clients yet" description="Add your first client to get started" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((client: Client) => (
            <div key={client.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="h-9 w-9 bg-green-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-green-600" />
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Delete client ${client.name}?`)) {
                      deleteMutation.mutate(client.id);
                    }
                  }}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">{client.name}</h3>
              {client.company && <p className="text-xs text-gray-400 mt-0.5">{client.company}</p>}
              <div className="mt-3 space-y-1">
                {client.email && <p className="text-xs text-gray-500">{client.email}</p>}
                {client.phone && <p className="text-xs text-gray-500">{client.phone}</p>}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50">
                <span className="text-xs text-gray-400">{client._count?.projects ?? 0} projects</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

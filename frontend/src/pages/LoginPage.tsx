import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api';
import { Zap } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await authApi.login(email, password);
      const { accessToken, user } = res.data.data;
      // Access token stored in Zustand memory — refresh token is in HttpOnly cookie (set by server)
      setAuth(user, accessToken);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message ?? 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 bg-brand-600 rounded-xl mb-4">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Velozity</h1>
          <p className="text-gray-500 mt-1">Agency Project Dashboard</p>
        </div>

        {/* Login form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in</h2>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="you@velozity.dev"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-3">Demo credentials (all use: Password123!)</p>
            <div className="grid grid-cols-1 gap-2">
              {[
                { label: 'Admin', email: 'admin@velozity.dev' },
                { label: 'PM — Priya', email: 'priya@velozity.dev' },
                { label: 'PM — Marco', email: 'marco@velozity.dev' },
                { label: 'Dev — Ravi', email: 'ravi@velozity.dev' },
                { label: 'Dev — Aisha', email: 'aisha@velozity.dev' },
              ].map(({ label, email: demoEmail }) => (
                <button
                  key={demoEmail}
                  type="button"
                  onClick={() => fillCredentials(demoEmail, 'Password123!')}
                  className="text-left px-3 py-2 text-xs bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                  <span className="font-medium text-gray-700">{label}</span>
                  <span className="text-gray-400 ml-2">{demoEmail}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

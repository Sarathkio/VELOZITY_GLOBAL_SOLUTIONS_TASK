import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { NotificationBell } from '../components/notifications/NotificationBell';
import { useSocketStore } from '../store/socketStore';
import { useAuthStore } from '../store/authStore';
import { Users } from 'lucide-react';

export function AppLayout() {
  const { onlineCount } = useSocketStore();
  const { user } = useAuthStore();

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        {/* Top header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex-1" />

          <div className="flex items-center gap-4">
            {/* Online presence — shown to all (only admin sees full list) */}
            {user?.role === 'ADMIN' && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Users className="h-4 w-4 text-green-500" />
                <span className="font-medium text-green-600">{onlineCount}</span>
                <span>online</span>
              </div>
            )}

            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

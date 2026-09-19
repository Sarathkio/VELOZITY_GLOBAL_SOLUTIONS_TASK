import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Building2,
  LogOut,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api';
import { cn } from '../utils/index';
import { Role } from '../types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Projects', href: '/projects', icon: <FolderKanban className="h-4 w-4" />, roles: ['ADMIN', 'PROJECT_MANAGER'] },
  { label: 'Tasks', href: '/tasks', icon: <CheckSquare className="h-4 w-4" /> },
  { label: 'Users', href: '/admin/users', icon: <Users className="h-4 w-4" />, roles: ['ADMIN'] },
  { label: 'Clients', href: '/admin/clients', icon: <Building2 className="h-4 w-4" />, roles: ['ADMIN'] },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      logout();
      navigate('/login');
    }
  };

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.roles || (user?.role && item.roles.includes(user.role)),
  );

  const roleLabels: Record<Role, string> = {
    ADMIN: 'Administrator',
    PROJECT_MANAGER: 'Project Manager',
    DEVELOPER: 'Developer',
  };

  const roleLabel = user?.role ? roleLabels[user.role] : '';

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-gray-900 flex flex-col z-20">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-800">
        <div className="h-8 w-8 bg-brand-600 rounded-lg flex items-center justify-center">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <span className="text-white font-bold text-lg">Velozity</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNav.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800',
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-gray-800">
        <div className="px-3 py-2 mb-2">
          <p className="text-white text-sm font-medium truncate">{user?.name}</p>
          <p className="text-gray-400 text-xs truncate">{roleLabel}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg text-sm transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

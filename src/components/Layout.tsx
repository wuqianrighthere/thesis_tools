import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { LayoutDashboard, PlusCircle, FlaskConical, List, LogOut } from 'lucide-react';
import clsx from 'clsx';

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Add Model', path: '/entry', icon: PlusCircle },
    { name: 'Variables Lab', path: '/lab', icon: FlaskConical },
    { name: 'My Models', path: '/models', icon: List },
  ];

  return (
    <div className="flex h-screen bg-stone-50 text-stone-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-stone-200 bg-stone-100/50 flex flex-col">
        <div className="p-6">
          <h1 className="text-lg font-semibold tracking-tight text-stone-800">Topic Sandbox</h1>
          <p className="text-xs text-stone-500 mt-1">OB Research Models</p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-stone-200/60 text-stone-900'
                    : 'text-stone-600 hover:bg-stone-200/40 hover:text-stone-900'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-stone-200">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-stone-300 flex items-center justify-center text-stone-600 font-medium text-sm">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-900 truncate">
                {user?.displayName || 'Scholar'}
              </p>
              <p className="text-xs text-stone-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="mt-2 flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-stone-600 rounded-md hover:bg-stone-200/40 hover:text-stone-900 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

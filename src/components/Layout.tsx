import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { LayoutDashboard, PlusCircle, FlaskConical, List, Lightbulb, LogOut, Settings, History, Menu, X, ExternalLink, Component } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Add Model', path: '/entry', icon: PlusCircle },
    { name: 'Variables Lab', path: '/lab', icon: FlaskConical },
    { name: 'New Ideas', path: '/ideas', icon: Lightbulb },
    { name: 'Models Pool', path: '/models', icon: List },
    { name: 'Variables Pool', path: '/variables', icon: Component },
  ];

  if (user?.isAdmin) {
    navItems.push({ name: 'Action Logs', path: '/logs', icon: History });
    navItems.push({ name: 'Useful Links', path: '/links', icon: ExternalLink });
    navItems.push({ name: 'Admin Settings', path: '/admin', icon: Settings });
  } else {
    navItems.push({ name: 'Action Logs', path: '/logs', icon: History });
    navItems.push({ name: 'Useful Links', path: '/links', icon: ExternalLink });
  }

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex h-screen bg-stone-50 text-stone-900 font-sans overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-stone-200 z-20 flex items-center justify-between px-4">
        <h1 className="text-lg font-semibold tracking-tight text-stone-800">我爱OB毕业论文</h1>
        <button onClick={toggleSidebar} className="p-2 text-stone-600 hover:bg-stone-100 rounded-md">
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/20 z-30"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        "fixed md:static inset-y-0 left-0 z-40 w-64 border-r border-stone-200 bg-stone-100/95 md:bg-stone-100/50 flex flex-col transition-transform duration-300 ease-in-out backdrop-blur-sm md:backdrop-blur-none",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 hidden md:block">
          <h1 className="text-lg font-semibold tracking-tight text-stone-800">我爱OB毕业论文</h1>
          <p className="text-xs text-stone-500 mt-1">OB Research Models</p>
        </div>
        <div className="p-6 md:hidden flex justify-between items-center border-b border-stone-200 bg-white/50">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-stone-800">Menu</h1>
          </div>
          <button onClick={closeSidebar} className="p-1 text-stone-600 hover:bg-stone-200 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          <nav className="px-4 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={closeSidebar}
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
        </div>

        <div className="p-4 border-t border-stone-200 bg-white/50 md:bg-transparent">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-stone-300 flex items-center justify-center text-stone-600 font-medium text-sm shrink-0">
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
            className="mt-2 flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-stone-600 rounded-md hover:bg-stone-200/40 hover:text-stone-900 transition-all cursor-pointer active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

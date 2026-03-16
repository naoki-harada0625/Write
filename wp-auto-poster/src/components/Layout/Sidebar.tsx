import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileEdit,
  List,
  Image,
  Settings,
  Globe,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'ダッシュボード', end: true },
  { to: '/editor', icon: FileEdit, label: '記事作成', end: false },
  { to: '/posts', icon: List, label: '記事一覧', end: false },
  { to: '/media', icon: Image, label: 'メディア', end: false },
  { to: '/settings', icon: Settings, label: '設定', end: false },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 z-30
          bg-white dark:bg-gray-900
          border-r border-gray-200 dark:border-gray-700
          transform transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
          flex flex-col
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-500" />
            <span className="font-bold text-gray-900 dark:text-white text-sm">
              WP Auto Poster
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => window.innerWidth < 1024 && onClose()}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                transition-colors duration-150
                ${isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }
              `}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
            WordPress Auto Poster v1.0
          </p>
        </div>
      </aside>
    </>
  );
}

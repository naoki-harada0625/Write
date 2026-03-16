import { Menu, Moon, Sun, ExternalLink } from 'lucide-react';
import { getAuthConfig } from '../../utils/api';

interface HeaderProps {
  onMenuToggle: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  title: string;
}

export function Header({ onMenuToggle, isDark, onToggleDark, title }: HeaderProps) {
  const config = getAuthConfig();

  return (
    <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-4 flex-shrink-0">
      {/* Mobile menu button */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      {/* Title */}
      <h1 className="flex-1 text-lg font-semibold text-gray-900 dark:text-white truncate">
        {title}
      </h1>

      {/* Site link */}
      {config?.siteUrl && (
        <a
          href={config.siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span className="max-w-[200px] truncate">{config.siteUrl}</span>
        </a>
      )}

      {/* Dark mode toggle */}
      <button
        onClick={onToggleDark}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="ダークモード切替"
      >
        {isDark ? (
          <Sun className="w-5 h-5 text-yellow-400" />
        ) : (
          <Moon className="w-5 h-5 text-gray-600" />
        )}
      </button>
    </header>
  );
}

import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const PAGE_TITLES: Record<string, string> = {
  '/': 'ダッシュボード',
  '/editor': '記事作成',
  '/posts': '記事一覧',
  '/media': 'メディアライブラリ',
  '/settings': '接続設定',
};

function getTitle(pathname: string): string {
  if (pathname.startsWith('/editor/')) return '記事編集';
  return PAGE_TITLES[pathname] ?? 'WP Auto Poster';
}

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('wp_auto_poster_dark');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('wp_auto_poster_dark', String(isDark));
  }, [isDark]);

  const title = getTitle(location.pathname);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onMenuToggle={() => setSidebarOpen(prev => !prev)}
          isDark={isDark}
          onToggleDark={() => setIsDark(prev => !prev)}
          title={title}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

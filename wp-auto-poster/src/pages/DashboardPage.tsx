import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Globe, FileEdit, Image, Settings, TrendingUp, Clock, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWordPressApi } from '../hooks/useWordPressApi';
import { Spinner } from '../components/common/Spinner';
import { getAuthConfig } from '../utils/api';
import type { WPPost } from '../types/wordpress';

interface Stats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  scheduledPosts: number;
  totalMedia: number;
}

function StatCard({
  title,
  value,
  icon: Icon,
  className,
  to,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  className?: string;
  to?: string;
}) {
  const content = (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 ${to ? 'hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${className}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentPosts, setRecentPosts] = useState<WPPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const config = getAuthConfig();
  const { getPosts, getMedia } = useWordPressApi();

  const loadDashboard = async () => {
    if (!config) return;
    setIsLoading(true);
    try {
      const [allResult, draftResult, futureResult, mediaResult] = await Promise.allSettled([
        getPosts({ status: 'publish', per_page: 5, orderby: 'date', order: 'desc' }),
        getPosts({ status: 'draft', per_page: 1 }),
        getPosts({ status: 'future', per_page: 1 }),
        getMedia(1, 1),
      ]);

      let totalPosts = 0;
      let publishedPosts = 0;
      let recentList: WPPost[] = [];

      if (allResult.status === 'fulfilled') {
        const total = parseInt(allResult.value.headers.get('X-WP-Total') ?? '0', 10);
        publishedPosts = total;
        totalPosts += total;
        recentList = allResult.value.data;
      }

      let draftPosts = 0;
      if (draftResult.status === 'fulfilled') {
        draftPosts = parseInt(draftResult.value.headers.get('X-WP-Total') ?? '0', 10);
        totalPosts += draftPosts;
      }

      let scheduledPosts = 0;
      if (futureResult.status === 'fulfilled') {
        scheduledPosts = parseInt(futureResult.value.headers.get('X-WP-Total') ?? '0', 10);
        totalPosts += scheduledPosts;
      }

      let totalMedia = 0;
      if (mediaResult.status === 'fulfilled') {
        totalMedia = parseInt(mediaResult.value.headers.get('X-WP-Total') ?? '0', 10);
      }

      setStats({ totalPosts, publishedPosts, draftPosts, scheduledPosts, totalMedia });
      setRecentPosts(recentList);
    } catch (err) {
      toast.error('データの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (!config) {
    return (
      <div className="max-w-md mx-auto mt-8 text-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            接続設定が必要です
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            WordPressサイトのURL、ユーザー名、アプリケーションパスワードを設定してください。
          </p>
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
          >
            <Settings className="w-4 h-4" />
            設定を開く
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">概要</h2>
          <button
            type="button"
            onClick={loadDashboard}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            更新
          </button>
        </div>

        {isLoading && !stats ? (
          <div className="flex items-center justify-center h-32">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard
              title="総記事数"
              value={stats?.totalPosts ?? '-'}
              icon={FileText}
              className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              to="/posts"
            />
            <StatCard
              title="公開済み"
              value={stats?.publishedPosts ?? '-'}
              icon={Globe}
              className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
              to="/posts"
            />
            <StatCard
              title="下書き"
              value={stats?.draftPosts ?? '-'}
              icon={FileEdit}
              className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
              to="/posts"
            />
            <StatCard
              title="予約投稿"
              value={stats?.scheduledPosts ?? '-'}
              icon={Clock}
              className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
              to="/posts"
            />
            <StatCard
              title="メディア数"
              value={stats?.totalMedia ?? '-'}
              icon={Image}
              className="bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400"
              to="/media"
            />
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">クイックアクション</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/editor"
            className="flex flex-col items-center gap-2 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-center"
          >
            <FileEdit className="w-6 h-6" />
            <span className="text-sm font-medium">記事を作成</span>
          </Link>
          <Link
            to="/posts"
            className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors text-center"
          >
            <FileText className="w-6 h-6" />
            <span className="text-sm font-medium">記事一覧</span>
          </Link>
          <Link
            to="/media"
            className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors text-center"
          >
            <Image className="w-6 h-6" />
            <span className="text-sm font-medium">メディア</span>
          </Link>
          <Link
            to="/settings"
            className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors text-center"
          >
            <Settings className="w-6 h-6" />
            <span className="text-sm font-medium">設定</span>
          </Link>
        </div>
      </div>

      {/* Recent posts */}
      {recentPosts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              <TrendingUp className="inline w-5 h-5 mr-2 text-blue-500" />
              最近の記事
            </h2>
            <Link to="/posts" className="text-sm text-blue-500 hover:text-blue-600">
              すべて表示
            </Link>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {recentPosts.map((post, i) => (
              <div
                key={post.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  i < recentPosts.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {post.title.rendered}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(post.date).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <Link
                  to={`/editor/${post.id}`}
                  className="flex-shrink-0 p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                >
                  <FileEdit className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connected site info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <p className="text-sm text-blue-700 dark:text-blue-400">
          <Globe className="inline w-4 h-4 mr-1.5" />
          接続中のサイト:{' '}
          <a
            href={config.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline hover:no-underline"
          >
            {config.siteUrl}
          </a>
          {' '}（ユーザー: {config.username}）
        </p>
      </div>
    </div>
  );
}

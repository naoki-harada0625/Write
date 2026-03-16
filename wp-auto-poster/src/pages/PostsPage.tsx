import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Edit, Trash2, ExternalLink, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePosts } from '../hooks/usePosts';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Spinner } from '../components/common/Spinner';
import type { WPPost } from '../types/wordpress';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  publish: { label: '公開', className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  draft: { label: '下書き', className: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' },
  future: { label: '予約', className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  pending: { label: '承認待ち', className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  private: { label: '非公開', className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
  trash: { label: 'ゴミ箱', className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
};

const STATUS_FILTERS = [
  { value: 'any', label: 'すべて' },
  { value: 'publish', label: '公開済み' },
  { value: 'draft', label: '下書き' },
  { value: 'future', label: '予約' },
  { value: 'pending', label: '承認待ち' },
];

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function PostsPage() {
  const navigate = useNavigate();
  const { posts, isLoading, error, totalPages, totalPosts, fetchPosts, deletePost } = usePosts();
  const [statusFilter, setStatusFilter] = useState('any');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<WPPost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPosts({
      page,
      per_page: 10,
      status: statusFilter === 'any' ? 'any' : statusFilter,
      search: search || undefined,
      orderby: 'date',
      order: 'desc',
    });
  }, [page, statusFilter, search, fetchPosts]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deletePost(deleteTarget.id);
      toast.success('記事を削除しました');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters & Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Status filter */}
          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                type="button"
                onClick={() => { setStatusFilter(f.value); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === f.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex gap-2 sm:ml-auto">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="記事を検索..."
                className="pl-8 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              検索
            </button>
          </div>
        </div>
      </div>

      {/* Posts list */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Spinner />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 dark:text-red-400 text-sm">
            {error}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p className="text-sm">記事が見つかりません</p>
            <Link
              to="/editor"
              className="mt-3 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              記事を作成する
            </Link>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2 bg-gray-50 dark:bg-gray-700/50 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700">
              <span>タイトル</span>
              <span>ステータス</span>
              <span>日付</span>
              <span>操作</span>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {posts.map(post => {
                const statusInfo = STATUS_LABELS[post.status] ?? { label: post.status, className: 'bg-gray-100 text-gray-600' };
                return (
                  <div key={post.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {post.title.rendered || '(タイトルなし)'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          ID: {post.id}
                          {post.slug && <span> · {post.slug}</span>}
                        </p>
                      </div>

                      <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>

                      <span className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                        {formatDate(post.date)}
                      </span>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => navigate(`/editor/${post.id}`)}
                          className="p-1.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded transition-colors"
                          title="編集"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {post.link && (
                          <a
                            href={post.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-green-500 dark:hover:text-green-400 rounded transition-colors"
                            title="サイトで表示"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(post)}
                          className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            全 {totalPosts} 件
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="記事を削除"
        message={`「${deleteTarget?.title.rendered ?? ''}」を完全に削除しますか？この操作は取り消せません。`}
        confirmLabel={isDeleting ? '削除中...' : '削除する'}
        cancelLabel="キャンセル"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isDanger
      />
    </div>
  );
}

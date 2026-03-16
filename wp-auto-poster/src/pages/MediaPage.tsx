import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Trash2, Copy, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWordPressApi } from '../hooks/useWordPressApi';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Spinner } from '../components/common/Spinner';
import type { WPMedia } from '../types/wordpress';

export function MediaPage() {
  const [media, setMedia] = useState<WPMedia[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMedia, setTotalMedia] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<WPMedia | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const { getMedia, uploadMedia, deleteMedia } = useWordPressApi();

  const loadMedia = useCallback(async (p: number) => {
    setIsLoading(true);
    try {
      const { data, headers } = await getMedia(p, 20);
      setMedia(data);
      setTotalPages(parseInt(headers.get('X-WP-TotalPages') ?? '1', 10));
      setTotalMedia(parseInt(headers.get('X-WP-Total') ?? '0', 10));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'メディアの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [getMedia]);

  useEffect(() => {
    loadMedia(page);
  }, [page, loadMedia]);

  const handleUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast.error('画像ファイルを選択してください');
      return;
    }

    setIsUploading(true);
    let successCount = 0;
    for (const file of imageFiles) {
      try {
        await uploadMedia(file);
        successCount++;
      } catch (err) {
        toast.error(`「${file.name}」のアップロードに失敗しました`);
      }
    }
    setIsUploading(false);

    if (successCount > 0) {
      toast.success(`${successCount}件の画像をアップロードしました`);
      setPage(1);
      loadMedia(1);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleUpload(e.dataTransfer.files);
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteMedia(deleteTarget.id);
      toast.success('メディアを削除しました');
      setMedia(prev => prev.filter(m => m.id !== deleteTarget.id));
      setTotalMedia(prev => prev - 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleCopyUrl = (media: WPMedia) => {
    navigator.clipboard.writeText(media.source_url).then(() => {
      setCopiedId(media.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success('URLをコピーしました');
    });
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div
        ref={dropZoneRef}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed transition-colors p-8 text-center cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Spinner size="lg" />
            <p className="text-sm text-gray-500 dark:text-gray-400">アップロード中...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              クリックまたはドラッグ&ドロップで画像をアップロード
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              PNG, JPG, GIF, WebP など
            </p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => e.target.files && handleUpload(e.target.files)}
        />
      </div>

      {/* Stats */}
      {totalMedia > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          全 {totalMedia} 件の画像
        </p>
      )}

      {/* Media grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Spinner size="lg" />
        </div>
      ) : media.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            アップロードされた画像がありません
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {media.map(item => (
            <div
              key={item.id}
              className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
                <img
                  src={
                    item.media_details?.sizes?.thumbnail?.source_url ??
                    item.source_url
                  }
                  alt={item.alt_text || item.title.rendered}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => handleCopyUrl(item)}
                  className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                  title="URLをコピー"
                >
                  {copiedId === item.id ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-700" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(item)}
                  className="p-2 bg-white rounded-full hover:bg-red-50 transition-colors"
                  title="削除"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>

              {/* Info */}
              <div className="p-2">
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate" title={item.title.rendered}>
                  {item.title.rendered}
                </p>
                {item.media_details?.width && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {item.media_details.width} × {item.media_details.height}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
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
            disabled={page === totalPages || isLoading}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="画像を削除"
        message={`「${deleteTarget?.title.rendered ?? ''}」を完全に削除しますか？`}
        confirmLabel={isDeleting ? '削除中...' : '削除する'}
        cancelLabel="キャンセル"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isDanger
      />
    </div>
  );
}

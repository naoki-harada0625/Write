import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Upload,
  X,
  ExternalLink,
  Calendar,
  Tag,
  FolderOpen,
  Image as ImageIcon,
  ChevronDown,
} from 'lucide-react';
import { RichTextEditor } from '../components/Editor/RichTextEditor';
import { Spinner } from '../components/common/Spinner';
import { useWordPressApi } from '../hooks/useWordPressApi';
import type { WPCategory, WPTag, WPMedia } from '../types/wordpress';

type EditorStatus = 'publish' | 'draft' | 'future';

interface EditorForm {
  title: string;
  content: string;
  status: EditorStatus;
  date: string;
  slug: string;
  excerpt: string;
  categories: number[];
  tags: number[];
  featuredMediaId: number | null;
  featuredMediaUrl: string | null;
}

const DEFAULT_FORM: EditorForm = {
  title: '',
  content: '',
  status: 'publish',
  date: '',
  slug: '',
  excerpt: '',
  categories: [],
  tags: [],
  featuredMediaId: null,
  featuredMediaUrl: null,
};

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<EditorForm>(DEFAULT_FORM);
  const [categories, setCategories] = useState<WPCategory[]>([]);
  const [tags, setTags] = useState<WPTag[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [mediaItems, setMediaItems] = useState<WPMedia[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  const {
    getPost,
    createPost,
    updatePost,
    getCategories,
    getTags,
    createTag,
    uploadMedia,
    getMedia,
  } = useWordPressApi();

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [cats, tgs] = await Promise.all([getCategories(), getTags()]);
        setCategories(cats);
        setTags(tgs);

        if (isEdit && id) {
          const post = await getPost(parseInt(id, 10));
          const postStatus = post.status as EditorStatus;

          // Find featured media URL
          let featuredUrl: string | null = null;
          if (post.featured_media) {
            try {
              const embedded = (post as any)._embedded?.['wp:featuredmedia']?.[0];
              featuredUrl = embedded?.source_url ?? null;
            } catch {
              // ignore
            }
          }

          setForm({
            title: post.title.rendered || '',
            content: post.content.rendered || '',
            status: ['publish', 'draft', 'future'].includes(postStatus) ? postStatus : 'draft',
            date: post.date ? post.date.slice(0, 16) : '',
            slug: post.slug || '',
            excerpt: post.excerpt.rendered?.replace(/<[^>]*>/g, '') || '',
            categories: post.categories || [],
            tags: post.tags || [],
            featuredMediaId: post.featured_media || null,
            featuredMediaUrl: featuredUrl,
          });
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'データの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [id, isEdit, getPost, getCategories, getTags]);

  const handleTagAdd = async () => {
    const names = tagInput.split(',').map(s => s.trim()).filter(Boolean);
    if (names.length === 0) return;

    const newTagIds: number[] = [];
    for (const name of names) {
      // Check if tag already exists
      const existing = tags.find(t => t.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        if (!form.tags.includes(existing.id)) {
          newTagIds.push(existing.id);
        }
        continue;
      }
      try {
        const newTag = await createTag(name);
        setTags(prev => [...prev, newTag]);
        newTagIds.push(newTag.id);
      } catch {
        toast.error(`タグ「${name}」の作成に失敗しました`);
      }
    }

    if (newTagIds.length > 0) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, ...newTagIds] }));
    }
    setTagInput('');
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('画像ファイルを選択してください');
      return;
    }
    setIsUploading(true);
    try {
      const media = await uploadMedia(file);
      setForm(prev => ({
        ...prev,
        featuredMediaId: media.id,
        featuredMediaUrl: media.source_url,
      }));
      toast.success('画像をアップロードしました');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '画像のアップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
    e.target.value = '';
  };

  const loadMediaLibrary = async () => {
    setIsLoadingMedia(true);
    try {
      const { data } = await getMedia(1, 30);
      setMediaItems(data);
    } catch (err) {
      toast.error('メディアの読み込みに失敗しました');
    } finally {
      setIsLoadingMedia(false);
    }
  };

  const handleSubmit = async (statusOverride?: EditorStatus) => {
    const finalStatus = statusOverride ?? form.status;
    if (!form.title.trim()) {
      toast.error('タイトルを入力してください');
      return;
    }
    if (finalStatus === 'future' && !form.date) {
      toast.error('予約投稿には日時を指定してください');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: import('../types/wordpress').WPPostCreateRequest = {
        title: form.title,
        content: form.content,
        status: finalStatus,
        slug: form.slug || undefined,
        excerpt: form.excerpt || undefined,
        categories: form.categories,
        tags: form.tags,
        featured_media: form.featuredMediaId ?? undefined,
        ...(finalStatus === 'future' && form.date ? { date: form.date + ':00' } : {}),
      };

      let post;
      if (isEdit && id) {
        post = await updatePost(parseInt(id, 10), payload);
        toast.success('記事を更新しました');
      } else {
        post = await createPost(payload);
        toast.success(
          finalStatus === 'publish' ? '記事を公開しました' :
          finalStatus === 'draft' ? '下書きとして保存しました' :
          '予約投稿を設定しました'
        );
      }

      if (post.link) {
        setPublishedUrl(post.link);
      }
      if (!isEdit) {
        navigate(`/editor/${post.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '投稿に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const selectedTagNames = form.tags
    .map(id => tags.find(t => t.id === id)?.name)
    .filter(Boolean) as string[];

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Published URL notification */}
      {publishedUrl && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
          <ExternalLink className="w-4 h-4 flex-shrink-0" />
          <span>記事URL:</span>
          <a
            href={publishedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline truncate"
          >
            {publishedUrl}
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main editor area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Title */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="記事タイトルを入力..."
              className="w-full text-2xl font-bold bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
            />
          </div>

          {/* Content editor */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              本文
            </label>
            <RichTextEditor
              value={form.content}
              onChange={content => setForm(prev => ({ ...prev, content }))}
            />
          </div>

          {/* Excerpt */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              抜粋（excerpt）
            </label>
            <textarea
              value={form.excerpt}
              onChange={e => setForm(prev => ({ ...prev, excerpt: e.target.value }))}
              placeholder="記事の要約を入力（省略可）..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Sidebar panel */}
        <div className="space-y-4">
          {/* Publish panel */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">公開設定</h3>

            {/* Status */}
            <div className="mb-3">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">ステータス</label>
              <div className="relative">
                <select
                  value={form.status}
                  onChange={e => setForm(prev => ({ ...prev, status: e.target.value as EditorStatus }))}
                  className="w-full appearance-none px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="publish">公開</option>
                  <option value="draft">下書き</option>
                  <option value="future">予約投稿</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Schedule date */}
            {form.status === 'future' && (
              <div className="mb-3">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <Calendar className="inline w-3 h-3 mr-1" />
                  投稿日時
                </label>
                <input
                  type="datetime-local"
                  value={form.date}
                  onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Slug */}
            <div className="mb-4">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">スラッグ（任意）</label>
              <input
                type="text"
                value={form.slug}
                onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="自動生成"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Publish buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleSubmit(form.status)}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? <Spinner size="sm" /> : null}
                {isEdit ? '更新する' : (
                  form.status === 'publish' ? '公開する' :
                  form.status === 'draft' ? '下書き保存' : '予約設定'
                )}
              </button>
              {!isEdit && form.status !== 'draft' && (
                <button
                  type="button"
                  onClick={() => handleSubmit('draft')}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  下書き保存
                </button>
              )}
            </div>
          </div>

          {/* Featured Image */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              <ImageIcon className="inline w-4 h-4 mr-1.5" />
              アイキャッチ画像
            </h3>

            {form.featuredMediaUrl ? (
              <div className="relative">
                <img
                  src={form.featuredMediaUrl}
                  alt="アイキャッチ"
                  className="w-full rounded-lg object-cover max-h-48"
                />
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, featuredMediaId: null, featuredMediaUrl: null }))}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div
                ref={dragRef}
                onDragOver={e => e.preventDefault()}
                onDrop={handleFileDrop}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <Spinner className="mx-auto" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      クリックまたはドラッグ&ドロップ
                    </p>
                  </>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            <button
              type="button"
              onClick={() => {
                setShowMediaLibrary(prev => !prev);
                if (!showMediaLibrary) loadMediaLibrary();
              }}
              className="w-full mt-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-xs font-medium transition-colors"
            >
              <FolderOpen className="inline w-3.5 h-3.5 mr-1" />
              メディアライブラリから選択
            </button>

            {/* Media library popup */}
            {showMediaLibrary && (
              <div className="mt-3 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                {isLoadingMedia ? (
                  <div className="flex items-center justify-center h-24">
                    <Spinner />
                  </div>
                ) : mediaItems.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-6">
                    画像がありません
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-1 p-1">
                    {mediaItems.map(media => (
                      <button
                        key={media.id}
                        type="button"
                        onClick={() => {
                          setForm(prev => ({
                            ...prev,
                            featuredMediaId: media.id,
                            featuredMediaUrl: media.source_url,
                          }));
                          setShowMediaLibrary(false);
                        }}
                        className="aspect-square overflow-hidden rounded hover:ring-2 hover:ring-blue-500"
                      >
                        <img
                          src={
                            media.media_details?.sizes?.thumbnail?.source_url ??
                            media.source_url
                          }
                          alt={media.alt_text || media.title.rendered}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Categories */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              <FolderOpen className="inline w-4 h-4 mr-1.5" />
              カテゴリ
            </h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {categories.map(cat => (
                <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.categories.includes(cat.id)}
                    onChange={e => {
                      if (e.target.checked) {
                        setForm(prev => ({ ...prev, categories: [...prev.categories, cat.id] }));
                      } else {
                        setForm(prev => ({ ...prev, categories: prev.categories.filter(c => c !== cat.id) }));
                      }
                    }}
                    className="w-3.5 h-3.5 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{cat.name}</span>
                  <span className="text-xs text-gray-400">({cat.count})</span>
                </label>
              ))}
              {categories.length === 0 && (
                <p className="text-xs text-gray-500">カテゴリがありません</p>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              <Tag className="inline w-4 h-4 mr-1.5" />
              タグ
            </h3>

            {/* Selected tags */}
            {selectedTagNames.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {form.tags.map(tagId => {
                  const tag = tags.find(t => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <span
                      key={tagId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs"
                    >
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagId) }))}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            <div className="flex gap-1">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleTagAdd())}
                placeholder="タグ名（コンマ区切り）"
                className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleTagAdd}
                className="px-2 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-xs transition-colors"
              >
                追加
              </button>
            </div>

            {/* Existing tags suggestions */}
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tags
                  .filter(t => !form.tags.includes(t.id))
                  .slice(0, 15)
                  .map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, tags: [...prev.tags, tag.id] }))}
                      className="px-1.5 py-0.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded text-xs transition-colors"
                    >
                      {tag.name}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

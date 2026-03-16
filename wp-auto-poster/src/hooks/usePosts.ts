import { useState, useCallback } from 'react';
import type { WPPost, PostsQueryParams } from '../types/wordpress';
import { useWordPressApi } from './useWordPressApi';

export function usePosts() {
  const [posts, setPosts] = useState<WPPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const { getPosts, deletePost: apiDeletePost } = useWordPressApi();

  const fetchPosts = useCallback(async (params: PostsQueryParams = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, headers } = await getPosts(params);
      setPosts(data);
      const total = parseInt(headers.get('X-WP-Total') ?? '0', 10);
      const totalPg = parseInt(headers.get('X-WP-TotalPages') ?? '1', 10);
      setTotalPosts(total);
      setTotalPages(totalPg);
    } catch (err) {
      const message = err instanceof Error ? err.message : '記事の取得に失敗しました';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [getPosts]);

  const deletePost = useCallback(async (id: number) => {
    await apiDeletePost(id);
    setPosts(prev => prev.filter(p => p.id !== id));
    setTotalPosts(prev => prev - 1);
  }, [apiDeletePost]);

  return {
    posts,
    isLoading,
    error,
    totalPages,
    totalPosts,
    fetchPosts,
    deletePost,
  };
}

import { useCallback } from 'react';
import type {
  WPPost,
  WPPostCreateRequest,
  WPCategory,
  WPTag,
  WPMedia,
  PostsQueryParams,
} from '../types/wordpress';
import { apiRequest, apiRequestWithHeaders } from '../utils/api';

export function useWordPressApi() {
  // Posts
  const getPosts = useCallback(async (params: PostsQueryParams = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.per_page) query.set('per_page', String(params.per_page));
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    if (params.orderby) query.set('orderby', params.orderby);
    if (params.order) query.set('order', params.order);
    query.set('_embed', '1');

    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequestWithHeaders<WPPost[]>(`/posts${qs}`);
  }, []);

  const getPost = useCallback(async (id: number) => {
    return apiRequest<WPPost>(`/posts/${id}?_embed=1`);
  }, []);

  const createPost = useCallback(async (data: WPPostCreateRequest) => {
    return apiRequest<WPPost>('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }, []);

  const updatePost = useCallback(async (id: number, data: WPPostCreateRequest) => {
    return apiRequest<WPPost>(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }, []);

  const deletePost = useCallback(async (id: number) => {
    return apiRequest<WPPost>(`/posts/${id}?force=true`, {
      method: 'DELETE',
    });
  }, []);

  // Categories
  const getCategories = useCallback(async () => {
    return apiRequest<WPCategory[]>('/categories?per_page=100');
  }, []);

  // Tags
  const getTags = useCallback(async () => {
    return apiRequest<WPTag[]>('/tags?per_page=100');
  }, []);

  const createTag = useCallback(async (name: string) => {
    return apiRequest<WPTag>('/tags', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }, []);

  // Media
  const getMedia = useCallback(async (page = 1, perPage = 20) => {
    return apiRequestWithHeaders<WPMedia[]>(
      `/media?page=${page}&per_page=${perPage}&media_type=image`
    );
  }, []);

  const uploadMedia = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);

    return apiRequest<WPMedia>('/media', {
      method: 'POST',
      body: formData,
    });
  }, []);

  const deleteMedia = useCallback(async (id: number) => {
    return apiRequest<WPMedia>(`/media/${id}?force=true`, {
      method: 'DELETE',
    });
  }, []);

  return {
    getPosts,
    getPost,
    createPost,
    updatePost,
    deletePost,
    getCategories,
    getTags,
    createTag,
    getMedia,
    uploadMedia,
    deleteMedia,
  };
}

export interface WPRendered {
  rendered: string;
  raw?: string;
  protected?: boolean;
}

export interface WPPost {
  id: number;
  date: string;
  date_gmt: string;
  guid: WPRendered;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: 'publish' | 'future' | 'draft' | 'pending' | 'private' | 'trash';
  type: string;
  link: string;
  title: WPRendered;
  content: WPRendered;
  excerpt: WPRendered;
  author: number;
  featured_media: number;
  comment_status: string;
  ping_status: string;
  sticky: boolean;
  template: string;
  format: string;
  categories: number[];
  tags: number[];
}

export interface WPPostCreateRequest {
  title?: string;
  content?: string;
  status?: 'publish' | 'future' | 'draft' | 'pending' | 'private';
  date?: string;
  slug?: string;
  excerpt?: string;
  featured_media?: number;
  categories?: number[];
  tags?: number[];
}

export interface WPCategory {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  parent: number;
}

export interface WPTag {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
}

export interface WPMedia {
  id: number;
  date: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: WPRendered;
  author: number;
  alt_text: string;
  caption: WPRendered;
  description: WPRendered;
  media_type: string;
  mime_type: string;
  media_details: {
    width: number;
    height: number;
    file: string;
    sizes: Record<string, {
      file: string;
      width: number;
      height: number;
      mime_type: string;
      source_url: string;
    }>;
  };
  source_url: string;
}

export interface WPUser {
  id: number;
  name: string;
  url: string;
  description: string;
  link: string;
  slug: string;
  avatar_urls: Record<string, string>;
}

export interface WPError {
  code: string;
  message: string;
  data?: {
    status: number;
  };
}

export interface AuthConfig {
  siteUrl: string;
  username: string;
  applicationPassword: string;
}

export interface PostsQueryParams {
  page?: number;
  per_page?: number;
  status?: string;
  search?: string;
  orderby?: string;
  order?: 'asc' | 'desc';
}

export type PostStatus = 'publish' | 'future' | 'draft' | 'pending' | 'private';

export interface DashboardStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  scheduledPosts: number;
  totalMedia: number;
}

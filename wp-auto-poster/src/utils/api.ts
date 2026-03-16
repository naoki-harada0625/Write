import type { AuthConfig, WPError } from '../types/wordpress';

const AUTH_CONFIG_KEY = 'wp_auto_poster_auth';

export function getAuthConfig(): AuthConfig | null {
  try {
    const stored = localStorage.getItem(AUTH_CONFIG_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as AuthConfig;
  } catch {
    return null;
  }
}

export function saveAuthConfig(config: AuthConfig): void {
  localStorage.setItem(AUTH_CONFIG_KEY, JSON.stringify(config));
}

export function clearAuthConfig(): void {
  localStorage.removeItem(AUTH_CONFIG_KEY);
}

export function buildAuthHeader(config: AuthConfig): string {
  return 'Basic ' + btoa(`${config.username}:${config.applicationPassword}`);
}

export function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export interface ApiRequestOptions extends RequestInit {
  config?: AuthConfig | null;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { config, ...fetchOptions } = options;
  const authConfig = config ?? getAuthConfig();

  if (!authConfig) {
    throw new Error('認証設定が見つかりません。設定画面で接続設定を行ってください。');
  }

  const baseUrl = normalizeUrl(authConfig.siteUrl);
  const url = `${baseUrl}/wp-json/wp/v2${endpoint}`;

  const headers: Record<string, string> = {
    Authorization: buildAuthHeader(authConfig),
    ...(fetchOptions.headers as Record<string, string> ?? {}),
  };

  if (!(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = (await response.json()) as WPError;
      errorMessage = errorData.message || errorMessage;
    } catch {
      // use default message
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function apiRequestWithHeaders<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<{ data: T; headers: Headers }> {
  const { config, ...fetchOptions } = options;
  const authConfig = config ?? getAuthConfig();

  if (!authConfig) {
    throw new Error('認証設定が見つかりません。設定画面で接続設定を行ってください。');
  }

  const baseUrl = normalizeUrl(authConfig.siteUrl);
  const url = `${baseUrl}/wp-json/wp/v2${endpoint}`;

  const headers: Record<string, string> = {
    Authorization: buildAuthHeader(authConfig),
    ...(fetchOptions.headers as Record<string, string> ?? {}),
  };

  if (!(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = (await response.json()) as WPError;
      errorMessage = errorData.message || errorMessage;
    } catch {
      // use default message
    }
    throw new Error(errorMessage);
  }

  const data = await response.json() as T;
  return { data, headers: response.headers };
}

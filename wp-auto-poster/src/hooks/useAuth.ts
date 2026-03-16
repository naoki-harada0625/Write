import { useState, useCallback } from 'react';
import type { AuthConfig, WPUser } from '../types/wordpress';
import { getAuthConfig, saveAuthConfig, clearAuthConfig, buildAuthHeader, normalizeUrl } from '../utils/api';

interface AuthState {
  config: AuthConfig | null;
  isAuthenticated: boolean;
  user: WPUser | null;
}

const DEFAULT_SITE_URL = 'https://bibimaru.xsrv.jp';

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => {
    const config = getAuthConfig();
    return {
      config,
      isAuthenticated: !!config,
      user: null,
    };
  });

  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const testConnection = useCallback(async (config: AuthConfig): Promise<WPUser> => {
    setIsTesting(true);
    setTestError(null);

    try {
      const baseUrl = normalizeUrl(config.siteUrl);
      const url = `${baseUrl}/wp-json/wp/v2/users/me`;
      const response = await fetch(url, {
        headers: {
          Authorization: buildAuthHeader(config),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // use default
        }
        throw new Error(errorMessage);
      }

      const user = await response.json() as WPUser;
      return user;
    } catch (err) {
      const message = err instanceof Error ? err.message : '接続テストに失敗しました';
      setTestError(message);
      throw err;
    } finally {
      setIsTesting(false);
    }
  }, []);

  const saveConfig = useCallback((config: AuthConfig) => {
    saveAuthConfig(config);
    setState(prev => ({ ...prev, config, isAuthenticated: true }));
  }, []);

  const logout = useCallback(() => {
    clearAuthConfig();
    setState({ config: null, isAuthenticated: false, user: null });
  }, []);

  return {
    ...state,
    isTesting,
    testError,
    testConnection,
    saveConfig,
    logout,
    defaultSiteUrl: DEFAULT_SITE_URL,
  };
}

import { useState } from 'react';
import { CheckCircle, XCircle, Eye, EyeOff, Wifi } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import type { AuthConfig } from '../types/wordpress';
import { Spinner } from '../components/common/Spinner';

export function SettingsPage() {
  const { config, defaultSiteUrl, testConnection, saveConfig, logout } = useAuth();

  const [formData, setFormData] = useState<AuthConfig>({
    siteUrl: config?.siteUrl ?? defaultSiteUrl,
    username: config?.username ?? '',
    applicationPassword: config?.applicationPassword ?? '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field: keyof AuthConfig, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!formData.siteUrl || !formData.username || !formData.applicationPassword) {
      toast.error('すべてのフィールドを入力してください');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const user = await testConnection(formData);
      setTestResult({
        success: true,
        message: `接続成功！ユーザー: ${user.name} (${user.slug})`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '接続に失敗しました';
      setTestResult({ success: false, message: msg });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!formData.siteUrl || !formData.username || !formData.applicationPassword) {
      toast.error('すべてのフィールドを入力してください');
      return;
    }
    setIsSaving(true);
    try {
      // Test before save
      await testConnection(formData);
      saveConfig(formData);
      toast.success('設定を保存しました');
      setTestResult({ success: true, message: '接続が確認され、設定が保存されました' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '接続に失敗しました';
      toast.error(`保存失敗: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    setFormData({ siteUrl: defaultSiteUrl, username: '', applicationPassword: '' });
    setTestResult(null);
    toast.success('ログアウトしました');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          WordPress 接続設定
        </h2>

        <div className="space-y-5">
          {/* Site URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              WordPress サイトURL
            </label>
            <input
              type="url"
              value={formData.siteUrl}
              onChange={e => handleChange('siteUrl', e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              ユーザー名
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={e => handleChange('username', e.target.value)}
              placeholder="WordPressのユーザー名"
              autoComplete="username"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Application Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              アプリケーションパスワード
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.applicationPassword}
                onChange={e => handleChange('applicationPassword', e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                autoComplete="current-password"
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              WordPress管理画面 → ユーザー → プロフィール → アプリケーションパスワードから生成してください
            </p>
          </div>

          {/* Test result */}
          {testResult && (
            <div
              className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                testResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || isSaving}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {isTesting ? <Spinner size="sm" /> : <Wifi className="w-4 h-4" />}
              接続テスト
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isTesting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {isSaving ? <Spinner size="sm" /> : null}
              設定を保存
            </button>

            {config && (
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors ml-auto"
              >
                設定をクリア
              </button>
            )}
          </div>
        </div>
      </div>

      {/* How to get Application Password */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">
          アプリケーションパスワードの取得方法
        </h3>
        <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1.5 list-decimal list-inside">
          <li>WordPress管理画面にログイン</li>
          <li>「ユーザー」→「プロフィール」に移動</li>
          <li>ページ下部の「アプリケーションパスワード」セクションまでスクロール</li>
          <li>アプリ名に「WP Auto Poster」と入力</li>
          <li>「新しいアプリケーションパスワードを追加」をクリック</li>
          <li>生成されたパスワードをコピーして上のフィールドに貼り付け</li>
        </ol>
      </div>
    </div>
  );
}

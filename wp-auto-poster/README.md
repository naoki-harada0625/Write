# WP Auto Poster

WordPress REST API を利用した自動投稿 Web アプリ。GitHub Pages でホストされるフロントエンド SPA。

## 機能

- **ダッシュボード** - 記事数・メディア数の統計、最近の記事一覧
- **記事エディタ** - リッチテキスト/HTML切り替え、カテゴリ・タグ・アイキャッチ画像対応
- **予約投稿** - ISO 8601 形式の日時指定
- **記事一覧・管理** - フィルタ/検索/ページネーション/編集/削除
- **メディアライブラリ** - ドラッグ&ドロップアップロード、画像管理
- **ダークモード** - ライト/ダーク切り替えトグル
- **認証設定** - Application Password による Basic 認証、localStorage 保存

## 技術スタック

- React 19 + Vite 8 + TypeScript
- Tailwind CSS v4
- TipTap v3（リッチテキストエディタ）
- React Router v7
- react-hot-toast

## セットアップ

```bash
cd wp-auto-poster
npm install --legacy-peer-deps
npm run dev
```

## ビルド & デプロイ

```bash
# ビルド
npm run build

# GitHub Pages にデプロイ
npm run deploy
```

> デプロイ先: `https://<username>.github.io/wp-auto-poster/`

## WordPress 接続設定

アプリ起動後、設定画面で以下を入力してください:

1. **WordPress サイト URL** - 例: `https://bibimaru.xsrv.jp`
2. **ユーザー名** - WordPress のログインユーザー名
3. **アプリケーションパスワード** - 以下の手順で取得

### アプリケーションパスワードの取得方法

1. WordPress 管理画面にログイン
2. 「ユーザー」→「プロフィール」へ移動
3. ページ下部「アプリケーションパスワード」セクションまでスクロール
4. アプリ名に `WP Auto Poster` と入力
5. 「新しいアプリケーションパスワードを追加」をクリック
6. 生成されたパスワードをコピーして設定画面に貼り付け

---

## CORS 設定（重要）

GitHub Pages から WordPress REST API を呼び出すには、WordPress 側で **CORS ヘッダー** の許可が必要です。

### 方法 1: `functions.php` に追加

WordPress テーマの `functions.php` に以下を追加してください:

```php
add_action('init', function () {
    $allowed_origins = [
        'https://<your-username>.github.io',
        'http://localhost:5173',
    ];

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if (in_array($origin, $allowed_origins, true)) {
        header("Access-Control-Allow-Origin: {$origin}");
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce');
        header('Access-Control-Allow-Credentials: true');
    }

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        status_header(200);
        exit;
    }
});
```

### 方法 2: `.htaccess` に追加

WordPress ルートの `.htaccess` に以下を追加してください:

```apache
<IfModule mod_headers.c>
    SetEnvIf Origin "^https://<your-username>\.github\.io$" ORIGIN_OK=1
    Header always set Access-Control-Allow-Origin "%{HTTP_ORIGIN}e" env=ORIGIN_OK
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" env=ORIGIN_OK
    Header always set Access-Control-Allow-Headers "Authorization, Content-Type, X-WP-Nonce" env=ORIGIN_OK
    Header always set Access-Control-Allow-Credentials "true" env=ORIGIN_OK
</IfModule>

# Handle preflight OPTIONS requests
RewriteCond %{REQUEST_METHOD} OPTIONS
RewriteRule ^(.*)$ $1 [R=200,L]
```

### 方法 3: プラグイン使用

WordPress プラグイン「**WP CORS**」または「**Enable CORS**」をインストールして有効化してください。

---

## セキュリティ注意事項

- Application Password は `localStorage` にのみ保存されます（サーバーには送信されません）
- 必ず HTTPS 接続で使用してください
- 使用しない場合は設定画面から「設定をクリア」してください

## ルーティング

| パス | 画面 |
|---|---|
| `/` | ダッシュボード |
| `/editor` | 記事作成 |
| `/editor/:id` | 記事編集 |
| `/posts` | 記事一覧 |
| `/media` | メディアライブラリ |
| `/settings` | 接続設定 |

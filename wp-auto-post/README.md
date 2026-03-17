# wp-auto-post — 投資・SIDE FIRE 記事 自動生成 & WordPress 投稿

Claude Code から一言指示するだけで、**トピック選定 → 記事生成 → WordPress 投稿** まで全自動で完了するスクリプトです。

## ファイル構成

```
wp-auto-post/
├── wp-auto-post.sh      # メインスクリプト
├── config.env           # WordPress認証情報（.gitignore対象）
├── topics.json          # トピックリスト（24種類）
├── posted-log.json      # 投稿済み記事ログ（重複防止）
└── README.md            # このファイル
```

## セットアップ

### 1. config.env の確認

`config.env` に WordPress の接続情報が設定されていることを確認してください:

```bash
WP_URL=https://bibimaru.xsrv.jp
WP_USER=agjamek@gmail.com
WP_APP_PASSWORD="RPCD fstY gbES BrSk qWMy YsOn"
```

### 2. 依存ツールの確認

```bash
curl --version   # curl が必要
jq --version     # jq が必要
python3 --version  # URLエンコード用
```

## 使い方

### 基本実行（トピック自動選定 → 記事生成 → 投稿）

```bash
bash wp-auto-post/wp-auto-post.sh
```

### トピック指定

```bash
bash wp-auto-post/wp-auto-post.sh "新NISAで月3万円積立投資する方法"
```

### 下書き保存（確認してから公開）

```bash
bash wp-auto-post/wp-auto-post.sh --draft
```

### 複数記事を連続投稿

```bash
bash wp-auto-post/wp-auto-post.sh --count 3
```

### 準備フェーズのみ（記事プロンプトだけ出力）

```bash
bash wp-auto-post/wp-auto-post.sh --prepare
```

### 生成済みファイルを直接投稿

```bash
bash wp-auto-post/wp-auto-post.sh --post \
  --title "新NISAで月3万円積立投資する最適な銘柄3選" \
  --content-file /tmp/article.html \
  --excerpt "新NISAで積立投資を始める方向けに..."
```

---

## Claude Code での実際の運用

Claude Code に以下のように指示するだけで動作します:

```
今日の投資記事を1本投稿して
```

```
新NISAについての記事を書いてWordPressに公開して
```

```
SIDE FIRE関連で下書き記事を作って
```

```
今週分の記事を3本まとめて投稿して
```

### Claude Code の処理フロー

1. `bash wp-auto-post/wp-auto-post.sh` を実行
2. スクリプトがトピックを選定し、記事生成プロンプトを出力
3. Claude Code がプロンプトに従って記事 HTML を生成
4. Claude Code が記事を `/tmp/wp-article-{topic_id}.txt` に保存
5. スクリプトがファイルを読み込み、WordPress に投稿
6. 投稿ログ (`posted-log.json`) を更新

---

## トピックカテゴリ一覧

### 投資系（10種）
- 新NISA活用術
- インデックス投資（S&P500/オルカン比較）
- 高配当株投資戦略
- ETF選び方・比較
- 投資信託コスト比較
- 米国株 vs 日本株分析
- 金（ゴールド）投資
- 債券・バランスファンド
- 投資初心者向けガイド
- 最新市場トレンド解説

### SIDE FIRE系（10種）
- SIDE FIREに必要な資産額シミュレーション
- 副収入でSIDE FIREを実現する方法
- 支出最適化術
- 30代からのFIRE計画
- サイドビジネス選び方
- 4%ルールの実践
- FIRE後の生活設計・社会保険
- 配当金生活の計算
- iDeCo・小規模企業共済活用
- 節約 vs 収入アップ

### 複合系（4種）
- 新NISAでSIDE FIREロードマップ
- 30代サラリーマンの資産形成戦略
- 副業収入を投資に回す方法
- 生活防衛資金の考え方

---

## 記事品質仕様

| 項目 | 仕様 |
|---|---|
| タイトル | 32文字前後・数字と具体性を含む |
| 総文字数 | 3,000〜5,000文字 |
| 見出し構成 | H2: 3〜5個、H2内にH3: 1〜3個 |
| 文体 | です/ます調、1文60〜80文字以内 |
| SEO | タイトル・H2/H3に主要キーワードを含む |
| 抜粋 | 120文字程度のメタディスクリプション |

---

## 投稿ログの確認

```bash
cat wp-auto-post/posted-log.json | jq .
```

```json
[
  {
    "date": "2026-03-16",
    "title": "新NISAで月3万円積立投資する最適な銘柄3選",
    "url": "https://bibimaru.xsrv.jp/?p=42",
    "topic_category": "投資",
    "topic_id": "nisa_usage"
  }
]
```

## 注意事項

- `config.env` は `.gitignore` に追加済みのため、リポジトリには公開されません
- WordPress の CORS 設定が必要な場合は、サーバー側の `functions.php` または `.htaccess` を設定してください
- Application Password にスペースが含まれていても正常に動作します（Base64エンコード済み）

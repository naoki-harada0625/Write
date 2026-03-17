# Claude Code 記事投稿ワークフロー

このファイルは Claude Code が「今日の記事を投稿して」などの指示を受けたときに従うべき手順書です。

## ワークフロー全体像

```
ユーザー指示
    ↓
1. wp-auto-post.sh --prepare  →  トピック選定・プロンプト出力
    ↓
2. Claude Code が記事HTML生成  →  /tmp/wp-article-{id}.txt に保存
    ↓
3. wp-auto-post.sh --post      →  WordPress に投稿・ログ更新
    ↓
完了レポート表示
```

---

## Step 1: トピック選定とプロンプト取得

```bash
bash wp-auto-post/wp-auto-post.sh --prepare
```

または特定トピックを指定する場合:

```bash
bash wp-auto-post/wp-auto-post.sh --prepare "新NISAで月3万円積立投資する方法"
```

スクリプトが出力するプロンプトを読んで、記事要件を把握する。

---

## Step 2: 記事HTML生成（Claude Code が担当）

プロンプトに従って記事を生成し、以下の形式でファイルに書き込む:

**ファイル形式（`/tmp/wp-article-{topic_id}.txt`）:**
```
記事タイトル（1行目、HTMLタグなし、32文字前後）
メタディスクリプション用抜粋（2行目、HTMLタグなし、120文字程度）
<h2>最初の見出し</h2>
<p>本文...</p>
（以降、記事本文HTML）
```

**記事生成チェックリスト:**
- [ ] タイトルは32文字前後で数字・具体性を含む
- [ ] リード文は200〜300文字で読者の悩みへの共感から始まる
- [ ] H2見出しは3〜5個
- [ ] 各H2内にH3が1〜3個
- [ ] 各セクションに具体的な数字・事例がある
- [ ] まとめセクションで要点整理と行動喚起がある
- [ ] 総文字数が3,000〜5,000文字（HTMLタグ除く）
- [ ] です/ます調で統一されている
- [ ] 同じ文末表現が3回連続していない

---

## Step 3: WordPress への投稿

```bash
bash wp-auto-post/wp-auto-post.sh --post \
  --content-file /tmp/wp-article-{topic_id}.txt
```

または下書きとして保存する場合:

```bash
bash wp-auto-post/wp-auto-post.sh --post --draft \
  --content-file /tmp/wp-article-{topic_id}.txt
```

---

## 一括実行パターン

### 記事1本を公開投稿（最もシンプル）

```bash
# Step 1: 準備
bash wp-auto-post/wp-auto-post.sh --prepare
# → プロンプトを確認して記事を生成 → /tmp/wp-article-{id}.txt に保存

# Step 3: 投稿
bash wp-auto-post/wp-auto-post.sh --post --content-file /tmp/wp-article-{id}.txt
```

### 下書き作成（確認後に公開）

```bash
bash wp-auto-post/wp-auto-post.sh --prepare
# → 記事生成 → ファイル保存

bash wp-auto-post/wp-auto-post.sh --post --draft \
  --content-file /tmp/wp-article-{id}.txt
```

### トピック指定で投稿

```bash
bash wp-auto-post/wp-auto-post.sh --prepare "高配当株で配当金月10万円を目指す"
# → 記事生成 → ファイル保存

bash wp-auto-post/wp-auto-post.sh --post \
  --content-file /tmp/wp-article-custom.txt
```

---

## 記事HTML テンプレート（参考）

```html
<p>
  [読者の悩みへの共感 1〜2文]。[この記事で解決できること]。
  [記事を読むメリットを具体的に提示]。
</p>

<h2>[大テーマ1：基礎・概念]</h2>
<p>[説明文。専門用語は初出時に注釈をつける]。</p>

<h3>[サブトピック1-1]</h3>
<p>[具体的な数字・データを含む説明]。</p>
<ul>
  <li><strong>[ポイント1]</strong>：[説明]</li>
  <li><strong>[ポイント2]</strong>：[説明]</li>
</ul>

<h3>[サブトピック1-2]</h3>
<p>[説明]。</p>

<h2>[大テーマ2：実践・具体例]</h2>
<p>[説明]。</p>

<h3>[具体的なシミュレーション・事例]</h3>
<p>[数字を使った具体例]。</p>
<ol>
  <li>[ステップ1]</li>
  <li>[ステップ2]</li>
  <li>[ステップ3]</li>
</ol>

<h2>[大テーマ3：注意点・よくある失敗]</h2>
<p>[説明]。</p>

<blockquote>
  <p>[重要なポイントや引用を強調]</p>
</blockquote>

<h2>[大テーマ4：まとめと行動喚起]</h2>
<p>[記事の要点を3〜5点でまとめる]。</p>
<ul>
  <li>[要点1]</li>
  <li>[要点2]</li>
  <li>[要点3]</li>
</ul>
<p>[読者への行動喚起。「〜から始めてみてください」「まずは〜してみましょう」など]。</p>
```

---

## よくあるユーザー指示とその対応

| ユーザーの指示 | 実行するコマンド |
|---|---|
| 「今日の記事を1本投稿して」 | `--prepare` → 生成 → `--post` |
| 「新NISAの記事を公開して」 | `--prepare "新NISA..."` → 生成 → `--post` |
| 「下書きで記事を作って」 | `--prepare` → 生成 → `--post --draft` |
| 「3本まとめて投稿して」 | 3回ループで `--prepare` → 生成 → `--post` |
| 「投稿済みの記事一覧を見せて」 | `cat wp-auto-post/posted-log.json \| jq .` |
| 「WordPressの最新記事を確認して」 | Step 2 の curl コマンドを直接実行 |

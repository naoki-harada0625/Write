#!/usr/bin/env bash
# =============================================================================
# wp-auto-post.sh
# 投資・SIDE FIRE 記事 自動生成 & WordPress 投稿スクリプト
# Claude Code が直接記事を生成し、このスクリプトが WordPress に投稿する
# =============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# =============================================================================
# 設定読み込み
# =============================================================================
CONFIG_FILE="${SCRIPT_DIR}/config.env"
TOPICS_FILE="${SCRIPT_DIR}/topics.json"
LOG_FILE="${SCRIPT_DIR}/posted-log.json"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "❌ config.env が見つかりません: $CONFIG_FILE"
  exit 1
fi
# shellcheck source=config.env
source "$CONFIG_FILE"

WP_API="${WP_URL}/wp-json/wp/v2"
AUTH_HEADER="Authorization: Basic $(echo -n "${WP_USER}:${WP_APP_PASSWORD}" | base64 | tr -d '\n')"

# =============================================================================
# 引数パース
# =============================================================================
TOPIC_ARG=""
POST_STATUS="${DEFAULT_STATUS:-publish}"
COUNT="${DEFAULT_COUNT:-1}"
MODE="full"          # full | prepare | post
CONTENT_FILE=""
TITLE_ARG=""
EXCERPT_ARG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --draft)         POST_STATUS="draft"; shift ;;
    --publish)       POST_STATUS="publish"; shift ;;
    --count)         COUNT="$2"; shift 2 ;;
    --prepare)       MODE="prepare"; shift ;;
    --post)          MODE="post"; shift ;;
    --content-file)  CONTENT_FILE="$2"; shift 2 ;;
    --title)         TITLE_ARG="$2"; shift 2 ;;
    --excerpt)       EXCERPT_ARG="$2"; shift 2 ;;
    --help|-h)       MODE="help"; shift ;;
    *)               TOPIC_ARG="$1"; shift ;;
  esac
done

# =============================================================================
# ヘルパー関数
# =============================================================================
log()  { echo "$(date '+%H:%M:%S') ▶ $*"   >&2; }
ok()   { echo "$(date '+%H:%M:%S') ✅ $*"  >&2; }
warn() { echo "$(date '+%H:%M:%S') ⚠️  $*"  >&2; }
err()  { echo "$(date '+%H:%M:%S') ❌ $*"  >&2; }

show_help() {
  cat <<'EOF'
使い方:
  bash wp-auto-post.sh [オプション] [トピック]

オプション:
  --draft              下書きとして保存（確認後に手動公開）
  --publish            公開投稿（デフォルト）
  --count N            N件の記事を連続生成・投稿
  --prepare            ステップ1のみ実行（トピック選定・プロンプト出力）
  --post               ステップ2のみ実行（記事ファイルをWordPressに投稿）
    --title "タイトル"
    --content-file /tmp/article.html
    --excerpt "抜粋文"
  --help               このヘルプを表示

例:
  bash wp-auto-post.sh                              # トピック自動選定して投稿
  bash wp-auto-post.sh "新NISAの活用術"             # トピック指定して投稿
  bash wp-auto-post.sh --draft                      # 下書きで保存
  bash wp-auto-post.sh --count 3                    # 3記事まとめて生成投稿
  bash wp-auto-post.sh --prepare                    # 準備フェーズのみ（記事プロンプト出力）
EOF
}

wp_api() {
  # $1: メソッド (GET/POST/PUT), $2: エンドポイント, $3: JSONボディ(省略可)
  local method="$1" endpoint="$2" body="${3:-}"
  local args=(-s -X "$method" "${WP_API}${endpoint}"
              -H "$AUTH_HEADER"
              -H "Content-Type: application/json")
  [[ -n "$body" ]] && args+=(-d "$body")
  curl "${args[@]}"
}

# =============================================================================
# Step 1: トピック選定
# =============================================================================
select_topic() {
  local requested_topic="${1:-}"
  log "トピック選定中..."

  # 過去の投稿タイトルを取得
  local past_titles
  past_titles=$(wp_api GET "/posts?per_page=100&status=any" | \
    jq -r '[.[].title.rendered] | map(gsub("<[^>]+>"; "")) | .[]' 2>/dev/null || echo "")

  # ローカルログからも取得
  local log_titles=""
  if [[ -f "$LOG_FILE" ]]; then
    log_titles=$(jq -r '.[].title' "$LOG_FILE" 2>/dev/null || echo "")
  fi

  local all_past_titles="${past_titles}"$'\n'"${log_titles}"

  # トピック指定がある場合はそれを使う
  if [[ -n "$requested_topic" ]]; then
    echo "$requested_topic"
    return 0
  fi

  # topics.json からランダムにトピックIDを選択（重複チェック付き）
  local all_ids
  all_ids=$(jq -r '.categories | to_entries[] | .value[] | .id' "$TOPICS_FILE")
  local id_count
  id_count=$(echo "$all_ids" | wc -l | tr -d ' ')

  local selected_id selected_title attempts=0
  while [[ $attempts -lt 30 ]]; do
    local rand_index=$(( (RANDOM % id_count) + 1 ))
    selected_id=$(echo "$all_ids" | sed -n "${rand_index}p")
    selected_title=$(jq -r \
      --arg id "$selected_id" \
      '.categories | to_entries[] | .value[] | select(.id == $id) | .title_template' \
      "$TOPICS_FILE")

    # キーワードが過去タイトルに含まれていないか確認
    local keyword
    keyword=$(jq -r \
      --arg id "$selected_id" \
      '.categories | to_entries[] | .value[] | select(.id == $id) | .keywords[0]' \
      "$TOPICS_FILE")

    if ! echo "$all_past_titles" | grep -qi "$keyword"; then
      echo "$selected_id"
      return 0
    fi
    (( attempts++ ))
    warn "トピック「$keyword」は既出のため再選定... (${attempts}/30)"
  done

  # 30回試行しても新規トピックが見つからなければ最初のものを返す
  warn "新規トピックが見つからないため、最初のトピックを使用します"
  jq -r '.categories | to_entries[0] | .value[0] | .id' "$TOPICS_FILE"
}

get_topic_info() {
  local topic_id="$1"
  jq -r \
    --arg id "$topic_id" \
    '.categories | to_entries[] | .value[] | select(.id == $id)' \
    "$TOPICS_FILE"
}

# =============================================================================
# Step 2: カテゴリ・タグ取得または作成
# =============================================================================
get_or_create_category() {
  local name="$1"
  # 既存カテゴリ検索
  local existing
  existing=$(wp_api GET "/categories?search=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$name'))" 2>/dev/null || echo "$name")" | \
    jq -r --arg name "$name" '.[] | select(.name == $name) | .id' | head -1)

  if [[ -n "$existing" ]]; then
    echo "$existing"
    return 0
  fi

  # 新規作成
  local result
  result=$(wp_api POST "/categories" "{\"name\":\"${name}\"}")
  echo "$result" | jq -r '.id'
}

get_or_create_tag() {
  local name="$1"
  local encoded_name
  encoded_name=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$name'))" 2>/dev/null || echo "$name")

  local existing
  existing=$(wp_api GET "/tags?search=${encoded_name}" | \
    jq -r --arg name "$name" '.[] | select(.name == $name) | .id' | head -1)

  if [[ -n "$existing" ]]; then
    echo "$existing"
    return 0
  fi

  local result
  result=$(wp_api POST "/tags" "{\"name\":\"${name}\"}")
  echo "$result" | jq -r '.id'
}

resolve_category_ids() {
  local category_name="$1"
  log "カテゴリ処理: $category_name"
  get_or_create_category "$category_name"
}

resolve_tag_ids() {
  local tags_json="$1"  # JSON配列文字列 e.g. ["新NISA","積立投資"]
  local ids=()
  while IFS= read -r tag; do
    [[ -z "$tag" ]] && continue
    local id
    id=$(get_or_create_tag "$tag")
    [[ -n "$id" && "$id" != "null" ]] && ids+=("$id")
  done < <(echo "$tags_json" | jq -r '.[]')
  # JSON配列として返す
  printf '%s\n' "${ids[@]}" | jq -R . | jq -s .
}

# =============================================================================
# Step 3: 記事生成プロンプトを出力（Claude Code が記事を生成する）
# =============================================================================
output_generation_prompt() {
  local topic_id="$1"
  local topic_info
  topic_info=$(get_topic_info "$topic_id")

  local title_template keywords category tags
  title_template=$(echo "$topic_info" | jq -r '.title_template')
  keywords=$(echo "$topic_info" | jq -r '.keywords | join("、")')
  category=$(echo "$topic_info" | jq -r '.category')
  tags=$(echo "$topic_info" | jq -r '.tags | join("、")')

  cat <<PROMPT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 記事生成プロンプト（Claude Code はこれに従って記事を作成してください）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【トピックID】 ${topic_id}
【カテゴリ】   ${category}
【タイトル案】 ${title_template}
【主要キーワード】 ${keywords}
【タグ候補】   ${tags}

【記事要件】
1. タイトル: SEOを意識した32文字前後（数字・具体性を含む）
2. リード文: 読者の悩みへの共感→解決提示（200〜300文字）
3. 本文構成:
   - H2見出し: 3〜5個
   - 各H2内にH3: 1〜3個
   - 各セクション: 具体的な数字・事例を含む
4. まとめ: 要点整理＋読者への行動喚起
5. 総文字数: 3,000〜5,000文字

【文章スタイル】
- です/ます調（ですます体）
- 1文は60〜80文字以内
- 同じ文末を3回連続不可（〜です。×3はNG）
- 専門用語は初出時に説明を添える
- 具体的な数字・事例を積極的に使う
- 読者への呼びかけを使う（「〜ですよね」「〜してみましょう」）

【出力形式】WordPress投稿用HTML
- 見出し: <h2>, <h3>
- 段落: <p>
- リスト: <ul><li> または <ol><li>
- 強調: <strong>
- 必要に応じて: <blockquote>, <table>

【出力ファイル】
生成した記事を以下のファイルに保存してください:
  タイトル行（1行目）: 実際の記事タイトル（HTMLタグなし）
  抜粋行（2行目）: メタディスクリプション用120文字程度の抜粋（HTMLタグなし）
  3行目以降: 記事本文HTML

保存先: /tmp/wp-article-${topic_id}.txt

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROMPT
}

# =============================================================================
# Step 4: WordPress に投稿
# =============================================================================
post_to_wordpress() {
  local title="$1"
  local content="$2"
  local excerpt="$3"
  local category_name="$4"
  local tags_array="$5"  # スペース区切りのタグ名

  log "カテゴリ・タグを準備中..."
  local cat_id
  cat_id=$(resolve_category_ids "$category_name")

  # タグIDを取得（スペース区切りのタグ名を処理）
  local tag_ids_json="[]"
  local tag_ids=()
  IFS=',' read -ra tag_names <<< "$tags_array"
  for tag in "${tag_names[@]}"; do
    tag=$(echo "$tag" | xargs)  # trim spaces
    [[ -z "$tag" ]] && continue
    local tid
    tid=$(get_or_create_tag "$tag")
    [[ -n "$tid" && "$tid" != "null" ]] && tag_ids+=("$tid")
  done

  if [[ ${#tag_ids[@]} -gt 0 ]]; then
    tag_ids_json=$(printf '%s\n' "${tag_ids[@]}" | jq -R . | jq -s .)
  fi

  log "WordPress に投稿中... (ステータス: ${POST_STATUS})"

  # JSONペイロードを安全に構築
  local payload
  payload=$(jq -n \
    --arg title   "$title" \
    --arg content "$content" \
    --arg excerpt "$excerpt" \
    --arg status  "$POST_STATUS" \
    --argjson cats "[$cat_id]" \
    --argjson tags "$tag_ids_json" \
    '{title: $title, content: $content, excerpt: $excerpt,
      status: $status, categories: $cats, tags: $tags}')

  local response
  response=$(wp_api POST "/posts" "$payload")

  # エラーチェック
  local error_code
  error_code=$(echo "$response" | jq -r '.code // empty')
  if [[ -n "$error_code" ]]; then
    err "WordPress API エラー: $error_code"
    echo "$response" | jq .
    return 1
  fi

  local post_id post_url post_status_result
  post_id=$(echo "$response" | jq -r '.id')
  post_url=$(echo "$response" | jq -r '.link')
  post_status_result=$(echo "$response" | jq -r '.status')

  echo "$post_id|$post_url|$post_status_result"
}

# =============================================================================
# Step 5: 投稿ログ更新
# =============================================================================
update_log() {
  local title="$1" url="$2" topic_category="$3" topic_id="$4"
  local today
  today=$(date '+%Y-%m-%d')

  local new_entry
  new_entry=$(jq -n \
    --arg date     "$today" \
    --arg title    "$title" \
    --arg url      "$url" \
    --arg category "$topic_category" \
    --arg tid      "$topic_id" \
    '{date: $date, title: $title, url: $url,
      topic_category: $category, topic_id: $tid}')

  # ログファイルに追記
  local current_log="[]"
  [[ -f "$LOG_FILE" ]] && current_log=$(cat "$LOG_FILE")

  echo "$current_log" | jq --argjson entry "$new_entry" '. += [$entry]' > "$LOG_FILE"
}

# =============================================================================
# 結果レポート表示
# =============================================================================
show_report() {
  local title="$1" url="$2" status="$3" content="$4" category="$5" tags="$6"
  local char_count
  # HTMLタグを除いた文字数をカウント
  char_count=$(echo "$content" | sed 's/<[^>]*>//g' | wc -m | tr -d ' ')

  cat <<REPORT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 投稿完了レポート
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 タイトル:   ${title}
🔗 URL:        ${url}
📊 文字数:     約${char_count}文字（本文HTMLタグ除く）
📁 カテゴリ:   ${category}
🏷️  タグ:       ${tags}
📢 ステータス: ${status}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REPORT
}

# =============================================================================
# フルフロー実行（1記事分）
# =============================================================================
run_full_flow() {
  local requested_topic="${1:-}"

  log "=== WordPress 自動投稿開始 ==="

  # --- Step 1: トピック選定 ---
  local topic_id
  topic_id=$(select_topic "$requested_topic")
  local topic_info
  topic_info=$(get_topic_info "$topic_id")

  local title_template category tags_csv
  title_template=$(echo "$topic_info" | jq -r '.title_template')
  category=$(echo "$topic_info" | jq -r '.category')
  tags_csv=$(echo "$topic_info" | jq -r '.tags | join(",")')

  ok "選定トピック: $title_template"

  # --- Step 2: 記事生成プロンプト出力 ---
  local tmp_file="/tmp/wp-article-${topic_id}.txt"

  # すでにファイルが存在する場合（Claude Codeが事前に生成済み）はスキップ
  if [[ ! -f "$tmp_file" ]]; then
    output_generation_prompt "$topic_id"

    cat <<MSG

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏸️  Claude Code: 上記プロンプトに従って記事を生成し、
   以下のファイルに保存してから続行してください:
   ${tmp_file}

   ファイル形式:
   1行目: 記事タイトル（HTMLタグなし）
   2行目: 抜粋（120文字程度、HTMLタグなし）
   3行目以降: 記事本文HTML

   保存後、以下のコマンドで投稿を完了できます:
   bash wp-auto-post.sh --post \
     --title "タイトル" \
     --content-file ${tmp_file} \
     --excerpt "抜粋"

   または、このスクリプトは --post モードでも実行できます。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MSG
    # ここで一度終了（Claude Code が記事を生成してファイルを作成する）
    exit 0
  fi

  # --- Step 3: ファイルから記事読み込み ---
  log "記事ファイルを読み込み中: $tmp_file"
  local title excerpt content

  if [[ -n "$TITLE_ARG" ]]; then
    title="$TITLE_ARG"
    excerpt="${EXCERPT_ARG:-}"
    content=$(cat "$tmp_file")
  else
    title=$(sed -n '1p' "$tmp_file")
    excerpt=$(sed -n '2p' "$tmp_file")
    content=$(tail -n +3 "$tmp_file")
  fi

  [[ -z "$title" ]] && { err "タイトルが空です"; exit 1; }
  [[ -z "$content" ]] && { err "記事本文が空です"; exit 1; }

  ok "タイトル: $title"

  # --- Step 4: WordPress に投稿 ---
  local result
  result=$(post_to_wordpress "$title" "$content" "$excerpt" "$category" "$tags_csv")

  local post_id post_url post_status_result
  IFS='|' read -r post_id post_url post_status_result <<< "$result"

  # --- Step 5: ログ更新 ---
  update_log "$title" "$post_url" "$category" "$topic_id"

  # 一時ファイルを削除
  rm -f "$tmp_file"

  # --- 結果レポート ---
  show_report "$title" "$post_url" "$post_status_result" "$content" "$category" \
    "$(echo "$topic_info" | jq -r '.tags | join(", ")')"
}

# =============================================================================
# --post モード: ファイルから読んで投稿
# =============================================================================
run_post_mode() {
  local title="$TITLE_ARG"
  local content_file="$CONTENT_FILE"
  local excerpt="$EXCERPT_ARG"

  if [[ -z "$content_file" || ! -f "$content_file" ]]; then
    err "--content-file が指定されていないか、ファイルが存在しません: $content_file"
    exit 1
  fi

  local content
  if [[ -z "$title" ]]; then
    title=$(sed -n '1p' "$content_file")
    excerpt=$(sed -n '2p' "$content_file")
    content=$(tail -n +3 "$content_file")
  else
    content=$(cat "$content_file")
  fi

  [[ -z "$title" ]]   && { err "タイトルが空です"; exit 1; }
  [[ -z "$content" ]] && { err "記事本文が空です"; exit 1; }

  # カテゴリとタグはデフォルト値を使用（topics.json の最初のエントリ）
  local category="資産形成"
  local tags_csv="投資,資産形成,FIRE"

  log "投稿モード: $title"
  local result
  result=$(post_to_wordpress "$title" "$content" "$excerpt" "$category" "$tags_csv")

  local post_id post_url post_status_result
  IFS='|' read -r post_id post_url post_status_result <<< "$result"

  update_log "$title" "$post_url" "$category" "manual"
  show_report "$title" "$post_url" "$post_status_result" "$content" "$category" "$tags_csv"
}

# =============================================================================
# --prepare モード: トピック選定とプロンプト出力のみ
# =============================================================================
run_prepare_mode() {
  local topic_id
  topic_id=$(select_topic "$TOPIC_ARG")
  ok "選定トピックID: $topic_id"
  output_generation_prompt "$topic_id"
}

# =============================================================================
# メイン
# =============================================================================
main() {
  case "$MODE" in
    help)
      show_help
      ;;
    prepare)
      run_prepare_mode
      ;;
    post)
      run_post_mode
      ;;
    full)
      if [[ "$COUNT" -gt 1 ]]; then
        log "${COUNT}件の記事を順次投稿します"
        for (( i=1; i<=COUNT; i++ )); do
          log "--- 記事 $i / $COUNT ---"
          run_full_flow "$TOPIC_ARG"
          # 複数件の場合はテンポラリファイルが残っている前提でループ
          # 実際には Claude Code が各記事を順番に生成する
        done
      else
        run_full_flow "$TOPIC_ARG"
      fi
      ;;
  esac
}

main "$@"

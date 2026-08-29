#!/bin/bash
set -euo pipefail
# 生成发布说明：仅提取 CHANGELOG 中当前版本的段落（不含标题/介绍/历史版本）。
# Release 标题由 name 字段提供，body 只放更新内容，避免重复。
VERSION="${1:-}"
OUT="${2:-release_notes.md}"
{
  if [ -f CHANGELOG.md ]; then
    awk -v ver="${VERSION}" '
      { line = $0 }
      line == ("## " ver) { in_block = 1; next }
      in_block && line ~ /^## / { exit }
      in_block { print }
    ' CHANGELOG.md
  else
    echo "- 首个版本"
  fi
} >"${OUT}"
echo "已生成 ${OUT}"

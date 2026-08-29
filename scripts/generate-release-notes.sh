#!/bin/bash
set -euo pipefail
# 生成发布说明：仅提取 CHANGELOG 中当前版本的段落（不含历史版本）
VERSION="${1:-}"
OUT="${2:-release_notes.md}"
{
  echo "# 盗音 ${VERSION}"
  echo ""
  echo "多平台音乐搜索、试听与高质量下载工具（洛雪音源兼容），面向飞牛 fnOS 原生应用。"
  echo ""
  echo "## 更新内容"
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

#!/bin/bash
set -euo pipefail
# 生成发布说明（CHANGELOG 摘要）
VERSION="${1:-}"
OUT="${2:-release_notes.md}"
{
  echo "# 盗音 ${VERSION}"
  echo ""
  echo "多平台音乐搜索、试听与高质量下载工具（洛雪音源兼容），面向飞牛 fnOS 原生应用。"
  echo ""
  echo "## 更新内容"
  if [ -f CHANGELOG.md ]; then
    # 跳过 CHANGELOG 首行「# 更新日志」，避免与「## 更新内容」标题重复
    tail -n +2 CHANGELOG.md | head -n 30
  else
    echo "- 首个版本"
  fi
} >"${OUT}"
echo "已生成 ${OUT}"

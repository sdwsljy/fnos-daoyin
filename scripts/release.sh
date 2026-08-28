#!/bin/bash
set -euo pipefail
# 发布流程：测试 → 构建 → FPK 打包 → 生成 latest.json
# 用法：pnpm release 或 ./scripts/release.sh 1.0.0

VERSION="${1:-$(node -p "require('./package.json').version")}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> 测试"
pnpm test

echo "==> 打包 FPK（v${VERSION}）"
MIYIN_VERSION="${VERSION}" REQUIRE_FNPACK="${REQUIRE_FNPACK:-0}" bash "${ROOT}/packaging/fnos/scripts/build-fpk.sh"

FPK_FILE="daoyin-v${VERSION}.fpk"
FPK_PATH="${ROOT}/packaging/fnos/${FPK_FILE}"
if [ -f "${FPK_PATH}" ]; then
  echo "==> 生成 latest.json"
  bash "${ROOT}/scripts/generate-release-notes.sh" "${VERSION}" "${ROOT}/release_notes.md"
  node "${ROOT}/scripts/generate-latest-json.mjs" "${VERSION}" "${FPK_FILE}" "${ROOT}/release_notes.md"
  echo "==> 产物：${FPK_PATH}"
  echo "==> 发布物：${FPK_PATH} + latest.json（附到 GitHub Release tag v${VERSION}）"
else
  echo "==> 未生成 FPK（无 fnpack），仅完成构建与测试"
fi

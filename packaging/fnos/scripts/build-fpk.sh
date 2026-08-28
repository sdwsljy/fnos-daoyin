#!/bin/bash
set -euo pipefail

# 盗音 FPK 打包脚本（Linux / macOS / Windows Git Bash 均可运行）
# 用法：pnpm build:fpk   （本地无 fnpack 时仅准备应用文件后退出 0；REQUIRE_FNPACK=1 强制要求成功）
# CI：MIYIN_VERSION=1.0.0 REQUIRE_FNPACK=1 ./packaging/fnos/scripts/build-fpk.sh
# 自定义输出目录：FNPACK_OUT_DIR=<dir>（Windows 下可传 C:\... 形式，脚本用 cygpath 转换）
# fnpack 查找顺序：$FNPACK_BIN > PATH 中的 fnpack > $ROOT_DIR/tools/fnpack(.exe)

ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
PKG_DIR="${ROOT_DIR}/packaging/fnos/daoyin"
STAGE_DIR="${ROOT_DIR}/packaging/fnos/.stage/daoyin"
MIYIN_VERSION="${MIYIN_VERSION:-$(cd "${ROOT_DIR}" && node -p "require('./package.json').version" 2>/dev/null || echo 1.0.0)}"
REQUIRE_FNPACK="${REQUIRE_FNPACK:-0}"
OUT_DIR="${FNPACK_OUT_DIR:-${ROOT_DIR}/packaging/fnos}"

# Windows 路径（C:\... 或 \\server\...）转换为 Git Bash 使用的 Unix 路径
if command -v cygpath >/dev/null 2>&1 && [[ "$OUT_DIR" == ?:\* || "$OUT_DIR" == \\* ]]; then
  OUT_DIR="$(cygpath -u "$OUT_DIR")"
fi

echo "==> 盗音打包开始，版本 ${MIYIN_VERSION}，输出目录 ${OUT_DIR}"

# 1. 版本写入 manifest 与 package.json
sed -i "s/^version=.*/version=${MIYIN_VERSION}/" "${PKG_DIR}/manifest"
(
  cd "${ROOT_DIR}"
  node -e "
    const fs = require('fs');
    const j = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    j.version = '${MIYIN_VERSION}';
    fs.writeFileSync('./package.json', JSON.stringify(j, null, 2) + '\n');
  "
)
echo "==> 版本已写入 manifest / package.json"

# 2. 生产构建（网关 baseURL）
echo "==> pnpm build (NUXT_APP_BASE_URL=/app/daoyin/)"
(
  cd "${ROOT_DIR}"
  # MSYS_NO_PATHCONV=1：防止 Git Bash（Windows）把 /app/daoyin/ 转成 C:/Program Files/Git/app/daoyin/
  MSYS_NO_PATHCONV=1 NUXT_APP_BASE_URL=/app/daoyin/ GATEWAY_PREFIX=/app/daoyin/ pnpm build
)

# 3. 暂存应用文件
rm -rf "${STAGE_DIR}"
mkdir -p "${STAGE_DIR}/server"
cp -r "${ROOT_DIR}/.output" "${STAGE_DIR}/server/.output"
cp "${ROOT_DIR}/packaging/fnos/server-entry.mjs" "${STAGE_DIR}/server/start.mjs"

# 4. server 目录独立安装 better-sqlite3（避免被仓库根 pnpm workspace 吸走）
#    --ignore-scripts：better-sqlite3@13+ 的 npm tarball 自带各平台 prebuilds
#    （含 prebuilds/linux-x64.node + linux-arm64.node），无需本地编译，Windows 无 VS 工具链也可安装
echo "==> 安装 better-sqlite3 到 server 目录（独立 node_modules，跳过构建脚本）"
(
  cd "${STAGE_DIR}/server"
  cat > package.json <<'EOF'
{
  "name": "daoyin-server",
  "version": "0.0.0",
  "private": true,
  "type": "module"
}
EOF
  npm install --no-save --omit=dev --ignore-scripts --no-audit --no-fund better-sqlite3@^13.0.3
)

# 5. 校验双架构 prebuilds
echo "==> 校验 better-sqlite3 prebuilds"
if [ ! -f "${STAGE_DIR}/server/node_modules/better-sqlite3/prebuilds/linux-x64.node" ]; then
  echo "错误: 缺少 prebuilds/linux-x64.node" >&2
  exit 1
fi
if [ ! -f "${STAGE_DIR}/server/node_modules/better-sqlite3/prebuilds/linux-arm64.node" ]; then
  echo "错误: 缺少 prebuilds/linux-arm64.node（双架构胖包必需）" >&2
  exit 1
fi

# 6. 校验必需文件清单
echo "==> 校验必需文件"
for f in \
  "manifest" \
  "config/privilege" \
  "config/resource" \
  "cmd/main" \
  "cmd/lib_config.sh" \
  "cmd/install_init" \
  "cmd/install_callback" \
  "cmd/uninstall_init" \
  "cmd/uninstall_callback" \
  "wizard/install" \
  "wizard/config" \
  "wizard/uninstall" \
  "app/ui/config" \
  "app/ui/images/icon_64.png" \
  "app/ui/images/icon_128.png" \
  "app/ui/images/icon_256.png"; do
  if [ ! -f "${PKG_DIR}/${f}" ]; then
    echo "错误: 缺少必需文件 ${PKG_DIR}/${f}" >&2
    exit 1
  fi
done

# 7. 拷贝应用文件到包目录
echo "==> 复制应用文件到 ${PKG_DIR}/app/server"
rm -rf "${PKG_DIR}/app/server"
cp -r "${STAGE_DIR}/server" "${PKG_DIR}/app/server"

# 8. 若存在 fnpack 则打 FPK，否则仅准备文件
find_fnpack() {
  if [ -n "${FNPACK_BIN:-}" ] && [ -x "${FNPACK_BIN}" ]; then
    return 0
  fi
  if command -v fnpack >/dev/null 2>&1; then
    FNPACK_BIN="$(command -v fnpack)"
    return 0
  fi
  for cand in "${ROOT_DIR}/tools/fnpack" "${ROOT_DIR}/tools/fnpack.exe"; do
    if [ -x "$cand" ]; then
      FNPACK_BIN="$cand"
      return 0
    fi
  done
  return 1
}

if find_fnpack; then
  echo "==> fnpack: ${FNPACK_BIN}"
  echo "==> fnpack build（输出 daoyin.fpk，随后重命名为带版本号产物）"
  (
    cd "${ROOT_DIR}/packaging/fnos"
    rm -f daoyin.fpk
    "${FNPACK_BIN}" build --directory ./daoyin
    if [ ! -f daoyin.fpk ]; then
      echo "错误: fnpack 未生成 daoyin.fpk" >&2
      exit 1
    fi
    mkdir -p "${OUT_DIR}"
    mv -f daoyin.fpk "${OUT_DIR}/daoyin-v${MIYIN_VERSION}.fpk"
  )
  echo "==> 产物：${OUT_DIR}/daoyin-v${MIYIN_VERSION}.fpk"
else
  if [ "${REQUIRE_FNPACK}" = "1" ]; then
    echo "错误: REQUIRE_FNPACK=1 但未找到 fnpack（可用 scripts/setup-fnpack.ps1 下载到 tools/）" >&2
    exit 1
  fi
  echo "==> 未找到 fnpack，已准备应用文件（packaging/fnos/daoyin/app/server）；本地联调可用"
fi

echo "==> 打包完成"

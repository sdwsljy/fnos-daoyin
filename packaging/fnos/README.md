# 盗音（daoyin）· 飞牛 fnOS 原生打包

`micro_app=true` 统一网关模式：无对外端口，通过 `/app/daoyin` 访问。

## 目录结构

```
daoyin/
├── manifest                      # 应用元数据（version 由 build-fpk.sh 覆盖）
├── ICON.PNG / ICON_256.PNG       # 应用图标
├── config/
│   ├── privilege                 # run-as=package 最小权限
│   └── resource                  # data-share: daoyin/data、daoyin/downloads；api-scope trim.file.sharedAccess
├── cmd/
│   ├── main                      # start/stop/status + PID 管理
│   ├── lib_config.sh             # 读写 $TRIM_PKGETC/miyin.env（SESSION_SECRET 生成）
│   ├── install_init / install_callback
│   ├── upgrade_init / upgrade_callback
│   ├── uninstall_init / uninstall_callback
│   └── config_init / config_callback
├── wizard/
│   ├── install                   # 访问口令 + 下载目录
│   ├── config                    # 同上（应用设置页可再次打开）
│   └── uninstall                 # 保留/删除数据
└── app/
    ├── ui/
    │   ├── config                # 网关入口（gatewayPrefix/gatewaySocket）
    │   └── images/icon_{64,128,256}.png
    └── server/                   # build-fpk.sh 生成
        ├── start.mjs             # server-entry.mjs（Nitro + socket 反代）
        ├── .output/server/index.mjs
        └── node_modules/better-sqlite3/  # prebuilds/linux-x64.node + linux-arm64.node
```

## 打包

```bash
pnpm build:fpk            # 本地无 fnpack 时仅准备应用文件后退出 0
MIYIN_VERSION=1.0.0 REQUIRE_FNPACK=1 ./packaging/fnos/scripts/build-fpk.sh
```

## Windows 打包

飞牛官方提供 Windows 版 `fnpack`（`fnpack-1.2.3-windows-amd64`，见 developer.fnnas.com/docs/cli/fnpack/）。配合 Git for Windows（Git Bash）即可在 Windows 上打 FPK 胖包：

```powershell
# 1. 下载 fnpack 到 tools/fnpack.exe
powershell -ExecutionPolicy Bypass -File scripts/setup-fnpack.ps1

# 2. 在 Git Bash 中打包（自定义输出目录，产物带版本号）
MIYIN_VERSION=1.0.0 REQUIRE_FNPACK=1 FNPACK_OUT_DIR="C:\Users\Administrator\Desktop\安装包" bash packaging/fnos/scripts/build-fpk.sh
```

说明：
- `build` 命令只支持 `--directory`（官方 fnpack 1.2.3），产物名固定为 `daoyin.fpk`，脚本会重命名为 `daoyin-v<版本>.fpk` 并移动到 `$FNPACK_OUT_DIR`（默认 `packaging/fnos/`）。
- better-sqlite3 用 `npm install --ignore-scripts`：npm tarball 自带 `prebuilds/linux-x64.node` + `linux-arm64.node`，无需本地编译，Windows 无 VS 工具链也可完成双架构胖包。

## 关键机制

- **运行时**：`install_dep_apps=nodejs_v22`，`cmd/main` 中 `export PATH=/var/apps/nodejs_v22/target/bin:$PATH`。
- **网络**：Nitro 监听 `127.0.0.1:18980`，`server-entry.mjs` 起 http server 监听 `$TRIM_APPDEST/app.sock` 反代到本机端口；网关请求自带 NAS 登录态校验。
- **配置注入**：`cmd/main` 解析 `TRIM_DATA_SHARE_PATHS`（data/downloads），按 `DOWNLOAD_MODE` 决定下载目录，注入 `NUXT_AUTH_TOKEN/NUXT_SESSION_SECRET/NUXT_DATA_DIR/NUXT_DOWNLOAD_DIR` 及 `GATEWAY_PREFIX/SOCKET_PATH/HOST/PORT/NODE_ENV`。
- **双架构**：`better-sqlite3@13+` npm 包自带 `prebuilds/linux-x64.node` 与 `linux-arm64.node`，运行时按 CPU 自动加载；应用为纯 JS，`platform=all` 单包通吃 x86_64/ARM64。

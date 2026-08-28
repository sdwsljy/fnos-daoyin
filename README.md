# 盗音（daoyin）

多平台音乐搜索、试听与高质量下载工具（洛雪音源兼容），面向飞牛 fnOS 打造纯原生应用版本。

> 技术路线借鉴自上游觅音（qwex888/miyin）；由「胖啥胖」维护发布。

## 功能

### 搜索与下载
- 服务端内置 wy / kw / kg / tx 四平台搜索适配器，洛雪音源脚本仅用于取直链
- 音质手动选择固定档位（flac24bit / flac / 320k / 192k / 128k），默认 flac24bit，不自动降级
- 智能下载队列：多源轮询、失败自动换源重试、无损音质实格式校验（音源返回 MP3 等非 FLAC 时自动换源）、试听片段防护、扩展名魔数纠正
- 队列状态筛选（全部 / 下载中 / 下载失败 / 下载完成 / 已存在）+ 实时进度（SSE 实时刷新）
- 批量管理：批量取消 / 重试 / 换源 / 删除（可选同时清理本地文件）/ 强制重新下载

### 歌单导入
- wy / tx / kg 歌单解析 + 精准匹配确认
- **跨平台搜索匹配**：原平台无命中时自动在其余平台搜索，score≥0.4 自动入队并标记来源平台
- 歌手硬性匹配门槛：无任何歌手交集即否决，支持多歌手拆分（任一命中即可），杜绝翻唱/合唱版本误下载
- 一键解析下载（解析 + 匹配 + 入队一步完成）；音质 / 歌词开关 / 歌词写入方式默认预选设置中的值

### 已存在检测
- 入队下载前检查下载目录是否已有同模板同名歌曲文件，存在则标记为「已存在」状态并停止下载
- 队列「已存在」筛选，支持强制重新下载或删除

### 歌词与元数据
- 下载后 ffmpeg 写入元数据（封面压缩内嵌、标签、内嵌歌词，缺失时降级跳过）
- 歌词双语（QQ QRC 解密、酷狗 KRC、咪咕 lrc/trc）；歌词可选外挂 .lrc 或内嵌到音频

### 音源管理
- 新增 URL / 上传 .js / 从文件夹批量上传 / 批量文本导入
- 检测、一键停用失效、清理失效
- 音源同名冲突处理（覆盖 / 跳过）

### 飞牛 fnOS
- 统一网关 `/app/daoyin` 访问，无对外端口
- 开放 API `trim.file.sharedAccess`：设置页应用内一键授权下载目录（选择并授权 / 授权当前路径 / 打开系统应用设置）
- 口令鉴权（AUTH_TOKEN 空 = 开放模式）

## 开发

要求 Node ≥ 22、pnpm。

```bash
pnpm install
cp .env.example .env
pnpm dev          # http://localhost:18980
pnpm test         # vitest
```

## 构建与打包

```bash
pnpm build                              # Nuxt 4 / Nitro node-server
pnpm build:fpk                          # 打 FPK 胖包（需 fnpack）
MIYIN_VERSION=1.0.9 REQUIRE_FNPACK=1 ./packaging/fnos/scripts/build-fpk.sh
```

Windows 下打 FPK（Git Bash + fnpack）：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-fnpack.ps1   # 下载 fnpack 到 tools/
MIYIN_VERSION=1.0.9 REQUIRE_FNPACK=1 FNPACK_OUT_DIR="D:\输出目录" bash packaging/fnos/scripts/build-fpk.sh
```

> 注意：飞牛网关模式下构建必须带 `NUXT_APP_BASE_URL=/app/daoyin/`（`build-fpk.sh` 已处理并禁用 MSYS 路径转换），否则应用 baseURL 损坏导致界面打不开。

详见 [`packaging/fnos/README.md`](packaging/fnos/README.md)。

## 合规

- 仅提供工具能力，不内置、不存储任何受版权保护的音频、歌词、封面内容
- 搜索走平台公开接口，直链获取由用户自行导入的音源脚本承担
- 公网部署建议设置访问口令

## License

MIT

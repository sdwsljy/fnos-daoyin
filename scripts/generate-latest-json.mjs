#!/usr/bin/env node
/**
 * 生成 GitHub Release 附带的 latest.json（应用内更新检测用）。
 * 用法：node scripts/generate-latest-json.mjs <version> <fpkPath?> [<releaseNotesPath?>]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const [version, fpkPath, notesPath] = process.argv.slice(2)
if (!version) {
  console.error('用法: node scripts/generate-latest-json.mjs <version> [<fpkPath>] [<releaseNotesPath>]')
  process.exit(1)
}

const repo = 'daoyin/daoyin'
const tag = `v${version.replace(/^v/i, '')}`
const changelog =
  notesPath && existsSync(resolve(notesPath))
    ? readFileSync(resolve(notesPath), 'utf8').trim()
    : `盗音 v${version}`

const manifest = {
  version,
  tag,
  releasedAt: new Date().toISOString(),
  changelog,
  downloads: {
    releasePage: `https://github.com/${repo}/releases/tag/${tag}`,
    fpk: fpkPath
      ? `https://github.com/${repo}/releases/download/${tag}/${fpkPath}`
      : undefined,
  },
}

const out = resolve(process.cwd(), 'latest.json')
writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n')
console.log(`已写入 ${out}`)

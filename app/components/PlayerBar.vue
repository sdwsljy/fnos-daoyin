<template>
  <div v-if="player.url" class="player-bar">
    <div class="player-seek">
      <input
        type="range"
        :max="player.duration || 0"
        :value="player.currentTime"
        step="0.1"
        aria-label="播放进度"
        @input="onSeek($event)"
      >
    </div>
    <div class="player-row">
      <div class="player-track">
        <img v-if="player.cover" :src="player.cover" class="player-cover" >
        <div v-else class="player-cover placeholder">♪</div>
        <div class="player-info">
          <div class="player-title">{{ player.title }}</div>
          <div class="player-artist">{{ player.artist }}</div>
        </div>
      </div>

      <div class="player-controls">
        <button class="ctl-btn" :class="{ active: player.playing }" @click="toggle">
          <svg v-if="!player.playing" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14l11-7z" fill="currentColor" />
          </svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" />
          </svg>
        </button>
      </div>

      <div class="player-time">{{ fmt(player.currentTime) }} / {{ fmt(player.duration) }}</div>

      <button class="ctl-btn ghost" :class="{ active: showLyric }" @click="showLyric = !showLyric">
        歌词
      </button>

      <div class="player-volume">
        <span class="vol-icon">{{ player.volume === 0 ? '🔇' : '🔊' }}</span>
        <input
          type="range"
          :value="Math.round(player.volume * 100)"
          min="0"
          max="100"
          aria-label="音量"
          @input="onVolume($event)"
        >
      </div>

      <button class="ctl-btn ghost" title="关闭" @click="stop">✕</button>
    </div>

    <div v-if="showLyric" class="player-lyric">
      <div v-if="!lyricLines.length" class="lyric-empty">暂无歌词</div>
      <div v-for="(l, i) in lyricLines" :key="i" class="lyric-line" :class="{ active: i === activeLine }">
        {{ l.text }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePlayer } from '~/composables/usePlayer'

const { player, toggle, seek, setVolume, stop } = usePlayer()
const showLyric = ref(false)

type LyricLine = { time: number; text: string }

const lyricLines = computed<LyricLine[]>(() => {
  const lrc = player.value.lyric || ''
  const lines: LyricLine[] = []
  for (const raw of lrc.split(/\r?\n/)) {
    const m = raw.match(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)/)
    if (!m) continue
    const min = parseInt(m[1]!, 10)
    const sec = parseInt(m[2]!, 10)
    const ms = m[3] ? parseInt(m[3]!.padEnd(3, '0'), 10) / 1000 : 0
    const text = (m[4] || '').trim()
    if (text) lines.push({ time: min * 60 + sec + ms, text })
  }
  return lines.sort((a, b) => a.time - b.time)
})

const activeLine = computed(() => {
  const t = player.value.currentTime
  let idx = -1
  for (let i = 0; i < lyricLines.value.length; i++) {
    if (lyricLines.value[i]!.time <= t) idx = i
    else break
  }
  return idx
})

function onSeek(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  if (Number.isFinite(v)) seek(v)
}

function onVolume(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  if (Number.isFinite(v)) setVolume(v / 100)
}

function fmt(sec: number) {
  if (!sec || !Number.isFinite(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
</script>

<style scoped>
.player-bar {
  position: fixed;
  left: var(--sidebar-width);
  right: 0;
  bottom: 0;
  z-index: 900;
  background: rgba(21, 21, 24, 0.82);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  padding: 0 24px 12px;
}

.player-seek {
  width: 100%;
  height: 14px;
  display: flex;
  align-items: center;
}

.player-seek input[type='range'] {
  width: 100%;
  margin: 0;
}

.player-row {
  display: flex;
  align-items: center;
  gap: 18px;
  max-width: 1160px;
  margin: 0 auto;
  width: 100%;
}

.player-track {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.player-cover {
  width: 46px;
  height: 46px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}

.player-cover.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-elev2);
  color: var(--color-text-faint);
  font-size: 18px;
}

.player-info {
  min-width: 0;
}

.player-title {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-artist {
  color: var(--color-text-dim);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ctl-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-elev2);
  color: var(--color-text);
  padding: 0;
}

.ctl-btn svg {
  width: 18px;
  height: 18px;
}

.ctl-btn.active {
  background: var(--grad-brand);
  color: #fff;
}

.ctl-btn.ghost {
  background: transparent;
  color: var(--color-text-dim);
  font-size: 13px;
  width: auto;
  height: auto;
  padding: 6px 10px;
}

.ctl-btn.ghost:hover:not(:disabled) {
  background: var(--color-bg-elev2);
  box-shadow: none;
}

.ctl-btn.ghost.active {
  color: var(--color-accent);
  background: transparent;
}

.player-time {
  color: var(--color-text-dim);
  font-size: 12px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.player-volume {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.vol-icon {
  font-size: 13px;
}

.player-volume input[type='range'] {
  width: 88px;
}

.player-lyric {
  max-height: 200px;
  overflow-y: auto;
  text-align: center;
  padding: 8px 0 0;
  max-width: 1160px;
  margin: 0 auto;
  width: 100%;
}

.lyric-line {
  color: var(--color-text-dim);
  font-size: 13px;
  line-height: 1.9;
  transition: color 0.15s ease, transform 0.15s ease;
}

.lyric-line.active {
  color: var(--color-accent);
  font-weight: 600;
  transform: scale(1.02);
}

.lyric-empty {
  color: var(--color-text-dim);
  font-size: 12px;
  padding: 8px 0;
}
</style>

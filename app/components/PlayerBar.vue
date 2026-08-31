<template>
  <div v-if="player.url" class="player-bar">
    <div class="player-row">
      <img v-if="player.cover" :src="player.cover" class="player-cover" >
      <div v-else class="player-cover placeholder">♪</div>
      <div class="player-info">
        <div class="player-title">{{ player.title }}</div>
        <div class="player-artist">{{ player.artist }}</div>
      </div>
      <button class="btn-ghost" @click="toggle">{{ player.playing ? '暂停' : '播放' }}</button>
      <div class="player-progress">
        <input
          type="range"
          :max="player.duration || 0"
          :value="player.currentTime"
          step="0.1"
          @input="onSeek($event)"
        >
        <span class="player-time">{{ fmt(player.currentTime) }} / {{ fmt(player.duration) }}</span>
      </div>
      <button class="btn-ghost" :class="{ active: showLyric }" @click="showLyric = !showLyric">歌词</button>
      <div class="player-volume">
        <span class="vol-icon">{{ player.volume === 0 ? '🔇' : '🔊' }}</span>
        <input
          type="range"
          :value="Math.round(player.volume * 100)"
          min="0"
          max="100"
          @input="onVolume($event)"
        >
      </div>
      <button class="btn-ghost" @click="stop">关闭</button>
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
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 900;
  background: rgba(10, 14, 23, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid var(--color-border);
  padding: 10px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.player-row {
  display: flex;
  align-items: center;
  gap: 14px;
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
}

.player-cover {
  width: 42px;
  height: 42px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.player-cover.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-elev2);
  color: var(--color-text-dim);
  font-size: 18px;
}

.player-info {
  min-width: 0;
  max-width: 220px;
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

.player-progress {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.player-progress input[type='range'] {
  flex: 1;
  min-width: 0;
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
  gap: 6px;
  flex-shrink: 0;
}

.vol-icon {
  font-size: 13px;
}

.player-volume input[type='range'] {
  width: 72px;
}

.player-bar button.active {
  color: var(--color-accent);
}

.player-lyric {
  max-height: 200px;
  overflow-y: auto;
  text-align: center;
  padding: 4px 0;
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

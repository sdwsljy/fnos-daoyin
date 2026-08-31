import type { Ref } from 'vue'

export type PlayerState = {
  url: string | null
  title: string
  artist: string
  cover?: string
  playing: boolean
  duration: number
  currentTime: number
  lyric: string | null
  volume: number
}

let audioEl: HTMLAudioElement | null = null

export function usePlayer() {
  const player: Ref<PlayerState> = useState<PlayerState>('daoyin-player', () => ({
    url: null,
    title: '',
    artist: '',
    cover: undefined,
    playing: false,
    duration: 0,
    currentTime: 0,
    lyric: null,
    volume: 1,
  }))

  function ensureAudio() {
    if (audioEl) return audioEl
    audioEl = new Audio()
    audioEl.volume = player.value.volume
    audioEl.addEventListener('loadedmetadata', () => {
      player.value.duration = audioEl?.duration || 0
    })
    audioEl.addEventListener('timeupdate', () => {
      player.value.currentTime = audioEl?.currentTime || 0
    })
    audioEl.addEventListener('ended', () => {
      player.value.playing = false
    })
    audioEl.addEventListener('error', () => {
      player.value.playing = false
    })
    return audioEl
  }

  function play(input: { url: string; title: string; artist: string; cover?: string }) {
    const audio = ensureAudio()
    audio.src = input.url
    player.value = {
      ...input,
      playing: true,
      duration: 0,
      currentTime: 0,
      lyric: null,
      volume: player.value.volume,
    }
    audio.play().catch(() => {
      player.value.playing = false
    })
  }

  function toggle() {
    const audio = ensureAudio()
    if (!audio.src) return
    if (audio.paused) {
      audio.play().catch(() => {})
      player.value.playing = true
    } else {
      audio.pause()
      player.value.playing = false
    }
  }

  function seek(sec: number) {
    const audio = ensureAudio()
    if (!audio.src || !Number.isFinite(sec)) return
    audio.currentTime = Math.max(0, Math.min(sec, audio.duration || sec))
    player.value.currentTime = audio.currentTime
  }

  function setLyric(lyric: string | null) {
    player.value.lyric = lyric
  }

  function setVolume(v: number) {
    const audio = ensureAudio()
    const vol = Math.max(0, Math.min(1, v))
    audio.volume = vol
    player.value.volume = vol
  }

  function stop() {
    audioEl?.pause()
    if (audioEl) audioEl.src = ''
    player.value = {
      url: null,
      title: '',
      artist: '',
      cover: undefined,
      playing: false,
      duration: 0,
      currentTime: 0,
      lyric: null,
      volume: player.value.volume,
    }
  }

  return {
    player,
    play,
    toggle,
    seek,
    setLyric,
    setVolume,
    stop,
  }
}

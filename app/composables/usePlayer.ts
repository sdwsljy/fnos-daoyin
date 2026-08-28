import type { Ref } from 'vue'

export type PlayerState = {
  url: string | null
  title: string
  artist: string
  cover?: string
  playing: boolean
}

let audioEl: HTMLAudioElement | null = null

export function usePlayer() {
  const player: Ref<PlayerState> = useState<PlayerState>('daoyin-player', () => ({
    url: null,
    title: '',
    artist: '',
    cover: undefined,
    playing: false,
  }))

  function ensureAudio() {
    if (audioEl) return audioEl
    audioEl = new Audio()
    audioEl.addEventListener('ended', () => {
      player.value.playing = false
    })
    return audioEl
  }

  function play(input: { url: string; title: string; artist: string; cover?: string }) {
    const audio = ensureAudio()
    audio.src = input.url
    player.value = { ...input, playing: true }
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

  function stop() {
    audioEl?.pause()
    player.value.playing = false
  }

  return {
    player,
    play,
    toggle,
    stop,
  }
}

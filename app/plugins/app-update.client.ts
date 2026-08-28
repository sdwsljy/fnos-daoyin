import { useAppUpdate } from '~/composables/useAppUpdate'

export default defineNuxtPlugin(() => {
  const { check } = useAppUpdate()
  setTimeout(() => {
    void check()
  }, 1500)
})

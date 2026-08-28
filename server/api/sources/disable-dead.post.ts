import { disableDeadSources } from '~~/server/services/sourceRegistry'

export default defineEventHandler(() => {
  return disableDeadSources()
})

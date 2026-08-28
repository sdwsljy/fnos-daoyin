import { saveSettings } from '~~/server/services/settingsService'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const next = saveSettings(body || {})
  return { settings: next }
})

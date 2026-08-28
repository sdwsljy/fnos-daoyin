import { getSettings, NAME_TEMPLATE_VARS } from '~~/server/services/settingsService'

export default defineEventHandler(() => {
  return { settings: getSettings(), nameTemplateVars: NAME_TEMPLATE_VARS }
})

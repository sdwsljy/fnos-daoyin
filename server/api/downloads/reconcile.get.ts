import { diffLocalFiles } from '~~/server/services/downloadQueue'

export default defineEventHandler(() => {
  return diffLocalFiles()
})

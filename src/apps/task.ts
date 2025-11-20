import config from '@/components/config'
import api from '@/model/api'
import { gameIds, getGameName } from '@/model/util'
import karin, { logger } from 'node-karin'

const tasks = gameIds.map((gameId) => {
  const name = `${getGameName(gameId as GameKey)}版本监控`
  const cron = config.getGameConfig(gameId)?.cron || '0 0/5 * * * *'
  const LogSet = config.getGameConfig(gameId)?.log || false
  logger.info(`[karin-plugin-gamepush] 创建定时任务: ${name} (cron: ${cron})`)

  return karin.task(name, cron, async () => {
    try {
      await api.checkVersion(true, gameId as GameKey)
    } catch (e) {
      logger.error(`[karin-plugin-gamepush] ${name}定时任务执行错误:`, e)
    }
  }, { log: LogSet })
})

export const Task = tasks

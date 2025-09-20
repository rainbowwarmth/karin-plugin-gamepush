import config from '@/components/config'
import request from '@/components/request'
import base from '@/model/base'
import { GAME_CONFIG, getGameChuckAPI, getGameName, getRedisKeys, versionComparator } from '@/model/util'
import { karin, logger, redis, segment } from 'node-karin'
import notice from '@/model/notice'

type GameKey = 'sr' | 'ys' | 'zzz' | 'bh3' | 'ww'

class Api extends base {
  gameApis = new Map()
  e: any
  redis: any
  constructor (e: any) {
    super()
    this.e = e
    this.redis = redis
    Object.keys(GAME_CONFIG).forEach((game) => {
      this.gameApis.set(game, getGameChuckAPI(game as GameKey))
    })
  }

  async autoCheck (game: GameKey) {
    try {
      const gameConfig = config.getGameConfig(game)
      if (gameConfig.enable) {
        await this.checkVersion(true, game)
      }
    } catch (err: any) {
      logger.error(`[karin-plugin-gamepush][${getGameName(game)}自动检查] 失败`, err)
    }
  }

  async checkVersion (auto = false, game: GameKey) {
    if (!game || !GAME_CONFIG[game]) {
      throw new Error(`[karin-plugin-gamepush] 无效的游戏标识: ${game}`)
    }
    try {
      const apiUrl = this.gameApis.get(game)
      const data = await request.get(apiUrl, {
        responseType: "json",
        log: true,
        gameName: getGameName(game)
      })

      if (game === "ww") {
        await this.processWWData(data, game, auto)
      } else {
        await this.processMHYData(data, game, auto)
      }
    } catch (err: any) {
      logger.error(`[karin-plugin-gamepush][${getGameName(game)}版本监控] 错误`, err)
      if (!auto) this.e.reply(`[karin-plugin-gamepush] ❌ 检查失败：${err.message}`)
    }
  }

  async processWWData (data: any, game: GameKey, auto: boolean) {
    const gameCheckData = data
    await this.processMainVersion(game, gameCheckData.default?.config?.version)
    await this.processPreDownload(game, gameCheckData.predownload?.config)
  }

  async processMHYData (data: any, game: GameKey, auto: boolean) {
    const gameCheckData = data?.data?.game_branches?.[0]
    if (!gameCheckData) throw new Error(`[karin-plugin-gamepush] ${getGameName(game)}游戏数据解析失败`)
    await this.processMainVersion(game, gameCheckData.main?.tag)
    await this.processPreDownload(game, gameCheckData.pre_download)
  }

  async processMainVersion (game: GameKey, currentVersion: any) {
    if (!currentVersion) return
    const { main: redisKey } = getRedisKeys(game)
    const stored = (await redis.get(redisKey)) || "0.0.0"
    if (versionComparator.compare(currentVersion, stored) > 0) {
      await redis.set(redisKey, currentVersion)
      notice.pushNotify({
        type: "main",
        game,
        newVersion: currentVersion,
        oldVersion: stored,
        pushChangeType: config.getGameConfig(game).pushChangeType
      })
    }
  }

  async processPreDownload (game: GameKey, preData: any) {
    const { pre: preKey } = getRedisKeys(game)
    const currentPre = game === "ww" ? preData?.version : preData?.tag
    const storedPre = await redis.get(preKey)
    if (currentPre) {
      if (currentPre !== storedPre) {
        await redis.set(preKey, currentPre)
        notice.pushNotify({
          type: "pre",
          game,
          newVersion: currentPre,
          oldVersion: storedPre || "0.0.0",
          pushChangeType: config.getGameConfig(game).pushChangeType
        })
      }
    } else if (storedPre) {
      await redis.del(preKey)
      notice.pushNotify({
        type: "pre-remove",
        game,
        newVersion: currentPre,
        oldVersion: storedPre,
        pushChangeType: config.getGameConfig(game).pushChangeType
      })
    }
  }

  async sendToGroups (msg: string, game: GameKey, gameConfig: any, pushChangeType: any) {
    if (!gameConfig?.pushGroups?.length) {
      logger.debug(`[karin-plugin-gamepush][${getGameName(game)}] 未配置推送群组`)
      return
    }
    for (const pushItem of gameConfig.pushGroups) {
      let botId, groupId
      if (typeof pushItem === "object") {
        botId = pushItem.botId
        groupId = pushItem.groupId
      }
      const bot = karin.getBot(botId)
      if (!bot) {
        return false
      }
      if (pushChangeType === "1") {
        return await karin.sendMsg(botId, {
          scene: "group", peer: groupId,
          name: ''
        }, msg)
      } else if (pushChangeType === "2") {
        const message = segment.text(msg)
        return await karin.sendMsg(botId, {
          scene: "group", peer: groupId,
          name: ''
        }, message)
      }
    }
  }

  formatSize (bytes: number) {
    const units = ["B", "KB", "MB", "GB", "TB"]
    let size = Number(bytes)
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`
  }
}
export default new Api({})

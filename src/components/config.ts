import fs from 'fs'
import path from 'path'
import YAML from 'yaml'
import chokidar, { FSWatcher } from 'chokidar'
import { logger } from 'node-karin'
import { gameIds, getGameName } from '@/model/util'

const CONFIG_DIR = path.join(process.cwd(), '@karinjs/karin-plugin-gamepush/config')
const CONFIG_PATH = path.join(CONFIG_DIR, 'GamePush-Plugin.yaml')
const DEFAULT_CRON = '0 0/5 * * * *'

class Config {
  configCache: { [key: string]: GameConfig } = {}
  watcher: FSWatcher | null = null
  constructor () {
    this.init()
  }

  init () {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true })
    if (!fs.existsSync(CONFIG_PATH)) this.saveConfig(this.getDefaultConfig())
    this.loadConfig()
    this.setupWatcher()
  }

  catch (error: unknown) {
    logger.error('[karin-plugin-gamepush] 配置初始化失败', error)
    this.configCache = this.getDefaultConfig()
  }

  getDefaultConfig () {
    return Object.fromEntries(
      gameIds.map((id) => [id, { enable: true, log: false, cron: DEFAULT_CRON, pushGroups: [], pushChangeType: '1', html: 'default' } as GameConfig])
    )
  }

  static formatPushGroups (list: (PushGroup | string)[] = []): PushGroup[] {
    return list
      .map((item: PushGroup | string) => {
        if (typeof item === 'string') {
          const [botId, groupId] = item.split(':')
          return botId && groupId ? { botId, groupId } : null
        }
        return item && typeof item === 'object' ? item : null
      })
      .filter((v): v is PushGroup => v != null)
  }

  static serializePushGroups (list: (PushGroup | string)[] = []): string[] {
    return list.map((item: PushGroup | string) => (typeof item === 'string' ? item : `${item.botId}:${item.groupId}`))
  }

  loadConfig () {
    try {
      const raw = fs.existsSync(CONFIG_PATH) ? YAML.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) : {}
      this.configCache = this.getDefaultConfig()

      for (const gameId of gameIds) {
        if (raw[gameId]) {
          const cfg = raw[gameId]
          this.configCache[gameId] = {
            enable: !!cfg.enable,
            log: !!cfg.log,
            cron: cfg.cron || DEFAULT_CRON,
            pushGroups: Config.formatPushGroups(cfg.pushGroups),
            pushChangeType: cfg.pushChangeType || '1',
            html: cfg.html || 'default'
          }
        }
      }
    } catch (error: unknown) {
      logger.error('[karin-plugin-gamepush] 配置加载失败', error)
      this.configCache = this.getDefaultConfig()
    }
  }

  saveConfig (newConfig: { [key: string]: GameConfig }) {
    try {
      const saveData = Object.fromEntries(
        Object.entries(newConfig).map(([gameId, cfg]) => [gameId, {
          enable: cfg.enable,
          log: cfg.log,
          cron: cfg.cron,
          pushGroups: Config.serializePushGroups(cfg.pushGroups),
          pushChangeType: cfg.pushChangeType,
          html: cfg.html
        }
        ])
      )
      fs.writeFileSync(CONFIG_PATH, YAML.stringify(saveData, { indent: 2 }), 'utf8')
      this.configCache = newConfig
      return true
    } catch (err) {
      logger.error('[karin-plugin-gamepush] 配置保存失败', err)
      return false
    }
  }

  async setupWatcher () {
    if (this.watcher) return
    try {
      this.watcher = chokidar.watch(CONFIG_PATH).on('change', () => {
        logger.info('[karin-plugin-gamepush] 配置变更，重新加载')
        this.loadConfig()
      })
    } catch (err) {
      logger.error('[karin-plugin-gamepush] 设置配置监视器失败', err)
    }
  }

  getGameConfig (game: string) {
    return this.configCache[game] || this.getDefaultConfig()[game]
  }

  updateGameConfig (game: string, updater: (cfg: GameConfig) => GameConfig) {
    const config = structuredClone(this.configCache)
    config[game] ||= this.getDefaultConfig()[game]
    config[game] = updater(config[game])
    this.saveConfig(config)
  }

  addPushGroup (gameId: GameKey, botId: string, groupId: string) {
    this.updateGameConfig(gameId, (cfg) => {
      const exists = cfg.pushGroups.some((g) => g.botId === botId && g.groupId === groupId)
      if (!exists) {
        cfg.pushGroups.push({ botId, groupId })
        logger.debug(`[karin-plugin-gamepush] 游戏${getGameName(gameId)} 添加机器人: ${botId} 群聊：${groupId} 推送配置`
        )
      } else {
        logger.debug(`[karin-plugin-gamepush] 游戏${getGameName(gameId)} 机器人: ${botId} 群聊：${groupId} 推送配置已存在`)
      }
      return cfg
    })
  }

  removePushGroup (gameId: GameKey, botId: string, groupId: string) {
    this.updateGameConfig(gameId, (cfg) => {
      const before = cfg.pushGroups.length
      cfg.pushGroups = cfg.pushGroups.filter((g) => !(g.botId === botId && g.groupId === groupId))
      if (cfg.pushGroups.length < before) {
        logger.debug(
          `[karin-plugin-gamepush] 游戏${getGameName(gameId)} 移除机器人: ${botId} 群聊：${groupId} 推送配置`
        )
      } else {
        logger.debug(
          `[karin-plugin-gamepush] 游戏${getGameName(gameId)} 不存在机器人: ${botId} 群聊：${groupId} 推送配置，无需移除`
        )
      }
      return cfg
    })
  }

  getFrontendConfig () {
    logger.debug('当前配置缓存:', JSON.stringify(this.configCache, null, 2))
    const frontendConfig: { [key: string]: GameConfig[] } = {}

    for (const gameId of gameIds) {
      const cfg = this.getGameConfig(gameId)
      frontendConfig[gameId] = [
        {
          enable: cfg.enable,
          log: false,
          cron: cfg.cron || DEFAULT_CRON,
          pushGroups: Config.formatPushGroups(cfg.pushGroups),
          pushChangeType: cfg.pushChangeType || '1',
          html: cfg.html || 'default'
        }
      ]
    }

    logger.debug('[karin-plugin-gamepush] 生成的前端配置:', JSON.stringify(frontendConfig, null, 2))
    return frontendConfig
  }

  parseFrontendConfig (data:any): { [key: string]: GameConfig } {
    const saveData: { [key: string]: GameConfig } = {}
    for (const gameId of gameIds) {
      const cfg = (data[gameId] || [])[0] || {}
      saveData[gameId] = {
        enable: Boolean(cfg.enable ?? true),
        log: Boolean(cfg.log ?? true),
        cron: cfg.cron || DEFAULT_CRON,
        pushGroups: Config.formatPushGroups(cfg.pushGroups || []),
        pushChangeType: cfg.pushChangeType || '1',
        html: cfg.html || 'default'
      }
    }
    return saveData
  }

  async saveFromFrontend (data: unknown) {
    try {
      logger.debug('[karin-plugin-gamepush] 接收到的原始数据:', JSON.stringify(data, null, 2))
      const saveData = this.parseFrontendConfig(data)

      for (const gameId of gameIds) {
        saveData[gameId].pushGroups = [
          ...new Map(
            saveData[gameId].pushGroups.map((g: { botId: string; groupId: string }) => [`${g.botId}:${g.groupId}`, g])
          ).values()
        ]
      }

      logger.debug('[karin-plugin-gamepush] 处理后的配置数据:', JSON.stringify(saveData, null, 2))

      if (this.saveConfig(saveData)) {
        logger.info('[karin-plugin-gamepush] 配置保存成功')
        return { success: true, message: '游戏推送配置已保存！' }
      }
      return { success: false, message: '保存配置文件时出错' }
    } catch (error: unknown) {
      logger.error('[karin-plugin-gamepush] 前端配置保存失败', error)
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, message: `配置保存失败: ${message}` }
    }
  }
}

export default new Config()

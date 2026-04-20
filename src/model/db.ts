import path from 'path'
import fs from 'fs'
import { Sequelize, DataTypes } from 'sequelize'
import { common, logger } from 'node-karin'
import { dir } from '@/components/path'
import request from '@/components/request'

class GamePushDB {
  REMOTE_VERSION_URL =
    'https://cnb.cool/rainbowwarmth/resources/-/git/raw/main/GamePush-Plugin/GamePush-Plugin-version.json'

  DB_DOWNLOAD_URL = 'https://cnb.cool/rainbowwarmth/resources/-/git/raw/main/GamePush-Plugin/GamePush-Plugin.db'
  DB_DIR: string
  DB_PATH: string
  VERSION_JSON_PATH: string
  initPromise: Promise<boolean> | null
  sequelize: any
  MainModel: any
  PreModel: any

  constructor () {
    this.DB_DIR = path.join(process.cwd(), '@karinjs/karin-plugin-gamepush/data')
    this.DB_PATH = path.join(this.DB_DIR, 'GamePush-Plugin.db')
    this.VERSION_JSON_PATH = path.join(this.DB_DIR, 'GamePush-Plugin-version.json')
    this.initPromise = null
  }

  async ensureInitialized () {
    return (this.initPromise ??= this.initialize().then(() => true))
  }

  ensureDirExists () {
    if (!fs.existsSync(this.DB_DIR)) {
      fs.mkdirSync(this.DB_DIR, { recursive: true })
      logger.debug(`[${dir.name}] 📂 创建数据库目录: ${this.DB_DIR}`)
    }
  }

  async fetchRemoteVersionInfo () {
    try {
      logger.debug(`[${dir.name}] 🌐 获取远程版本信息...`)
      const res = await request.get(this.REMOTE_VERSION_URL, {
        responseType: 'json',
        log: true
      })
      if (!res) throw new Error('请求返回空')
      logger.debug(`[${dir.name}] ✅ 远程版本: ${res.version}`)
      return res
    } catch (err) {
      logger.error(`[${dir.name}] ❌ 获取远程版本失败`, err)
      throw err
    }
  }

  async downloadDatabase () {
    this.ensureDirExists()
    logger.debug(`[${dir.name}] ⬇️ 下载数据库文件...`)
    await common.downFile(this.DB_DOWNLOAD_URL, this.DB_PATH)
  }

  saveLocalVersionInfo (info: { version: string }) {
    try {
      fs.writeFileSync(this.VERSION_JSON_PATH, JSON.stringify(info, null, 2))
      logger.debug(`[${dir.name}] 💾 本地版本已更新: ${info.version}`)
    } catch (err) {
      logger.error(`[${dir.name}] ❌ 保存本地版本失败`, err)
    }
  }

  async checkDatabase () {
    this.ensureDirExists()
    const dbExists = fs.existsSync(this.DB_PATH)
    const versionFileExists = fs.existsSync(this.VERSION_JSON_PATH)

    let remoteInfo = null
    try {
      remoteInfo = await this.fetchRemoteVersionInfo()
    } catch {
      if (dbExists) return true
    }

    const localInfo = versionFileExists
      ? JSON.parse(fs.readFileSync(this.VERSION_JSON_PATH, 'utf8') || '{}')
      : {}

    const needDownload = !dbExists || (remoteInfo && localInfo.version !== remoteInfo.version)

    if (needDownload) {
      await this.downloadDatabase()
      this.saveLocalVersionInfo(
        remoteInfo || {
          ...localInfo,
          version: localInfo.version + '_local' || `v${new Date().toISOString().slice(0, 10)}`
        }
      )
    }

    return true
  }

  defineModel (name: string, fields: { id: { type: DataTypes.IntegerDataTypeConstructor; primaryKey: boolean; autoIncrement: boolean } | { type: DataTypes.IntegerDataTypeConstructor; primaryKey: boolean; autoIncrement: boolean }; game: { type: DataTypes.StringDataTypeConstructor; allowNull: boolean } | { type: DataTypes.StringDataTypeConstructor; allowNull: boolean }; version?: { type: DataTypes.StringDataTypeConstructor; allowNull: boolean }; size: { type: DataTypes.StringDataTypeConstructor; allowNull: boolean } | { type: DataTypes.StringDataTypeConstructor; allowNull: boolean }; ver?: { type: DataTypes.StringDataTypeConstructor; allowNull: boolean }; oldver?: { type: DataTypes.StringDataTypeConstructor; allowNull: boolean } }) {
    return this.sequelize.define(name, fields, {
      tableName: name,
      timestamps: false,
      freezeTableName: true
    })
  }

  initializeModels () {
    this.MainModel = this.defineModel('main', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      game: { type: DataTypes.STRING, allowNull: false },
      version: { type: DataTypes.STRING, allowNull: false },
      size: { type: DataTypes.STRING, allowNull: false },
 	    time: { type: DataTypes.TEXT, allowNull: true }
    })

    this.PreModel = this.defineModel('pre', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      game: { type: DataTypes.STRING, allowNull: false },
      ver: { type: DataTypes.STRING, allowNull: false },
      oldver: { type: DataTypes.STRING, allowNull: false },
      size: { type: DataTypes.STRING, allowNull: false },
 	    time: { type: DataTypes.TEXT, allowNull: true }
    })
  }

  async initialize () {
    await this.checkDatabase()

    this.sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: this.DB_PATH,
      logging: false,
      define: { freezeTableName: true, timestamps: false },
      dialectOptions: { foreign_keys: 'ON' }
    })

    await this.sequelize.authenticate()
    logger.debug(`[${dir.name}] 📊 数据库连接成功: ${this.DB_PATH}`)

    this.initializeModels()
    await this.sequelize.sync({ alter: true })
    logger.debug(`[${dir.name}] ✅ 数据库模型同步完成`)
  }

  async storeMainSizeData (game: GameKey, version: string, size: string) {
    await this.ensureInitialized()
    const Time = new Date().toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
 	    year: "numeric",
 	    month: "2-digit",
 	    day: "2-digit",
      hour: "2-digit",
 	    minute: "2-digit",
 	    second: "2-digit"
    })
    const [created] = await this.MainModel.findOrCreate({
      where: { game, version },
      defaults: { size, time: Time }
    })
    if (created) logger.debug(`[${dir.name}] 💾 main 表新增: ${game}-${version} | ${size}`)
    return created
  }

  async storePreSizeData (game: GameKey, ver: string, oldver: string, size: string) {
    await this.ensureInitialized()
    const Time = new Date().toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
 	    year: "numeric",
 	    month: "2-digit",
 	    day: "2-digit",
      hour: "2-digit",
 	    minute: "2-digit",
 	    second: "2-digit"
    })
    const [created] = await this.PreModel.findOrCreate({
      where: { game, ver, oldver },
      defaults: { size, time: Time }
    })
    if (created) { logger.debug(`[${dir.name}] 💾 pre 表新增: ${game}-${ver} | old: ${oldver} | ${size}`) }
    return created
  }

  /**
   * 获取main表数据
   * @param {string} game - 游戏ID
   * @param {string} [version] - 可选，指定版本号
   * @returns {Promise<Array>} 返回匹配的数据记录
   */
  async getMainData (game: GameKey, version = null) {
    await this.ensureInitialized()
    const where: { game: GameKey; version?: string } = { game }
    if (version !== null && version !== undefined) {
      where.version = version
    }
    return this.MainModel.findAll({ where })
  }

  /**
   * 获取pre表数据
   * @param {string} game - 游戏ID
   * @param {string} [ver] - 可选，指定预下载版本号
   * @returns {Promise<Array>} 返回匹配的数据记录
   */
  async getPreData (game: GameKey, ver = null) {
    await this.ensureInitialized()
    return this.PreModel.findAll({ where: ver ? { game, ver } : { game } })
  }

  async close () {
    if (this.sequelize) {
      await this.sequelize.close()
      logger.info(`[${dir.name}] 🔌 数据库连接已关闭`)
    }
  }
}

const dbInstance = new GamePushDB()
const dbPromise = dbInstance.ensureInitialized().then(() => dbInstance)

export default dbPromise

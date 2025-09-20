import db from '@/model/db'
import { getRedisKeys } from '@/model/util'
import karin, { common, redis } from 'node-karin'
import fs from 'fs'

type GameKey = 'sr' | 'ys' | 'zzz' | 'bh3' | 'ww'

const gameRegexMap: Record<GameKey, RegExp> = {
  ys: /(ys|YS|原神)/,
  sr: /(\*|星铁|星轨|穹轨|星穹|崩铁|星穹铁道|崩坏星穹铁道|铁道)/,
  zzz: /(%|％|绝区零|zzz|ZZZ|绝区)/,
  bh3: /(!|！|崩坏三|崩坏3|崩三|崩3|bbb|三崩子)/,
  ww: /(~|～|鸣潮|ww|WW|mc)/
}

const gameInfoMap: Record<GameKey, { id: GameKey; display: string }> = {
  ys: { id: "ys", display: "原神" },
  sr: { id: "sr", display: "星铁" },
  zzz: { id: "zzz", display: "绝区零" },
  bh3: { id: "bh3", display: "崩坏3" },
  ww: { id: "ww", display: "鸣潮" }
}

export const delkey = karin.command(buildReg("删除rediskey"), async (e) => {
  try {
    const match = getMatchGameId(e.msg)
    if (!match) return e.reply("未找到匹配的游戏类型")

    const keys = getRedisKeys(match.id)
    if (!keys?.main) return e.reply("配置中未找到主RedisKey")

    await redis.del(keys.main)
    e.reply(`${match.display} RedisKey已删除`)
  } catch (error: any) {
    e.reply(`删除失败: ${error.message}`)
  }
}, {
  name: "GamePush-删除rediskey",
  priority: 100,
  event: "message",
  permission: "master"
})

export const delPreKey = karin.command(buildReg("删除预下载rediskey"), async (e) => {
  try {
    const match = getMatchGameId(e.msg)
    if (!match) return e.reply("未找到匹配的游戏类型")

    const keys = getRedisKeys(match.id)
    if (!keys?.pre) return e.reply("配置中未找到预下载RedisKey")

    await redis.del(keys.pre)
    e.reply(`${match.display} 预下载RedisKey已删除`)
  } catch (error: any) {
    e.reply(`删除失败: ${error.message}`)
  }
}, {
  name: "GamePush-删除预下载rediskey",
  priority: 100,
  event: "message",
  permission: "master"
})

export const setkey = karin.command(buildReg("设置rediskey\\s*(.+)"), async (e) => {
  try {
    const match = getMatchGameId(e.msg)
    if (!match) return e.reply("未找到匹配的游戏类型")

    const keys = getRedisKeys(match.id)
    if (!keys?.main) return e.reply("配置中未找到主RedisKey")

    const [, value] = e.msg.match(/设置rediskey\s*(.+)/i) || []
    if (!value) return e.reply("请提供要设置的值")

    await redis.set(keys.main, value.trim())
    e.reply(`${match.display} RedisKey已设置为: ${value}`)
  } catch (error: any) {
    e.reply(`设置失败: ${error.message}`)
  }
}, {
  name: "GamePush-设置rediskey",
  priority: 100,
  event: "message",
  permission: "master"
})

export const setPrekey = karin.command(buildReg("设置预下载rediskey\\s*(.+)"), async (e) => {
  try {
    const match = getMatchGameId(e.msg)
    if (!match) return e.reply("未找到匹配的游戏类型")

    const keys = getRedisKeys(match.id)
    if (!keys?.pre) return e.reply("配置中未找到预下载RedisKey")

    const [, value] = e.msg.match(/设置rediskey\s*(.+)/i) || []
    if (!value) return e.reply("请提供要设置的值")

    await redis.set(keys.pre, value.trim())
    e.reply(`${match.display} RedisKey已设置为: ${value}`)
  } catch (error: any) {
    e.reply(`设置失败: ${error.message}`)
  }
}, {
  name: "GamePush-设置预下载rediskey",
  priority: 100,
  event: "message",
  permission: "master"
})

export const updatedb = karin.command(`#更新游戏版本数据`, async (e) => {
  const DB_DOWNLOAD_URL = (await db).DB_DOWNLOAD_URL
  const DB_PATH = (await db).DB_PATH
  const VERSION_JSON_PATH = (await db).VERSION_JSON_PATH
  await e.reply(`正在更新版本数据，请稍候...`)
  await common.downFile(DB_DOWNLOAD_URL, DB_PATH)
  const localInfo = JSON.parse(fs.readFileSync(VERSION_JSON_PATH, "utf8") || "{}")
  await e.reply(`版本数据更新完成！, 当前数据版本：${localInfo.version || '未知'}`)
}, {
  name: "GamePush-更新版本数据",
  priority: 100,
  event: "message",
  permission: "master"
})

function getMatchGameId (msg: string) {
  const entries = Object.entries(gameRegexMap) as [GameKey, RegExp][]

  for (const [id, regex] of entries) {
    if (regex.test(msg)) return gameInfoMap[id]
  }

  if (/^#*(删除|设置)(预下载)?rediskey/.test(msg)) {
    return gameInfoMap["ys"]
  }

  return null
}

function buildReg (action: any) {
  const allPatterns = Object.values(gameRegexMap)
    .map((r) => r.source)
    .join("|")
  return new RegExp(`^#*(?:(?:${allPatterns})\\s*)?${action}$`)
}
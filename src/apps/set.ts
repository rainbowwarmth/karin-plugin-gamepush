import db from '@/model/db'
import { getGameName, getRedisKeys, getReg } from '@/model/util'
import karin, { common, redis } from 'node-karin'
import fs from 'fs'

type GameKey = 'sr' | 'ys' | 'zzz' | 'bh3' | 'ww'
const GAME_KEYS: GameKey[] = ['ys', 'sr', 'zzz', 'bh3', 'ww']

export const delkey = karin.command(buildReg('删除rediskey'), async (e) => {
  try {
    const match = getMatchGameId(e.msg)
    if (!match) return e.reply('未找到匹配的游戏类型')

    const keys = getRedisKeys(match.id)
    if (!keys?.main) return e.reply('配置中未找到主RedisKey')

    await redis.del(keys.main)
    e.reply(`${match.display} RedisKey已删除`)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    e.reply(`删除失败: ${msg}`)
  }
}, {
  name: 'GamePush-删除rediskey',
  priority: 100,
  event: 'message',
  permission: 'master'
})

export const delPreKey = karin.command(buildReg('删除预下载rediskey'), async (e) => {
  try {
    const match = getMatchGameId(e.msg)
    if (!match) return e.reply('未找到匹配的游戏类型')

    const keys = getRedisKeys(match.id)
    if (!keys?.pre) return e.reply('配置中未找到预下载RedisKey')

    await redis.del(keys.pre)
    e.reply(`${match.display} 预下载RedisKey已删除`)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    e.reply(`删除失败: ${msg}`)
  }
}, {
  name: 'GamePush-删除预下载rediskey',
  priority: 100,
  event: 'message',
  permission: 'master'
})

export const setkey = karin.command(buildReg('设置rediskey\\s*(.+)'), async (e) => {
  try {
    const match = getMatchGameId(e.msg)
    if (!match) return e.reply('未找到匹配的游戏类型')

    const keys = getRedisKeys(match.id)
    if (!keys?.main) return e.reply('配置中未找到主RedisKey')

    const [, value] = e.msg.match(/设置rediskey\s*(.+)/i) || []
    if (!value) return e.reply('请提供要设置的值')

    await redis.set(keys.main, value.trim())
    e.reply(`${match.display} RedisKey已设置为: ${value}`)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    e.reply(`删除失败: ${msg}`)
  }
}, {
  name: 'GamePush-设置rediskey',
  priority: 100,
  event: 'message',
  permission: 'master'
})

export const setPrekey = karin.command(buildReg('设置预下载rediskey\\s*(.+)'), async (e) => {
  try {
    const match = getMatchGameId(e.msg)
    if (!match) return e.reply('未找到匹配的游戏类型')

    const keys = getRedisKeys(match.id)
    if (!keys?.pre) return e.reply('配置中未找到预下载RedisKey')

    const [, value] = e.msg.match(/设置rediskey\s*(.+)/i) || []
    if (!value) return e.reply('请提供要设置的值')

    await redis.set(keys.pre, value.trim())
    e.reply(`${match.display} RedisKey已设置为: ${value}`)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    e.reply(`删除失败: ${msg}`)
  }
}, {
  name: 'GamePush-设置预下载rediskey',
  priority: 100,
  event: 'message',
  permission: 'master'
})

export const updatedb = karin.command('#更新游戏版本数据', async (e) => {
  const DB_DOWNLOAD_URL = (await db).DB_DOWNLOAD_URL
  const DB_PATH = (await db).DB_PATH
  const VERSION_JSON_PATH = (await db).VERSION_JSON_PATH
  await e.reply('正在更新版本数据，请稍候...')
  await common.downFile(DB_DOWNLOAD_URL, DB_PATH)
  const localInfo = JSON.parse(fs.readFileSync(VERSION_JSON_PATH, 'utf8') || '{}')
  await e.reply(`版本数据更新完成！, 当前数据版本：${localInfo.version || '未知'}`)
}, {
  name: 'GamePush-更新版本数据',
  priority: 100,
  event: 'message',
  permission: 'master'
})
/**
 * 匹配消息中的游戏ID（严格类型，无报错）
 */
function getMatchGameId (msg: string) {
  for (const game of GAME_KEYS) {
    const reg = getReg(game)
    if (new RegExp(reg).test(msg)) {
      return {
        id: game,
        display: getGameName(game)
      }
    }
  }

  if (/^#*(删除|设置)(预下载)?rediskey/.test(msg)) {
    return {
      id: 'ys' as GameKey,
      display: getGameName('ys')
    }
  }

  return null
}

/**
 * 构建指令正则（严格类型）
 */
function buildReg (action: string) {
  const allPatterns = GAME_KEYS.map(g => getReg(g)).join('|')
  return new RegExp(`^#*(?:(?:${allPatterns})\\s*)?${action}$`)
}

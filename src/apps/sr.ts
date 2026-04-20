import config from '@/components/config'
import api from '@/model/api'
import db from '@/model/db'
import download from '@/model/download'
import { getRedisKeys, getReg } from '@/model/util'
import karin, { common, redis } from 'node-karin'

const srReg = getReg('sr')

export const srCheck = karin.command(`^#*${srReg}版本监控$`, async (e) => {
  await api.checkVersion(true, 'sr')
  return e.reply('✅ 已执行手动检查', { reply: true })
}, {
  name: 'GmaePush-星铁版本监控',
  priority: 100,
  event: 'message',
  permission: 'master'
})

export const srPushSet = karin.command(`^#*${srReg}(开启|关闭)版本推送$`, async (e) => {
  if (!e.isGroup) return e.reply('❌ 该功能仅限群聊中使用', { reply: true })
  const groupId = String(e.groupId)
  const botId = String(e.selfId)
  const isEnable = e.msg.includes('开启')
  if (isEnable) {
    config.addPushGroup('sr', botId, groupId)
  } else {
    config.removePushGroup('sr', botId, groupId)
  }
  const action = isEnable ? `已添加本群到推送列表（ID：${groupId}）` : `已移除本群推送（ID：${groupId}）`
  return e.reply(`✅ 已${isEnable ? '开启' : '关闭'}星铁版本推送，${action}`, { reply: true })
}, {
  name: 'GmaePush-星铁版本推送设置',
  priority: 100,
  event: 'message',
  permission: 'master'
})

export const srVer = karin.command(`^#*${srReg}当前版本$`, async (e) => {
  const { main, pre } = getRedisKeys('sr')
  const [mainVer, preVer] = await Promise.all([redis.get(main), redis.get(pre)])
  const msg = [
    '📌 星铁当前版本信息',
    `正式版本：${mainVer || '未知'}`,
    `预下载版本：${preVer || '未开启'}`
  ].join('\n')
  return e.reply(msg, { reply: true })
}, {
  name: 'GamePush-星铁当前版本',
  priority: 100,
  event: 'message',
  permission: 'all'
})

export const srDownloadLinks = karin.command(`^#*${srReg}获取下载链接$`, async (e) => {
  try {
    const { data, patch } = await download.getDownloadData('sr', 'main') as {
      data: GamePatch,
      patch: GamePatch
    }
    if (!data) return e.reply('当前没有可用的正式版本下载', { reply: true })
    const { msg, client, PatchClient } = download.formatDownloadInfo('sr', data, 'main', patch) as {
      msg: string,
      client: string,
      PatchClient: string
    }
    return await e.bot.sendForwardMsg(e.contact, common.makeForward([msg, client, PatchClient], e.selfId, e.bot.account.name))
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    e.reply(`删除失败: ${msg}`)
  }
}, {
  name: 'GamePush-星铁下载链接',
  priority: 100,
  event: 'message',
  permission: 'all'
})

export const srPreDownloadLinks = karin.command(`^#*${srReg}获取预下载链接$`, async (e) => {
  try {
    const { data, patch } = await download.getDownloadData('sr', 'pre') as {
      data: GamePatch,
      patch: GamePatch
    }
    if (!data) return e.reply('🚫 星铁当前未开放预下载', { reply: true })
    const { msg, client, PatchClient } = download.formatDownloadInfo('sr', data, 'pre', patch) as {
      msg: string,
      client: string,
      PatchClient: string
    }
    return await e.bot.sendForwardMsg(e.contact, common.makeForward([msg, client, PatchClient], e.selfId, e.bot.account.name))
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    e.reply(`删除失败: ${msg}`)
  }
}, {
  name: 'GamePush-星铁预下载链接',
  priority: 100,
  event: 'message',
  permission: 'all'
})

export const srVersionData = karin.command(`^#*${srReg}版本数据(.*)$`, async (e) => {
  const input = e.msg.replace(new RegExp(`#*${srReg}版本数据`, 'i'), '').trim()
  try {
    if (!input) {
      const mainVersions = await (await db).getMainData('sr')
      const preVersions = await (await db).getPreData('sr')
      if ((!mainVersions || mainVersions.length === 0) && (!preVersions || preVersions.length === 0)) {
        return e.reply('暂无星铁版本数据', { reply: true })
      }
      let message = '📊 星铁历史版本数据：\n'
      if (mainVersions && mainVersions.length > 0) {
        message += '\n📦 正式版本：\n'
        message += mainVersions
          .map((record: { version: string; size: string }, index: number) => `${index + 1}. 版本号：${record.version}，占用大小：${record.size}`)
          .join('\n')
      }
      if (preVersions && preVersions.length > 0) {
        message += '\n\n🎁 预下载版本：\n'
        message += preVersions
          .map(
            (record: { ver: string; oldver: string; size: string }, index: number) =>
              `${index + 1}. 版本号：${record.ver}，旧版本：${record.oldver}，更新大小：${record.size}`
          )
          .join('\n')
      }

      message += '\n\n📝 提示：发送 #版本数据 [版本号] 查看详细数据'
      return await e.bot.sendForwardMsg(e.contact, common.makeForward(message, e.selfId, e.bot.account.name))
    }
    const mainVersion = await (await db).getMainData('sr', input as any)
    const preVersion = await (await db).getPreData('sr', input as any)

    if ((!mainVersion || mainVersion.length === 0) && (!preVersion || preVersion.length === 0)) {
      return e.reply(`未找到星铁版本 ${input} 的数据`, { reply: true })
    }

    let message = `📊 星铁版本 ${input} 数据：\n`

    if (mainVersion && mainVersion.length > 0) {
      const record = mainVersion[0]
      message += '\n📦 正式版本：\n'
      message += `版本号：${record.version}\n`
      message += `占用大小：${record.size}\n`
    }

    if (preVersion && preVersion.length > 0) {
      const record = preVersion[0]
      message += '\n\n🎁 预下载版本：\n'
      message += `版本号：${record.ver}\n`
      message += `旧版本：${record.oldver}\n`
      message += `更新大小：${record.size}\n`
    }

    return e.reply(message, { reply: true })
  } catch (error) {
    return e.reply('查询版本数据时发生错误，请稍后再试', { reply: true })
  }
}, {
  name: 'GamePush-星铁版本数据',
  priority: 100,
  event: 'message',
  permission: 'all'
})

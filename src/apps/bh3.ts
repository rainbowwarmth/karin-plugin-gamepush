import config from '@/components/config'
import api from '@/model/api'
import db from '@/model/db'
import download from '@/model/download'
import { getRedisKeys } from '@/model/util'
import karin, { common, redis } from 'node-karin'

const bh3Reg = "(!|！|崩坏三|崩坏3|崩三|崩3|bbb|三崩子)"

export const bh3Check = karin.command(`^#*${bh3Reg}版本监控$`, async (e) => {
  await api.checkVersion(true, 'bh3')
  return e.reply("✅ 已执行手动检查", { reply: true })
}, {
  name: "GmaePush-崩坏3版本监控",
  priority: 100,
  event: "message",
  permission: "master"
})

export const bh3PushSet = karin.command(`^#*${bh3Reg}(开启|关闭)版本推送$`, async (e) => {
  if (!e.isGroup) return e.reply("❌ 该功能仅限群聊中使用", { reply: true })
  const groupId = String(e.groupId)
  const botId = String(e.selfId)
  const isEnable = e.msg.includes("开启")
  if (isEnable) {
    config.addPushGroup("bh3", botId, groupId)
  } else {
    config.removePushGroup("bh3", botId, groupId)
  }
  const action = isEnable ? `已添加本群到推送列表（ID：${groupId}）` : `已移除本群推送（ID：${groupId}）`
  return e.reply(`✅ 已${isEnable ? "开启" : "关闭"}崩坏3版本推送，${action}`, { reply: true })
}, {
  name: "GmaePush-崩坏3版本推送设置",
  priority: 100,
  event: "message",
  permission: "master"
})

export const bh3Ver = karin.command(`^#*${bh3Reg}当前版本$`, async (e) => {
  const { main, pre } = getRedisKeys("bh3")
  const [mainVer, preVer] = await Promise.all([redis.get(main), redis.get(pre)])
  const msg = [
    "📌 崩坏3当前版本信息",
    `正式版本：${mainVer || "未知"}`,
    `预下载版本：${preVer || "未开启"}`
  ].join("\n")
  return e.reply(msg, { reply: true })
}, {
  name: "GamePush-崩坏3当前版本",
  priority: 100,
  event: "message",
  permission: "all"
})

export const bh3VersionData = karin.command(`^#*${bh3Reg}版本数据(.*)$`, async (e) => {
  const input = e.msg.replace(new RegExp(`#*${bh3Reg}版本数据`, "i"), "").trim()
  try {
    if (!input) {
      const mainVersions = await (await db).getMainData("bh3")
      const preVersions = await (await db).getPreData("bh3")
      if ((!mainVersions || mainVersions.length === 0) && (!preVersions || preVersions.length === 0)) {
        return e.reply("暂无原神版本数据", { reply: true })
      }
      let message = "📊 原神历史版本数据：\n"
      if (mainVersions && mainVersions.length > 0) {
        message += "\n📦 正式版本：\n"
        message += mainVersions
          .map((record: { version: any; size: any }, index: number) => `${index + 1}. 版本号：${record.version}，占用大小：${record.size}`)
          .join("\n")
      }
      if (preVersions && preVersions.length > 0) {
        message += "\n\n🎁 预下载版本：\n"
        message += preVersions
          .map(
            (record: { ver: any; oldver: any; size: any }, index: number) =>
              `${index + 1}. 版本号：${record.ver}，旧版本：${record.oldver}，更新大小：${record.size}`
          )
          .join("\n")
      }

      message += "\n\n📝 提示：发送 #版本数据 [版本号] 查看详细数据"
      return await e.bot.sendForwardMsg(e.contact, common.makeForward(message, e.selfId, e.bot.account.name))
    }
    const mainVersion = await (await db).getMainData("bh3", input as any)
    const preVersion = await (await db).getPreData("bh3", input as any)

    if ((!mainVersion || mainVersion.length === 0) && (!preVersion || preVersion.length === 0)) {
      return e.reply(`未找到原神版本 ${input} 的数据`, { reply: true })
    }

    let message = `📊 原神版本 ${input} 数据：\n`

    if (mainVersion && mainVersion.length > 0) {
      const record = mainVersion[0]
      message += `\n📦 正式版本：\n`
      message += `版本号：${record.version}\n`
      message += `占用大小：${record.size}\n`
    }

    if (preVersion && preVersion.length > 0) {
      const record = preVersion[0]
      message += `\n\n🎁 预下载版本：\n`
      message += `版本号：${record.ver}\n`
      message += `旧版本：${record.oldver}\n`
      message += `更新大小：${record.size}\n`
    }

    return e.reply(message, { reply: true })
  } catch (error) {
    return e.reply("查询版本数据时发生错误，请稍后再试", { reply: true })
  }
}, {
  name: "GamePush-鸣朝版本数据",
  priority: 100,
  event: "message",
  permission: "all"
})
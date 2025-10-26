import config from '@/components/config'
import request from '@/components/request'
import base from '@/model/base'
import { logger, render, segment } from 'node-karin'
import { getBuildAPI, getGameChuckAPI, getPatchBuildAPI } from '@/model/util'
import download from '@/model/download'
import api from '@/model/api'
import db from '@/model/db'

type GameKey = 'sr' | 'ys' | 'zzz' | 'bh3' | 'ww'

class Notifier extends base {
  TemplateMap: {
    [key: string]: (data: any) => string
    main: ({
      gameName,
      oldVersion,
      newVersion,
      formattedTotalSize,
      incrementalSize
    }: {
      gameName: string
      oldVersion: string
      newVersion: string
      formattedTotalSize?: string
      incrementalSize?: string
    }) => string
    pre: ({
      gameName,
      newVersion,
      formattedTotalSize,
      incrementalSize
    }: {
      gameName: string
      newVersion: string
      formattedTotalSize?: string
      incrementalSize?: string
    }) => string
    "pre-remove": ({
      gameName,
      oldVersion
    }: {
      gameName: string
      oldVersion: string
    }) => string
  } = {
      main: ({
        gameName,
        oldVersion,
        newVersion,
        formattedTotalSize,
        incrementalSize
      }: {
        gameName: string
        oldVersion: string
        newVersion: string
        formattedTotalSize?: string
        incrementalSize?: string
      }) =>
        [
          `✨${gameName}游戏版本更新通知`,
          `🚀版本变更：${oldVersion} → ${newVersion}`,
          formattedTotalSize && `📦完整大小（含中文语音）：${formattedTotalSize}`,
          incrementalSize && `🔄 增量更新大小：约${incrementalSize}`,
          "📢 请及时更新客户端",
          ...(gameName !== "原神" ? [`💾 发送【#${gameName}获取下载链接】获取客户端`] : [])
        ]
          .filter(Boolean)
          .join("\n"),

      pre: ({
        gameName,
        newVersion,
        formattedTotalSize,
        incrementalSize
      }: {
        gameName: string
        newVersion: string
        formattedTotalSize?: string
        incrementalSize?: string
      }) =>
        [
          `🎁${gameName}预下载资源已开放`,
          `📦新版本：${newVersion}`,
          formattedTotalSize && `📦 完整大小（含中文语音）：${formattedTotalSize}`,
          incrementalSize && `🔄 增量更新大小：约${incrementalSize}`,
          "📥请提前下载游戏资源",
          ...(gameName !== "原神" ? [`💾 发送【#${gameName}获取下载链接】获取客户端`] : [])
        ]
          .filter(Boolean)
          .join("\n"),

      "pre-remove": ({
        gameName,
        oldVersion
      }: {
        gameName: string
        oldVersion: string
      }) =>
        `🌙${gameName}预下载资源已关闭\n🔒正式版本${oldVersion}即将上线`
    }

  async pushNotify ({
    type,
    game,
    newVersion,
    oldVersion,
    pushChangeType
  }: {
    type: string
    game: GameKey
    newVersion: string
    oldVersion: string
    pushChangeType: string
  }) {
    try {
      if (oldVersion === "0.0.0") {
        logger.debug(`[karin-plugin-gamepush] 初始版本0.0.0，不推送通知且不更新数据库`)
        return
      }

      const gameConfig = config.getGameConfig(game)
      const gameName = this.getGameName(game)
      const { formattedTotalSize, incrementalSize, Ver } = await this.fetchSizeInfo(game, type, gameName)

      switch (type) {
        case "main":
          await (await db).storeMainSizeData(game, newVersion, formattedTotalSize)
          break
        case "pre":
          await (await db).storePreSizeData(game, newVersion, Ver, incrementalSize)
          break
        case "pre-remove":
          logger.debug(`⛔ 预下载关闭通知，不存储大小数据`)
          break
        default:
          logger.warn(`⚠️ 未知通知类型: ${type}`)
      }

      if (type === "pre-remove") return

      const templateData = {
        gameName,
        oldVersion,
        newVersion,
        Ver,
        formattedTotalSize,
        incrementalSize
      }

      if (pushChangeType === "1") {
        await this.sendImageMessage(type, game, gameConfig, templateData, pushChangeType, gameConfig.html)
      } else {
        await this.sendTextMessage(type, game, gameConfig, templateData, pushChangeType)
      }
    } catch (err: any) {
      logger.error(`[karin-plugin-gamepush][${this.getGameName(game)}推送通知] 失败`, err)
    }
  }

  async fetchSizeInfo (game: GameKey, type: any, gameName: string) {
    const excludedLanguages = ["en-us", "ja-jp", "ko-kr"]
    let formattedTotalSize, incrementalSize, Ver, buildSize = 0, patchSize = 0
    const BranchesData = await request.get(getGameChuckAPI(game), {
      responseType: "json",
      log: true,
      gameName
    })

    const parseManifests = (manifests: any[], version: string | number) =>
      manifests
        .filter((m) => !excludedLanguages.includes(m.matching_field?.toLowerCase()))
        .reduce(
          (sum, m) => sum + parseInt(
            m?.deduplicated_stats?.uncompressed_size ||
            m?.stats?.[version]?.uncompressed_size ||
            "0",
            10
          ),
          0
        )

    if (game === 'ww') {
      const d = await download.getDownloadData(game, type) as {
        data: { game_pkgs: Array<{ size: number }> }
        patch: { game_pkgs: Array<{ size: number; version: string }> }
      }
      formattedTotalSize = api.formatSize(d.data.game_pkgs[0].size)
      incrementalSize = api.formatSize(d.patch.game_pkgs[0].size)
      Ver = d.patch.game_pkgs[0].version
    } else if (["ys", "sr", "zzz"].includes(game)) {
      const branch = BranchesData?.data?.game_branches?.[0]
      const section = type === "pre" ? branch?.pre_download : branch?.main
      Ver = section?.diff_tags?.[0]
      const buildData = await request.get(
        getBuildAPI(type, section?.package_id, section?.password),
        { responseType: "json", log: true, gameName }
      )
      const patchData = await request.post(
        getPatchBuildAPI(type, section?.package_id, section?.password),
        { responseType: "json", log: true, gameName }
      )
      buildSize = parseManifests(buildData?.data?.manifests || [], Ver)
      patchSize = parseManifests(patchData?.data?.manifests || [], Ver)
      formattedTotalSize = api.formatSize(buildSize)
      incrementalSize = api.formatSize(patchSize)
    } else {
      const branch = BranchesData?.data?.game_branches?.[0]
      Ver = branch?.main?.tag
      const section = type === "pre" ? branch?.pre_download : branch?.main

      const data = await request.get(getBuildAPI(type, section?.package_id, section?.password), {
        responseType: "json",
        log: true,
        gameName
      })
      const manifests = data?.data?.manifests || []
      const gameManifest = manifests.find((m: { matching_field: string }) => m.matching_field === "game")
      const asbManifest = manifests.find((m: { matching_field: string }) => m.matching_field === "asb")

      patchSize = gameManifest?.stats?.compressed_size || 0
      buildSize = asbManifest?.stats?.compressed_size || 0

      formattedTotalSize = api.formatSize(buildSize)
      incrementalSize = api.formatSize(patchSize)
    }
    return { formattedTotalSize, incrementalSize, Ver }
  }

  async sendImageMessage (type: string | undefined, game: GameKey, gameConfig: { enable: boolean; log: boolean; cron: string; pushGroups: any[]; pushChangeType: string, html: string}, templateData: { gameName: string; oldVersion: string; newVersion: string; Ver: any; formattedTotalSize: string; incrementalSize: string }, pushChangeType: string, html: string ) {
    const screenData = await this.screenData(game, type, html)
    const data = {
      name: 'karin-plugin-gamepush',
      file: screenData.tplFile,
      type: (screenData.imgType || "jpeg") as "jpeg" | "png" | "webp",
      data: {
        ...screenData,
        ...templateData,
        date: new Date().toLocaleDateString(),
        type
      },
      pageGotoParams: {
        waitUntil: "networkidle2" as const
      }
    }

    const img = segment.image(`base64://` + await render.render(data))
    img
      ? api.sendToGroups(img, game, gameConfig, pushChangeType)
      : logger.error(`[karin-plugin-gamepush] 发送图片消息失败`)
  }

  async sendTextMessage (type: string, game: GameKey, gameConfig: { enable: boolean; log: boolean; cron: string; pushGroups: any[]; pushChangeType: string }, templateData: { gameName: string; oldVersion: string; newVersion: string; Ver: any; formattedTotalSize: string; incrementalSize: string }, pushChangeType: string) {
    try {
      const template = this.TemplateMap[type]
      if (!template) throw new Error(`未知推送类型: ${type}`)
      api.sendToGroups(template(templateData), game, gameConfig, pushChangeType)
    } catch (err: any) {
      logger.error(`[karin-plugin-gamepush] 发送文本消息失败: ${err.message}`, err)
    }
  }
}

export default new Notifier()
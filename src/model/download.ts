import request from '@/components/request'
import api from '@/model/api'
import { getGameAPI, getGameName, versionComparator } from '@/model/util'
import { logger } from 'node-karin'

type GameKey = 'sr' | 'ys' | 'zzz' | 'bh3' | 'ww'

class Download {
  cache = new Map()
  cacheTTL = 30000

  /**
   * 获取下载数据
   * @param {string} game - 游戏ID
   * @param {string} type - 下载类型
   * @returns {Promise<Object>} 下载数据
   */
  async getDownloadData (game: GameKey, type: string = "main"): Promise<object> {
    const cacheKey = `${game}-${type}`
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data
    }

    const data = await this.fetchDownloadData(game, type)
    this.cache.set(cacheKey, {
      timestamp: Date.now(),
      data
    })

    return data
  }

  /**
   * 从API获取下载数据
   * @param {string} game - 游戏ID
   * @param {string} type - 下载类型
   * @returns {Promise<Object>} 下载数据
   */
  async fetchDownloadData (game: GameKey, type: string): Promise<object> {
    const apiUrl = getGameAPI(game)

    try {
      const data = await request.get(apiUrl, {
        responseType: "json",
        log: true,
        gameName: getGameName(game)
      })

      if (game === "ww") {
        return this.handleWWData(data, type)
      }
      return this.handleMHYData(data, type)
    } catch (err: any) {
      logger.error(`[karin-plugin-gamepush] 获取下载数据失败: ${err.message}`)
      return {
        data: null,
        patch: { game_pkgs: [], audio_pkgs: [] },
        type
      }
    }
  }

  /**
   * 处理鸣潮游戏数据
   * @param {Object} data - API返回数据
   * @param {string} type - 下载类型
   * @returns {Object} 处理后的下载数据
   */
  handleWWData (data: any, type: string): object {
    const versionType = type === "pre" ? "predownload" : "default"
    const versionData = data[versionType]?.config

    if (!versionData) {
      return {
        data: null,
        patch: { game_pkgs: [] },
        type
      }
    }

    const cdn =
      data.cdnList?.[0]?.url?.replace(/\/+$/, "") || "https://pcdownload-huoshan.aki-game.com"

    const mainUrl = `${cdn}/${versionData.indexFile.replace(/^\//, "")}`

    const mainMajor = {
      version: versionData.version,
      game_pkgs: [
        {
          url: mainUrl,
          md5: versionData.indexFileMd5 || "",
          size: versionData.size || 0
        }
      ]
    }

    const patchPkgs = (versionData.patchConfig || [])
      .sort((a: { version: string }, b: { version: string }) => versionComparator.compare(b.version, a.version))
      .filter((patch: { indexFile: any }) => patch.indexFile)
      .map((patch: { indexFile: string; indexFileMd5: any; size: any; version: any }) => ({
        url: `${cdn}/${patch.indexFile.replace(/^\//, "")}`,
        md5: patch.indexFileMd5 || "",
        size: patch.size || 0,
        version: patch.version
      }))

    return {
      data: mainMajor,
      patch: { game_pkgs: patchPkgs },
      type
    }
  }

  /**
   * 处理米哈游游戏数据
   * @param {Object} data - API返回数据
   * @param {string} type - 下载类型
   * @returns {Object} 处理后的下载数据
   */
  handleMHYData (data: any, type: string): object {
    const packageData = data?.data?.game_packages?.[0] || {}

    const safeGetPatch = (patchArray: any[]) => {
      return patchArray?.[0] || { game_pkgs: [], audio_pkgs: [] }
    }

    if (type === "pre") {
      const preData = packageData?.pre_download?.major || {}
      const prePatch = safeGetPatch(packageData?.pre_download?.patches)

      return {
        data: preData,
        patch: prePatch,
        type
      }
    } else {
      const mainData = packageData?.main?.major || {}
      const mainPatch = safeGetPatch(packageData?.main?.patches)

      return {
        data: mainData,
        patch: mainPatch,
        type
      }
    }
  }

  /**
   * 格式化下载信息
   * @param {string} game - 游戏ID
   * @param {Object} data - 下载数据
   * @param {string} type - 下载类型
   * @param {Object} patch - 补丁数据
   * @returns {Object} 格式化后的下载信息
   */
  formatDownloadInfo (game: GameKey, data: any, type: string, patch: any): object {
    const gameName = getGameName(game)
    const { version } = data
    const typeText = type === "pre" ? "预下载" : "正式版"

    const msg = [
      `${gameName} ${typeText}下载信息`,
      `版本: ${version}`,
      "请选择需要的下载内容"
    ].join("\n")

    const client = this.formatPackageInfo(
      data.game_pkgs,
      `${gameName} ${typeText}${game === "bh3" ? "游戏下载" : "游戏分卷包下载"}`,
      `${game === "bh3" ? "游戏下载" : "游戏分卷包下载"}`
    )

    const audio = this.formatPackageInfo(
      data.audio_pkgs,
      `${gameName} ${typeText}音频下载`,
      "音频包"
    )

    const patch_client = this.formatPackageInfo(
      patch?.game_pkgs,
      `${gameName} ${typeText}游戏增量包下载`,
      "游戏增量包"
    )

    const patch_audio = this.formatPackageInfo(
      patch?.audio_pkgs,
      `${gameName} ${typeText}音频增量包下载`,
      "音频增量包"
    )

    return { msg, client, audio, patch_client, patch_audio }
  }

  /**
   * 格式化包信息
   * @param {Array} pkgs - 包数组
   * @param {string} title - 标题
   * @param {string} type - 类型
   * @returns {string} 格式化后的包信息
   */
  formatPackageInfo (pkgs: any[], title: string, type: string): string {
    if (!pkgs || pkgs.length === 0) {
      return `${title}\n暂无${type}下载`
    }

    const items = pkgs.map((pkg, index) => {
      const size = api.formatSize(pkg.size || 0)
      const name = pkg.language ? `${pkg.language}${type}` : `${type}${index + 1}`
      const version = pkg.version ? ` (${pkg.version})` : ""
      return `${name}${version}: ${pkg.url}\n大小: ${size}`
    })

    return `${title}\n${items.join("\n\n")}`
  }
}

export default new Download()

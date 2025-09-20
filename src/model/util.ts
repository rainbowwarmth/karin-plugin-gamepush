const API_BASE = "https://hyp-api.mihoyo.com/hyp/hyp-connect/api/getGamePackages"
const CHECK_API = "https://hyp-api.mihoyo.com/hyp/hyp-connect/api/getGameBranches"
const Download_API = "https://api-takumi.mihoyo.com/downloader/sophon_chunk/api/"
const Game_API = "https://hyp-api.mihoyo.com/hyp/hyp-connect/api/getGames"
const WW_API_BASE = "https://prod-cn-alicdn-gamestarter.kurogame.com/launcher/game/G152/10003_Y8xXrXk65DqFHEDgApn3cpK5lfczpFx5/index.json"

type GameKey = keyof typeof GAME_CONFIG

/**
 * 游戏ID
 */
export const gameIds = ["ys", "sr", "zzz", "bh3", "ww"]

export const GAME_CONFIG = {
  ys: {
    id: "1Z8W5NHUQb",
    name: "原神",
    biz: "hk4e_cn",
    redisPrefix: "YS"
  },
  sr: {
    id: "64kMb5iAWu",
    name: "崩坏:星穹铁道",
    biz: "hkrpg_cn",
    redisPrefix: "SR"
  },
  zzz: {
    id: "x6znKlJ0xK",
    name: "绝区零",
    biz: "nap_cn",
    redisPrefix: "ZZZ"
  },
  bh3: {
    id: "osvnlOc0S8",
    name: "崩坏3",
    biz: "bh3_cn",
    redisPrefix: "BH3"
  },
  ww: {
    name: "鸣潮",
    redisPrefix: "WW"
  }
}

export const getGameAPI = (game: GameKey) => {
  if (game === "ww") return WW_API_BASE
  return `${API_BASE}?launcher_id=jGHBHlcOq1&game_ids[]=${GAME_CONFIG[game].id}`
}

export const getGameChuckAPI = (game: GameKey) => {
  if (game === "ww") return WW_API_BASE
  return `${CHECK_API}?launcher_id=jGHBHlcOq1&game_ids[]=${GAME_CONFIG[game].id}`
}

export const getPatchBuildAPI = (type: string, package_id: any, password: any) => {
  return `${Download_API}getPatchBuild?branch=${type === "pre" ? "predownload" : "main"}&plat_app=ddxf5qt290cg&package_id=${package_id}&password=${password}`
}

export const getBuildAPI = (type: string, package_id: any, password: any) => {
  return `${Download_API}getBuild?branch=${type === "pre" ? "predownload" : "main"}&plat_app=ddxf5qt290cg&package_id=${package_id}&password=${password}`
}

export const getGameIcon = () => {
  return `${Game_API}?launcher_id=jGHBHlcOq1&language=zh-cn`
}

export const getGameName = (game: GameKey) => GAME_CONFIG[game]?.name || "未知游戏"

export const getRedisKeys = (game: GameKey) => {
  const prefix = GAME_CONFIG[game]?.redisPrefix || "GAME"
  return {
    main: `Yz:GamePush:${prefix}:Main`,
    pre: `Yz:GamePush:${prefix}:Pre`
  }
}

export const versionComparator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base"
})
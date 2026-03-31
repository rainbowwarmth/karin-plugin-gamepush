const API_BASE = 'https://hyp-api.mihoyo.com/hyp/hyp-connect/api/getGamePackages'
const CHECK_API = 'https://hyp-api.mihoyo.com/hyp/hyp-connect/api/getGameBranches'
const DownloadAPI = 'https://api-takumi.mihoyo.com/downloader/sophon_chunk/api/'
const GameAPI = 'https://hyp-api.mihoyo.com/hyp/hyp-connect/api/getGames'
const WW_API_BASE = 'https://prod-cn-alicdn-gamestarter.kurogame.com/launcher/game/G152/10003_Y8xXrXk65DqFHEDgApn3cpK5lfczpFx5/index.json'

/**
 * 游戏ID
 */
export const gameIds = ['ys', 'sr', 'zzz', 'bh3', 'ww']

export const GAME_CONFIG = {
  ys: {
    id: '1Z8W5NHUQb',
    name: '原神',
    biz: 'hk4e_cn',
    redisPrefix: 'YS',
    reg: '(ys|YS|原神)'
  },
  sr: {
    id: '64kMb5iAWu',
    name: '崩坏:星穹铁道',
    biz: 'hkrpg_cn',
    redisPrefix: 'SR',
    reg: '(\\*|星铁|星轨|穹轨|星穹|崩铁|星穹铁道|崩坏星穹铁道|铁道)'
  },
  zzz: {
    id: 'x6znKlJ0xK',
    name: '绝区零',
    biz: 'nap_cn',
    redisPrefix: 'ZZZ',
    reg: '(%|％|绝区零|zzz|ZZZ|绝区)'
  },
  bh3: {
    id: 'osvnlOc0S8',
    name: '崩坏3',
    biz: 'bh3_cn',
    redisPrefix: 'BH3',
    reg: '(!|！|崩坏三|崩坏3|崩三|崩3|bbb|三崩子)'
  },
  ww: {
    name: '鸣潮',
    redisPrefix: 'WW',
    reg: '(~|～|鸣潮|ww|WW|mc)'
  }
}

export const getGameAPI = (game: GameKey) => {
  if (game === 'ww') return WW_API_BASE
  return `${API_BASE}?launcher_id=jGHBHlcOq1&game_ids[]=${GAME_CONFIG[game].id}`
}

export const getGameChuckAPI = (game: GameKey) => {
  if (game === 'ww') return WW_API_BASE
  return `${CHECK_API}?launcher_id=jGHBHlcOq1&game_ids[]=${GAME_CONFIG[game].id}`
}

export const getPatchBuildAPI = (type: string, packageId: string, password: string) => {
  return `${DownloadAPI}getPatchBuild?branch=${type === 'pre' ? 'predownload' : 'main'}&plat_app=ddxf5qt290cg&package_id=${packageId}&password=${password}`
}

export const getBuildAPI = (type: string, packageId: string, password: string) => {
  return `${DownloadAPI}getBuild?branch=${type === 'pre' ? 'predownload' : 'main'}&plat_app=ddxf5qt290cg&package_id=${packageId}&password=${password}`
}

export const getGameIcon = () => {
  return `${GameAPI}?launcher_id=jGHBHlcOq1&language=zh-cn`
}

export const getGameName = (game: GameKey) => GAME_CONFIG[game]?.name || '未知游戏'

export const getReg = (game: GameKey) => GAME_CONFIG[game]?.reg || '当前游戏未定义正则'

export const getRedisKeys = (game: GameKey) => {
  const prefix = GAME_CONFIG[game]?.redisPrefix || 'GAME'
  return {
    main: `Yz:GamePush:${prefix}:Main`,
    pre: `Yz:GamePush:${prefix}:Pre`
  }
}

export const versionComparator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base'
})

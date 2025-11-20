import { dir } from '@/components/path'
import { GAME_CONFIG, getGameIcon } from './util'
import request from '@/components/request'

export default class base {
  getGameName (game: GameKey) {
    const gameNames: Record<GameKey, string> = {
      sr: '星穹铁道',
      ys: '原神',
      zzz: '绝区零',
      bh3: '崩坏3',
      ww: '鸣潮'
    }
    return gameNames[game]
  }

  async GameIcon (game: GameKey) {
    if (game === 'ww') return 'https://cn.bing.com/th?id=OSK.d2e8b2efa5867fba330b354d0472f5e5&w=120&h=120&qlt=120&c=6&rs=1&cdv=1&pid=RS'
    const res = await request.get(getGameIcon(), { responseType: 'json', log: true, gameName: this.getGameName(game) })
    const { id, biz } = GAME_CONFIG[game]
    return res.data.games.find((g: { id: string; biz: string }) => g.id === id || g.biz === biz)?.display?.icon?.url || ''
  }

  getCurrentDate () {
    return new Date().toISOString().slice(0, 10).replace(/-/g, '')
  }

  screenData (game: GameKey, type = '', html = '') {
    return this.getScreenData(game, type, html)
  }

  async getScreenData (game: GameKey, type = '', html = '') {
    const basic = {
      imgType: 'jpeg',
      tplFile: `${dir.pluginDir}/resources/html/GamePush-Plugin/GamePush-Plugin-${html}.html`,
      fontsPath: `${dir.ResourcesDir}/fonts/`,
      pluResPath: `${dir.pluginDir}/resources/`,
      htmlSavePath: `${dir.pluginDir}/@karinjs/karin-plugin-GamePush/html/`,
      plugin: {
        name: 'karin-plugin-GamePush',
        version: dir.pkg.version,
      }
    }

    const other = {
      saveId: `push_${game}_${type}_${this.getCurrentDate}`,
      cwd: process.cwd().replace(/\\/g, '/'),
      htmlFileName: `${game}_${type}_${this.getCurrentDate}.html`,
      bot: {
        name: 'karin',
      }
    }

    const iconUrl = await this.GameIcon(game)
    return {
      ...basic,
      ...other,
      gameName: this.getGameName(game),
      icon: iconUrl
    }
  }
}

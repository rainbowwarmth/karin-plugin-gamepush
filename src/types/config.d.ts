interface PushGroup {
  groupId: string;
  botId: string;
}

interface GameConfig {
  enable: boolean
  log: boolean
  cron: string
  pushGroups: PushGroup[]
  pushChangeType: '1' | '2'
  html: 'default' | 'Simple'
}

type GameKey = 'sr' | 'ys' | 'zzz' | 'bh3' | 'ww'

interface FrontendConfig {
  [key: string]: GameConfig[]
}

interface templateData {
  gameName: string;
  oldVersion: string;
  newVersion: string;
  Ver: string;
  formattedTotalSize: string;
  incrementalSize: string;
}

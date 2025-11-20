interface templateData {
  gameName: string;
  oldVersion: string;
  newVersion: string;
  Ver: string;
  formattedTotalSize: string;
  incrementalSize: string;
}

interface Templatemain {
  gameName: string
  oldVersion: string
  newVersion: string
  formattedTotalSize?: string
  incrementalSize?: string
}

interface Templatepre {
  gameName: string
  newVersion: string
  formattedTotalSize?: string
  incrementalSize?: string
}

interface TemplatepreRemove {
  gameName: string
  oldVersion: string
}

interface TemplateMap {
  main: (data: Templatemain) => string
  pre: (data: Templatepre) => string
  'pre-remove': (data: TemplatepreRemove) => string
  [key: string]: (data: any) => string
}

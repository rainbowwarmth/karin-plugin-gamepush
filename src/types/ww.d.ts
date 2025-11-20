/**
 * 多语言文本类型（RHIOption 中的 text 多语言键）
 * 键为固定语言标识，设为可选（因为部分项的 text 是空对象）
 */
interface RHILanguageText {
  'zh-Hans'?: string; // 简体中文
  de?: string;      // 德语
  'zh-Hant'?: string; // 繁体中文
  ko?: string;      // 韩语
  ja?: string;      // 日语
  en?: string;      // 英语
  fr?: string;      // 法语
  es?: string;      // 西班牙语
}

/**
 * RHI 选项项类型
 */
interface RHIOption {
  cmdOption: string;
  text: RHILanguageText;
  isShow: 0 | 1;
}

/**
 * CDN 列表项类型（修正：JSON 中是大写 P/K1/K2）
 */
interface CdnListItem {
  P: number;
  K1: number;
  K2: number;
  url: string;
}

/**
 * PathConfig 中的 ext 子对象类型（修正：JSON 中 ext 是对象而非字符串）
 */
interface PathConfigExt {
  maxFileSize: number;
}

/**
 * 补丁配置项类型（修正 ext 类型为对象）
 */
interface PathConfig {
  indexFileMd5: string;
  unCompressSize: number;
  ext: PathConfigExt; // 修正：原字符串改为对象
  baseUrl: string;
  size: number;
  indexFile: string;
  version: string;
}

/**
 * 根级 default/config 和 predownload/config 的公共配置类型
 */
interface wwConfig {
  indexFileMd5: string;
  unCompressSize: number;
  baseUrl: string;
  size: number;
  patchType: string;
  indexFile: string;
  version: string;
  patchConfig: PathConfig[];
}

/**
 * predownload.resourcesDiff 中的游戏信息类型（无 size，新增 version）
 */
interface PredownloadGameInfo {
  fileName: string;
  md5: string;
  version: string;
}

/**
 * predownload 中的资源差异类型
 */
interface PredownloadResourcesDiff {
  currentGameInfo: PredownloadGameInfo;
  previousGameInfo: PredownloadGameInfo;
}

/**
 * predownload 整体类型
 */
interface Predownload {
  changelog: Record<string, never>; // 空对象
  config: wwConfig;
  resources: string;
  resourcesBasePath: string;
  resourcesDiff: PredownloadResourcesDiff;
  resourcesExcludePath: string[];
  resourcesExcludePathNeedUpdate: string[];
  sampleHashSwitch: 0 | 1;
  version: string;
}

/**
 * 根级 default 对象类型（新增多个字段）
 */
interface Default {
  sampleHashSwitch: 0 | 1;
  cdnList: CdnListItem[];
  resourcesBasePath: string;
  changelog: Record<string, never>; // 空对象
  resources: string;
  resourcesExcludePathNeedUpdate: string[];
  config: wwConfig;
  resourcesExcludePath: string[];
  version: string;
  changelogVisible: 0 | 1; // 修正：JSON 中是数字 0 而非字符串
}

/**
 * 实验配置的下载子项类型（修正：JSON 中值为字符串，需兼容 string/number）
 */
interface ExperimentDownload {
  downloadCdnSelectTestDuration: string | number;
  downloadReadBlockTimeout: string | number;
}

/**
 * 实验配置的资源检查子项类型（修正：值为字符串，需兼容 string/number）
 */
interface ExperimentResCheck {
  fileChunkCheckSwitch: string | number;
  fileSizeCheckSwitch: string | number;
  resValidCheckTimeOut: string | number;
  fileCheckWhiteListConfig: string;
}

/**
 * 实验配置的应用子项类型（JSON 中无该字段，设为可选）
 */
interface ExperimentApply {
  applyMethodFeature?: string;
}

/**
 * 实验配置整体类型
 */
interface ExperimentConfig {
  download: ExperimentDownload;
  res_check: ExperimentResCheck;
  apply?: ExperimentApply; // 可选：JSON 中无该字段
  keyFileCheckList?: string[]; // 可选：JSON 中无该字段
}

/**
 * 根级游戏数据核心类型（新增 hashCacheCheckAccSwitch、keyFileCheckList、predownload 等字段）
 */
interface WwGameData {
  chunkDownloadSwitch: 0 | 1;
  keyFileCheckSwitch: 0 | 1;
  resourcesLogin: {
    host: string;
    loginSwitch: 0 | 1;
  };
  checkExeIsRunning: 0 | 1;
  hashCacheCheckAccSwitch: 0 | 1; // 新增字段
  fingerprints: string[];
  default: Default;
  RHIOptionSwitch: 0 | 1;
  predownloadSwitch: 0 | 1;
  RHIOptionList: RHIOption[];
  experiment: ExperimentConfig;
  predownload: Predownload; // 新增核心 predownload 字段
  keyFileCheckList: string[]; // 新增字段
}

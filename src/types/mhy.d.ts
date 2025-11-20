/**
 * 游戏基础信息类型
 */
interface GameInfo {
  id: string;
  biz: string;
}

/**
 * 分类项类型（main.categories 数组的项）
 */
interface CategoryItem {
  category_id: string;
  matching_field: string;
}

/**
 * 主配置信息类型
 */
interface MainConfig {
  package_id: string;
  branch: string;
  password: string;
  tag: string;
  diff_tags: string[];
  categories: CategoryItem[];
  required_client_version: string;
}

interface PreConfig {
  package_id: string;
  branch: string;
  password: string;
  tag: string;
  diff_tags: string[];
  categories: CategoryItem[];
  required_client_version: string;
}

/**
 * 根级配置类型（完整匹配 JSON 结构）
 */
interface RootConfig {
  game: GameInfo;
  main: MainConfig;
  pre_download: PreConfig;
}

interface mhyData {
  data: {
    game_branches: RootConfig[]
  }
}

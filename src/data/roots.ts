// 字源形码 v1.32 字根映射数据
// 格式：[字根, 键位, Unicode码点(用于SVG渲染)]
//
// 数据来源：字源1.32版字根编码.txt
// 处理说明：
// 1. PUA区字根保留并提供SVG渲染描述
// 2. 所有CJK扩展A/B区、私用区字根均已保留
// 3. 总计 400 个字根条目

// 需要SVG渲染的字根（私用区/扩展区，多数字体无法显示）
// 格式：码点 -> 描述信息（用于生成SVG图形）
export const PUA_ROOTS: Record<number, { key: string; desc: string }> = {
  0x3404: { key: 'g', desc: 'U+3404' },
  0x342B: { key: 'j', desc: 'U+342B' },
  0x353E: { key: 'j', desc: 'U+353E' },
  0x382F: { key: 'b', desc: 'U+382F' },
  0x3840: { key: 'y', desc: 'U+3840' },
  0x39AE: { key: 'z', desc: 'U+39AE' },
  0x4DB9: { key: 'r', desc: 'U+4DB9' },
  0xE019: { key: 'o', desc: '食变' },
  0xE102: { key: 'f', desc: '攵变' },
  0xE106: { key: 'y', desc: '立变' },
  0xE136: { key: 'r', desc: '艹变' },
  0xE137: { key: 'r', desc: '业变' },
  0xE162: { key: 'o', desc: '米变' },
  0xE16B: { key: 'q', desc: 'U+E16B' },
  0xE16F: { key: 'o', desc: '缶变' },
  0xE17E: { key: 'h', desc: '父变' },
  0xE18C: { key: 'a', desc: '女变' },
  0xE401: { key: 'o', desc: '灬变' },
  0xE420: { key: 'm', desc: '髟上' },
  0xE431: { key: 'd', desc: '老变' },
  0xE439: { key: 'u', desc: '𧘇上' },
  0xE440: { key: 'p', desc: '衤变' },
  0xE443: { key: 'f', desc: '礻变' },
  0xE444: { key: 'j', desc: '骨变' },
  0xE447: { key: 'j', desc: '齿变' },
  0xE448: { key: 'i', desc: '歹变' },
  0xE449: { key: 'i', desc: '氵变' },
  0xE44B: { key: 'i', desc: '冫变' },
  0xE44F: { key: 'z', desc: '钅变' },
  0xE450: { key: 'z', desc: '釒变' },
  0xE451: { key: 'g', desc: '辶变' },
  0xE45E: { key: 'e', desc: '鳥变' },
  0xE460: { key: 'w', desc: '犬变' },
  0xE462: { key: 'w', desc: '鹿变' },
  0xE46F: { key: 'i', desc: '凵变' },
  0xE472: { key: 'j', desc: 'U+E472' },
  0xE478: { key: 'u', desc: '老变' },
  0xE479: { key: 'u', desc: '耒变' },
  0xE48A: { key: 'c', desc: '頁变' },
  0xE490: { key: 'c', desc: '貝变' },
  0xE491: { key: 'c', desc: '頁变' },
  0xE492: { key: 'c', desc: '見变' },
  0xE494: { key: 'b', desc: '臼变' },
  0xE498: { key: 'u', desc: '糹变' },
  0xE4A1: { key: 't', desc: '竹变' },
  0xE4A9: { key: 'l', desc: '竖变' },
  0xE4B5: { key: 'g', desc: '走变' },
  0xE4BB: { key: 'd', desc: '丁变' },
  0xE4C5: { key: 'y', desc: '氏变' },
  0xE4C7: { key: 'y', desc: '立变' },
  0xE4C8: { key: 'y', desc: '衣变' },
  0xE4CE: { key: 'i', desc: '穴变' },
  0xE506: { key: 'v', desc: '火变' },
  0xE507: { key: 'v', desc: '灬变' },
  0xE50F: { key: 'c', desc: '頁变' },
  0xE51A: { key: 'r', desc: 'U+E51A' },
  0xE524: { key: 'm', desc: '月变' },
  0xE52A: { key: 't', desc: '禾变' },
  0xE53B: { key: 'o', desc: '米变' },
  0xE540: { key: 'u', desc: '糹变' },
  0xE545: { key: 'c', desc: '巛变' },
  0xE54A: { key: 'y', desc: '方变' },
  0xE554: { key: 'g', desc: '辶变' },
  0xE56B: { key: 'e', desc: '虫变' },
  0xE56D: { key: 'a', desc: '力变' },
  0xE56F: { key: 'k', desc: '口变' },
  0xE599: { key: 'i', desc: '阝变' },
  0xE5BD: { key: 'r', desc: '业变' },
  0xE5C9: { key: 'z', desc: '矛变' },
  0xE816: { key: 'f', desc: '大变' },
  0xE817: { key: 't', desc: '天变' },
  0xE81C: { key: 'a', desc: '欠变' },
  0xE822: { key: 'i', desc: '山变' },
  0xE823: { key: 'j', desc: '歹变' },
  0xE831: { key: 'e', desc: '非变' },
  0xE836: { key: 't', desc: '竹变' },
  0xE839: { key: 'w', desc: '犬变' },
  0xE848: { key: 'g', desc: '走变' },
};

const rawRoots: [string, string][] = [
  // 基本区字根
  ["\u767D","k"],["\u65E6","n"],["\u4E86","h"],["\u79BE","t"],["\u4E3F","m"],["\u6708","m"],["\u4E0D","i"],["\u4E00","q"],
  ["\u4E2D","v"],["\u4EBA","s"],["\u4E5F","l"],["\u5F73","g"],["\u5F50","d"],["\u4EBB","s"],["\u2E88","a"],["\u8002","h"],
  ["\u65E5","n"],["\u4E0A","v"],["\u4E91","n"],["\u4E36","v"],["\u4EA0","y"],["\u5973","a"],["\u53B6","j"],["\u53C8","f"],
  ["\u5BF8","d"],["\u5927","e"],["\u571F","b"],["\u8980","y"],["\u5915","m"],["\u8FB6","l"],["\u30F0","g"],["\u8BA0","l"],
  ["\u4E37","i"],["\u672A","x"],["\u4E8C","w"],["\u4E59","o"],["\u8864","y"],["\u76AE","u"],["\u4E2C","x"],["\u5C0F","i"],
  ["\u800C","t"],["\u9FB5","d"],["\u7528","o"],["\u8033","j"],["\u53E3","k"],["\u5F00","r"],["\u4E01","d"],["\u4E0B","v"],
  ["\u53E4","m"],["\u6535","f"],["\u4E8E","d"],["\u6C35","c"],["\u4EB2","g"],["\u65A4","x"],["\u7E9F","u"],["\u9AD8","p"],
  ["\u5B80","p"],["\u8C55","w"],["\u6728","x"],["\u76EE","j"],["\u5FC3","j"],["\u2E8A","v"],["\u706C","v"],["\u5C6E","r"],
  ["\u6208","z"],["\u4E4B","l"],["\u672C","x"],["\u5176","o"],["\u624C","d"],["\u5DF4","w"],["\u5F13","z"],["\u5315","u"],
  ["\u5182","u"],["\u5934","j"],["\u4EA5","g"],["\u961D","i"],["\u4E66","t"],["\u620A","z"],["\u6236","p"],["\u513F","h"],
  ["\u95E8","p"],["\u4E43","l"],["\u9FB6","a"],["\u516B","i"],["\u4E09","e"],["\u5FC4","j"],["\u751F","h"],["\u9A6C","w"],
  ["\u7531","b"],["\u56D7","k"],["\u738B","f"],["\u53D1","u"],["\u2E8D","i"],["\u5196","u"],["\u8F66","g"],["\u5200","z"],
  ["\u5DFE","y"],["\u5C38","h"],["\u5E7F","h"],["\u5DF2","j"],["\u4E8D","g"],["\u81EA","j"],["\u529B","o"],["\u531A","i"],
  ["\u4E42","r"],["\u6C34","c"],["\u722B","e"],["\u5929","e"],["\u2EB7","w"],["\u8D70","g"],["\u5DF1","j"],["\u91D1","z"],
  ["\u7ACB","g"],["\u65E0","h"],["\u4E07","l"],["\u8279","r"],["\u4E28","l"],["\u5902","f"],["\u4E8B","k"],["\u5B50","h"],
  ["\u4E06","f"],["\u56EC","j"],["\u2EA7","w"],["\u6B62","g"],["\u6BCD","a"],["\u2E80","n"],["\u65B9","y"],["\u30B9","c"],
  ["\u5369","j"],["\u4E1A","r"],["\u4E95","c"],["\u58EB","b"],["\u8D1D","c"],["\u5202","z"],["\u4E24","w"],["\u5C11","i"],
  ["\u7C73","o"],["\u5341","p"],["\u4E14","t"],["\u540F","k"],["\u620B","z"],["\u9996","j"],["\u51AB","n"],["\u6B20","a"],
  ["\u5EFF","r"],["\u51E0","o"],["\u624B","d"],["\u535C","v"],["\u5F0B","u"],["\u5DE5","o"],["\u725C","w"],["\u897F","y"],
  ["\u866B","e"],["\u56DB","r"],["\u6C0F","y"],["\u9485","z"],["\u5382","h"],["\u975E","e"],["\u56DE","k"],["\u9FB0","g"],
  ["\u7518","l"],["\u5C71","i"],["\u5E72","x"],["\u4EBC","e"],["\u6209","z"],["\u8A00","l"],["\u9FB4","j"],["\u820C","l"],
  ["\u5EFE","r"],["\u793A","v"],["\u7535","n"],["\u6729","x"],["\u4E94","t"],["\u5E7A","u"],["\u7247","x"],["\u2E81","h"],
  ["\u4EA6","l"],["\u96B9","e"],["\u4E29","u"],["\u2E86","u"],["\u52F9","a"],["\u620C","z"],["\u5EF4","l"],["\u725B","w"],
  ["\u2ED7","n"],["\u7F52","o"],["\u9875","c"],["\u9FB7","r"],["\u54C1","k"],["\u9C7C","q"],["\u5C1A","i"],["\u5DF3","j"],
  ["\u9ED1","v"],["\u516D","y"],["\u77E2","t"],["\u7A74","i"],["\u7259","j"],["\u7530","b"],["\u8089","m"],["\u2E8E","h"],
  ["\u6237","p"],["\u6B79","j"],["\u4E9A","r"],["\u4E5D","o"],["\u6C42","k"],["\u72AC","w"],["\u9F99","w"],["\u793B","v"],
  ["\u7533","n"],["\u52FF","y"],["\u53E5","a"],["\u7F8A","w"],["\u6C11","s"],["\u4EBD","e"],["\u8863","y"],["\u6C14","n"],
  ["\u5343","l"],["\u5405","k"],["\u77F3","f"],["\u65E9","n"],["\u821F","g"],["\u76BF","o"],["\u8EAB","j"],["\u9963","o"],
  ["\u5DDD","c"],["\u98DF","o"],["\u706B","v"],["\u7592","h"],["\u514D","w"],["\u53F2","k"],["\u79B8","w"],["\u752B","b"],
  ["\u592B","e"],["\u5FC5","j"],["\u8DB3","g"],["\u4E03","u"],["\u9E1F","e"],["\u5C22","h"],["\u5342","g"],["\u7CF8","u"],
  ["\u98DE","g"],["\u8C46","o"],["\u5415","k"],["\u72AD","w"],["\u5F61","u"],["\u4E88","z"],["\u9578","u"],["\u74E6","o"],
  ["\u8C37","i"],["\u9EBB","t"],["\u4E1D","u"],["\u6C3A","c"],["\u9769","u"],["\u7FBD","u"],["\u5C6F","r"],["\u58F4","o"],
  ["\u4E61","u"],["\u4EA1","g"],["\u6BDB","u"],["\u96E8","n"],["\u7676","g"],["\u5F51","w"],["\u722A","e"],["\u7532","n"],
  ["\u81E3","j"],["\u519C","o"],["\u9AA8","j"],["\u4E4C","e"],["\u2F71","w"],["\u7F36","o"],["\u536F","n"],["\u81FC","b"],
  ["\u4E18","i"],["\u7236","h"],["\u864D","w"],["\u672B","x"],["\u4E51","s"],["\u7AF9","t"],["\u536C","n"],["\u74DC","o"],
  ["\u4E4E","l"],["\u72AE","u"],["\u8012","x"],["\u5807","u"],["\u9E7F","w"],["\u9F7F","j"],["\u9F20","w"],["\u66F0","n"],
  ["\u5154","w"],["\u723F","x"],["\u51F5","i"],["\u5C70","s"],["\u77DB","z"],["\u5DDB","c"],["\u7CFB","u"],["\u51F8","k"],
  ["\u8C78","w"],["\u51F9","k"],["\u4E08","f"],["\u2EBD","b"],["\u5EFE","q"],["\u4E28","c"],["\uD88B\uDFE3","s"],["\u8ECA","g"],
  ["\u7CF9","u"],["\u4E9C","r"],["\u4E23","n"],["\u4E8A","k"],["\u8C9D","c"],["\u4E9E","r"],["\u53C0","u"],["\u9580","p"],
  ["\u98E0","o"],["\u9801","c"],["\u99AC","w"],["\u70CF","e"],["\u9CE5","e"],["\u9B5A","q"],["\u9EFD","q"],["\uD8DD\uDDF3","j"],
  ["\u9F52","j"],["\u353E","j"],["\u342B","j"],["\u3404","g"],["\u382F","b"],["\u3840","y"],["\u4DB9","r"],["\u39AE","z"],
  ["\u382F","j"],["\uE816","f"],["\uE440","p"],["\uE401","o"],["\uE836","t"],["\uE817","t"],["\uE839","w"],["\uE5C9","z"],
  ["\uE431","d"],["\uE822","i"],["\uE56D","a"],["\uE848","g"],["\uE4C8","y"],["\uE498","u"],["\uE52A","t"],["\uE599","i"],
  ["\uE4CE","i"],["\uE439","u"],["\uE491","c"],["\uE50F","c"],["\uE507","v"],["\uE56B","e"],["\uE4C5","y"],["\uE444","j"],
  ["\uE449","i"],["\uE53B","o"],["\uE51A","r"],["\uE448","i"],["\uE420","m"],["\uE5BD","r"],["\uE45E","e"],["\uE4B5","g"],
  ["\uE81C","a"],["\uE478","u"],["\uE479","u"],["\uE44B","i"],["\uE46F","i"],["\uE450","z"],["\uE4C7","y"],["\uE831","e"],
  ["\uE447","j"],["\uE4A1","t"],["\uE460","w"],["\uE494","b"],["\uE492","c"],["\uE554","g"],["\uE48A","c"],["\uE540","u"],
  ["\uE44F","z"],["\uE4A9","l"],["\uE451","g"],["\uE524","m"],["\uE56F","k"],["\uE823","j"],["\uE54A","y"],["\uE472","j"],
  ["\uE545","c"],["\uE4BB","d"],["\uE490","c"],["\uE506","v"],["\uE443","f"],["\uE102","f"],["\uE462","w"],["\uE17E","h"],
  ["\uE18C","a"],["\uE16F","o"],["\uE136","r"],["\uE106","y"],["\uE162","o"],["\uE019","o"],["\uE137","r"],["\uE16B","q"],
];

export interface RootMapping {
  char: string;
  key: string;
  codePoint: number;
  /** 是否为私用区/扩展区字根（需要特殊渲染） */
  isPUA: boolean;
  /** PUA字根描述 */
  desc?: string;
  /** 可渲染的显示文本（PUA/CJK扩展区字符用描述替代） */
  displayChar: string;
}

export interface KeyGroup {
  key: string;
  roots: RootMapping[];
}

/** 判断是否为PUA/扩展区字根 */
function isPUARoot(cp: number): boolean {
  return (cp >= 0xE000 && cp <= 0xF8FF) || // Private Use Area
         (cp >= 0x3400 && cp <= 0x4DBF) || // CJK Extension A
         (cp >= 0x20000 && cp <= 0x2A6DF); // CJK Extension B
}

/** 判断字根是否可在浏览器中正常渲染（PUA区字根和扩展B区字根无法渲染） */
export function isRenderableRoot(cp: number): boolean {
  return !(cp >= 0xE000 && cp <= 0xF8FF) && // Private Use Area
         !(cp >= 0x20000 && cp <= 0x2A6DF); // CJK Extension B
}

/** 所有字根映射列表 */
export const rootMappings: RootMapping[] = rawRoots.map(([char, key]) => {
  const cp = char.codePointAt(0) ?? 0;
  const puaInfo = PUA_ROOTS[cp];
  const renderable = isRenderableRoot(cp);
  // 不可渲染的字符用 desc 作为显示文本（如 "食变"、"U+3404"）
  const displayChar = renderable ? char : (puaInfo?.desc ?? '□');
  return {
    char,
    key,
    codePoint: cp,
    isPUA: isPUARoot(cp),
    desc: puaInfo?.desc,
    displayChar,
  };
});

/** 可练习字根列表（排除PUA区不可渲染字根） */
export const practiceRootMappings: RootMapping[] = rootMappings.filter(r => isRenderableRoot(r.codePoint));

/** 按键分组的字根映射（包含所有字根，用于字根总表） */
export const keyGroups: KeyGroup[] = Object.entries(
  rootMappings.reduce<Record<string, RootMapping[]>>((acc, root) => {
    if (!acc[root.key]) acc[root.key] = [];
    acc[root.key].push(root);
    return acc;
  }, {})
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([key, roots]) => ({ key, roots }));

/** 可渲染字根的按键分组（排除PUA和扩展B区不可渲染字根，用于字根总表展示） */
export const renderableKeyGroups: KeyGroup[] = Object.entries(
  practiceRootMappings.reduce<Record<string, RootMapping[]>>((acc, root) => {
    if (!acc[root.key]) acc[root.key] = [];
    acc[root.key].push(root);
    return acc;
  }, {})
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([key, roots]) => ({ key, roots }));

/** 获取所有键位列表 */
export const allKeys = keyGroups.map(g => g.key);

/** 根据字根查找键位 */
export function findKeyByRoot(char: string): string | undefined {
  return rootMappings.find(r => r.char === char)?.key;
}

/** 根据键位获取所有字根 */
export function findRootsByKey(key: string): string[] {
  return keyGroups.find(g => g.key === key)?.roots.map(r => r.char) ?? [];
}

/** 随机获取一个可练习字根 */
export function getRandomRoot(): RootMapping {
  return practiceRootMappings[Math.floor(Math.random() * practiceRootMappings.length)];
}

/** 常用字根列表（去除有简体对应的繁体字根，且排除PUA不可渲染字根） */
export const commonRootMappings: RootMapping[] = (() => {
  // 繁简对照：繁体字根 -> 对应的简体字根
  const traditionalToSimplified: Record<string, string> = {
    '亞': '亚', '亜': '亚',
    '烏': '乌',
    '為': '为', '爲': '为',
    '糹': '纟', '糸': '纟',
    '貝': '贝', '頁': '页', '見': '见',
    '車': '车', '門': '门', '馬': '马',
    '魚': '鱼', '鳥': '鸟', '齒': '齿',
    '言': '讠', '金': '钅', '食': '饣',
    '飠': '饣',
    '長': '镸', // 镸 is the variant
  };

  return practiceRootMappings.filter(root => {
    // 如果是繁体且有对应简体，则排除
    if (traditionalToSimplified[root.char]) return false;
    return true;
  });
})();

/** 键盘布局定义 */
export const keyboardRows: string[][] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

/** 按键位索引的字根映射表（预计算，避免页面内重复构建） */
export const keyRootsMap: Record<string, RootMapping[]> = (() => {
  const map: Record<string, RootMapping[]> = {};
  for (const r of practiceRootMappings) {
    if (!map[r.key]) map[r.key] = [];
    map[r.key].push(r);
  }
  return map;
})();

/** 按键位索引的全部字根映射表（含 PUA 不可渲染字根） */
export const allKeyRootsMap: Record<string, RootMapping[]> = (() => {
  const map: Record<string, RootMapping[]> = {};
  for (const r of rootMappings) {
    if (!map[r.key]) map[r.key] = [];
    map[r.key].push(r);
  }
  return map;
})();

/** 字根图所在目录（public/roots/），用于渲染浏览器无法显示的 PUA/扩展区字根 */
export const ROOT_IMAGE_DIR = 'roots';

/**
 * 获取不可渲染字根对应的字根图路径（相对站点根，如 "roots/a (7).png"）。
 *
 * 映射规则（与"字源1.32字根图"一致）：同一键位下按字根表顺序排列，
 * 第 idx 个字根 → `<key>.png`（idx=0）或 `<key> (<idx>).png`。
 *
 * 注意：字根图只绘制了部分字根，若某位置没有对应图片文件，
 * 调用方应通过 <img onError> 回退到文本描述。
 */
export function getRootImagePath(root: RootMapping): string | null {
  const list = allKeyRootsMap[root.key];
  if (!list || list.length === 0) return null;
  const idx = list.findIndex(r => r.codePoint === root.codePoint && r.key === root.key);
  if (idx < 0) return null;
  const fileName = idx === 0 ? `${root.key}.png` : `${root.key} (${idx}).png`;
  return `${ROOT_IMAGE_DIR}/${fileName}`;
}

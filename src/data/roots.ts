// 字源形码 v1.31 字根映射数据
// 格式：[字根, 键位, Unicode码点(用于SVG渲染)]
//
// 数据来源：字源1.31版字根.txt
// 处理说明：
// 1. U+E42F 出现两次（键位d和q），按用户要求两个都保留
// 2. 5个U+FFFD替换字符（原始字节损坏）已删除
// 3. 所有CJK扩展A/B区、私用区字根均已保留
// 4. 总计 400 个字根条目

// 需要SVG渲染的字根（私用区/扩展区，多数字体无法显示）
// 格式：码点 -> 描述信息（用于生成SVG图形）
export const PUA_ROOTS: Record<number, { key: string; desc: string }> = {
  0xE407: { key: 'x', desc: '龹上' },
  0xE408: { key: 'x', desc: '龹下' },
  0xE420: { key: 'm', desc: '髟上' },
  0xE42F: { key: 'd', desc: '者上' },
  0xE439: { key: 'u', desc: '𧘇上' },
  0xE440: { key: 'p', desc: '衤变' },
  0xE443: { key: 'p', desc: '礻变' },
  0xE449: { key: 'i', desc: '氵变' },
  0xE44B: { key: 'i', desc: '冫变' },
  0xE44F: { key: 'z', desc: '钅变' },
  0xE450: { key: 'z', desc: '釒变' },
  0xE45D: { key: 'w', desc: '豕变' },
  0xE45E: { key: 'e', desc: '鳥变' },
  0xE462: { key: 'w', desc: '鹿变' },
  0xE478: { key: 'd', desc: '老变' },
  0xE47C: { key: 'o', desc: '缶变' },
  0xE488: { key: 'a', desc: '女变' },
  0xE490: { key: 'c', desc: '貝变' },
  0xE491: { key: 'c', desc: '頁变' },
  0xE492: { key: 'c', desc: '見变' },
  0xE495: { key: 'x', desc: '木变' },
  0xE497: { key: 'd', desc: '手变' },
  0xE4A1: { key: 't', desc: '竹变' },
  0xE4A6: { key: 'i', desc: '山变' },
  0xE4A9: { key: 'l', desc: '竖变' },
  0xE4AB: { key: 'l', desc: '弓变' },
  0xE4AE: { key: 'r', desc: '艹变' },
  0xE4AF: { key: 'r', desc: '廾变' },
  0xE4B5: { key: 'g', desc: '走变' },
  0xE4B9: { key: 'l', desc: '彐变' },
  0xE4BC: { key: 'l', desc: '乚变' },
  0xE4BD: { key: 'l', desc: '乙变' },
  0xE4C7: { key: 'y', desc: '立变' },
  0xE4C8: { key: 'y', desc: '衣变' },
  0xE4D3: { key: 'j', desc: '骨变' },
  0xE4EB: { key: 'l', desc: '言变' },
  0xE506: { key: 'v', desc: '火变' },
  0xE507: { key: 'v', desc: '灬变' },
  0xE51C: { key: 'a', desc: '力变' },
  0xE524: { key: 'm', desc: '月变' },
  0xE52A: { key: 't', desc: '禾变' },
  0xE53B: { key: 'o', desc: '米变' },
  0xE54A: { key: 'y', desc: '方变' },
  0xE56B: { key: 'e', desc: '虫变' },
  0xE56F: { key: 'k', desc: '口变' },
  0xE580: { key: 'p', desc: '门变' },
  0xE599: { key: 'i', desc: '阝变' },
  0xE5A5: { key: 'p', desc: '穴变' },
  0xE5BD: { key: 'r', desc: '业变' },
  0xE5C9: { key: 'z', desc: '矛变' },
  0xE771: { key: 'g', desc: '辶变' },
  0xE816: { key: 'f', desc: '大变' },
  0xE817: { key: 't', desc: '天变' },
  0xE831: { key: 'e', desc: '非变' },
};

const rawRoots: [string, string][] = [
  // CJK部首补充区 (U+2E80-U+2EFF)
  ["\u2E80","n"],["\u2E81","h"],["\u2E86","u"],["\u2E87","o"],["\u2E88","a"],
  ["\u2E8A","v"],["\u2E8C","i"],["\u2E8D","i"],["\u2E97","j"],["\u2E9C","n"],
  ["\u2E9D","m"],["\u2EA7","w"],["\u2EAE","t"],["\u2EB6","w"],["\u2EB7","w"],
  // CJK偏旁部首 (U+2F00-U+2FDF) & 其他
  ["\u2ECA","g"],["\u2ED7","n"],["\u2F71","w"],
  ["〇","k"],["〢","i"],["コ","i"],["ス","c"],["ユ","i"],["リ","i"],
  // CJK扩展A区
  ["\u342B","j"],["\u353E","j"],["\u382F","i"],["\u3840","y"],["\u4491","g"],
  // 基本区字根
  ["一","q"],["丁","g"],["丂","l"],["七","u"],["丆","f"],["万","l"],["丈","f"],["三","e"],
  ["上","v"],["下","v"],["不","i"],["专","u"],["且","t"],["丘","i"],["业","r"],["丝","u"],
  ["丣","p"],["两","w"],["丨","l"],["个","t"],["丬","x"],["中","v"],["丶","v"],["丷","i"],
  ["丸","o"],["丿","m"],["乂","r"],["乃","l"],["之","l"],["乌","e"],["乑","s"],["乙","d"],
  ["九","o"],["也","l"],["乡","u"],["书","t"],["了","h"],["予","z"],["事","k"],["二","w"],
  ["亍","g"],["云","n"],["五","t"],["亚","r"],["亜","r"],["亞","r"],["亠","y"],["亡","g"],
  ["亦","l"],["产","y"],["亲","y"],["人","s"],["亻","s"],["亼","e"],["今","s"],["儿","h"],
  ["兀","h"],["免","w"],["兔","w"],["八","i"],["六","y"],["其","o"],["冂","u"],["冖","u"],
  ["农","o"],["冫","n"],["几","o"],["凡","o"],["凵","i"],["凸","k"],["凹","k"],["刀","z"],
  ["刂","z"],["力","o"],["勹","a"],["勿","y"],["匕","d"],["化","d"],["匚","i"],["匸","i"],
  ["十","p"],["千","l"],["卜","v"],["卩","j"],["卬","p"],["卯","p"],["厂","h"],["厶","j"],
  ["叀","u"],["又","f"],["双","f"],["发","u"],["口","k"],["古","m"],["句","k"],["品","k"],
  ["囗","k"],["四","r"],["回","k"],["土","b"],["士","b"],["壴","o"],["夂","f"],["夕","m"],
  ["大","e"],["天","e"],["夫","e"],["头","j"],["女","a"],["子","h"],["宀","p"],["寸","f"],
  ["小","i"],["少","i"],["尚","i"],["尢","w"],["尤","w"],["尸","h"],["屮","r"],["屯","r"],
  ["屰","s"],["山","i"],["巛","c"],["川","c"],["工","d"],["己","j"],["已","j"],["巳","j"],
  ["巴","w"],["巾","y"],["干","x"],["幺","u"],["广","h"],["廴","g"],["廾","r"],["廿","r"],
  ["弋","u"],["弓","z"],["彐","l"],["彑","w"],["彡","u"],["彳","g"],["心","j"],["忄","j"],
  ["必","j"],["戈","z"],["戉","z"],["戊","z"],["戋","z"],["戌","z"],["成","z"],["户","p"],
  ["手","d"],["扌","d"],["才","x"],["攵","f"],["文","y"],["斗","o"],["斤","x"],["方","y"],
  ["无","i"],["日","n"],["旦","n"],["早","n"],["曰","n"],["月","m"],["木","x"],["朩","x"],
  ["未","x"],["末","x"],["本","x"],["欠","a"],
  ["止","g"],["歹","j"],["母","a"],["毛","u"],["氏","y"],["民","s"],["气","l"],
  ["水","c"],["氵","c"],["永","c"],["氺","c"],["求","c"],["火","v"],["灬","v"],["為","v"],
  ["烏","e"],["爪","e"],["爫","e"],["爲","v"],["爿","x"],["片","x"],["牙","j"],["牛","w"],
  ["牜","w"],["犬","w"],["犭","w"],["犮","u"],["王","f"],["瓜","o"],["瓦","o"],["生","h"],
  ["用","o"],["甫","b"],["田","b"],["由","b"],["甲","y"],["疒","h"],["癶","g"],["白","k"],
  ["皮","u"],["皿","o"],["目","j"],["矛","z"],["矢","t"],["石","f"],["示","v"],["礻","v"],
  ["禸","w"],["禾","o"],["穴","p"],["立","y"],["竹","t"],["米","o"],["糸","u"],["糹","u"],
  ["系","u"],["纟","u"],["缶","o"],["罒","o"],["羊","w"],["羽","u"],["耂","h"],["而","l"],
  ["耒","o"],["耳","j"],["肉","m"],["臣","j"],["自","j"],["臼","b"],["舟","g"],["艹","r"],
  ["虍","w"],["虫","e"],["衣","y"],["衤","y"],["西","e"],["覀","e"],["見","j"],["见","j"],
  ["言","l"],["讠","l"],["豆","o"],["豕","w"],["豸","w"],["貝","c"],["贝","c"],["走","g"],
  ["足","g"],["身","j"],["車","g"],["车","g"],["辰","n"],["辶","g"],["酉","e"],["釆","w"],
  ["金","z"],["钅","z"],["镸","u"],["門","p"],["门","p"],["阝","i"],["隹","e"],["雨","n"],
  ["非","e"],["革","u"],["音","y"],["頁","c"],["页","c"],["飞","e"],["食","o"],["飠","o"],
  ["饣","o"],["首","j"],["馬","w"],["马","w"],["骨","j"],["高","p"],["魚","q"],["鱼","q"],
  ["鳥","e"],["鸟","e"],["鹿","w"],["麻","t"],["黑","v"],["黽","i"],["鼠","w"],["齒","j"],
  ["齿","j"],["龙","w"],["龜","l"],["龰","g"],["龴","j"],["龵","d"],["龶","a"],["龷","r"],
  // 私用区字根 (PUA) - 用Unicode转义确保数据完整
  ["\uE407","x"],["\uE408","x"],["\uE420","m"],
  ["\uE42F","d"], // U+E42F 键位d（用户要求两个都保留）
  ["\uE42F","q"], // U+E42F 键位q（用户要求两个都保留）
  ["\uE439","u"],["\uE440","p"],["\uE443","p"],["\uE449","i"],["\uE44B","i"],
  ["\uE44F","z"],["\uE450","z"],["\uE45D","w"],["\uE45E","e"],["\uE462","w"],
  ["\uE478","d"],["\uE47C","o"],["\uE488","a"],["\uE490","c"],["\uE491","c"],
  ["\uE492","c"],["\uE495","x"],["\uE497","d"],["\uE4A1","t"],["\uE4A6","i"],
  ["\uE4A9","l"],["\uE4AB","l"],["\uE4AE","r"],["\uE4AF","r"],["\uE4B5","g"],
  ["\uE4B9","l"],["\uE4BC","l"],["\uE4BD","l"],["\uE4C7","y"],["\uE4C8","y"],
  ["\uE4D3","j"],["\uE4EB","l"],["\uE506","v"],["\uE507","v"],["\uE51C","a"],
  ["\uE524","m"],["\uE52A","t"],["\uE53B","o"],["\uE54A","y"],["\uE56B","e"],
  ["\uE56F","k"],["\uE580","p"],["\uE599","i"],["\uE5A5","p"],["\uE5BD","r"],
  ["\uE5C9","z"],["\uE771","g"],["\uE816","f"],["\uE817","t"],["\uE831","e"],
  // CJK扩展B区
  ["\uD840\uDC0E","r"],["\uD842\uDD0E","d"],["\uD84E\uDC42","i"],
  ["\uD859\uDCDD","j"],["\uD859\uDCDE","j"],["\uD859\uDD51","b"],
  ["\uD85D\uDE07","y"],["\uD85F\uDC28","w"],["\uD866\uDD7F","o"],
];

export interface RootMapping {
  char: string;
  key: string;
  codePoint: number;
  /** 是否为私用区/扩展区字根（需要特殊渲染） */
  isPUA: boolean;
  /** PUA字根描述 */
  desc?: string;
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
  return {
    char,
    key,
    codePoint: cp,
    isPUA: isPUARoot(cp),
    desc: puaInfo?.desc,
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

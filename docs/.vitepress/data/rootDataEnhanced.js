// src/data/rootData.js
/**
 * 字根数据管理
 * 提供字根数据的分类、索引和查询功能
 */

export const allRoots = [
  { character: '白', code: 'k', hint: '白色', category: '自然' },
  { character: '一', code: 'q', hint: '横线', category: '数字' },
  { character: '旦', code: 'n', hint: '太阳升起', category: '自然' },
  { character: '不', code: 'i', hint: '否定', category: '其他' },
  { character: '了', code: 'h', hint: '完成', category: '其他' },
  { character: '', code: 'f', hint: '厂字头', category: '结构' },
  { character: '人', code: 's', hint: '人类', category: '人体' },
  { character: '⺝', code: 'm', hint: '单人旁', category: '结构' },
  { character: '丿', code: 'm', hint: '撇', category: '笔画' },
  { character: '亻', code: 's', hint: '单人旁', category: '结构' },
  { character: '也', code: 'l', hint: '也字底', category: '结构' },
  { character: '文', code: 'y', hint: '文字', category: '其他' },
  { character: '个', code: 't', hint: '个体', category: '其他' },
  { character: '门', code: 'p', hint: '门字框', category: '结构' },
  { character: '中', code: 'v', hint: '中间', category: '其他' },
  { character: '未', code: 'x', hint: '未来', category: '其他' },
  { character: '上', code: 'v', hint: '上面', category: '其他' },
  { character: '大', code: 'e', hint: '大小', category: '其他' },
  { character: '丶', code: 'v', hint: '点', category: '笔画' },
  { character: '力', code: 'o', hint: '力量', category: '其他' },
  { character: '禾', code: 'o', hint: '禾苗', category: '植物' },
  { character: '囗', code: 'k', hint: '方框', category: '结构' },
  { character: '王', code: 'f', hint: '王字旁', category: '其他' },
  { character: '土', code: 'b', hint: '土地', category: '自然' },
  { character: '厶', code: 'j', hint: '私字底', category: '结构' },
  { character: '乙', code: 'd', hint: '乙字旁', category: '笔画' },
  { character: '讠', code: 'l', hint: '言字旁', category: '结构' },
  { character: '丷', code: 'i', hint: '倒八字=八', category: '笔画' },
  { character: '日', code: 'n', hint: '太阳', category: '自然' },
  { character: '寸', code: 'f', hint: '寸字底', category: '结构' },
  { character: '覀', code: 'e', hint: '西字头', category: '结构' },
  { character: '', code: 'p', hint: '高字头', category: '结构' },
  { character: '屮', code: 'r', hint: '草字头', category: '植物' },
  { character: '云', code: 'n', hint: '云朵', category: '自然' },
  { character: '丁', code: 'g', hint: '丁字底', category: '其他' },
  { character: '口', code: 'k', hint: '口形', category: '结构' },
  { character: '又', code: 'f', hint: '又字旁', category: '结构' },
  { character: '生', code: 'h', hint: '生长', category: '自然' },
  { character: '而', code: 'l', hint: '而且', category: '其他' },
  { character: '子', code: 'h', hint: '孩子', category: '人体' },
  { character: '', code: 'z', hint: '那左旁', category: '结构' },
  { character: '阝', code: 'i', hint: '耳朵旁', category: '人体' },
  { character: '彳', code: 'g', hint: '双人旁', category: '结构' },
  { character: '二', code: 'w', hint: '数字二', category: '数字' },
  { character: '丨', code: 'l', hint: '竖线', category: '笔画' },
  { character: '⺶', code: 'w', hint: '羊字头', category: '动物' },
  { character: '下', code: 'v', hint: '下面', category: '其他' },
  { character: '自', code: 'j', hint: '自己', category: '人体' },
  { character: '之', code: 'l', hint: '之字底', category: '结构' },
  { character: '', code: 't', hint: '建字底', category: '结构' },
  { character: '匚', code: 'i', hint: '区字框', category: '结构' },
  { character: '辶', code: 'g', hint: '走之底', category: '结构' },
  { character: '发', code: 'u', hint: '头发', category: '人体' },
  { character: '⺁', code: 'h', hint: '后字头', category: '结构' },
  { character: '用', code: 'o', hint: '使用', category: '其他' },
  { character: '首', code: 'j', hint: '首领', category: '人体' },
  { character: '亍', code: 'g', hint: '行字旁', category: '结构' },
  { character: 'コ', code: 'i', hint: '八字头', category: '数字' },
  { character: '斤', code: 'x', hint: '斤字旁', category: '其他' },
  { character: '', code: 'm', hint: '然字头-左上', category: '其他' },
  { character: '犬', code: 'w', hint: '犬旁', category: '动物' },
  { character: '宀', code: 'p', hint: '宝盖头', category: '结构' },
  { character: '豕', code: 'w', hint: '猪字底', category: '动物' },
  { character: '事', code: 'k', hint: '事情', category: '其他' },
  { character: '成', code: 'z', hint: '成功', category: '其他' },
  { character: '方', code: 'y', hint: '方向', category: '其他' },
  { character: '夕', code: 'm', hint: '夕阳', category: '自然' },
  { character: '纟', code: 'u', hint: '绞丝旁', category: '结构' },
  { character: 'ス', code: 'c', hint: '劲字左头', category: '笔画' },
  { character: '氵', code: 'c', hint: '三点水', category: '自然' },
  { character: '⺍', code: 'i', hint: '学字头', category: '结构' },
  { character: '冖', code: 'u', hint: '秃宝盖', category: '结构' },
  { character: '女', code: 'a', hint: '女性', category: '人体' },
  { character: '耂', code: 'h', hint: '老字头', category: '人体' },
  { character: '冂', code: 'u', hint: '同字框', category: '结构' },
  { character: '见', code: 'j', hint: '看见', category: '人体' },
  { character: '⺌', code: 'i', hint: '光字头', category: '自然' },
  { character: '彐', code: 'l', hint: '雪字底', category: '自然' },
  { character: '三', code: 'e', hint: '数字三', category: '数字' },
  { character: '走', code: 'g', hint: '走之底', category: '结构' },
  { character: '己', code: 'j', hint: '自己', category: '人体' },
  { character: '龵', code: 'd', hint: '看字头', category: '结构' },
  { character: '天', code: 'e', hint: '天空', category: '自然' },
  { character: '八', code: 'i', hint: '八字形', category: '数字' },
  { character: '刀', code: 'z', hint: '刀字旁', category: '其他' },
  { character: '', code: 'i', hint: '齐字底=稍息站姿', category: '其他' },
  { character: '小', code: 'i', hint: '大小', category: '其他' },
  { character: '立', code: 'y', hint: '站立', category: '其他' },
  { character: '其', code: 'o', hint: '其中', category: '其他' },
  { character: '止', code: 'g', hint: '停止', category: '其他' },
  { character: '匕', code: 'd', hint: '匕首', category: '其他' },
  { character: '木', code: 'x', hint: '树木', category: '植物' },
  { character: '羊', code: 'w', hint: '羊字旁', category: '动物' },
  { character: '心', code: 'j', hint: '心脏', category: '人体' },
  { character: '本', code: 'x', hint: '根本', category: '植物' },
  { character: '䒑', code: 'g', hint: '前字头', category: '结构' },
  { character: '廾', code: 'r', hint: '弄字底', category: '结构' },
  { character: '目', code: 'j', hint: '眼睛', category: '人体' },
  { character: '头', code: 'j', hint: '头部', category: '人体' },
  { character: '车', code: 'g', hint: '车辆', category: '其他' },
  { character: '音', code: 'y', hint: '声音', category: '其他' },
  { character: '无', code: 'i', hint: '没有', category: '其他' },
  { character: '扌', code: 'd', hint: '提手旁', category: '人体' },
  { character: '巴', code: 'w', hint: '巴字旁', category: '结构' },
  { character: '几', code: 'o', hint: '茶几', category: '其他' },
  { character: '十', code: 'p', hint: '十字形', category: '数字' },
  { character: '民', code: 's', hint: '人民', category: '人体' },
  { character: '⺮', code: 't', hint: '竹字头', category: '植物' },
  { character: '弓', code: 'z', hint: '弓字旁', category: '其他' },
  { character: '已', code: 'j', hint: '已经', category: '其他' },
  { character: '工', code: 'd', hint: '工作', category: '其他' },
  { character: '丈', code: 'f', hint: '丈量', category: '其他' },
  { character: '忄', code: 'j', hint: '竖心旁', category: '人体' },
  { character: '龶', code: 'a', hint: '亲字头', category: '结构' },
  { character: '月', code: 'm', hint: '月亮', category: '自然' },
  { character: '矢', code: 't', hint: '矢量', category: '其他' },
  { character: '⺊', code: 'v', hint: '步字底', category: '结构' },
  { character: '灬', code: 'v', hint: '四点底', category: '笔画' },
  { character: '业', code: 'r', hint: '事业', category: '其他' },
  { character: '卜', code: 'v', hint: '占卜', category: '其他' },
  { character: '丬', code: 'x', hint: '将字旁', category: '结构' },
  { character: '两', code: 'w', hint: '两个', category: '数字' },
  { character: '高', code: 'p', hint: '高大', category: '其他' },
  { character: '由', code: 'b', hint: '由于', category: '自然' },
  { character: '耳', code: 'j', hint: '耳朵', category: '人体' },
  { character: '千', code: 'l', hint: '千个', category: '数字' },
  { character: '牜', code: 'w', hint: '牛字旁', category: '动物' },
  { character: '勿', code: 'y', hint: '不要', category: '其他' },
  { character: '手', code: 'd', hint: '手工', category: '人体' },
  { character: '广', code: 'h', hint: '广阔', category: '结构' },
  { character: '', code: 'i', hint: '兴横头', category: '结构' },
  { character: '戈', code: 'z', hint: '戈字旁', category: '其他' },
  { character: '攵', code: 'f', hint: '反文旁', category: '结构' },
  { character: '⺷', code: 'w', hint: '羊字头', category: '动物' },
  { character: '衤', code: 'y', hint: '衣字旁', category: '结构' },
  { character: '皮', code: 'u', hint: '皮肤', category: '人体' },
  { character: '刂', code: 'z', hint: '立刀旁', category: '其他' },
  { character: '产', code: 'y', hint: '产生', category: '其他' },
  { character: '亲', code: 'y', hint: '亲人', category: '人体' },
  { character: '牛', code: 'w', hint: '牛羊', category: '动物' },
  { character: '身', code: 'j', hint: '身体', category: '人体' },
  { character: '西', code: 'e', hint: '西方', category: '自然' },
  { character: '亼', code: 'e', hint: '集合', category: '结构' },
  { character: '回', code: 'k', hint: '回来', category: '结构' },
  { character: '弋', code: 'u', hint: '弋字旁', category: '其他' },
  { character: '言', code: 'l', hint: '语言', category: '其他' },
  { character: '𧘇', code: 'y', hint: '衣字旁', category: '结构' },
  { character: '化', code: 'd', hint: '化学', category: '其他' },
  { character: '廿', code: 'r', hint: '二十=艹', category: '数字' },
  { character: '冫', code: 'n', hint: '两点水', category: '自然' },
  { character: '欠', code: 'a', hint: '欠缺', category: '其他' },
  { character: '', code: 'i', hint: '裳字头=同尚', category: '结构' },
  { character: '巾', code: 'y', hint: '毛巾', category: '其他' },
  { character: '⺧', code: 'w', hint: '牛头', category: '动物' },
  { character: '儿', code: 'h', hint: '儿童', category: '人体' },
  { character: '龴', code: 'j', hint: '勇字头', category: '结构' },
  { character: '', code: 'o', hint: '甬字底=同用字', category: '结构' },
  { character: '厂', code: 'h', hint: '厂字头', category: '结构' },
  { character: '', code: 'u', hint: '东字旁=七', category: '结构' },
  { character: '士', code: 'b', hint: '士兵', category: '人体' },
  { character: '尸', code: 'h', hint: '尸字头', category: '结构' },
  { character: '龰', code: 'g', hint: '定字底', category: '结构' },
  { character: '乃', code: 'l', hint: '乃是', category: '其他' },
  { character: '', code: 'd', hint: '顷字旁', category: '结构' },
  { character: '贝', code: 'c', hint: '贝壳', category: '其他' },
  { character: '⺈', code: 'a', hint: '刀字旁', category: '其他' },
  { character: '水', code: 'c', hint: '水流', category: '自然' },
  { character: '', code: 't', hint: '且多一横', category: '结构' },
  { character: '夂', code: 'f', hint: '反文旁', category: '结构' },
  { character: '乂', code: 'r', hint: '交叉', category: '结构' },
  { character: '朩', code: 'x', hint: '木字旁', category: '植物' },
  { character: '干', code: 'x', hint: '干燥', category: '自然' },
  { character: '系', code: 'u', hint: '系统', category: '其他' },
  { character: '气', code: 'l', hint: '气体', category: '自然' },
  { character: '页', code: 'c', hint: '页码', category: '其他' },
  { character: '亦', code: 'l', hint: '也字底', category: '结构' },
  { character: '四', code: 'r', hint: '数字四', category: '数字' },
  { character: '礻', code: 'v', hint: '示字旁', category: '结构' },
  { character: '米', code: 'o', hint: '米粒', category: '植物' },
  { character: '少', code: 'i', hint: '多少', category: '其他' },
  { character: '卩', code: 'j', hint: '单耳旁', category: '结构' },
  { character: '才', code: 'x', hint: '才能', category: '其他' },
  { character: '爫', code: 'e', hint: '爪字头', category: '结构' },
  { character: '戌', code: 'z', hint: '戌时', category: '其他' },
  { character: '', code: 'l', hint: '君字头', category: '结构' },
  { character: '', code: 'd', hint: '丰少一横', category: '结构' },
  { character: '廴', code: 'g', hint: '建字底', category: '结构' },
  { character: '古', code: 'm', hint: '古代', category: '其他' },
  { character: '必', code: 'j', hint: '必须', category: '其他' },
  { character: '亠', code: 'y', hint: '点横头', category: '结构' },
  { character: '山', code: 'i', hint: '山峰', category: '自然' },
  { character: '金', code: 'z', hint: '金属', category: '自然' },
  { character: '', code: 'g', hint: '充字头', category: '结构' },
  { character: '彡', code: 'u', hint: '三撇', category: '笔画' },
  { character: '穴', code: 'p', hint: '穴字头', category: '结构' },
  { character: 'ユ', code: 'i', hint: '单人旁', category: '结构' },
  { character: '龷', code: 'r', hint: '登字旁', category: '结构' },
  { character: '', code: 'y', hint: '衣字底', category: '结构' },
  { character: '马', code: 'w', hint: '马匹', category: '动物' },
  { character: '斗', code: 'o', hint: '斗争', category: '其他' },
  { character: '五', code: 't', hint: '数字五', category: '数字' },
  { character: '书', code: 't', hint: '书籍', category: '其他' },
  { character: '非', code: 'e', hint: '非常', category: '其他' },
  { character: '田', code: 'b', hint: '田地', category: '自然' },
  { character: '兀', code: 'h', hint: '兀字旁', category: '结构' },
  { character: '虫', code: 'e', hint: '虫子', category: '动物' },
  { character: '且', code: 't', hint: '而且', category: '其他' },
  { character: '隹', code: 'e', hint: '短尾鸟', category: '动物' },
  { character: '⻊', code: 'g', hint: '足字旁', category: '人体' },
  { character: '品', code: 'k', hint: '品质', category: '其他' },
  { character: '求', code: 'c', hint: '请求', category: '其他' },
  { character: '', code: 'x', hint: '北左旁', category: '结构' },
  { character: '歹', code: 'j', hint: '歹字旁', category: '其他' },
  { character: '亡', code: 'g', hint: '死亡', category: '其他' },
  { character: '六', code: 'y', hint: '数字六', category: '数字' },
  { character: '夫', code: 'e', hint: '夫妻', category: '人体' },
  { character: '万', code: 'l', hint: '万能', category: '数字' },
  { character: '今', code: 's', hint: '今天', category: '其他' },
  { character: '石', code: 'f', hint: '石头', category: '自然' },
  { character: '专', code: 'u', hint: '专门', category: '其他' },
  { character: 'リ', code: 'i', hint: '帅字旁', category: '笔画' },
  { character: '七', code: 'u', hint: '数字七', category: '数字' },
  { character: '艹', code: 'r', hint: '草字头', category: '植物' },
  { character: '巳', code: 'j', hint: '巳时', category: '其他' },
  { character: '飞', code: 'e', hint: '飞翔', category: '自然' },
  { character: '⺇', code: 'o', hint: '几个', category: '数字' },
  { character: '𣥂', code: 'i', hint: '少少一点', category: '笔画' },
  { character: '母', code: 'a', hint: '母亲', category: '人体' },
  { character: '', code: 'o', hint: '单字底', category: '结构' },
  { character: '罒', code: 'o', hint: '网字头', category: '结构' },
  { character: '凵', code: 'i', hint: '框向上', category: '结构' },
  { character: '丘', code: 'i', hint: '山丘', category: '自然' },
  { character: '⺆', code: 'u', hint: '框向下', category: '结构' },
  { character: '丆', code: 'f', hint: '石字头', category: '结构' },
  { character: '⻗', code: 'n', hint: '雨字头', category: '自然' },
  { character: '㐫', code: 'j', hint: '离字头', category: '结构' },
  { character: '禸', code: 'w', hint: '犬字旁', category: '动物' },
  { character: '亚', code: 'r', hint: '亚洲', category: '其他' },
  { character: '示', code: 'v', hint: '显示', category: '其他' },
  { character: '勹', code: 'a', hint: '包字头', category: '结构' },
  { character: '疒', code: 'h', hint: '病字头', category: '结构' },
  { character: '九', code: 'o', hint: '数字九', category: '数字' },
  { character: '戋', code: 'z', hint: '戋字旁', category: '其他' },
  { character: '㠯', code: 'i', hint: '点横头', category: '结构' },
  { character: '火', code: 'v', hint: '火焰', category: '自然' },
  { character: '戉', code: 'z', hint: '戈字旁', category: '其他' },
  { character: '', code: 'v', hint: '曾中间', category: '结构' },
  { character: '片', code: 'x', hint: '片字旁', category: '结构' },
  { character: '早', code: 'n', hint: '早晨', category: '自然' },
  { character: '农', code: 'o', hint: '农业', category: '其他' },
  { character: '衣', code: 'y', hint: '衣服', category: '其他' },
  { character: '⺀', code: 'n', hint: '头两点', category: '笔画' },
  { character: '丂', code: 'l', hint: '考字底', category: '结构' },
  { character: '丸', code: 'o', hint: '丸子', category: '其他' },
  { character: '户', code: 'p', hint: '户口', category: '结构' },
  { character: '', code: 'j', hint: '单耳字旁', category: '结构' },
  { character: '黑', code: 'v', hint: '黑色', category: '自然' },
  { character: '革', code: 'u', hint: '革命', category: '其他' },
  { character: '足', code: 'g', hint: '足部', category: '人体' },
  { character: '', code: 'y', hint: '派字底', category: '结构' },
  { character: '句', code: 'k', hint: '句子', category: '其他' },
  { character: '氏', code: 'y', hint: '氏族', category: '其他' },
  { character: '', code: 'p', hint: '贸字头', category: '结构' },
  { character: '〢', code: 'i', hint: '两点', category: '笔画' },
  { character: '糸', code: 'u', hint: '丝线', category: '结构' },
  { character: '', code: 'm', hint: '祭字头', category: '结构' },
  { character: '', code: 'r', hint: '段字左旁', category: '结构' },
  { character: '双', code: 'f', hint: '双人', category: '数字' },
  { character: '钅', code: 'z', hint: '金字旁', category: '自然' },
  { character: '舟', code: 'g', hint: '舟船', category: '其他' },
  { character: '', code: 'd', hint: '乐字头', category: '结构' },
  { character: '毛', code: 'u', hint: '毛发', category: '人体' },
  { character: '幺', code: 'u', hint: '细小', category: '其他' },
  { character: '', code: 'c', hint: '水字型', category: '自然' },
  { character: '犭', code: 'w', hint: '犬旁', category: '动物' },
  { character: '㔾', code: 'j', hint: '交叉', category: '结构' },
  { character: '', code: 'a', hint: '久字头', category: '结构' },
  { character: '', code: 'c', hint: '水字型', category: '自然' },
  { character: '', code: 'l', hint: '印左旁', category: '结构' },
  { character: '免', code: 'w', hint: '免费', category: '其他' },
  { character: '予', code: 'z', hint: '给予', category: '其他' },
  { character: '皿', code: 'o', hint: '器皿', category: '其他' },
  { character: '壴', code: 'o', hint: '鼓字旁', category: '结构' },
  { character: '食', code: 'o', hint: '食物', category: '其他' },
  { character: '龙', code: 'w', hint: '龙形', category: '动物' },
  { character: '川', code: 'c', hint: '河流', category: '自然' },
  { character: '酉', code: 'e', hint: '酉时', category: '其他' },
  { character: '尤', code: 'w', hint: '尤其', category: '其他' },
  { character: '牙', code: 'j', hint: '牙齿', category: '人体' },
  { character: '屯', code: 'r', hint: '屯集', category: '其他' },
  { character: '', code: 'e', hint: '鸟没横', category: '动物' },
  { character: '釆', code: 'w', hint: '犬旁', category: '动物' },
  { character: '癶', code: 'g', hint: '登字底', category: '结构' },
  { character: '豆', code: 'o', hint: '豆子', category: '植物' },
  { character: '彑', code: 'w', hint: '彑字旁', category: '动物' },
  { character: '', code: 't', hint: '竹字头', category: '植物' },
  { character: '永', code: 'c', hint: '永远', category: '自然' },
  { character: '鱼', code: 'q', hint: '鱼', category: '动物' },
  { character: '', code: 'e', hint: '贵字头', category: '结构' },
  { character: '缶', code: 'o', hint: '缶字旁', category: '其他' },
  { character: '尚', code: 'i', hint: '高尚', category: '其他' },
  { character: '', code: 'i', hint: '班中间点丿', category: '结构' },
  { character: '凡', code: 'o', hint: '平凡', category: '其他' },
  { character: '⽱', code: 'w', hint: '犬旁', category: '动物' },
  { character: '氺', code: 'c', hint: '水流', category: '自然' },
  { character: '虍', code: 'w', hint: '虎字头', category: '动物' },
  { character: '', code: 'z', hint: '臧字框', category: '结构' },
  { character: '匸', code: 'i', hint: '区字框', category: '结构' },
  { character: '', code: 'e', hint: '短尾鸟', category: '动物' },
  { character: '乡', code: 'u', hint: '乡村', category: '其他' },
  { character: '雨', code: 'n', hint: '雨水', category: '自然' },
  { character: '饣', code: 'o', hint: '食字旁', category: '结构' },
  { character: '甫', code: 'b', hint: '甫字旁', category: '结构' },
  { character: '爪', code: 'e', hint: '爪子', category: '动物' },
  { character: '肉', code: 'm', hint: '肉体', category: '人体' },
  { character: '丝', code: 'u', hint: '丝线', category: '结构' },
  { character: '羽', code: 'u', hint: '羽毛', category: '动物' },
  { character: '骨', code: 'j', hint: '骨头', category: '人体' },
  { character: '𠀎', code: 'r', hint: '草字头', category: '植物' },
  { character: '卬', code: 'p', hint: '仰字旁', category: '结构' },
  { character: '', code: 'k', hint: '窗方框', category: '结构' },
  { character: '镸', code: 'u', hint: '长字旁', category: '结构' },
  { character: '', code: 'g', hint: '止字底', category: '结构' },
  { character: '辰', code: 'n', hint: '时辰', category: '其他' },
  { character: '甲', code: 'y', hint: '甲等', category: '其他' },
  { character: '麻', code: 't', hint: '麻木', category: '植物' },
  { character: '臣', code: 'j', hint: '臣子', category: '人体' },
  { character: '臼', code: 'b', hint: '臼齿', category: '人体' },
  { character: '末', code: 'x', hint: '末尾', category: '植物' },
  { character: '瓦', code: 'o', hint: '瓦片', category: '自然' },
  { character: '', code: 'z', hint: '戈字旁', category: '其他' },
  { character: '⺜', code: 'n', hint: '病字头', category: '结构' },
  { character: '乌', code: 'e', hint: '乌鸦', category: '动物' },
  { character: '鸟', code: 'e', hint: '鸟儿', category: '动物' },
  { character: '乑', code: 's', hint: '众人', category: '人体' },
  { character: '', code: 'c', hint: '川字型', category: '自然' },
  { character: '瓜', code: 'o', hint: '瓜果', category: '植物' },
  { character: '', code: 'l', hint: '亦字底', category: '结构' },
  { character: '矛', code: 'z', hint: '矛盾', category: '其他' },
  { character: '犮', code: 'u', hint: '发字旁', category: '结构' },
  { character: '齿', code: 'j', hint: '牙齿', category: '人体' },
  { character: '', code: 'l', hint: '小亦字底', category: '结构' },
  { character: '叀', code: 'u', hint: '惠字头', category: '结构' },
  { character: '巛', code: 'c', hint: '河流', category: '自然' },
  { character: '卯', code: 'p', hint: '卯时', category: '其他' },
  { character: '耒', code: 'o', hint: '耒耜', category: '其他' },
  { character: '竹', code: 't', hint: '竹子', category: '植物' },
  { character: '豸', code: 'w', hint: '豸旁', category: '动物' },
  { character: '曰', code: 'n', hint: '曰字旁', category: '结构' },
  { character: '鼠', code: 'w', hint: '老鼠', category: '动物' },
  { character: '⺗', code: 'j', hint: '竖心旁', category: '结构' },
  { character: '', code: 'a', hint: '獒字旁', category: '动物' },
  { character: '屰', code: 's', hint: '逆字旁', category: '结构' },
  { character: '', code: 'y', hint: '喂字底', category: '结构' },
  { character: '鹿', code: 'w', hint: '鹿角', category: '动物' },
  { character: '㡀', code: 'y', hint: '衣字旁', category: '结构' },
  { character: '戊', code: 'z', hint: '戊时', category: '其他' },
  { character: '朩', code: 'i', hint: '木字旁', category: '植物' },
  { character: '兔', code: 'w', hint: '兔子', category: '动物' },
  { character: '𦥑', code: 'b', hint: '土地', category: '自然' },
  { character: '', code: 'x', hint: '片字旁', category: '结构' },
  { character: '', code: 'x', hint: '片字旁', category: '结构' },
  { character: '𦣞', code: 'j', hint: '竖心旁', category: '结构' },
  { character: '', code: 'l', hint: '瘧字底', category: '结构' },
  { character: '', code: 'p', hint: '膏字头', category: '结构' },
  { character: '尢', code: 'w', hint: '犬旁', category: '动物' },
  { character: '凸', code: 'k', hint: '凸起', category: '结构' },
  { character: '凹', code: 'k', hint: '凹陷', category: '结构' },
  { character: '', code: 'v', hint: '曾中间', category: '结构' },
  { character: '𠤎', code: 'd', hint: '折字旁', category: '结构' },
  { character: '爿', code: 'x', hint: '片字旁', category: '结构' },
  { character: '𧰨', code: 'w', hint: '豕底', category: '动物' },
  { character: '', code: 'w', hint: '鼠字底', category: '动物' },
  { character: '飠', code: 'o', hint: '食字旁', category: '结构' },
  { character: '鳥', code: 'e', hint: '鸟儿', category: '动物' },
  { character: '馬', code: 'w', hint: '马匹', category: '动物' },
  { character: '糹', code: 'u', hint: '绞丝旁', category: '结构' },
  { character: '貝', code: 'c', hint: '贝壳', category: '其他' },
  { character: '門', code: 'p', hint: '门户', category: '结构' },
  { character: '魚', code: 'q', hint: '鱼', category: '动物' },
  { character: '頁', code: 'c', hint: '页码', category: '其他' },
  { character: '車', code: 'g', hint: '车辆', category: '其他' },
  { character: '齒', code: 'j', hint: '牙齿', category: '人体' },
  { character: '見', code: 'j', hint: '看见', category: '人体' },
  { character: '', code: 'l', hint: '長字头', category: '结构' },
  { character: '黽', code: 'i', hint: '黾字旁', category: '结构' },
  { character: '亞', code: 'r', hint: '亚洲', category: '其他' },
  { character: '亜', code: 'r', hint: '亚洲', category: '其他' },
  { character: '', code: 'r', hint: '壷字底', category: '结构' },
  { character: '見', code: 'j', hint: '看见', category: '人体' },
  { character: '手', code: 'd', hint: '手工', category: '人体' },
  { character: '', code: 'd', hint: '聿字头', category: '结构' },
  { character: '〇', code: 'k', hint: '零圆圈', category: '数字' },
  { character: '', code: 'p', hint: '璢右上', category: '结构' },
  { character: '丣', code: 'p', hint: '酉字底', category: '结构' },
  { character: '', code: 'w', hint: '馬字头', category: '动物' },
  { character: '烏', code: 'e', hint: '乌鸦', category: '动物' },
  { character: '𦣝', code: 'j', hint: '类臣旁', category: '结构' },
  { character: '𩙿', code: 'o', hint: '食字旁', category: '结构' },
  { character: '', code: 'r', hint: '斲字左底', category: '结构' }
]

/**
 * 字根分类常量
 */
export const ROOT_CATEGORIES = {
  NATURAL: '自然',
  HUMAN: '人体',
  ANIMAL: '动物',
  PLANT: '植物',
  NUMBER: '数字',
  STROKE: '笔画',
  STRUCTURE: '结构',
  OTHER: '其他'
}

/**
 * 字根编码映射（按编码快速查找）
 */
export const rootsByCode = new Map()

/**
 * 字根分类映射（按分类查找）
 */
export const rootsByCategory = new Map()

/**
 * 初始化索引
 */
function initializeIndexes() {
  allRoots.forEach(root => {
    // 按编码索引
    if (!rootsByCode.has(root.code)) {
      rootsByCode.set(root.code, [])
    }
    rootsByCode.get(root.code).push(root)
    
    // 如果有分类，按分类索引
    if (root.category) {
      if (!rootsByCategory.has(root.category)) {
        rootsByCategory.set(root.category, [])
      }
      rootsByCategory.get(root.category).push(root)
    }
  })
}

// 初始化索引
initializeIndexes()

/**
 * 根据编码查找字根
 * @param {string} code - 字根编码
 * @returns {Object|null} 字根数据或null
 */
export const findRootByCode = (code) => {
  const roots = rootsByCode.get(code.toLowerCase())
  return roots && roots.length > 0 ? roots[0] : null
}

/**
 * 根据编码查找所有匹配的字根
 * @param {string} code - 字根编码
 * @returns {Array} 字根数组
 */
export const findAllRootsByCode = (code) => {
  return rootsByCode.get(code.toLowerCase()) || []
}

/**
 * 根据分类查找字根
 * @param {string} category - 分类名称
 * @returns {Array} 字根数组
 */
export const findRootsByCategory = (category) => {
  return rootsByCategory.get(category) || []
}

/**
 * 获取所有分类
 * @returns {Array} 分类名称数组
 */
export const getAllCategories = () => {
  return Array.from(rootsByCategory.keys())
}

/**
 * 统计各分类的字根数量
 * @returns {Object} 分类统计
 */
export const getCategoryStats = () => {
  const stats = {}
  rootsByCategory.forEach((roots, category) => {
    stats[category] = roots.length
  })
  return stats
}

/**
 * 验证字根数据
 * @returns {Object} 验证结果
 */
export const validateRootData = () => {
  const issues = []
  const codeSet = new Set()
  
  allRoots.forEach((root, index) => {
    // 检查必填字段
    if (!root.character || !root.code || !root.hint) {
      issues.push(`索引 ${index}: 缺少必填字段`)
    }
    
    // 检查编码重复
    if (codeSet.has(root.code)) {
      issues.push(`编码 ${root.code} 重复`)
    }
    codeSet.add(root.code)
  })
  
  return {
    valid: issues.length === 0,
    issues,
    totalRoots: allRoots.length
  }
}
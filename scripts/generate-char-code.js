// 从JSON生成TypeScript码表数据
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = path.join(__dirname, '../src/data/charCodeRaw.json');
const outputFile = path.join(__dirname, '../src/data/charCodeData.ts');

console.log('读取JSON文件:', inputFile);
let content = fs.readFileSync(inputFile, 'utf-8');
// 移除BOM头
if (content.charCodeAt(0) === 0xFEFF) {
  content = content.slice(1);
}
const rawData = JSON.parse(content);

// 解析数据
const charCodeData = [];
const codeToCharMap = {};
const charToCodeMap = {};

for (const item of rawData) {
  const { code, char } = item;
  
  // 添加到数据数组
  charCodeData.push({ char, code });
  
  // 存储编码->汉字映射
  if (!codeToCharMap[code]) {
    codeToCharMap[code] = [];
  }
  codeToCharMap[code].push(char);
  
  // 存储汉字->编码映射
  if (!charToCodeMap[char]) {
    charToCodeMap[char] = [];
  }
  charToCodeMap[char].push(code);
}

// 生成TypeScript文件
const tsContent = `// 整字练习码表数据
// 自动生成自 整字出简不出全练习.txt
// 总汉字数: ${Object.keys(charToCodeMap).length}, 总编码数: ${Object.keys(codeToCharMap).length}

export interface CharCodeItem {
  char: string;      // 汉字
  code: string;      // 编码
}

// 所有汉字编码数据（编码排序）
export const charCodeData: CharCodeItem[] = ${JSON.stringify(
  charCodeData.sort((a, b) => a.code.localeCompare(b.code)),
  null,
  2
)};

// 编码到汉字的映射（一个编码可能对应多个汉字）
export const codeToCharMap: Record<string, string[]> = ${JSON.stringify(codeToCharMap, null, 2)};

// 汉字到编码的映射（一个汉字可能有多个编码）
export const charToCodeMap: Record<string, string[]> = ${JSON.stringify(charToCodeMap, null, 2)};

// 获取随机汉字
export function getRandomChar(): CharCodeItem {
  const index = Math.floor(Math.random() * charCodeData.length);
  return charCodeData[index];
}

// 根据编码获取汉字
export function getCharByCode(code: string): string[] {
  return codeToCharMap[code.toLowerCase()] || [];
}

// 根据汉字获取编码
export function getCodeByChar(char: string): string[] {
  return charToCodeMap[char] || [];
}

// 统计信息
export const charCodeStats = {
  totalChars: ${Object.keys(charToCodeMap).length},
  totalCodes: ${Object.keys(codeToCharMap).length},
  oneCodeChars: ${Object.values(charToCodeMap).filter(codes => codes.length === 1).length},
  multiCodeChars: ${Object.values(charToCodeMap).filter(codes => codes.length > 1).length},
};
`;

fs.writeFileSync(outputFile, tsContent, 'utf-8');

console.log('✅ 码表数据已生成');
console.log(`📊 总汉字数: ${Object.keys(charToCodeMap).length}`);
console.log(`📊 总编码数: ${Object.keys(codeToCharMap).length}`);
console.log(`📄 输出文件: ${outputFile}`);
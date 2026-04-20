// 解析整字练习码表文件
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Buffer } from 'buffer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取文件（使用iconv-lite解码GB2312）
const inputFile = path.join(__dirname, '../整字出简不出全练习.txt');
const outputFile = path.join(__dirname, '../src/data/charCodeData.ts');

console.log('读取文件:', inputFile);

// 读取原始Buffer
const buffer = fs.readFileSync(inputFile);

// 手动解码GB2312（简化版，适用于常见汉字）
// GB2312编码：汉字第一个字节0xB0-0xF7，第二个字节0xA1-0xFE
function decodeGB2312(buffer) {
  let result = '';
  let i = 0;
  
  while (i < buffer.length) {
    const byte = buffer[i];
    
    // 检查是否是GB2312汉字（双字节）
    if (byte >= 0xB0 && byte <= 0xF7 && i + 1 < buffer.length) {
      const byte2 = buffer[i + 1];
      if (byte2 >= 0xA1 && byte2 <= 0xFE) {
        // 尝试使用TextDecoder解码
        const charBuffer = buffer.slice(i, i + 2);
        try {
          // 使用gbk编码解码（gbk兼容gb2312）
          const decoder = new TextDecoder('gbk');
          const char = decoder.decode(charBuffer);
          result += char;
          i += 2;
          continue;
        } catch {
          // 如果解码失败，使用Unicode替代字符
          result += '?';
          i += 2;
          continue;
        }
      }
    }
    
    // ASCII字符或单字节
    if (byte < 0x80) {
      result += String.fromCharCode(byte);
      i++;
    } else {
      // 其他双字节字符（扩展区）
      if (i + 1 < buffer.length) {
        try {
          const decoder = new TextDecoder('gbk');
          const char = decoder.decode(buffer.slice(i, i + 2));
          result += char;
          i += 2;
        } catch {
          result += '?';
          i++;
        }
      } else {
        i++;
      }
    }
  }
  
  return result;
}

// 使用TextDecoder直接解码（Node.js 12+支持gbk）
let content;
try {
  const decoder = new TextDecoder('gbk');
  content = decoder.decode(buffer);
} catch {
  console.log('TextDecoder不支持gbk，使用备用解码...');
  content = decodeGB2312(buffer);
}

const lines = content.split('\n');

// 解析数据
const charCodeData = [];
const codeToCharMap = {};
const charToCodeMap = {};

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  
  // 分割编码和汉字（TAB分隔）
  const parts = trimmed.split('\t');
  if (parts.length >= 2) {
    const code = parts[0].toLowerCase();
    const char = parts[1];
    
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
# 解析整字练习码表文件
$inputFile = "整字出简不出全练习.txt"
$outputFile = "src\data\charCodeData.ts"

Write-Host "读取文件: $inputFile"

# 读取文件内容（使用默认编码GB2312）
$lines = Get-Content $inputFile -Encoding Default

# 解析数据
$charCodeData = @()
$codeToCharMap = @{}
$charToCodeMap = @{}

foreach ($line in $lines) {
    $trimmed = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed)) { continue }
    
    # 分割编码和汉字（TAB分隔）
    $parts = $trimmed -split "`t"
    if ($parts.Length -ge 2) {
        $code = $parts[0].ToLower()
        $char = $parts[1]
        
        # 添加到数据数组
        $charCodeData += [PSCustomObject]@{ char = $char; code = $code }
        
        # 存储编码->汉字映射
        if (-not $codeToCharMap.ContainsKey($code)) {
            $codeToCharMap[$code] = @()
        }
        $codeToCharMap[$code] += $char
        
        # 存储汉字->编码映射
        if (-not $charToCodeMap.ContainsKey($char)) {
            $charToCodeMap[$char] = @()
        }
        $charToCodeMap[$char] += $code
    }
}

# 排序数据
$sortedData = $charCodeData | Sort-Object { $_.code }

# 生成TypeScript文件
$totalChars = $charToCodeMap.Keys.Count
$totalCodes = $codeToCharMap.Keys.Count
$oneCodeChars = ($charToCodeMap.Values | Where-Object { $_.Count -eq 1 }).Count
$multiCodeChars = ($charToCodeMap.Values | Where-Object { $_.Count -gt 1 }).Count

# 转换为JSON
$dataJson = $sortedData | ConvertTo-Json -Depth 2
$codeToCharJson = $codeToCharMap | ConvertTo-Json -Depth 2
$charToCodeJson = $charToCodeMap | ConvertTo-Json -Depth 2

$tsContent = @"
// 整字练习码表数据
// 自动生成自 整字出简不出全练习.txt
// 总汉字数: $totalChars, 总编码数: $totalCodes

export interface CharCodeItem {
  char: string;      // 汉字
  code: string;      // 编码
}

// 所有汉字编码数据（编码排序）
export const charCodeData: CharCodeItem[] = $dataJson;

// 编码到汉字的映射（一个编码可能对应多个汉字）
export const codeToCharMap: Record<string, string[]> = $codeToCharJson;

// 汉字到编码的映射（一个汉字可能有多个编码）
export const charToCodeMap: Record<string, string[]> = $charToCodeJson;

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
  totalChars: $totalChars,
  totalCodes: $totalCodes,
  oneCodeChars: $oneCodeChars,
  multiCodeChars: $multiCodeChars,
};
"@

# 写入文件
$tsContent | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host "✅ 码表数据已生成"
Write-Host "📊 总汉字数: $totalChars"
Write-Host "📊 总编码数: $totalCodes"
Write-Host "📄 输出文件: $outputFile"
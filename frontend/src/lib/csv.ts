/**
 * CSV文件处理工具函数
 * 
 * 提供CSV文件的解析、生成和下载功能
 */

/**
 * CSV解析结果接口
 */
export interface CsvParseResult<T> {
  data: T[];
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
  totalRows: number;
  validRows: number;
}

/**
 * 解析CSV文件内容
 * 
 * Args:
 *   csvContent: CSV文件内容字符串
 *   headers: 期望的列头数组
 *   rowParser: 行数据解析函数
 * 
 * Returns:
 *   Promise<CsvParseResult<T>>: 解析结果
 */
export async function parseCsv<T>(
  csvContent: string,
  headers: string[],
  rowParser: (rowData: Record<string, string>, rowIndex: number) => { data?: T; errors: string[] }
): Promise<CsvParseResult<T>> {
  const lines = csvContent.trim().split('\n');
  const result: CsvParseResult<T> = {
    data: [],
    errors: [],
    totalRows: lines.length - 1, // 减去标题行
    validRows: 0,
  };

  if (lines.length === 0) {
    result.errors.push({
      row: 0,
      message: 'CSV文件为空',
    });
    return result;
  }

  // 解析标题行
  const headerLine = lines[0];
  const csvHeaders = parseCsvRow(headerLine).map(h => h.trim());
  
  // 验证标题行
  const missingHeaders = headers.filter(header => !csvHeaders.includes(header));
  if (missingHeaders.length > 0) {
    result.errors.push({
      row: 0,
      message: `缺少必需的列: ${missingHeaders.join(', ')}`,
    });
  }

  // 解析数据行
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // 跳过空行

    try {
      const rowValues = parseCsvRow(line);
      const rowData: Record<string, string> = {};
      
      // 将行数据映射到对象
      csvHeaders.forEach((header, index) => {
        rowData[header] = rowValues[index] || '';
      });

      // 使用自定义解析器处理行数据
      const parseResult = rowParser(rowData, i);
      
      if (parseResult.errors.length > 0) {
        parseResult.errors.forEach(error => {
          result.errors.push({
            row: i + 1, // 显示行号从1开始
            message: error,
          });
        });
      } else if (parseResult.data) {
        result.data.push(parseResult.data);
        result.validRows++;
      }
    } catch (error) {
      result.errors.push({
        row: i + 1,
        message: `行解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    }
  }

  return result;
}

/**
 * 解析CSV行数据（处理引号和逗号）
 * 
 * Args:
 *   line: CSV行字符串
 * 
 * Returns:
 *   string[]: 解析后的字段数组
 */
function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // 双引号转义
        current += '"';
        i += 2;
      } else {
        // 切换引号状态
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // 字段分隔符
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * 生成CSV内容
 * 
 * Args:
 *   data: 数据数组
 *   headers: 列头数组
 *   rowFormatter: 行数据格式化函数
 * 
 * Returns:
 *   string: CSV内容字符串
 */
export function generateCsv<T>(
  data: T[],
  headers: string[],
  rowFormatter: (item: T) => string[]
): string {
  const csvLines: string[] = [];
  
  // 添加标题行
  csvLines.push(headers.map(header => `"${header}"`).join(','));
  
  // 添加数据行
  data.forEach(item => {
    const rowValues = rowFormatter(item);
    const csvRow = rowValues.map(value => {
      // 处理包含逗号、引号或换行符的值
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
    csvLines.push(csvRow);
  });
  
  return csvLines.join('\n');
}

/**
 * 下载CSV文件
 * 
 * Args:
 *   content: CSV内容
 *   filename: 文件名
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * 读取文件内容
 * 
 * Args:
 *   file: 文件对象
 * 
 * Returns:
 *   Promise<string>: 文件内容
 */
export function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const content = event.target?.result as string;
      resolve(content);
    };
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    
    reader.readAsText(file, 'utf-8');
  });
}
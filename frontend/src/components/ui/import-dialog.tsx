/**
 * 数据导入对话框组件
 * 
 * 提供CSV/Excel数据导入功能，支持模板下载、数据验证和批量创建
 */

'use client';

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { cn, safeTrim } from '@/lib/utils';
import { 
  parseCsv, 
  generateCsv, 
  downloadCsv, 
  readFileContent, 
  CsvParseResult 
} from '@/lib/csv';
import { 
  importTemplates, 
  ImportResourceType, 
  ImportTemplate, 
  teacherFieldDescriptions
} from '@/lib/import-templates';
import * as XLSX from 'xlsx';

/**
 * 导入状态枚举
 */
type ImportStage = 'upload' | 'preview' | 'importing' | 'result';

/**
 * 导入结果接口
 */
interface ImportResult {
  successCount: number;
  errorCount: number;
  errors: Array<{
    row?: number;
    message: string;
  }>;
}

/**
 * 导入对话框属性接口
 */
interface ImportDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: ImportResourceType;
  onImport: (data: T[]) => Promise<void>;
  title?: string;
}

/**
 * 数据导入对话框组件
 * 
 * Args:
 *   open: 是否打开对话框
 *   onOpenChange: 开关状态变化回调
 *   resourceType: 资源类型
 *   onImport: 导入数据回调
 *   title: 对话框标题
 * 
 * Returns:
 *   React.ReactElement: 导入对话框组件
 */export function ImportDialog<T>({
  open,
  onOpenChange,
  resourceType,
  onImport,
  title,
}: ImportDialogProps<T>) {
  const template = importTemplates[resourceType] as unknown as ImportTemplate<T>;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 状态管理
  const [stage, setStage] = useState<ImportStage>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<CsvParseResult<T> | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  /**
   * 重置状态
   */
  const resetState = () => {
    setStage('upload');
    setSelectedFile(null);
    setParseResult(null);
    setImportResult(null);
    setImporting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * 关闭对话框
   */
  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  /**
   * 下载模板文件
   */
  const handleDownloadTemplate = () => {
    const csvContent = generateCsv(
      template.exampleData,
      template.headers,
      (item) => template.headers.map(header => item[header] || '')
    );
    
    downloadCsv(csvContent, `${template.name}导入模板`);
  };

  /**
   * 处理文件选择
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const validTypes = ['.csv', '.xlsx'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(fileExtension)) {
      alert('请选择CSV或Excel格式的文件');
      return;
    }

    setSelectedFile(file);
  };

  /**
   * 解析CSV文件
   */
  const handleParseFile = async () => {
    if (!selectedFile) return;

    try {
      let rows: any[] = [];
      if (selectedFile.name.endsWith('.xlsx')) {
        // 解析 xlsx
        const arrayBuffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      } else {
        // 解析 csv
        const content = await readFileContent(selectedFile);
        const result = await parseCsv(content, template.headers, template.validator);
        rows = result.data;
      }

      // 表头校验
      const fileHeaders = Object.keys(rows[0] || {}).map(h => safeTrim(h));
      const expectedHeaders = template.headers.map(h => safeTrim(h));
      const missingHeaders = expectedHeaders.filter(h => !fileHeaders.includes(h));
      if (missingHeaders.length > 0) {
        alert(`缺少必需的列: ${missingHeaders.join(', ')}`);
        return;
      }

      // 统一校验和格式化（无论 xlsx 还是 csv，rows 都要经过 validator）
      const errors: { row: number; message: string }[] = [];
      const validData: T[] = [];
      rows.forEach((row, idx) => {
        const validationResult = template.validator(row, idx + 2);
        if (typeof validationResult === 'string') {
          errors.push({ row: idx + 2, message: validationResult });
        } else if (validationResult && Array.isArray(validationResult.errors)) {
          if (validationResult.errors.length > 0) {
            validationResult.errors.forEach(msg =>
              errors.push({ row: idx + 2, message: msg })
            );
          } else {
            validData.push(validationResult.data ?? row);
          }
        } else {
          validData.push(row);
        }
      });
      console.log('parseResult.data:', validData);
      setParseResult({
        data: validData,
        errors,
        totalRows: rows.length,
        validRows: validData.length,
      });
      setStage('preview');
    } catch (error) {
      console.error('文件解析失败:', error);
      alert('文件解析失败，请检查文件格式');
    }
  };

  /**
   * 执行数据导入
   */
  const handleImport = async () => {
    if (!parseResult || !parseResult.data.length) return;

    setImporting(true);
    setStage('importing');

    try {
      // parseResult.data 已经是拍平结构
      const flatData = parseResult.data.map(item => {
        const row = item as Record<string, string>;
        return {
          name: row['课程名称*'],
          courseCode: row['课程代码*'],
          subject: row['学科*'],
          weeklyHours: row['周课时*'],
          requiresContinuous: row['需要连排*'] === '是' ? 'true' : 'false',
          continuousHours: row['连排课时'],
          roomTypes: row['教室类型要求'],
          equipment: row['设备要求'],
          description: row['描述'],
        };
      });
      const ws = XLSX.utils.json_to_sheet(flatData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const file = new File([wbout], 'import.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // 调试：解析刚生成的 wbout，看看内容
      const debugWb = XLSX.read(wbout, { type: 'array' });
      const debugSheet = debugWb.Sheets[debugWb.SheetNames[0]];
      const debugData = XLSX.utils.sheet_to_json(debugSheet, { defval: '' });
      console.log('【导出内容】', debugData);

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/import/courses', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();

      if (result.success) {
        setImportResult({
          successCount: result.inserted || 0,
          errorCount: 0,
          errors: [],
        });
      } else {
        setImportResult({
          successCount: 0,
          errorCount: parseResult?.data.length || 0,
          errors: [{ message: result.message || '导入失败' }],
        });
      }
    } catch (error) {
      setImportResult({
        successCount: 0,
        errorCount: parseResult?.data.length || 0,
        errors: [{ message: error instanceof Error ? error.message : '导入失败' }],
      });
    } finally {
      setImporting(false);
      setStage('result');
    }
  };

  /**
   * 重新开始导入
   */
  const handleRestart = () => {
    resetState();
  };

  /**
   * 渲染上传阶段
   */
  const renderUploadStage = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
          <Upload className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          导入{template.name}数据
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          请先下载模板文件，按照格式填写数据后上传CSV文件
        </p>
      </div>

      <div className="space-y-4">
        <Button 
          variant="outline" 
          onClick={() => downloadXlsxTemplate(template)}
          className="w-full"
        >
          <Download className="h-4 w-4 mr-2" />
          下载导入模板（Excel）
        </Button>

        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {selectedFile ? (
            <div className="space-y-2">
              <FileText className="h-8 w-8 mx-auto text-green-600" />
              <p className="text-sm font-medium">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-8 w-8 mx-auto text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                点击选择CSV文件或拖拽文件到此处
              </p>
            </div>
          )}
          
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="mt-3"
          >
            选择文件
          </Button>
        </div>

        {selectedFile && (
          <Button onClick={handleParseFile} className="w-full">
            解析文件
          </Button>
        )}
      </div>

      {/* 模板说明 */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h4 className="font-medium mb-2">导入格式说明：</h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• 必填字段：{template.requiredFields.join('、')}</li>
          <li>• 文件格式：CSV (UTF-8编码)</li>
          <li>• 多个值用英文逗号分隔</li>
          <li>• 请确保数据格式正确，避免特殊字符</li>
        </ul>
      </div>
    </div>
  );

  /**
   * 渲染预览阶段
   */
  const renderPreviewStage = () => {
    if (!parseResult) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">数据预览</h3>
          <Button variant="outline" size="sm" onClick={() => setStage('upload')}>
            <RotateCcw className="h-4 w-4 mr-1" />
            重新选择
          </Button>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {parseResult.totalRows}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">总行数</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {parseResult.validRows}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">有效行数</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {parseResult.errors.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">错误数</div>
          </div>
        </div>

        {/* 错误列表 */}
        {parseResult.errors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <h4 className="font-medium text-red-800 dark:text-red-200 mb-2 flex items-center">
              <XCircle className="h-4 w-4 mr-1" />
              数据错误 ({parseResult.errors.length}个)
            </h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {parseResult.errors.slice(0, 10).map((error, index) => (
                <div key={index} className="text-sm text-red-700 dark:text-red-300">
                  {error.row ? `第${error.row}行: ` : ''}{error.message}
                </div>
              ))}
              {parseResult.errors.length > 10 && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  ... 还有 {parseResult.errors.length - 10} 个错误
                </div>
              )}
            </div>
          </div>
        )}

        {/* 数据预览表格 */}
        {parseResult.data.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2">
              <h4 className="font-medium">有效数据预览 (前5行)</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    {template.headers.map((header, index) => (
                      <th key={index} className="px-3 py-2 text-left font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {parseResult.data.slice(0, 5).map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      {template.formatter(item).map((value, cellIndex) => (
                        <td key={cellIndex} className="px-3 py-2 text-gray-900 dark:text-gray-100">
                          {value || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * 渲染导入中阶段
   */
  const renderImportingStage = () => (
    <div className="text-center py-8">
      <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
        <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        正在导入数据...
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        请稍候，正在处理 {parseResult?.validRows || 0} 条记录
      </p>
    </div>
  );

  /**
   * 渲染结果阶段
   */
  const renderResultStage = () => {
    if (!importResult) return null;

    const isSuccess = importResult.errorCount === 0;

    return (
      <div className="text-center py-6">
        <div className={cn(
          "mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4",
          isSuccess 
            ? "bg-green-100 dark:bg-green-900" 
            : "bg-red-100 dark:bg-red-900"
        )}>
          {isSuccess ? (
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          ) : (
            <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          )}
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {isSuccess ? '导入完成' : '导入失败'}
        </h3>
        
        <div className="space-y-2 mb-6">
          <p className="text-gray-600 dark:text-gray-400">
            成功导入: {importResult.successCount} 条记录
          </p>
          {importResult.errorCount > 0 && (
            <p className="text-red-600 dark:text-red-400">
              失败: {importResult.errorCount} 条记录
            </p>
          )}
        </div>

        {importResult.errors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-6 text-left">
            <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
              错误详情:
            </h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {importResult.errors.map((error, index) => (
                <div key={index} className="text-sm text-red-700 dark:text-red-300">
                  {error.row ? `第${error.row}行: ` : ''}{error.message}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex space-x-3 justify-center">
          <Button variant="outline" onClick={handleRestart}>
            重新导入
          </Button>
          <Button onClick={handleClose}>
            完成
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {title || `批量导入${template.name}`}
          </DialogTitle>
          <DialogClose onClose={handleClose} />
        </DialogHeader>

        <div className="p-6">
          {stage === 'upload' && renderUploadStage()}
          {stage === 'preview' && renderPreviewStage()}
          {stage === 'importing' && renderImportingStage()}
          {stage === 'result' && renderResultStage()}
        </div>

        {stage === 'preview' && parseResult && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setStage('upload')}>
              返回
            </Button>
            <Button 
              onClick={handleImport}
              disabled={parseResult.validRows === 0}
            >
              导入 {parseResult.validRows} 条记录
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function downloadXlsxTemplate(template: ImportTemplate<any>) {
  const ws = XLSX.utils.json_to_sheet(template.exampleData, { header: template.headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, template.name);
  XLSX.writeFile(wb, `${template.name}导入模板.xlsx`);
}
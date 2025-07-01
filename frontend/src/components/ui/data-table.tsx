/**
 * 数据表格组件
 * 
 * 提供通用的数据表格显示功能，支持排序、分页、操作按钮等
 */

'use client';

import React from 'react';
import { Button } from './button';
import { ChevronLeft, ChevronRight, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 表格列定义接口
 */
export interface TableColumn<T> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  width?: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  sortable?: boolean;
}

/**
 * 分页信息接口
 */
export interface PaginationInfo {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
}

/**
 * 数据表格属性接口
 */
interface DataTableProps<T> {
  columns: TableColumn<T>[];
  dataSource?: T[];  // 允许undefined
  loading?: boolean;
  pagination?: PaginationInfo;
  onPageChange?: (page: number, pageSize: number) => void;
  onEdit?: (record: T) => void;
  onDelete?: (record: T) => void;
  rowKey?: keyof T | ((record: T) => string);
  className?: string;
}

/**
 * 数据表格组件
 * 
 * Args:
 *   columns: 表格列配置
 *   dataSource: 数据源
 *   loading: 是否加载中
 *   pagination: 分页配置
 *   onPageChange: 分页变化回调
 *   onEdit: 编辑回调
 *   onDelete: 删除回调
 *   rowKey: 行键值
 *   className: 自定义样式类
 * 
 * Returns:
 *   React.ReactElement: 数据表格组件
 */export function DataTable<T extends Record<string, any>>({
  columns,
  dataSource,
  loading = false,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
  rowKey = '_id',
  className,
}: DataTableProps<T>) {
  // 获取行键值
  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return String(record[rowKey] || index);
  };

  // 渲染表格头部
  const renderTableHeader = () => (
    <thead className="bg-gray-50 dark:bg-gray-700">
      <tr>
        {columns.map((column) => (
          <th
            key={column.key}
            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
            style={{ width: column.width }}
          >
            {column.title}
          </th>
        ))}
        {(onEdit || onDelete) && (
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
            操作
          </th>
        )}
      </tr>
    </thead>
  );

  // 渲染单元格内容
  const renderCellContent = (column: TableColumn<T>, record: T, index: number) => {
    if (column.render) {
      return column.render(
        column.dataIndex ? record[column.dataIndex] : undefined,
        record,
        index
      );
    }
    
    if (column.dataIndex) {
      const value = record[column.dataIndex];
      return value !== null && value !== undefined ? String(value) : '-';
    }
    
    return '-';
  };

  // 渲染操作按钮
  const renderActions = (record: T) => (
    <div className="flex items-center space-x-2">
      {onEdit && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(record)}
          className="h-8 w-8 p-0"
        >
          <Edit className="h-4 w-4" />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(record)}
          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:border-red-300"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  // 渲染表格主体
  const renderTableBody = () => {
    if (loading) {
      return (
        <tbody>
          <tr>
            <td 
              colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} 
              className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
            >
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2">加载中...</span>
              </div>
            </td>
          </tr>
        </tbody>
      );
    }

    if (!dataSource || dataSource.length === 0) {
      return (
        <tbody>
          <tr>
            <td 
              colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} 
              className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
            >
              暂无数据
            </td>
          </tr>
        </tbody>
      );
    }

    return (
      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
        {dataSource?.map((record, index) => (
          <tr
            key={getRowKey(record, index)}
            className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {columns.map((column) => (
              <td
                key={column.key}
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
              >
                {renderCellContent(column, record, index)}
              </td>
            ))}
            {(onEdit || onDelete) && (
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {renderActions(record)}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    );
  };

  // 渲染分页
  const renderPagination = () => {
    if (!pagination) return null;

    const { current, pageSize, total } = pagination;
    const totalPages = Math.ceil(total / pageSize);
    const startItem = (current - 1) * pageSize + 1;
    const endItem = Math.min(current * pageSize, total);

    return (
      <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          显示 {startItem} - {endItem} 条，共 {total} 条
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(current - 1, pageSize)}
            disabled={current <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {current} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(current + 1, pageSize)}
            disabled={current >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          {renderTableHeader()}
          {renderTableBody()}
        </table>
      </div>
      {renderPagination()}
    </div>
  );
}
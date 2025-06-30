/**
 * 工具函数库
 * 
 * 提供通用的工具函数，包括CSS类名合并、格式化等功能
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并和优化CSS类名
 * 
 * Args:
 *   inputs: CSS类名数组或条件对象
 * 
 * Returns:
 *   string: 优化后的CSS类名字符串
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化日期为中文格式
 * 
 * Args:
 *   date: Date对象或日期字符串
 * 
 * Returns:
 *   string: 格式化后的日期字符串
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * 格式化日期时间为中文格式
 * 
 * Args:
 *   date: Date对象或日期字符串
 * 
 * Returns:
 *   string: 格式化后的日期时间字符串
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
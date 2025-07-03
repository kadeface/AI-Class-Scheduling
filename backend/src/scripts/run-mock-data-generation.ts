/**
 * 执行模拟数据生成的脚本
 * 
 * 使用方法:
 * npx ts-node src/scripts/run-mock-data-generation.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env') });

// 导入并执行数据生成函数
import { generateCompleteMockData } from './generate-complete-mock-data';

console.log('🎯 智能排课系统 - 模拟数据生成器');
console.log('=' .repeat(50));

generateCompleteMockData()
  .then(() => {
    console.log('🎉 数据生成成功完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 数据生成失败:', error);
    process.exit(1);
  });
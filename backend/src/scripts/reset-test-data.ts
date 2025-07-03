/**
 * 重置测试数据脚本
 * 
 * 清理并重新创建测试数据
 */

import mongoose from 'mongoose';
import { TeachingPlan } from '../models/TeachingPlan';
import { createTestData } from './create-test-data';

/**
 * 连接数据库
 * 
 * Returns:
 *   Promise<void>: 数据库连接Promise
 */
async function connectDatabase(): Promise<void> {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-class-scheduling';
    await mongoose.connect(mongoUri);
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    throw error;
  }
}

/**
 * 清理错误的教学计划数据
 * 
 * Returns:
 *   Promise<void>: 清理操作Promise
 */
async function cleanupTeachingPlans(): Promise<void> {
  try {
    console.log('🧹 清理现有教学计划数据...');
    const result = await TeachingPlan.deleteMany({});
    console.log(`✅ 已删除 ${result.deletedCount} 个教学计划`);
  } catch (error) {
    console.error('❌ 清理教学计划失败:', error);
    throw error;
  }
}

/**
 * 主执行函数
 * 
 * Returns:
 *   Promise<void>: 主执行Promise
 */
async function main(): Promise<void> {
  try {
    console.log('🚀 开始重置测试数据...');
    
    await connectDatabase();
    await cleanupTeachingPlans();
    
    console.log('📦 数据库连接已关闭');
    await mongoose.disconnect();
    
    // 重新创建测试数据
    console.log('🔄 重新创建测试数据...');
    await createTestData();
    
    console.log('✅ 测试数据重置完成');
    
  } catch (error) {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export { main as resetTestData };
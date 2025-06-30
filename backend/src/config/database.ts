/**
 * MongoDB数据库连接配置
 * 
 * 提供数据库连接、断开连接和连接状态检查功能
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 连接到MongoDB数据库
 * 
 * Returns:
 *   Promise<void>: 连接成功时resolve
 * 
 * Raises:
 *   Error: 当数据库连接失败时抛出错误
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-class-scheduling';
    
    await mongoose.connect(mongoUri);
    
    console.log('✅ MongoDB数据库连接成功');
    console.log(`📊 数据库名称: ${mongoose.connection.db?.databaseName}`);
    console.log(`🔗 连接地址: ${mongoUri}`);
    
  } catch (error) {
    console.error('❌ MongoDB数据库连接失败:', error);
    process.exit(1);
  }
};

/**
 * 断开数据库连接
 * 
 * Returns:
 *   Promise<void>: 断开连接成功时resolve
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('🔌 MongoDB数据库连接已断开');
  } catch (error) {
    console.error('❌ 数据库断开连接失败:', error);
  }
};

/**
 * 监听数据库连接事件
 */
mongoose.connection.on('error', (error) => {
  console.error('❌ MongoDB连接错误:', error);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 MongoDB连接已断开');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB重新连接成功');
});
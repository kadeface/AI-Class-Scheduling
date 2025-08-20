/**
 * 创建默认课程时间配置
 * 
 * 为指定学年学期创建标准的课程时间配置
 */

import mongoose from 'mongoose';
import { PeriodTimeConfig } from '../models/PeriodTimeConfig';
import { connectDatabase } from '../config/database';

/**
 * 默认时间配置数据
 */
const DEFAULT_TIME_CONFIGS = [
  {
    period: 1,
    startTime: '08:00',
    endTime: '08:45',
    breakTime: 10,
    description: '第一节'
  },
  {
    period: 2,
    startTime: '08:55',
    endTime: '09:40',
    breakTime: 20,
    description: '第二节'
  },
  {
    period: 3,
    startTime: '10:00',
    endTime: '10:45',
    breakTime: 10,
    description: '第三节'
  },
  {
    period: 4,
    startTime: '10:55',
    endTime: '11:40',
    breakTime: 140,
    description: '第四节'
  },
  {
    period: 5,
    startTime: '14:00',
    endTime: '14:45',
    breakTime: 10,
    description: '第五节'
  },
  {
    period: 6,
    startTime: '14:55',
    endTime: '15:40',
    breakTime: 20,
    description: '第六节'
  },
  {
    period: 7,
    startTime: '16:00',
    endTime: '16:45',
    breakTime: 10,
    description: '第七节'
  },
  {
    period: 8,
    startTime: '16:55',
    endTime: '17:40',
    breakTime: 0,
    description: '第八节'
  }
];

/**
 * 创建默认时间配置
 */
async function createDefaultTimeConfigs() {
  try {
    console.log('开始创建默认课程时间配置...');

    // 连接数据库
    await connectDatabase();

    const academicYear = '2025-2026';
    const semester = '1';

    // 检查是否已存在配置
    const existingConfigs = await PeriodTimeConfig.find({
      academicYear,
      semester
    });

    if (existingConfigs.length > 0) {
      console.log(`⚠️  ${academicYear} 学年 ${semester} 学期的时间配置已存在，跳过创建`);
      return;
    }

    // 创建时间配置
    const configs = DEFAULT_TIME_CONFIGS.map(config => ({
      ...config,
      academicYear,
      semester,
      isActive: true
    }));

    const createdConfigs = await PeriodTimeConfig.insertMany(configs);

    console.log(`✅ 成功创建 ${createdConfigs.length} 个时间配置`);
    console.log(`   学年: ${academicYear}`);
    console.log(`   学期: ${semester}`);
    
    // 显示创建的时间配置
    createdConfigs.forEach(config => {
      console.log(`   ${config.period}. ${config.startTime}-${config.endTime} (休息${config.breakTime}分钟)`);
    });

  } catch (error) {
    console.error('❌ 创建默认时间配置失败:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  createDefaultTimeConfigs();
}

export { createDefaultTimeConfigs };

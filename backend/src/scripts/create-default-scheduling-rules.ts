/**
 * 创建默认排课规则脚本
 * 
 * 用于检查和创建系统默认的排课规则数据
 */

import mongoose from 'mongoose';
import { SchedulingRules } from '../models/SchedulingRules';
import { User } from '../models/User';

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
 * 创建默认排课规则
 * 
 * Returns:
 *   Promise<void>: 创建操作Promise
 */
async function createDefaultSchedulingRules(): Promise<void> {
  try {
    // 检查是否已存在默认规则
    const existingDefault = await SchedulingRules.findOne({ isDefault: true });
    if (existingDefault) {
      console.log('✅ 已存在默认排课规则:', existingDefault.name);
      return;
    }

    // 查找管理员用户作为创建者
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      // 创建一个系统管理员用户
      adminUser = new User({
        username: 'system_admin',
        password: 'system123', // 这只是临时密码，实际使用时应该修改
        role: 'admin',
        profile: {
          name: '系统管理员',
          employeeId: 'SYS001'
        }
      });
      await adminUser.save();
      console.log('✅ 创建系统管理员用户');
    }

    // 创建默认排课规则
    const defaultRules = new SchedulingRules({
      name: '标准排课规则(K-12)',
      description: '适用于K-12阶段的标准排课规则配置',
      schoolType: 'mixed',
      academicYear: '2024-2025',
      semester: 1,
      
      timeRules: {
        dailyPeriods: 8,
        workingDays: [1, 2, 3, 4, 5], // 周一到周五
        periodDuration: 45, // 45分钟/节
        breakDuration: 10,  // 10分钟课间休息
        lunchBreakStart: 4, // 第4节后午休
        lunchBreakDuration: 90, // 90分钟午休
        morningPeriods: [1, 2, 3, 4],
        afternoonPeriods: [5, 6, 7, 8],
        forbiddenSlots: []
      },
      
      teacherConstraints: {
        maxDailyHours: 6,
        maxContinuousHours: 3,
        minRestBetweenCourses: 10,
        avoidFridayAfternoon: true,
        respectTeacherPreferences: true,
        allowCrossGradeTeaching: false
      },
      
      roomConstraints: {
        respectCapacityLimits: true,
        allowRoomSharing: true,
        preferSpecialRoomsForSpecialCourses: true,
        allowRoomChange: false
      },
      
      courseArrangementRules: {
        allowContinuousCourses: true,
        maxContinuousPeriodsPerCourse: 2,
        preferMorningForMainCourses: true,
        avoidSinglePeriodGaps: true,
        respectCoursePreferences: true,
        balanceWorkload: true
      },
      
      conflictResolutionRules: {
        teacherConflictResolution: 'strict',
        roomConflictResolution: 'strict',
        classConflictResolution: 'strict',
        allowOverride: false,
        priorityOrder: ['teacher', 'room', 'class']
      },
      
      isDefault: true,
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id
    });

    await defaultRules.save();
    console.log('✅ 成功创建默认排课规则:', defaultRules.name);
    
  } catch (error) {
    console.error('❌ 创建默认排课规则失败:', error);
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
    console.log('🚀 开始创建默认排课规则...');
    
    await connectDatabase();
    await createDefaultSchedulingRules();
    
    console.log('✅ 默认排课规则创建完成');
    
  } catch (error) {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📦 数据库连接已关闭');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export { main as createDefaultSchedulingRules };
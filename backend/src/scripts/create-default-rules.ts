/**
 * 创建默认排课规则脚本
 * 
 * 用于快速创建系统默认的排课规则
 */

import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { SchedulingRules } from '../models/SchedulingRules';

/**
 * 创建高中默认排课规则
 */
async function createHighSchoolDefaultRules(): Promise<void> {
  console.log('🏫 创建高中默认排课规则...');
  
  const defaultRules = new SchedulingRules({
    name: '高中标准排课规则',
    description: '适用于普通高中的标准排课规则，包含常见的时间安排和约束条件',
    schoolType: 'high',
    academicYear: '2024-2025',
    semester: 1,
    timeRules: {
      dailyPeriods: 8,
      workingDays: [1, 2, 3, 4, 5], // 周一到周五
      periodDuration: 45, // 每节课45分钟
      breakDuration: 10,  // 课间休息10分钟
      lunchBreakStart: 4, // 第4节课后开始午休
      lunchBreakDuration: 90, // 午休90分钟
      morningPeriods: [1, 2, 3, 4],
      afternoonPeriods: [5, 6, 7, 8],
      forbiddenSlots: [] // 禁用时段（可根据需要添加）
    },
    teacherConstraints: {
      maxDailyHours: 6,     // 教师每天最多6节课
      maxContinuousHours: 3, // 最多连续3节课
      minRestBetweenCourses: 1, // 课程间至少休息1个时段
      avoidFridayAfternoon: true, // 避免周五下午排课
      respectTeacherPreferences: true, // 尊重教师偏好
      allowCrossGradeTeaching: true    // 允许跨年级教学
    },
    roomConstraints: {
      respectCapacityLimits: true,     // 尊重教室容量限制
      allowRoomSharing: false,         // 不允许教室共用
      preferFixedClassrooms: true,     // 优先使用固定教室
      specialRoomPriority: 'preferred' // 特殊教室优先级
    },
    courseArrangementRules: {
      allowContinuousCourses: true,    // 允许连排课程
      maxContinuousHours: 2,           // 最多连排2节
      distributionPolicy: 'balanced',   // 均衡分布策略
      avoidFirstLastPeriod: ['体育'], // 避免在第一节和最后一节排体育
      coreSubjectPriority: true,       // 核心学科优先
      labCoursePreference: 'afternoon' // 实验课优先下午
    },
    conflictResolutionRules: {
      teacherConflictResolution: 'strict', // 教师冲突严格处理
      roomConflictResolution: 'strict',    // 教室冲突严格处理
      classConflictResolution: 'strict',   // 班级冲突严格处理
      allowOverride: false,                // 不允许覆盖冲突
      priorityOrder: ['teacher', 'room', 'time'] // 优先级顺序
    },
    isDefault: true,
    isActive: true,
    createdBy: new mongoose.Types.ObjectId() // 系统创建
  });

  try {
    // 检查是否已存在默认规则
    const existingDefault = await SchedulingRules.findOne({
      academicYear: '2024-2025',
      semester: 1,
      schoolType: 'high',
      isDefault: true,
      isActive: true
    });

    if (existingDefault) {
      console.log('⚠️  默认排课规则已存在:', existingDefault.name);
      return;
    }

    const savedRules = await defaultRules.save();
    console.log('✅ 高中默认排课规则创建成功');
    console.log('   规则ID:', savedRules._id);
    console.log('   规则名称:', savedRules.name);
    
  } catch (error) {
    console.error('❌ 创建默认排课规则失败:', error);
    throw error;
  }
}

/**
 * 创建初中默认排课规则
 */
async function createMiddleSchoolDefaultRules(): Promise<void> {
  console.log('🏫 创建初中默认排课规则...');
  
  const defaultRules = new SchedulingRules({
    name: '初中标准排课规则',
    description: '适用于初中的标准排课规则，考虑初中生的学习特点',
    schoolType: 'middle',
    academicYear: '2024-2025',
    semester: 1,
    timeRules: {
      dailyPeriods: 7,
      workingDays: [1, 2, 3, 4, 5],
      periodDuration: 45,
      breakDuration: 10,
      lunchBreakStart: 4,
      lunchBreakDuration: 120, // 初中午休时间更长
      morningPeriods: [1, 2, 3, 4],
      afternoonPeriods: [5, 6, 7],
      forbiddenSlots: []
    },
    teacherConstraints: {
      maxDailyHours: 5,     // 初中教师每天最多5节课
      maxContinuousHours: 2, // 最多连续2节课
      minRestBetweenCourses: 1,
      avoidFridayAfternoon: true,
      respectTeacherPreferences: true,
      allowCrossGradeTeaching: false // 初中不建议跨年级
    },
    roomConstraints: {
      respectCapacityLimits: true,
      allowRoomSharing: false,
      preferFixedClassrooms: true,
      specialRoomPriority: 'required' // 初中特殊教室要求更严格
    },
    courseArrangementRules: {
      allowContinuousCourses: true,
      maxContinuousHours: 2,
      distributionPolicy: 'balanced',
      avoidFirstLastPeriod: ['体育', '音乐', '美术'],
      coreSubjectPriority: true,
      labCoursePreference: 'afternoon'
    },
    conflictResolutionRules: {
      teacherConflictResolution: 'strict',
      roomConflictResolution: 'strict',
      classConflictResolution: 'strict',
      allowOverride: false,
      priorityOrder: ['teacher', 'room', 'time']
    },
    isDefault: false, // 不设为默认，让用户自己选择
    isActive: true,
    createdBy: new mongoose.Types.ObjectId()
  });

  try {
    const savedRules = await defaultRules.save();
    console.log('✅ 初中默认排课规则创建成功');
    console.log('   规则ID:', savedRules._id);
    console.log('   规则名称:', savedRules.name);
    
  } catch (error) {
    console.error('❌ 创建初中排课规则失败:', error);
    throw error;
  }
}

/**
 * 主执行函数
 */
async function main(): Promise<void> {
  try {
    console.log('🚀 开始创建默认排课规则...\n');
    
    // 连接数据库
    await connectDatabase();
    console.log('✅ 数据库连接成功\n');
    
    // 创建默认规则
    await createHighSchoolDefaultRules();
    await createMiddleSchoolDefaultRules();
    
    console.log('\n🎉 默认排课规则创建完成！');
    console.log('💡 现在可以在前端页面中查看和使用这些规则了。');
    
  } catch (error) {
    console.error('❌ 创建默认规则失败:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('📡 数据库连接已关闭');
    process.exit(0);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export { main as createDefaultRules };
/**
 * 测试数据格式问题
 * 
 * 这个测试文件用于验证固定时间课程数据在保存和读取过程中的格式问题
 */

const mongoose = require('mongoose');
const { SchedulingRules } = require('./dist/models');

// 测试数据
const testFixedTimeCourses = {
  enabled: true,
  courses: [
    {
      type: 'class-meeting',
      dayOfWeek: 1,
      period: 1,
      weekType: 'all',
      startWeek: 1,
      endWeek: 20,
      notes: '班主任主持班会'
    }
  ],
  priority: true,
  allowOverride: false,
  conflictStrategy: 'strict'
};

const testSchedulingRules = {
  name: '测试排课规则',
  description: '测试固定时间课程数据格式',
  schoolType: 'primary',
  academicYear: '2025-2026',
  semester: 1,
  timeRules: {
    dailyPeriods: 7,
    workingDays: [1, 2, 3, 4, 5],
    periodDuration: 40,
    breakDuration: 10,
    lunchBreakStart: 4,
    lunchBreakDuration: 90,
    morningPeriods: [1, 2, 3],
    afternoonPeriods: [5, 6, 7, 4],
    forbiddenSlots: []
  },
  teacherConstraints: {
    maxDailyHours: 6,
    maxContinuousHours: 2,
    minRestBetweenCourses: 1,
    avoidFridayAfternoon: false,
    respectTeacherPreferences: true,
    allowCrossGradeTeaching: true,
    rotationStrategy: {
      enableRotation: true,
      rotationMode: 'round_robin',
      roundCompletion: true,
      minIntervalBetweenClasses: 1,
      maxConsecutiveClasses: 2,
      rotationOrder: 'alphabetical',
      customRotationOrder: []
    }
  },
  roomConstraints: {
    respectCapacityLimits: true,
    allowRoomSharing: false,
    preferFixedClassrooms: true,
    specialRoomPriority: 'preferred'
  },
  courseArrangementRules: {
    allowContinuousCourses: false,
    maxContinuousHours: 2,
    distributionPolicy: 'balanced',
    avoidFirstLastPeriod: [],
    coreSubjectPriority: true,
    labCoursePreference: 'afternoon',
    subjectSpecificRules: [],
    enableSubjectConstraints: true,
    defaultSubjectInterval: 1,
    coreSubjectStrategy: {
      enableCoreSubjectStrategy: true,
      coreSubjects: ['语文', '数学', '英语'],
      distributionMode: 'daily',
      maxDailyOccurrences: 2,
      minDaysPerWeek: 5,
      avoidConsecutiveDays: true,
      preferredTimeSlots: [2, 3, 5, 6, 4, 1, 7],
      avoidTimeSlots: [8],
      maxConcentration: 1,
      balanceWeight: 100,
      enforceEvenDistribution: true
    },
    fixedTimeCourses: testFixedTimeCourses
  },
  conflictResolutionRules: {
    teacherConflictResolution: 'strict',
    roomConflictResolution: 'warn',
    classConflictResolution: 'warn',
    allowOverride: false,
    priorityOrder: ['teacher', 'room', 'time']
  },
  isDefault: false,
  isActive: true,
  createdBy: '68692a48c6a3f27c50bf8cba'
};

async function testDataFormat() {
  console.log('🧪 开始测试数据格式问题...\n');
  
  try {
    // 连接数据库
    await mongoose.connect('mongodb://localhost:27017/ai-class-scheduling');
    console.log('✅ 数据库连接成功\n');
    
    // 1. 测试数据创建前的格式
    console.log('📋 测试数据创建前的格式:');
    console.log('fixedTimeCourses 类型:', typeof testSchedulingRules.courseArrangementRules.fixedTimeCourses);
    console.log('fixedTimeCourses 值:', JSON.stringify(testSchedulingRules.courseArrangementRules.fixedTimeCourses, null, 2));
    console.log('courses 类型:', typeof testSchedulingRules.courseArrangementRules.fixedTimeCourses.courses);
    console.log('courses 值:', JSON.stringify(testSchedulingRules.courseArrangementRules.fixedTimeCourses.courses, null, 2));
    console.log('');
    
    // 2. 创建排课规则
    console.log('🚀 开始创建排课规则...');
    const schedulingRules = new SchedulingRules(testSchedulingRules);
    const savedRules = await schedulingRules.save();
    console.log('✅ 排课规则创建成功，ID:', savedRules._id);
    console.log('');
    
    // 3. 检查保存后的数据格式
    console.log('📊 保存后的数据格式:');
    console.log('fixedTimeCourses 类型:', typeof savedRules.courseArrangementRules.fixedTimeCourses);
    console.log('fixedTimeCourses 值:', JSON.stringify(savedRules.courseArrangementRules.fixedTimeCourses, null, 2));
    console.log('courses 类型:', typeof savedRules.courseArrangementRules.fixedTimeCourses.courses);
    console.log('courses 值:', JSON.stringify(savedRules.courseArrangementRules.fixedTimeCourses.courses, null, 2));
    console.log('');
    
    // 4. 从数据库重新查询
    console.log('🔍 从数据库重新查询...');
    const retrievedRules = await SchedulingRules.findById(savedRules._id);
    console.log('✅ 查询成功');
    console.log('');
    
    // 5. 检查查询后的数据格式
    console.log('📊 查询后的数据格式:');
    console.log('fixedTimeCourses 类型:', typeof retrievedRules.courseArrangementRules.fixedTimeCourses);
    console.log('fixedTimeCourses 值:', JSON.stringify(retrievedRules.courseArrangementRules.fixedTimeCourses, null, 2));
    console.log('courses 类型:', typeof retrievedRules.courseArrangementRules.fixedTimeCourses.courses);
    console.log('courses 值:', JSON.stringify(retrievedRules.courseArrangementRules.fixedTimeCourses.courses, null, 2));
    console.log('');
    
    // 6. 测试数据访问
    console.log('🔍 测试数据访问:');
    if (retrievedRules.courseArrangementRules.fixedTimeCourses.enabled) {
      console.log('✅ 固定时间课程已启用');
      const courses = retrievedRules.courseArrangementRules.fixedTimeCourses.courses;
      if (Array.isArray(courses)) {
        console.log('✅ courses 是数组，长度:', courses.length);
        courses.forEach((course, index) => {
          console.log(`   课程 ${index + 1}:`, course.type, `周${course.dayOfWeek}第${course.period}节`);
        });
      } else {
        console.log('❌ courses 不是数组，类型:', typeof courses);
      }
    } else {
      console.log('❌ 固定时间课程未启用');
    }
    console.log('');
    
    // 7. 清理测试数据
    console.log('🧹 清理测试数据...');
    await SchedulingRules.findByIdAndDelete(savedRules._id);
    console.log('✅ 测试数据已清理');
    
    console.log('\n✅ 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }
}

// 运行测试
testDataFormat();

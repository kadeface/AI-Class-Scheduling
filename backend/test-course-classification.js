/**
 * 课程分类和分阶段排课测试脚本
 * 
 * 用于验证课程分类逻辑和分阶段排课的完整流程
 */

const mongoose = require('mongoose');
const { SchedulingEngine } = require('./dist/services/scheduling/scheduling-engine');
const { AlgorithmConfig } = require('./dist/services/scheduling/types');

// 导入模型定义
require('./dist/models/Course');
require('./dist/models/Class');
require('./dist/models/Teacher');
require('./dist/models/Room');

// 配置
const MONGODB_URI = 'mongodb://localhost:27017/ai-class-scheduling';

/**
 * 连接数据库
 */
async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
}

/**
 * 获取测试数据
 */
async function getTestData() {
  try {
    // 获取课程数据
    const Course = mongoose.model('Course');
    const courses = await Course.find({ isActive: true }).limit(20);
    
    // 获取班级数据
    const Class = mongoose.model('Class');
    const classes = await Class.find({ isActive: true }).limit(5);
    
    // 获取教师数据
    const Teacher = mongoose.model('Teacher');
    const teachers = await Teacher.find({ isActive: true }).limit(10);
    
    console.log(`📚 获取到 ${courses.length} 个课程`);
    console.log(`👥 获取到 ${classes.length} 个班级`);
    console.log(`👨‍🏫 获取到 ${teachers.length} 个教师`);
    
    return { courses, classes, teachers };
  } catch (error) {
    console.error('❌ 获取测试数据失败:', error);
    return { courses: [], classes: [], teachers: [] };
  }
}

/**
 * 创建排课变量
 */
function createScheduleVariables(courses, classes, teachers) {
  const variables = [];
  let variableId = 1;
  
  for (const course of courses) {
    for (const classInfo of classes) {
      // 为每个课程-班级组合创建一个变量
      const variable = {
        id: `var${variableId++}`,
        classId: classInfo._id,
        courseId: course._id,
        teacherId: teachers[Math.floor(Math.random() * teachers.length)]._id,
        requiredHours: course.weeklyHours || 1,
        priority: course.subject === '语文' || course.subject === '数学' || course.subject === '英语' ? 9 : 6,
        domain: [],
        timePreferences: [],
        timeAvoidance: [],
        subject: course.subject,
        courseName: course.name,
        roomRequirements: course.roomRequirements
      };
      
      variables.push(variable);
    }
  }
  
  console.log(`🔧 创建了 ${variables.length} 个排课变量`);
  return variables;
}

/**
 * 创建模拟排课规则
 */
function createMockRules() {
  return {
    timeRules: {
      workingDays: [1, 2, 3, 4, 5], // 周一到周五
      dailyPeriods: 7, // 每天7节课
      forbiddenSlots: []
    },
    roomConstraints: {
      allowRoomSharing: false,
      respectCapacityLimits: true,
      preferFixedClassrooms: true,
      specialRoomPriority: 'strict'
    },
    teacherConstraints: {
      maxDailyHours: 6,
      maxContinuousHours: 3,
      minRestBetweenCourses: 10,
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
    courseArrangementRules: {
      enableSubjectConstraints: true,
      coreSubjectStrategy: {
        enableCoreSubjectStrategy: true,
        coreSubjects: ['语文', '数学', '英语'],
        maxDailyOccurrences: 2,
        minDaysPerWeek: 3,
        preferredTimeSlots: [1, 2, 3, 4],
        avoidTimeSlots: [7],
        maxConcentration: 3
      },
      subjectSpecificRules: []
    }
  };
}

/**
 * 创建模拟算法配置
 */
function createMockConfig() {
  return {
    maxIterations: 1000,
    timeLimit: 60,
    backtrackLimit: 100,
    enableLocalOptimization: true,
    localOptimizationIterations: 50,
    verbose: false  // 关闭详细日志
  };
}

/**
 * 测试课程分类
 */
async function testCourseClassification() {
  try {
    console.log('\n🔍 测试课程分类逻辑...');
    
    // 获取测试数据
    const { courses, classes, teachers } = await getTestData();
    if (courses.length === 0 || classes.length === 0 || teachers.length === 0) {
      console.log('❌ 测试数据不足，跳过测试');
      return false;
    }
    
    // 创建排课变量
    const variables = createScheduleVariables(courses, classes, teachers);
    
    // 创建排课引擎
    const rules = createMockRules();
    const config = createMockConfig();
    const engine = new SchedulingEngine(rules, config);
    
    // 测试课程分类
    const classification = engine.classifyCourses(variables);
    
    console.log('\n📊 课程分类结果:');
    console.log(`   总变量数: ${classification.classificationStats.totalVariables}`);
    console.log(`   核心课程: ${classification.classificationStats.coreCourseCount} 个`);
    console.log(`   一般课程: ${classification.classificationStats.coreCourseCount} 个`);
    console.log(`   识别的核心科目: ${classification.classificationStats.coreSubjects.join(', ')}`);
    
    // 显示分类详情
    console.log('\n📚 核心课程详情:');
    for (const course of classification.coreCourses.slice(0, 5)) {
      const courseInfo = courses.find(c => c._id.equals(course.courseId));
      console.log(`   ${courseInfo?.name || '未知'} (${courseInfo?.subject || '未知'}) - 优先级: ${course.priority}`);
    }
    
    console.log('\n🎨 一般课程详情:');
    for (const course of classification.generalCourses.slice(0, 5)) {
      const courseInfo = courses.find(c => c._id.equals(course.courseId));
      console.log(`   ${courseInfo?.name || '未知'} (${courseInfo?.subject || '未知'}) - 优先级: ${course.priority}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ 课程分类测试失败:', error);
    return false;
  }
}

/**
 * 测试分阶段排课
 */
async function testStagedScheduling() {
  try {
    console.log('\n🚀 测试分阶段排课...');
    
    // 获取测试数据
    const { courses, classes, teachers } = await getTestData();
    if (courses.length === 0 || classes.length === 0 || teachers.length === 0) {
      console.log('❌ 测试数据不足，跳过测试');
      return false;
    }
    
    // 创建排课变量
    const variables = createScheduleVariables(courses, classes, teachers);
    
    // 创建排课引擎
    const rules = createMockRules();
    const config = createMockConfig();
    const engine = new SchedulingEngine(rules, config);
    
    // 执行分阶段排课
    console.log('   🔄 开始执行分阶段排课...');
    const result = await engine.solve(variables);
    
    console.log('\n📊 分阶段排课结果:');
    console.log(`   成功: ${result.success}`);
    console.log(`   总变量: ${result.statistics.totalVariables}`);
    console.log(`   已分配: ${result.statistics.assignedVariables}`);
    console.log(`   未分配: ${result.statistics.unassignedVariables}`);
    console.log(`   硬约束违反: ${result.statistics.hardViolations}`);
    console.log(`   软约束违反: ${result.statistics.softViolations}`);
    console.log(`   执行时间: ${result.statistics.executionTime}ms`);
    
    // 分析分配结果
    if (result.success) {
      const assignments = result.scheduleState.assignments;
      const courseStats = new Map();
      
      for (const [variableId, assignment] of assignments) {
        const variable = variables.find(v => v.id === variableId);
        if (variable) {
          const courseInfo = courses.find(c => c._id.equals(variable.courseId));
          const subject = courseInfo?.subject || '未知';
          courseStats.set(subject, (courseStats.get(subject) || 0) + 1);
        }
      }
      
      console.log('\n📋 已分配课程统计:');
      for (const [subject, count] of courseStats) {
        console.log(`   ${subject}: ${count} 个`);
      }
    }
    
    return result.success;
  } catch (error) {
    console.error('❌ 分阶段排课测试失败:', error);
    return false;
  }
}

/**
 * 主测试函数
 */
async function main() {
  try {
    console.log('🚀 开始课程分类和分阶段排课测试...');
    
    // 1. 连接数据库
    await connectDatabase();
    
    // 2. 测试课程分类
    const classificationTest = await testCourseClassification();
    
    // 3. 测试分阶段排课
    const schedulingTest = await testStagedScheduling();
    
    // 4. 输出总体测试结果
    console.log('\n📊 总体测试结果:');
    console.log(`   课程分类测试: ${classificationTest ? '✅ 通过' : '❌ 失败'}`);
    console.log(`   分阶段排课测试: ${schedulingTest ? '✅ 通过' : '❌ 失败'}`);
    
    const allPassed = classificationTest && schedulingTest;
    console.log(`\n🎯 总体结果: ${allPassed ? '✅ 所有测试通过' : '❌ 部分测试失败'}`);
    
  } catch (error) {
    console.error('❌ 测试执行失败:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已断开');
    process.exit(0);
  }
}

// 运行测试
if (require.main === module) {
  main();
}

module.exports = {
  testCourseClassification,
  testStagedScheduling
};

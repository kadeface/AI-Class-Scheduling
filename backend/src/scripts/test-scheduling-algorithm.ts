/**
 * 排课算法测试脚本
 * 
 * 用于测试和验证排课算法的正确性和性能
 */

import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { 
  SchedulingService, 
  SchedulingRequest,
  ScheduleVariable,
  AlgorithmConfig 
} from '../services/scheduling';
import { SchedulingRules } from '../models/SchedulingRules';
import { TeachingPlan } from '../models/TeachingPlan';
import { Class } from '../models/Class';
import { Course } from '../models/Course';
import { Teacher } from '../models/Teacher';
import { Room } from '../models/Room';

/**
 * 测试数据生成器
 */
class TestDataGenerator {

  /**
   * 生成测试用的排课规则
   * 
   * Returns:
   *   Promise<any>: 排课规则ID
   */
  static async generateTestRules(): Promise<mongoose.Types.ObjectId> {
    const rules = new SchedulingRules({
      name: '测试排课规则',
      description: '用于算法测试的排课规则',
      schoolType: 'high',
      academicYear: '2024-2025',
      semester: 1,
      timeRules: {
        dailyPeriods: 8,
        workingDays: [1, 2, 3, 4, 5],
        periodDuration: 45,
        breakDuration: 10,
        lunchBreakStart: 4,
        lunchBreakDuration: 90,
        morningPeriods: [1, 2, 3, 4],
        afternoonPeriods: [5, 6, 7, 8]
      },
      teacherConstraints: {
        maxDailyHours: 6,
        maxContinuousHours: 3,
        minRestBetweenCourses: 0,
        avoidFridayAfternoon: true,
        respectTeacherPreferences: true,
        allowCrossGradeTeaching: true
      },
      roomConstraints: {
        respectCapacityLimits: true,
        allowRoomSharing: false,
        preferFixedClassrooms: true,
        specialRoomPriority: 'preferred'
      },
      courseArrangementRules: {
        allowContinuousCourses: true,
        maxContinuousHours: 2,
        distributionPolicy: 'balanced',
        avoidFirstLastPeriod: ['体育'],
        coreSubjectPriority: true,
        labCoursePreference: 'afternoon'
      },
      conflictResolutionRules: {
        teacherConflictResolution: 'strict',
        roomConflictResolution: 'strict',
        classConflictResolution: 'strict',
        allowOverride: false,
        priorityOrder: ['teacher', 'class', 'room']
      },
      isDefault: true,
      isActive: true,
      createdBy: new mongoose.Types.ObjectId()
    });

    await rules.save();
    return rules._id;
  }

  /**
   * 生成测试班级
   * 
   * Args:
   *   count: 班级数量
   * 
   * Returns:
   *   Promise<mongoose.Types.ObjectId[]>: 班级ID列表
   */
  static async generateTestClasses(count: number = 3): Promise<mongoose.Types.ObjectId[]> {
    const classes = [];
    
    for (let i = 1; i <= count; i++) {
      const classDoc = new Class({
        name: `高一(${i})班`,
        grade: '高一',
        studentCount: 45,
        classTeacher: new mongoose.Types.ObjectId(),
        isActive: true
      });
      
      await classDoc.save();
      classes.push(classDoc._id);
    }
    
    return classes;
  }

  /**
   * 生成测试课程
   * 
   * Returns:
   *   Promise<mongoose.Types.ObjectId[]>: 课程ID列表
   */
  static async generateTestCourses(): Promise<mongoose.Types.ObjectId[]> {
    const courseData = [
      { name: '语文', code: 'CHI001', subject: '语文', hoursPerWeek: 5 },
      { name: '数学', code: 'MAT001', subject: '数学', hoursPerWeek: 5 },
      { name: '英语', code: 'ENG001', subject: '英语', hoursPerWeek: 4 },
      { name: '物理', code: 'PHY001', subject: '物理', hoursPerWeek: 4 },
      { name: '化学', code: 'CHE001', subject: '化学', hoursPerWeek: 3 },
      { name: '生物', code: 'BIO001', subject: '生物', hoursPerWeek: 3 },
      { name: '历史', code: 'HIS001', subject: '历史', hoursPerWeek: 2 },
      { name: '地理', code: 'GEO001', subject: '地理', hoursPerWeek: 2 },
      { name: '体育', code: 'PE001', subject: '体育', hoursPerWeek: 2 }
    ];
    
    const courses = [];
    
    for (const data of courseData) {
      const course = new Course({
        ...data,
        credits: data.hoursPerWeek,
        requiresSpecialRoom: ['物理', '化学', '生物', '体育'].includes(data.subject),
        roomType: data.subject === '体育' ? '体育场馆' : 
                 ['物理', '化学', '生物'].includes(data.subject) ? '实验室' : '普通教室',
        canBeContinuous: !['体育'].includes(data.subject),
        isActive: true
      });
      
      await course.save();
      courses.push(course._id);
    }
    
    return courses;
  }

  /**
   * 生成测试教师
   * 
   * Args:
   *   courseIds: 课程ID列表
   * 
   * Returns:
   *   Promise<mongoose.Types.ObjectId[]>: 教师ID列表
   */
  static async generateTestTeachers(courseIds: mongoose.Types.ObjectId[]): Promise<mongoose.Types.ObjectId[]> {
    const teacherData = [
      { name: '张老师', subject: '语文' },
      { name: '李老师', subject: '数学' },
      { name: '王老师', subject: '英语' },
      { name: '刘老师', subject: '物理' },
      { name: '陈老师', subject: '化学' },
      { name: '杨老师', subject: '生物' },
      { name: '赵老师', subject: '历史' },
      { name: '孙老师', subject: '地理' },
      { name: '周老师', subject: '体育' }
    ];
    
    const teachers = [];
    
    for (let i = 0; i < teacherData.length; i++) {
      const data = teacherData[i];
      const teacher = new Teacher({
        name: data.name,
        employeeId: `T00${i + 1}`,
        department: '高中部',
        subjects: [data.subject],
        title: '教师',
        maxHoursPerWeek: 20,
        email: `teacher${i + 1}@school.edu`,
        isActive: true
      });
      
      await teacher.save();
      teachers.push(teacher._id);
    }
    
    return teachers;
  }

  /**
   * 生成测试教室
   * 
   * Returns:
   *   Promise<mongoose.Types.ObjectId[]>: 教室ID列表
   */
  static async generateTestRooms(): Promise<mongoose.Types.ObjectId[]> {
    const roomData = [
      { name: '高一(1)班教室', type: '普通教室', capacity: 50 },
      { name: '高一(2)班教室', type: '普通教室', capacity: 50 },
      { name: '高一(3)班教室', type: '普通教室', capacity: 50 },
      { name: '物理实验室1', type: '实验室', capacity: 40 },
      { name: '化学实验室1', type: '实验室', capacity: 40 },
      { name: '生物实验室1', type: '实验室', capacity: 40 },
      { name: '体育馆', type: '体育场馆', capacity: 100 }
    ];
    
    const rooms = [];
    
    for (let i = 0; i < roomData.length; i++) {
      const data = roomData[i];
      const room = new Room({
        name: data.name,
        code: `R${String(i + 1).padStart(3, '0')}`,
        type: data.type,
        building: 'A栋',
        floor: Math.floor(i / 3) + 1,
        capacity: data.capacity,
        equipment: data.type === '实验室' ? ['实验台', '投影仪'] : ['投影仪'],
        isActive: true
      });
      
      await room.save();
      rooms.push(room._id);
    }
    
    return rooms;
  }

  /**
   * 生成测试教学计划
   * 
   * Args:
   *   classIds: 班级ID列表
   *   courseIds: 课程ID列表
   *   teacherIds: 教师ID列表
   * 
   * Returns:
   *   Promise<mongoose.Types.ObjectId[]>: 教学计划ID列表
   */
  static async generateTestTeachingPlans(
    classIds: mongoose.Types.ObjectId[],
    courseIds: mongoose.Types.ObjectId[],
    teacherIds: mongoose.Types.ObjectId[]
  ): Promise<mongoose.Types.ObjectId[]> {
    const plans = [];
    
    const courseHours = [5, 5, 4, 4, 3, 3, 2, 2, 2]; // 对应课程的周课时
    
    for (const classId of classIds) {
      const courseAssignments = courseIds.map((courseId, index) => ({
        course: courseId,
        teacher: teacherIds[index],
        weeklyHours: courseHours[index],
        requiresContinuous: ![6, 7, 8].includes(index), // 历史、地理、体育不需要连排
        continuousHours: [6, 7, 8].includes(index) ? undefined : 2
      }));
      
      const plan = new TeachingPlan({
        class: classId,
        academicYear: '2024-2025',
        semester: 1,
        courseAssignments,
        totalWeeklyHours: courseHours.reduce((sum, hours) => sum + hours, 0),
        status: 'approved',
        createdBy: new mongoose.Types.ObjectId(),
        isActive: true
      });
      
      await plan.save();
      plans.push(plan._id);
    }
    
    return plans;
  }
}

/**
 * 算法性能测试器
 */
class AlgorithmTester {

  /**
   * 执行基本功能测试
   * 
   * Returns:
   *   Promise<void>
   */
  static async runBasicTest(): Promise<void> {
    console.log('\n📊 开始基本功能测试...');
    
    try {
      // 生成测试数据
      console.log('  🔧 生成测试数据...');
      const rulesId = await TestDataGenerator.generateTestRules();
      const classIds = await TestDataGenerator.generateTestClasses(2);
      const courseIds = await TestDataGenerator.generateTestCourses();
      const teacherIds = await TestDataGenerator.generateTestTeachers(courseIds);
      const roomIds = await TestDataGenerator.generateTestRooms();
      const planIds = await TestDataGenerator.generateTestTeachingPlans(classIds, courseIds, teacherIds);
      
      console.log(`  ✅ 生成数据完成: ${classIds.length}个班级, ${courseIds.length}门课程, ${teacherIds.length}位教师`);
      
      // 执行排课
      console.log('  🚀 开始执行排课算法...');
      const service = new SchedulingService();
      
      const request: SchedulingRequest = {
        academicYear: '2024-2025',
        semester: 1,
        classIds,
        rulesId,
        preserveExisting: false,
        algorithmConfig: {
          maxIterations: 5000,
          timeLimit: 60,
          enableLocalOptimization: true
        }
      };
      
      const startTime = Date.now();
      
      const result = await service.executeScheduling(request, (progress) => {
        console.log(`    ${progress.stage}: ${progress.percentage.toFixed(1)}% - ${progress.message}`);
      });
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // 输出结果
      console.log('\n📈 排课结果统计:');
      console.log(`  ✅ 执行状态: ${result.success ? '成功' : '失败'}`);
      console.log(`  ⏱️  执行时间: ${executionTime}ms`);
      console.log(`  📚 总变量数: ${result.statistics.totalVariables}`);
      console.log(`  ✔️  已分配: ${result.statistics.assignedVariables}`);
      console.log(`  ❌ 未分配: ${result.statistics.unassignedVariables}`);
      console.log(`  🚫 硬约束违反: ${result.statistics.hardViolations}`);
      console.log(`  ⚠️  软约束违反: ${result.statistics.softViolations}`);
      console.log(`  🎯 总评分: ${result.statistics.totalScore}`);
      
      if (result.conflicts.length > 0) {
        console.log('\n⚠️  发现冲突:');
        result.conflicts.forEach((conflict, index) => {
          console.log(`  ${index + 1}. ${conflict.message}`);
        });
      }
      
      if (result.suggestions.length > 0) {
        console.log('\n💡 改进建议:');
        result.suggestions.forEach((suggestion, index) => {
          console.log(`  ${index + 1}. ${suggestion}`);
        });
      }
      
    } catch (error) {
      console.error('❌ 基本功能测试失败:', error);
    }
  }

  /**
   * 执行性能基准测试
   * 
   * Returns:
   *   Promise<void>
   */
  static async runPerformanceTest(): Promise<void> {
    console.log('\n🚀 开始性能基准测试...');
    
    const testCases = [
      { classes: 2, description: '小规模（2个班级）' },
      { classes: 5, description: '中等规模（5个班级）' },
      { classes: 10, description: '大规模（10个班级）' }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n  📊 测试 ${testCase.description}...`);
      
      try {
        // 清理旧数据
        await Promise.all([
          Class.deleteMany({}),
          Course.deleteMany({}),
          Teacher.deleteMany({}),
          Room.deleteMany({}),
          TeachingPlan.deleteMany({}),
          SchedulingRules.deleteMany({})
        ]);
        
        // 生成测试数据
        const rulesId = await TestDataGenerator.generateTestRules();
        const classIds = await TestDataGenerator.generateTestClasses(testCase.classes);
        const courseIds = await TestDataGenerator.generateTestCourses();
        const teacherIds = await TestDataGenerator.generateTestTeachers(courseIds);
        const roomIds = await TestDataGenerator.generateTestRooms();
        const planIds = await TestDataGenerator.generateTestTeachingPlans(classIds, courseIds, teacherIds);
        
        // 执行排课
        const service = new SchedulingService();
        const request: SchedulingRequest = {
          academicYear: '2024-2025',
          semester: 1,
          classIds,
          rulesId,
          preserveExisting: false,
          algorithmConfig: {
            maxIterations: 10000,
            timeLimit: 120,
            enableLocalOptimization: false // 性能测试关闭局部优化
          }
        };
        
        const startTime = Date.now();
        const result = await service.executeScheduling(request);
        const endTime = Date.now();
        
        console.log(`    ⏱️  执行时间: ${endTime - startTime}ms`);
        console.log(`    📊 成功率: ${result.statistics.assignedVariables}/${result.statistics.totalVariables} (${(result.statistics.assignedVariables/result.statistics.totalVariables*100).toFixed(1)}%)`);
        console.log(`    🎯 算法效率: ${result.statistics.assignedVariables/(endTime - startTime)*1000:.1f} 分配/秒`);
        
      } catch (error) {
        console.error(`    ❌ ${testCase.description} 测试失败:`, error);
      }
    }
  }
}

/**
 * 主测试函数
 */
async function runTests(): Promise<void> {
  try {
    console.log('🧪 智能排课算法测试工具');
    console.log('===========================\n');
    
    // 连接数据库
    console.log('📡 连接数据库...');
    await connectDatabase();
    console.log('✅ 数据库连接成功');
    
    // 清理旧测试数据
    console.log('🧹 清理旧测试数据...');
    await Promise.all([
      Class.deleteMany({}),
      Course.deleteMany({}),
      Teacher.deleteMany({}),
      Room.deleteMany({}),
      TeachingPlan.deleteMany({}),
      SchedulingRules.deleteMany({})
    ]);
    console.log('✅ 数据清理完成');
    
    // 执行测试
    await AlgorithmTester.runBasicTest();
    await AlgorithmTester.runPerformanceTest();
    
    console.log('\n🎉 所有测试完成!');
    
  } catch (error) {
    console.error('❌ 测试执行失败:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('📡 数据库连接已关闭');
    process.exit(0);
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}
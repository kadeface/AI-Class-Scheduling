/**
 * 测试数据初始化脚本
 * 
 * 为智能排课系统创建完整的测试数据，包括：
 * - 教师数据
 * - 班级数据  
 * - 课程数据
 * - 教室数据
 * - 排课规则
 * - 教学计划
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Teacher } from '../models/Teacher';
import { Class } from '../models/Class';
import { Course } from '../models/Course';
import { Room } from '../models/Room';
import { SchedulingRules } from '../models/SchedulingRules';
import { TeachingPlan } from '../models/TeachingPlan';

// 加载环境变量
dotenv.config();

/**
 * 连接数据库
 */
async function connectDatabase() {
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
 * 清理现有数据
 */
async function cleanupData() {
  console.log('🧹 清理现有测试数据...');
  
  await TeachingPlan.deleteMany({});
  await SchedulingRules.deleteMany({});
  await Room.deleteMany({});
  await Course.deleteMany({});
  await Class.deleteMany({});
  await Teacher.deleteMany({});
  
  console.log('✅ 数据清理完成');
}

/**
 * 创建教师数据
 */
async function createTeachers() {
  console.log('👨‍🏫 创建教师数据...');
  
  const teachers = [
    {
      name: '张老师',
      employeeId: 'T001',
      email: 'zhang@school.edu',
      phone: '13800000001',
      subjects: ['数学'],
      profile: {
        title: '高级教师',
        experience: 10,
        qualifications: ['中学一级教师', '数学专业硕士']
      },
      preferences: {
        maxDailyHours: 6,
        maxWeeklyHours: 20,
        preferredTimeSlots: [
          { dayOfWeek: 1, periods: [1, 2, 3] },
          { dayOfWeek: 2, periods: [1, 2, 3] }
        ]
      },
      isActive: true
    },
    {
      name: '李老师',
      employeeId: 'T002',
      email: 'li@school.edu',
      phone: '13800000002',
      subjects: ['语文'],
      profile: {
        title: '高级教师',
        experience: 8,
        qualifications: ['中学一级教师', '汉语言文学学士']
      },
      preferences: {
        maxDailyHours: 6,
        maxWeeklyHours: 18
      },
      isActive: true
    },
    {
      name: '王老师',
      employeeId: 'T003',
      email: 'wang@school.edu',
      phone: '13800000003',
      subjects: ['英语'],
      profile: {
        title: '中级教师',
        experience: 5,
        qualifications: ['英语专业学士', '英语四级']
      },
      preferences: {
        maxDailyHours: 5,
        maxWeeklyHours: 16
      },
      isActive: true
    },
    {
      name: '赵老师',
      employeeId: 'T004',
      email: 'zhao@school.edu',
      phone: '13800000004',
      subjects: ['物理'],
      profile: {
        title: '中级教师',
        experience: 6,
        qualifications: ['物理专业学士']
      },
      preferences: {
        maxDailyHours: 6,
        maxWeeklyHours: 18
      },
      isActive: true
    },
    {
      name: '陈老师',
      employeeId: 'T005',
      email: 'chen@school.edu',
      phone: '13800000005',
      subjects: ['化学'],
      profile: {
        title: '中级教师',
        experience: 4,
        qualifications: ['化学专业学士']
      },
      preferences: {
        maxDailyHours: 5,
        maxWeeklyHours: 15
      },
      isActive: true
    }
  ];

  const createdTeachers = await Teacher.insertMany(teachers);
  console.log(`✅ 创建了 ${createdTeachers.length} 个教师`);
  return createdTeachers;
}

/**
 * 创建班级数据
 */
async function createClasses() {
  console.log('🏫 创建班级数据...');
  
  const classes = [
    {
      name: '高一(1)班',
      grade: 10, // 高一对应10年级
      studentCount: 45,
      academicYear: '2024-2025',
      semester: 1,
      isActive: true
    },
    {
      name: '高一(2)班',
      grade: 10, // 高一对应10年级
      studentCount: 42,
      academicYear: '2024-2025',
      semester: 1,
      isActive: true
    },
    {
      name: '高二(1)班',
      grade: 11, // 高二对应11年级
      studentCount: 38,
      academicYear: '2024-2025',
      semester: 1,
      isActive: true
    }
  ];

  const createdClasses = await Class.insertMany(classes);
  console.log(`✅ 创建了 ${createdClasses.length} 个班级`);
  return createdClasses;
}

/**
 * 创建课程数据
 */
async function createCourses() {
  console.log('📚 创建课程数据...');
  
  const courses = [
    {
      name: '高中数学',
      courseCode: 'MATH001',
      subject: '数学',
      description: '高中数学课程',
      weeklyHours: 6,
      requiresContinuous: true,
      continuousHours: 2,
      roomRequirements: {
        types: ['普通教室'],
        equipment: ['黑板', '投影仪']
      },
      isActive: true
    },
    {
      name: '高中语文',
      courseCode: 'LANG001',
      subject: '语文',
      description: '高中语文课程',
      weeklyHours: 5,
      requiresContinuous: true,
      continuousHours: 2,
      roomRequirements: {
        types: ['普通教室'],
        equipment: ['黑板', '音响']
      },
      isActive: true
    },
    {
      name: '高中英语',
      courseCode: 'ENG001',
      subject: '英语',
      description: '高中英语课程',
      weeklyHours: 4,
      requiresContinuous: false,
      roomRequirements: {
        types: ['普通教室', '语音室'],
        equipment: ['语音设备', '投影仪']
      },
      isActive: true
    },
    {
      name: '高中物理',
      courseCode: 'PHY001',
      subject: '物理',
      description: '高中物理课程',
      weeklyHours: 4,
      requiresContinuous: false,
      roomRequirements: {
        types: ['实验室'],
        equipment: ['实验器材', '投影仪']
      },
      isActive: true
    },
    {
      name: '高中化学',
      courseCode: 'CHEM001',
      subject: '化学',
      description: '高中化学课程',
      weeklyHours: 3,
      requiresContinuous: false,
      roomRequirements: {
        types: ['实验室'],
        equipment: ['实验器材', '通风设备']
      },
      isActive: true
    }
  ];

  const createdCourses = await Course.insertMany(courses);
  console.log(`✅ 创建了 ${createdCourses.length} 门课程`);
  return createdCourses;
}

/**
 * 创建教室数据
 */
async function createRooms() {
  console.log('🏢 创建教室数据...');
  
  const rooms = [
    {
      name: '101教室',
      roomNumber: '101',
      building: 'A栋',
      floor: 1,
      capacity: 50,
      type: '普通教室',
      equipment: ['智慧黑板', '投影仪', '音响设备', '空调'],
      isActive: true
    },
    {
      name: '102教室',
      roomNumber: '102',
      building: 'A栋',
      floor: 1,
      capacity: 50,
      type: '普通教室',
      equipment: ['智慧黑板', '投影仪', '空调'],
      isActive: true
    },
    {
      name: '201语音教室',
      roomNumber: '201',
      building: 'A栋',
      floor: 2,
      capacity: 45,
      type: '语音室',
      equipment: ['音响设备', '投影仪', '网络设备', '空调'],
      isActive: true
    },
    {
      name: '301物理实验室',
      roomNumber: '301',
      building: 'B栋',
      floor: 3,
      capacity: 40,
      type: '实验室',
      equipment: ['实验台', '投影仪', '网络设备'],
      isActive: true
    },
    {
      name: '302化学实验室',
      roomNumber: '302',
      building: 'B栋',
      floor: 3,
      capacity: 35,
      type: '实验室',
      equipment: ['实验台', '投影仪', '网络设备'],
      isActive: true
    }
  ];

  const createdRooms = await Room.insertMany(rooms);
  console.log(`✅ 创建了 ${createdRooms.length} 间教室`);
  return createdRooms;
}

/**
 * 创建排课规则
 */
async function createSchedulingRules() {
  console.log('📋 创建排课规则...');
  
  const rules = {
    name: '标准排课规则',
    description: '适用于普通高中的标准排课规则',
    schoolType: 'high',
    academicYear: '2024-2025',
    semester: 1,
    isDefault: true,
    isActive: true,
    createdBy: new mongoose.Types.ObjectId(),
    
    timeRules: {
      dailyPeriods: 8,
      workingDays: [1, 2, 3, 4, 5], // 周一到周五
      periodDuration: 45, // 45分钟一节课
      breakDuration: 10, // 10分钟课间休息
      lunchBreakStart: 4, // 第4节后开始午休
      lunchBreakDuration: 90, // 90分钟午休
      morningPeriods: [1, 2, 3, 4], // 上午1-4节
      afternoonPeriods: [5, 6, 7, 8], // 下午5-8节
      forbiddenSlots: [
        { dayOfWeek: 1, periods: [8] }, // 周一第8节禁止
        { dayOfWeek: 5, periods: [7, 8] } // 周五第7、8节禁止
      ]
    },
    
    teacherConstraints: {
      maxDailyHours: 6,
      maxContinuousHours: 3,
      minRestBetweenCourses: 10,
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
      avoidFirstLastPeriod: ['体育', '音乐', '美术'],
      coreSubjectPriority: true,
      labCoursePreference: 'afternoon'
    },
    
    conflictResolutionRules: {
      teacherConflictResolution: 'strict',
      roomConflictResolution: 'strict',
      classConflictResolution: 'strict',
      allowOverride: false,
      priorityOrder: ['teacher', 'room', 'class']
    }
  };

  const createdRules = await SchedulingRules.create(rules);
  console.log('✅ 创建了排课规则');
  return createdRules;
}

/**
 * 创建教学计划
 */
async function createTeachingPlans(teachers: any[], classes: any[], courses: any[]) {
  console.log('📊 创建教学计划...');
  
  const plans = [];

  // 为每个班级创建教学计划
  for (const classObj of classes) {
    const courseAssignments = [];

    // 为每门课程创建安排
    for (const course of courses) {
      let teacherId = null;
      const subject = String(course.subject);
      
      // 根据科目找对应教师
      switch (subject) {
        case '数学':
          teacherId = teachers.find(t => t.name === '张老师')?._id;
          break;
        case '语文':
          teacherId = teachers.find(t => t.name === '李老师')?._id;
          break;
        case '英语':
          teacherId = teachers.find(t => t.name === '王老师')?._id;
          break;
        case '物理':
          teacherId = teachers.find(t => t.name === '赵老师')?._id;
          break;
        case '化学':
          teacherId = teachers.find(t => t.name === '陈老师')?._id;
          break;
      }
      
      if (teacherId) {
        courseAssignments.push({
          course: course._id,
          teacher: teacherId,
          weeklyHours: course.weeklyHours,
          requiresContinuous: subject === '数学' || subject === '语文', // 数学和语文需要连排
          continuousHours: (subject === '数学' || subject === '语文') ? 2 : undefined,
          preferredTimeSlots: subject === '数学' ? [
            { dayOfWeek: 1, periods: [1, 2] }, // 数学偏好周一上午
            { dayOfWeek: 3, periods: [1, 2] }  // 周三上午
          ] : undefined,
          avoidTimeSlots: subject === '体育' ? [
            { dayOfWeek: 1, periods: [1] } // 避开周一第一节
          ] : undefined
        });
      }
    }

    const plan = {
      class: classObj._id,
      academicYear: '2024-2025',
      semester: 1,
      courseAssignments,
      totalWeeklyHours: courseAssignments.reduce((sum, assignment) => sum + assignment.weeklyHours, 0),
      status: 'approved',
      createdBy: new mongoose.Types.ObjectId(), // 模拟用户ID
      notes: `${classObj.name}的教学计划`,
      isActive: true
    };

    plans.push(plan);
  }

  const createdPlans = await TeachingPlan.insertMany(plans);
  console.log(`✅ 创建了 ${createdPlans.length} 个教学计划`);
  return createdPlans;
}

/**
 * 主初始化函数
 */
async function initializeTestData() {
  console.log('🚀 开始初始化测试数据...\n');

  try {
    // 1. 连接数据库
    await connectDatabase();

    // 2. 清理现有数据
    await cleanupData();

    // 3. 创建基础数据
    const teachers = await createTeachers();
    const classes = await createClasses();
    const courses = await createCourses();
    const rooms = await createRooms();

    // 4. 创建排课规则
    const rules = await createSchedulingRules();

    // 5. 创建教学计划
    const plans = await createTeachingPlans(teachers, classes, courses);

    console.log('\n🎉 测试数据初始化完成！');
    console.log('📊 数据统计:');
    console.log(`   👨‍🏫 教师: ${teachers.length} 人`);
    console.log(`   🏫 班级: ${classes.length} 个`);
    console.log(`   📚 课程: ${courses.length} 门`);
    console.log(`   🏢 教室: ${rooms.length} 间`);
    console.log(`   📋 排课规则: 1 套`);
    console.log(`   📊 教学计划: ${plans.length} 个`);

    console.log('\n✅ 现在可以进行排课测试了！');

    return {
      teachers,
      classes,
      courses,
      rooms,
      rules,
      plans
    };

  } catch (error) {
    console.error('❌ 测试数据初始化失败:', error);
    throw error;
  }
}

// 直接执行初始化（如果作为脚本运行）
if (require.main === module) {
  initializeTestData()
    .then(() => {
      console.log('✅ 脚本执行完成，正在关闭数据库连接...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 脚本执行失败:', error);
      process.exit(1);
    })
    .finally(() => {
      mongoose.disconnect();
    });
}

export { initializeTestData }; 
/**
 * 创建测试数据脚本
 * 
 * 用于创建排课系统需要的基础测试数据
 */

import mongoose from 'mongoose';
import { User } from '../models/User';
import { Teacher } from '../models/Teacher';
import { Class } from '../models/Class';
import { Course } from '../models/Course';
import { Room } from '../models/Room';
import { TeachingPlan } from '../models/TeachingPlan';

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
 * 创建测试用户
 * 
 * Returns:
 *   Promise<any>: 创建的管理员用户
 */
async function createTestUsers(): Promise<any> {
  try {
    let adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      adminUser = new User({
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        profile: {
          name: '系统管理员',
          employeeId: 'ADMIN001',
          email: 'admin@school.edu.cn'
        }
      });
      await adminUser.save();
      console.log('✅ 创建管理员用户');
    }
    return adminUser;
  } catch (error) {
    console.error('❌ 创建用户失败:', error);
    throw error;
  }
}

/**
 * 创建测试教师
 * 
 * Args:
 *   adminUser: 管理员用户对象
 * 
 * Returns:
 *   Promise<any[]>: 创建的教师列表
 */
async function createTestTeachers(adminUser: any): Promise<any[]> {
  try {
    // 检查是否已有教师数据
    const existingCount = await Teacher.countDocuments();
    if (existingCount > 0) {
      console.log('✅ 教师数据已存在，跳过创建');
      return await Teacher.find().limit(5);
    }

    const teachers = [
      {
        name: '张老师',
        employeeId: 'T001',
        department: '语文组',
        subjects: ['语文'],
        title: '高级教师',
        maxHoursPerWeek: 18,
        email: 'zhang@school.edu.cn'
      },
      {
        name: '李老师', 
        employeeId: 'T002',
        department: '数学组',
        subjects: ['数学'],
        title: '一级教师',
        maxHoursPerWeek: 20,
        email: 'li@school.edu.cn'
      },
      {
        name: '王老师',
        employeeId: 'T003', 
        department: '英语组',
        subjects: ['英语'],
        title: '高级教师',
        maxHoursPerWeek: 16,
        email: 'wang@school.edu.cn'
      },
      {
        name: '赵老师',
        employeeId: 'T004',
        department: '物理组', 
        subjects: ['物理'],
        title: '一级教师',
        maxHoursPerWeek: 18,
        email: 'zhao@school.edu.cn'
      },
      {
        name: '陈老师',
        employeeId: 'T005',
        department: '化学组',
        subjects: ['化学'], 
        title: '高级教师',
        maxHoursPerWeek: 16,
        email: 'chen@school.edu.cn'
      }
    ];

    const createdTeachers = [];
    for (const teacherData of teachers) {
      const teacher = new Teacher(teacherData);
      await teacher.save();
      createdTeachers.push(teacher);
    }

    console.log(`✅ 创建了 ${teachers.length} 个教师`);
    return createdTeachers;
  } catch (error) {
    console.error('❌ 创建教师失败:', error);
    throw error;
  }
}
/**
 * 创建测试班级
 * 
 * Args:
 *   teachers: 教师列表
 * 
 * Returns:
 *   Promise<any[]>: 创建的班级列表
 */
async function createTestClasses(teachers: any[]): Promise<any[]> {
  try {
    // 检查是否已有班级数据
    const existingCount = await Class.countDocuments();
    if (existingCount > 0) {
      console.log('✅ 班级数据已存在，跳过创建');
      return await Class.find().limit(3);
    }

    const classes = [
      {
        name: '高一(1)班',
        grade: '高一',
        studentCount: 45,
        classTeacher: teachers[0]._id
      },
      {
        name: '高一(2)班', 
        grade: '高一',
        studentCount: 42,
        classTeacher: teachers[1]._id
      },
      {
        name: '高二(1)班',
        grade: '高二',
        studentCount: 38,
        classTeacher: teachers[2]._id
      }
    ];

    const createdClasses = [];
    for (const classData of classes) {
      const classItem = new Class(classData);
      await classItem.save();
      createdClasses.push(classItem);
    }

    console.log(`✅ 创建了 ${classes.length} 个班级`);
    return createdClasses;
  } catch (error) {
    console.error('❌ 创建班级失败:', error);
    throw error;
  }
}

/**
 * 创建测试课程
 * 
 * Returns:
 *   Promise<any[]>: 创建的课程列表
 */
async function createTestCourses(): Promise<any[]> {
  try {
    // 检查是否已有课程数据
    const existingCount = await Course.countDocuments();
    if (existingCount > 0) {
      console.log('✅ 课程数据已存在，跳过创建');
      return await Course.find().limit(5);
    }

    const courses = [
      {
        name: '语文',
        subject: '语文',
        courseCode: 'CHI001',
        weeklyHours: 6,
        requiresContinuous: true,
        continuousHours: 2,
        roomRequirements: {
          types: ['普通教室'],
          capacity: 45,
          equipment: []
        }
      },
      {
        name: '数学',
        subject: '数学',
        courseCode: 'MATH001',
        weeklyHours: 6,
        requiresContinuous: true,
        continuousHours: 2,
        roomRequirements: {
          types: ['普通教室'],
          capacity: 45,
          equipment: []
        }
      },
      {
        name: '英语',
        subject: '英语',
        courseCode: 'ENG001',
        weeklyHours: 5,
        requiresContinuous: false,
        roomRequirements: {
          types: ['普通教室'],
          capacity: 45,
          equipment: []
        }
      },
      {
        name: '物理',
        subject: '物理',
        courseCode: 'PHY001',
        weeklyHours: 4,
        requiresContinuous: true,
        continuousHours: 2,
        roomRequirements: {
          types: ['实验室'],
          capacity: 40,
          equipment: ['实验台']
        }
      },
      {
        name: '化学',
        subject: '化学',
        courseCode: 'CHEM001',
        weeklyHours: 3,
        requiresContinuous: false,
        roomRequirements: {
          types: ['实验室'],
          capacity: 36,
          equipment: ['实验台', '通风橱']
        }
      }
    ];

    const createdCourses = [];
    for (const courseData of courses) {
      const course = new Course(courseData);
      await course.save();
      createdCourses.push(course);
    }

    console.log(`✅ 创建了 ${courses.length} 个课程`);
    return createdCourses;
  } catch (error) {
    console.error('❌ 创建课程失败:', error);
    throw error;
  }
}

/**
 * 创建测试教室
 * 
 * Returns:
 *   Promise<any[]>: 创建的教室列表  
 */
async function createTestRooms(): Promise<any[]> {
  try {
    // 检查是否已有教室数据
    const existingCount = await Room.countDocuments();
    if (existingCount > 0) {
      console.log('✅ 教室数据已存在，跳过创建');
      return await Room.find().limit(10);
    }

    const rooms = [
      {
        name: '教学楼A-101',
        code: 'A101',
        type: '普通教室',
        building: '教学楼A',
        floor: 1,
        capacity: 50,
        equipment: ['黑板', '投影仪', '音响']
      },
      {
        name: '教学楼A-102',
        code: 'A102', 
        type: '普通教室',
        building: '教学楼A',
        floor: 1,
        capacity: 48,
        equipment: ['黑板', '投影仪']
      },
      {
        name: '教学楼A-201',
        code: 'A201',
        type: '普通教室',
        building: '教学楼A', 
        floor: 2,
        capacity: 45,
        equipment: ['黑板', '投影仪', '音响']
      },
      {
        name: '物理实验室1',
        code: 'LAB01',
        type: '物理实验室',
        building: '实验楼',
        floor: 1, 
        capacity: 40,
        equipment: ['实验台', '投影仪', '物理器材']
      },
      {
        name: '化学实验室1',
        code: 'LAB02',
        type: '化学实验室',
        building: '实验楼',
        floor: 1,
        capacity: 36,
        equipment: ['实验台', '通风橱', '化学器材']
      }
    ];

    const createdRooms = [];
    for (const roomData of rooms) {
      const room = new Room(roomData);
      await room.save();
      createdRooms.push(room);
    }

    console.log(`✅ 创建了 ${rooms.length} 个教室`);
    return createdRooms;
  } catch (error) {
    console.error('❌ 创建教室失败:', error);
    throw error;
  }
}/**
 * 创建测试教学计划
 * 
 * Args:
 *   adminUser: 管理员用户
 *   classes: 班级列表
 *   courses: 课程列表
 *   teachers: 教师列表
 * 
 * Returns:
 *   Promise<any[]>: 创建的教学计划列表
 */
async function createTestTeachingPlans(
  adminUser: any, 
  classes: any[], 
  courses: any[], 
  teachers: any[]
): Promise<any[]> {
  try {
    // 检查是否已有教学计划数据
    const existingCount = await TeachingPlan.countDocuments();
    if (existingCount > 0) {
      console.log('✅ 教学计划数据已存在，跳过创建');
      return await TeachingPlan.find().limit(5);
    }

    const teachingPlans = [];

    // 为每个班级创建一个完整的教学计划（包含所有课程）
    for (let i = 0; i < classes.length; i++) {
      const classItem = classes[i];
      
      // 为该班级创建所有课程的分配
      const courseAssignments = [];
      let totalWeeklyHours = 0;
      
      for (let j = 0; j < courses.length; j++) {
        const course = courses[j];
        const teacher = teachers[j % teachers.length]; // 循环分配教师

        courseAssignments.push({
          course: course._id,
          teacher: teacher._id,
          weeklyHours: course.weeklyHours,
          requiresContinuous: course.requiresContinuous,
          continuousHours: course.requiresContinuous ? course.continuousHours : undefined,
          preferredTimeSlots: [],
          avoidTimeSlots: []
        });
        
        totalWeeklyHours += course.weeklyHours;
      }

      const teachingPlan = new TeachingPlan({
        class: classItem._id,
        academicYear: '2024-2025',
        semester: 1,
        courseAssignments: courseAssignments,
        totalWeeklyHours: totalWeeklyHours,
        status: 'approved',
        createdBy: adminUser._id,
        approvedBy: adminUser._id,
        approvedAt: new Date()
      });

      await teachingPlan.save();
      teachingPlans.push(teachingPlan);
    }

    console.log(`✅ 创建了 ${teachingPlans.length} 个教学计划`);
    return teachingPlans;
  } catch (error) {
    console.error('❌ 创建教学计划失败:', error);
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
    console.log('🚀 开始创建测试数据...');
    
    await connectDatabase();
    
    // 按依赖顺序创建数据
    const adminUser = await createTestUsers();
    const teachers = await createTestTeachers(adminUser);
    const classes = await createTestClasses(teachers);
    const courses = await createTestCourses();
    const rooms = await createTestRooms();
    const teachingPlans = await createTestTeachingPlans(adminUser, classes, courses, teachers);
    
    console.log('✅ 测试数据创建完成');
    console.log(`📊 数据统计:`);
    console.log(`   - 教师: ${teachers.length} 个`);
    console.log(`   - 班级: ${classes.length} 个`);
    console.log(`   - 课程: ${courses.length} 个`);
    console.log(`   - 教室: ${rooms.length} 个`);
    console.log(`   - 教学计划: ${teachingPlans.length} 个`);
    
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

export { main as createTestData };
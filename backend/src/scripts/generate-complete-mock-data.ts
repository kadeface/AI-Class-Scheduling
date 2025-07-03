/**
 * 生成完整的模拟数据脚本
 * 
 * 创建完整的K-12教学数据，满足一周课程安排需求
 * 包括：教师、班级、课程、场室、教学计划
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
 * 清理现有数据
 */
async function cleanupExistingData(): Promise<void> {
  try {
    console.log('🧹 清理现有数据...');
    
    await TeachingPlan.deleteMany({});
    await Teacher.deleteMany({});
    await Class.deleteMany({});
    await Course.deleteMany({});
    await Room.deleteMany({});
    
    console.log('✅ 现有数据清理完成');
  } catch (error) {
    console.error('❌ 数据清理失败:', error);
    throw error;
  }
}

/**
 * 创建管理员用户
 */
async function createAdminUser(): Promise<any> {
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
          email: 'admin@school.edu.cn',
          department: '教务处'
        }
      });
      await adminUser.save();
      console.log('✅ 创建管理员用户');
    }
    return adminUser;
  } catch (error) {
    console.error('❌ 创建管理员用户失败:', error);
    throw error;
  }
}

/**
 * 创建完整的教师数据
 */
async function createTeachers(): Promise<any[]> {
  try {
    console.log('👨‍🏫 创建教师数据...');
    
    const teachersData = [
      // 语文组
      { name: '张文华', employeeId: 'T001', department: '语文组', subjects: ['语文'], title: '高级教师', maxHoursPerWeek: 18 },
      { name: '李雅琴', employeeId: 'T002', department: '语文组', subjects: ['语文'], title: '一级教师', maxHoursPerWeek: 20 },
      { name: '王春梅', employeeId: 'T003', department: '语文组', subjects: ['语文'], title: '高级教师', maxHoursPerWeek: 16 },
      
      // 数学组
      { name: '陈建国', employeeId: 'T004', department: '数学组', subjects: ['数学'], title: '高级教师', maxHoursPerWeek: 18 },
      { name: '刘明华', employeeId: 'T005', department: '数学组', subjects: ['数学'], title: '一级教师', maxHoursPerWeek: 20 },
      { name: '赵志强', employeeId: 'T006', department: '数学组', subjects: ['数学'], title: '高级教师', maxHoursPerWeek: 16 },
      
      // 英语组
      { name: '孙丽娜', employeeId: 'T007', department: '英语组', subjects: ['英语'], title: '高级教师', maxHoursPerWeek: 16 },
      { name: '周晓霞', employeeId: 'T008', department: '英语组', subjects: ['英语'], title: '一级教师', maxHoursPerWeek: 18 },
      { name: '吴桂花', employeeId: 'T009', department: '英语组', subjects: ['英语'], title: '高级教师', maxHoursPerWeek: 16 },
      
      // 物理组
      { name: '郑国强', employeeId: 'T010', department: '物理组', subjects: ['物理'], title: '高级教师', maxHoursPerWeek: 16 },
      { name: '韩冬梅', employeeId: 'T011', department: '物理组', subjects: ['物理'], title: '一级教师', maxHoursPerWeek: 18 },
      
      // 化学组
      { name: '冯志华', employeeId: 'T012', department: '化学组', subjects: ['化学'], title: '高级教师', maxHoursPerWeek: 16 },
      { name: '蔡丽萍', employeeId: 'T013', department: '化学组', subjects: ['化学'], title: '一级教师', maxHoursPerWeek: 18 },
      
      // 生物组
      { name: '何建军', employeeId: 'T014', department: '生物组', subjects: ['生物'], title: '高级教师', maxHoursPerWeek: 16 },
      { name: '谢秀芳', employeeId: 'T015', department: '生物组', subjects: ['生物'], title: '一级教师', maxHoursPerWeek: 18 },
      
      // 历史组
      { name: '邓国华', employeeId: 'T016', department: '历史组', subjects: ['历史'], title: '高级教师', maxHoursPerWeek: 18 },
      { name: '田素梅', employeeId: 'T017', department: '历史组', subjects: ['历史'], title: '一级教师', maxHoursPerWeek: 20 },
      
      // 地理组
      { name: '范志刚', employeeId: 'T018', department: '地理组', subjects: ['地理'], title: '一级教师', maxHoursPerWeek: 18 },
      { name: '程丽华', employeeId: 'T019', department: '地理组', subjects: ['地理'], title: '高级教师', maxHoursPerWeek: 16 },
      
      // 政治组
      { name: '卢建华', employeeId: 'T020', department: '政治组', subjects: ['政治'], title: '高级教师', maxHoursPerWeek: 18 },
      { name: '曾秀兰', employeeId: 'T021', department: '政治组', subjects: ['政治'], title: '一级教师', maxHoursPerWeek: 20 },
      
      // 体育组
      { name: '姚志强', employeeId: 'T022', department: '体育组', subjects: ['体育'], title: '一级教师', maxHoursPerWeek: 22 },
      { name: '石丽萍', employeeId: 'T023', department: '体育组', subjects: ['体育'], title: '高级教师', maxHoursPerWeek: 20 },
      
      // 音美组
      { name: '龚建国', employeeId: 'T024', department: '音美组', subjects: ['音乐'], title: '一级教师', maxHoursPerWeek: 20 },
      { name: '崔秀芳', employeeId: 'T025', department: '音美组', subjects: ['美术'], title: '高级教师', maxHoursPerWeek: 18 },
      
      // 信息技术组
      { name: '覃志华', employeeId: 'T026', department: '信息技术组', subjects: ['信息技术'], title: '一级教师', maxHoursPerWeek: 18 },
      { name: '莫丽娟', employeeId: 'T027', department: '信息技术组', subjects: ['信息技术'], title: '高级教师', maxHoursPerWeek: 16 }
    ];

    const teachers = [];
    for (const teacherData of teachersData) {
      const teacher = new Teacher({
        ...teacherData,
        email: `${teacherData.employeeId.toLowerCase()}@school.edu.cn`,
        phone: `138${teacherData.employeeId.slice(-8).padStart(8, '0')}`,
        unavailableSlots: [],
        isActive: true
      });
      await teacher.save();
      teachers.push(teacher);
    }

    console.log(`✅ 创建了 ${teachers.length} 个教师`);
    return teachers;
  } catch (error) {
    console.error('❌ 创建教师失败:', error);
    throw error;
  }
}/**
 * 创建班级数据
 */
async function createClasses(teachers: any[]): Promise<any[]> {
  try {
    console.log('🏫 创建班级数据...');
    
    // 分配班主任
    const classesData = [
      // 高一年级 (10年级)
      { name: '高一(1)班', grade: 10, studentCount: 45, classTeacher: teachers[0]._id, academicYear: '2024-2025', semester: 1 },
      { name: '高一(2)班', grade: 10, studentCount: 42, classTeacher: teachers[1]._id, academicYear: '2024-2025', semester: 1 },
      { name: '高一(3)班', grade: 10, studentCount: 44, classTeacher: teachers[2]._id, academicYear: '2024-2025', semester: 1 },
      { name: '高一(4)班', grade: 10, studentCount: 43, classTeacher: teachers[3]._id, academicYear: '2024-2025', semester: 1 },
      { name: '高一(5)班', grade: 10, studentCount: 46, classTeacher: teachers[4]._id, academicYear: '2024-2025', semester: 1 },
      { name: '高一(6)班', grade: 10, studentCount: 41, classTeacher: teachers[5]._id, academicYear: '2024-2025', semester: 1 },
      
      // 高二年级 (11年级)
      { name: '高二(1)班', grade: 11, studentCount: 38, classTeacher: teachers[6]._id, academicYear: '2024-2025', semester: 1 },
      { name: '高二(2)班', grade: 11, studentCount: 40, classTeacher: teachers[7]._id, academicYear: '2024-2025', semester: 1 },
      { name: '高二(3)班', grade: 11, studentCount: 39, classTeacher: teachers[8]._id, academicYear: '2024-2025', semester: 1 },
      { name: '高二(4)班', grade: 11, studentCount: 37, classTeacher: teachers[9]._id, academicYear: '2024-2025', semester: 1 },
      { name: '高二(5)班', grade: 11, studentCount: 41, classTeacher: teachers[10]._id, academicYear: '2024-2025', semester: 1 },
      
      // 高三年级 (12年级)
      { name: '高三(1)班', grade: 12, studentCount: 35, classTeacher: teachers[11]._id, academicYear: '2024-2025', semester: 1 },
      { name: '高三(2)班', grade: 12, studentCount: 36, classTeacher: teachers[12]._id, academicYear: '2024-2025', semester: 1 },
      { name: '高三(3)班', grade: 12, studentCount: 34, classTeacher: teachers[13]._id, academicYear: '2024-2025', semester: 1 },
      { name: '高三(4)班', grade: 12, studentCount: 37, classTeacher: teachers[14]._id, academicYear: '2024-2025', semester: 1 }
    ];

    const classes = [];
    for (const classData of classesData) {
      const classItem = new Class({
        ...classData,
        homeroom: null, // 暂不分配固定教室
        isActive: true
      });
      await classItem.save();
      classes.push(classItem);
    }

    console.log(`✅ 创建了 ${classes.length} 个班级`);
    return classes;
  } catch (error) {
    console.error('❌ 创建班级失败:', error);
    throw error;
  }
}

/**
 * 创建课程数据
 */
async function createCourses(): Promise<any[]> {
  try {
    console.log('📚 创建课程数据...');
    
    const coursesData = [
      // 主要学科
      {
        name: '语文',
        subject: '语文',
        courseCode: 'CHI001',
        weeklyHours: 5,
        requiresContinuous: true,
        continuousHours: 2,
        roomRequirements: {
          types: ['普通教室'],
          capacity: 45,
          equipment: ['多媒体设备']
        }
      },
      {
        name: '数学',
        subject: '数学',
        courseCode: 'MATH001',
        weeklyHours: 5,
        requiresContinuous: true,
        continuousHours: 2,
        roomRequirements: {
          types: ['普通教室'],
          capacity: 45,
          equipment: ['多媒体设备']
        }
      },
      {
        name: '英语',
        subject: '英语',
        courseCode: 'ENG001',
        weeklyHours: 4,
        requiresContinuous: false,
        roomRequirements: {
          types: ['普通教室', '语音室'],
          capacity: 45,
          equipment: ['多媒体设备', '音响设备']
        }
      },
      
      // 理科
      {
        name: '物理',
        subject: '物理',
        courseCode: 'PHY001',
        weeklyHours: 3,
        requiresContinuous: true,
        continuousHours: 2,
        roomRequirements: {
          types: ['普通教室', '实验室'],
          capacity: 40,
          equipment: ['实验设备', '多媒体设备']
        }
      },
      {
        name: '化学',
        subject: '化学',
        courseCode: 'CHEM001',
        weeklyHours: 3,
        requiresContinuous: true,
        continuousHours: 2,
        roomRequirements: {
          types: ['普通教室', '实验室'],
          capacity: 40,
          equipment: ['实验设备', '通风设备']
        }
      },
      {
        name: '生物',
        subject: '生物',
        courseCode: 'BIO001',
        weeklyHours: 2,
        requiresContinuous: false,
        roomRequirements: {
          types: ['普通教室', '实验室'],
          capacity: 40,
          equipment: ['实验设备', '显微镜']
        }
      },
      
      // 文科
      {
        name: '历史',
        subject: '历史',
        courseCode: 'HIS001',
        weeklyHours: 2,
        requiresContinuous: false,
        roomRequirements: {
          types: ['普通教室'],
          capacity: 45,
          equipment: ['多媒体设备']
        }
      },
      {
        name: '地理',
        subject: '地理',
        courseCode: 'GEO001',
        weeklyHours: 2,
        requiresContinuous: false,
        roomRequirements: {
          types: ['普通教室'],
          capacity: 45,
          equipment: ['多媒体设备', '地图']
        }
      },
      {
        name: '政治',
        subject: '政治',
        courseCode: 'POL001',
        weeklyHours: 2,
        requiresContinuous: false,
        roomRequirements: {
          types: ['普通教室'],
          capacity: 45,
          equipment: ['多媒体设备']
        }
      },
      
      // 艺体科
      {
        name: '体育',
        subject: '体育',
        courseCode: 'PE001',
        weeklyHours: 2,
        requiresContinuous: true,
        continuousHours: 2,
        roomRequirements: {
          types: ['体育馆', '操场'],
          capacity: 50,
          equipment: ['体育器材']
        }
      },
      {
        name: '音乐',
        subject: '音乐',
        courseCode: 'MUS001',
        weeklyHours: 1,
        requiresContinuous: false,
        roomRequirements: {
          types: ['音乐室'],
          capacity: 45,
          equipment: ['钢琴', '音响设备']
        }
      },
      {
        name: '美术',
        subject: '美术',
        courseCode: 'ART001',
        weeklyHours: 1,
        requiresContinuous: false,
        roomRequirements: {
          types: ['美术室'],
          capacity: 45,
          equipment: ['画架', '画具']
        }
      },
      {
        name: '信息技术',
        subject: '信息技术',
        courseCode: 'IT001',
        weeklyHours: 1,
        requiresContinuous: false,
        roomRequirements: {
          types: ['计算机房'],
          capacity: 45,
          equipment: ['电脑', '网络']
        }
      }
    ];

    const courses = [];
    for (const courseData of coursesData) {
      const course = new Course({
        ...courseData,
        description: `高中${courseData.name}课程`,
        isActive: true
      });
      await course.save();
      courses.push(course);
    }

    console.log(`✅ 创建了 ${courses.length} 门课程`);
    return courses;
  } catch (error) {
    console.error('❌ 创建课程失败:', error);
    throw error;
  }
}/**
 * 创建教室数据
 */
async function createRooms(): Promise<any[]> {
  try {
    console.log('🏢 创建教室数据...');
    
    const roomsData = [
      // 普通教室 - 教学楼A
      ...Array.from({ length: 15 }, (_, i) => ({
        name: `教学楼A-${(i + 101).toString()}`,
        roomNumber: `A${(i + 101).toString()}`,
        type: '普通教室',
        building: '教学楼A',
        floor: Math.floor(i / 5) + 1,
        capacity: 50,
        equipment: ['智慧黑板', '投影仪', '音响设备', '空调']
      })),
      
      // 普通教室 - 教学楼B
      ...Array.from({ length: 10 }, (_, i) => ({
        name: `教学楼B-${(i + 201).toString()}`,
        roomNumber: `B${(i + 201).toString()}`,
        type: '普通教室',
        building: '教学楼B',
        floor: Math.floor(i / 5) + 1,
        capacity: 48,
        equipment: ['智慧黑板', '投影仪', '音响设备', '空调']
      })),
      
      // 实验室
      { name: '物理实验室1', roomNumber: 'LAB01', type: '实验室', building: '实验楼', floor: 1, capacity: 40, equipment: ['实验台', '投影仪', '体育器材', '网络设备'] },
      { name: '物理实验室2', roomNumber: 'LAB02', type: '实验室', building: '实验楼', floor: 1, capacity: 40, equipment: ['实验台', '投影仪', '体育器材', '网络设备'] },
      { name: '化学实验室1', roomNumber: 'LAB03', type: '实验室', building: '实验楼', floor: 2, capacity: 36, equipment: ['实验台', '投影仪', '音响设备', '空调'] },
      { name: '化学实验室2', roomNumber: 'LAB04', type: '实验室', building: '实验楼', floor: 2, capacity: 36, equipment: ['实验台', '投影仪', '音响设备', '空调'] },
      { name: '生物实验室1', roomNumber: 'LAB05', type: '实验室', building: '实验楼', floor: 3, capacity: 40, equipment: ['实验台', '显微镜', '投影仪', '空调'] },
      { name: '生物实验室2', roomNumber: 'LAB06', type: '实验室', building: '实验楼', floor: 3, capacity: 40, equipment: ['实验台', '显微镜', '投影仪', '空调'] },
      
      // 专用教室
      { name: '计算机房1', roomNumber: 'COM01', type: '计算机房', building: '信息楼', floor: 1, capacity: 50, equipment: ['电脑', '投影仪', '网络设备', '空调'] },
      { name: '计算机房2', roomNumber: 'COM02', type: '计算机房', building: '信息楼', floor: 1, capacity: 50, equipment: ['电脑', '投影仪', '网络设备', '空调'] },
      { name: '语音室1', roomNumber: 'LANG01', type: '语音室', building: '信息楼', floor: 2, capacity: 48, equipment: ['音响设备', '投影仪', '网络设备', '空调'] },
      { name: '语音室2', roomNumber: 'LANG02', type: '语音室', building: '信息楼', floor: 2, capacity: 48, equipment: ['音响设备', '投影仪', '网络设备', '空调'] },
      { name: '音乐室1', roomNumber: 'MUS01', type: '音乐室', building: '艺术楼', floor: 1, capacity: 45, equipment: ['钢琴', '音响设备', '投影仪', '空调'] },
      { name: '音乐室2', roomNumber: 'MUS02', type: '音乐室', building: '艺术楼', floor: 1, capacity: 45, equipment: ['钢琴', '音响设备', '投影仪', '空调'] },
      { name: '美术室1', roomNumber: 'ART01', type: '美术室', building: '艺术楼', floor: 2, capacity: 45, equipment: ['投影仪', '音响设备', '智慧黑板', '空调'] },
      { name: '美术室2', roomNumber: 'ART02', type: '美术室', building: '艺术楼', floor: 2, capacity: 45, equipment: ['投影仪', '音响设备', '智慧黑板', '空调'] },
      
      // 体育场馆
      { name: '体育馆', roomNumber: 'GYM01', type: '体育馆', building: '体育馆', floor: 1, capacity: 200, equipment: ['体育器材', '音响设备', '投影仪', '空调'] },
      { name: '乒乓球室', roomNumber: 'TT01', type: '体育馆', building: '体育馆', floor: 1, capacity: 30, equipment: ['体育器材', '音响设备', '空调'] },
      { name: '操场', roomNumber: 'FIELD01', type: '操场', building: '室外', floor: 1, capacity: 500, equipment: ['体育器材', '音响设备'] }
    ];

    const rooms = [];
    for (const roomData of roomsData) {
      const room = new Room({
        ...roomData,
        unavailableSlots: [], // 默认全时段可用
        isActive: true
      });
      await room.save();
      rooms.push(room);
    }

    console.log(`✅ 创建了 ${rooms.length} 个教室/场馆`);
    return rooms;
  } catch (error) {
    console.error('❌ 创建教室失败:', error);
    throw error;
  }
}

/**
 * 创建教学计划 - 核心函数
 */
async function createTeachingPlans(
  adminUser: any,
  classes: any[],
  courses: any[],
  teachers: any[]
): Promise<any[]> {
  try {
    console.log('📋 创建教学计划...');
    
    // 按学科分组教师
    const teachersBySubject: { [key: string]: any[] } = {};
    teachers.forEach(teacher => {
      const subject = teacher.subjects[0];
      if (!teachersBySubject[subject]) {
        teachersBySubject[subject] = [];
      }
      teachersBySubject[subject].push(teacher);
    });

    const teachingPlans = [];

    // 为每个班级创建完整的教学计划
    for (const classItem of classes) {
      console.log(`  📝 为 ${classItem.name} 创建教学计划...`);
      
      const courseAssignments = [];
      let totalWeeklyHours = 0;

      // 为每门课程分配教师
      for (const course of courses) {
        const subjectTeachers = teachersBySubject[course.subject];
        if (!subjectTeachers || subjectTeachers.length === 0) {
          console.warn(`⚠️  警告: 没有找到 ${course.subject} 学科的教师`);
          continue;
        }

        // 简单的负载均衡分配策略
        const randomTeacher = subjectTeachers[Math.floor(Math.random() * subjectTeachers.length)];

        courseAssignments.push({
          course: course._id,
          teacher: randomTeacher._id,
          weeklyHours: course.weeklyHours,
          requiresContinuous: course.requiresContinuous,
          continuousHours: course.requiresContinuous ? course.continuousHours : undefined,
          preferredTimeSlots: [],
          avoidTimeSlots: [],
          notes: `${classItem.name} - ${course.name}课程安排`
        });

        totalWeeklyHours += course.weeklyHours;
      }

      // 创建教学计划
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
 */
async function main(): Promise<void> {
  try {
    console.log('🚀 开始生成完整的模拟数据...');
    console.log('📊 数据规模预览:');
    console.log('   - 教师: 27人 (覆盖13个学科)');
    console.log('   - 班级: 15个 (高一6个、高二5个、高三4个)');
    console.log('   - 课程: 13门 (语数英+理化生+政史地+艺体技)');
    console.log('   - 教室: 40个 (普通教室25个、专用教室15个)');
    console.log('   - 教学计划: 15个 (每班一个完整计划)');
    console.log('');

    await connectDatabase();
    
    // 1. 清理现有数据
    await cleanupExistingData();
    
    // 2. 创建管理员用户
    const adminUser = await createAdminUser();
    
    // 3. 按依赖顺序创建数据
    const teachers = await createTeachers();
    const classes = await createClasses(teachers);
    const courses = await createCourses();
    const rooms = await createRooms();
    const teachingPlans = await createTeachingPlans(adminUser, classes, courses, teachers);
    
    console.log('');
    console.log('✅ 完整模拟数据生成完成！');
    console.log('📈 最终统计:');
    console.log(`   - 教师数量: ${teachers.length}`);
    console.log(`   - 班级数量: ${classes.length}`);
    console.log(`   - 课程数量: ${courses.length}`);
    console.log(`   - 教室数量: ${rooms.length}`);
    console.log(`   - 教学计划: ${teachingPlans.length}`);
    
    // 计算总课时数
    const totalHours = teachingPlans.reduce((sum, plan) => sum + plan.totalWeeklyHours, 0);
    console.log(`   - 总周课时: ${totalHours} 节`);
    console.log(`   - 平均每班: ${Math.round(totalHours / classes.length)} 节/周`);
    
    console.log('');
    console.log('🎯 数据已准备就绪，可以进行智能排课！');
    
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

export { main as generateCompleteMockData };
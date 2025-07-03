/**
 * 验证模拟数据完整性的脚本
 * 
 * 检查生成的数据是否满足一周课程安排的需求
 */

import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env') });

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
 * 验证数据完整性
 */
async function validateData(): Promise<void> {
  try {
    console.log('🔍 开始验证数据完整性...');
    console.log('');

    // 1. 基础数据统计
    const teacherCount = await Teacher.countDocuments({ isActive: true });
    const classCount = await Class.countDocuments({ isActive: true });
    const courseCount = await Course.countDocuments({ isActive: true });
    const roomCount = await Room.countDocuments({ isActive: true });
    const planCount = await TeachingPlan.countDocuments({});

    console.log('📊 数据统计:');
    console.log(`   教师数量: ${teacherCount}`);
    console.log(`   班级数量: ${classCount}`);
    console.log(`   课程数量: ${courseCount}`);
    console.log(`   教室数量: ${roomCount}`);
    console.log(`   教学计划: ${planCount}`);
    console.log('');

    // 2. 教师学科覆盖检查
    console.log('👨‍🏫 教师学科覆盖检查:');
    const teachers = await Teacher.find({ isActive: true });
    const subjectCoverage: { [key: string]: number } = {};
    
    teachers.forEach(teacher => {
      teacher.subjects.forEach(subject => {
        subjectCoverage[subject] = (subjectCoverage[subject] || 0) + 1;
      });
    });

    Object.entries(subjectCoverage).forEach(([subject, count]) => {
      console.log(`   ${subject}: ${count} 名教师`);
    });
    console.log('');

    // 3. 课程工作量分析
    console.log('📚 课程工作量分析:');
    const courses = await Course.find({ isActive: true });
    let totalWeeklyHours = 0;
    
    courses.forEach(course => {
      console.log(`   ${course.name}: ${course.weeklyHours} 节/周${course.requiresContinuous ? ' (需连排)' : ''}`);
      totalWeeklyHours += course.weeklyHours;
    });
    
    console.log(`   总计: ${totalWeeklyHours} 节/周/班`);
    console.log(`   ${classCount} 个班级总计: ${totalWeeklyHours * classCount} 节/周`);
    console.log('');

    // 4. 教学计划完整性检查
    console.log('📋 教学计划完整性检查:');
    const teachingPlans = await TeachingPlan.find({})
      .populate('class')
      .populate('courseAssignments.course')
      .populate('courseAssignments.teacher');

    for (const plan of teachingPlans) {
      const className = (plan.class as any).name;
      const courseCount = plan.courseAssignments.length;
      const totalHours = plan.totalWeeklyHours;
      
      console.log(`   ${className}: ${courseCount} 门课程, ${totalHours} 节/周`);
      
      // 检查是否有缺失的科目
      const planSubjects = plan.courseAssignments.map(ca => (ca.course as any).subject);
      const requiredSubjects = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '体育'];
      const missingSubjects = requiredSubjects.filter(subject => !planSubjects.includes(subject));
      
      if (missingSubjects.length > 0) {
        console.log(`     ⚠️  缺少科目: ${missingSubjects.join(', ')}`);
      }
    }
    console.log('');

    // 5. 教室容量与需求匹配检查
    console.log('🏢 教室容量与需求检查:');
    const rooms = await Room.find({ isActive: true });
    const roomsByType: { [key: string]: any[] } = {};
    
    rooms.forEach(room => {
      if (!roomsByType[room.type]) {
        roomsByType[room.type] = [];
      }
      roomsByType[room.type].push(room);
    });

    Object.entries(roomsByType).forEach(([type, rooms]) => {
      const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
      const avgCapacity = Math.round(totalCapacity / rooms.length);
      console.log(`   ${type}: ${rooms.length} 间, 平均容量 ${avgCapacity} 人`);
    });
    console.log('');

    // 6. 排课可行性评估
    console.log('⚡ 排课可行性评估:');
    
    // 每周总时段数 (5天 × 8节)
    const totalSlotsPerWeek = 5 * 8;
    console.log(`   每周总时段: ${totalSlotsPerWeek} 个`);
    
    // 每班每周需要的课时
    const hoursPerClassPerWeek = totalWeeklyHours;
    console.log(`   每班周课时: ${hoursPerClassPerWeek} 节`);
    
    // 所有班级总课时需求
    const totalHoursNeeded = hoursPerClassPerWeek * classCount;
    console.log(`   总课时需求: ${totalHoursNeeded} 节/周`);
    
    // 普通教室可提供的总时段数
    const regularRooms = roomsByType['普通教室'] || [];
    const totalRegularSlots = regularRooms.length * totalSlotsPerWeek;
    console.log(`   普通教室总时段: ${totalRegularSlots} 个/周`);
    
    // 利用率计算
    const utilizationRate = (totalHoursNeeded / totalRegularSlots * 100).toFixed(1);
    console.log(`   教室利用率: ${utilizationRate}%`);
    
    if (parseFloat(utilizationRate) > 80) {
      console.log('   ⚠️  教室利用率较高，排课可能较为紧张');
    } else {
      console.log('   ✅ 教室资源充足，排课应该可行');
    }
    console.log('');

    // 7. 教师工作量检查
    console.log('👥 教师工作量检查:');
    const teacherWorkload: { [key: string]: number } = {};
    
    teachingPlans.forEach(plan => {
      plan.courseAssignments.forEach(ca => {
        const teacherId = (ca.teacher as any)._id.toString();
        const teacherName = (ca.teacher as any).name;
        const hours = ca.weeklyHours;
        
        if (!teacherWorkload[teacherName]) {
          teacherWorkload[teacherName] = 0;
        }
        teacherWorkload[teacherName] += hours;
      });
    });

    Object.entries(teacherWorkload).forEach(([name, hours]) => {
      const teacher = teachers.find(t => t.name === name);
      const maxHours = teacher?.maxWeeklyHours || 20;
      const utilizationPercent = ((hours / maxHours) * 100).toFixed(1);
      
      console.log(`   ${name}: ${hours}/${maxHours} 节 (${utilizationPercent}%)`);
      
      if (hours > maxHours) {
        console.log(`     ❌ 超出最大工作量！`);
      }
    });

    console.log('');
    console.log('✅ 数据验证完成！');
    console.log('🎯 系统已准备好进行智能排课');

  } catch (error) {
    console.error('❌ 数据验证失败:', error);
    throw error;
  }
}

/**
 * 主执行函数
 */
async function main(): Promise<void> {
  try {
    console.log('🎯 智能排课系统 - 数据验证器');
    console.log('=' .repeat(50));
    
    await connectDatabase();
    await validateData();
    
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

export { main as validateMockData };
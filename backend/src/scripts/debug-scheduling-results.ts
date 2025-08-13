/**
 * 调试智能排课结果脚本
 * 
 * 用于诊断智能排课后结果没有变化的问题
 * 使用现有数据库数据进行测试
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Schedule } from '../models/Schedule';
import { Class } from '../models/Class';
import { Teacher } from '../models/Teacher';
import { Room } from '../models/Room';
import { TeachingPlan } from '../models/TeachingPlan';
import { SchedulingRules } from '../models/SchedulingRules';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * 检查数据库连接和基础数据
 */
async function checkDatabaseStatus(): Promise<void> {
  console.log('🔍 检查数据库状态...');
  
  try {
    // 检查各集合的数据量
    const scheduleCount = await Schedule.countDocuments();
    const classCount = await Class.countDocuments();
    const teacherCount = await Teacher.countDocuments();
    const roomCount = await Room.countDocuments();
    const teachingPlanCount = await TeachingPlan.countDocuments();
    const rulesCount = await SchedulingRules.countDocuments();
    
    console.log('📊 数据库统计信息:');
    console.log(`   排课记录: ${scheduleCount}`);
    console.log(`   班级数量: ${classCount}`);
    console.log(`   教师数量: ${teacherCount}`);
    console.log(`   教室数量: ${roomCount}`);
    console.log(`   教学计划: ${teachingPlanCount}`);
    console.log(`   排课规则: ${rulesCount}`);
    
    if (scheduleCount === 0) {
      console.log('⚠️  警告: 数据库中没有排课记录');
    }
    
  } catch (error) {
    console.error('❌ 检查数据库状态失败:', error);
    throw error;
  }
}

/**
 * 检查指定学年学期的排课数据
 */
async function checkScheduleData(academicYear: string, semester: number): Promise<void> {
  console.log(`\n🔍 检查 ${academicYear} 学年第 ${semester} 学期的排课数据...`);
  
  try {
    const semesterKey = `${academicYear}-${semester}`;
    
    // 查询排课记录
    const schedules = await Schedule.find({
      semester: semesterKey,
      status: 'active'
    }).populate('class course teacher room');
    
    console.log(`📅 找到 ${schedules.length} 条排课记录`);
    
    if (schedules.length === 0) {
      console.log('⚠️  该学期没有排课记录');
      return;
    }
    
    // 按班级分组统计
    const classStats = new Map<string, number>();
    const teacherStats = new Map<string, number>();
    const roomStats = new Map<string, number>();
    
    schedules.forEach(schedule => {
      const className = (schedule.class as any)?.name || '未知班级';
      const teacherName = (schedule.teacher as any)?.name || '未知教师';
      const roomName = (schedule.room as any)?.name || '未知教室';
      
      classStats.set(className, (classStats.get(className) || 0) + 1);
      teacherStats.set(teacherName, (teacherStats.get(teacherName) || 0) + 1);
      roomStats.set(roomName, (roomStats.get(roomName) || 0) + 1);
    });
    
    console.log('\n📚 班级排课统计:');
    classStats.forEach((count, className) => {
      console.log(`   ${className}: ${count} 节`);
    });
    
    console.log('\n👨‍🏫 教师排课统计:');
    teacherStats.forEach((count, teacherName) => {
      console.log(`   ${teacherName}: ${count} 节`);
    });
    
    console.log('\n🏫 教室使用统计:');
    roomStats.forEach((count, roomName) => {
      console.log(`   ${roomName}: ${count} 节`);
    });
    
    // 检查数据完整性
    console.log('\n🔍 数据完整性检查:');
    let missingData = 0;
    schedules.forEach((schedule, index) => {
      if (!schedule.class || !schedule.course || !schedule.teacher || !schedule.room) {
        missingData++;
        console.log(`   ⚠️  记录 ${index + 1} 缺少关联数据:`, {
          class: !!schedule.class,
          course: !!schedule.course,
          teacher: !!schedule.teacher,
          room: !!schedule.room
        });
      }
    });
    
    if (missingData === 0) {
      console.log('   ✅ 所有排课记录数据完整');
    } else {
      console.log(`   ⚠️  发现 ${missingData} 条记录数据不完整`);
    }
    
  } catch (error) {
    console.error('❌ 检查排课数据失败:', error);
    throw error;
  }
}

/**
 * 检查排课数据格式一致性
 */
async function checkDataFormatConsistency(academicYear: string, semester: number): Promise<void> {
  console.log(`\n🔍 检查数据格式一致性...`);
  
  try {
    const semesterKey = `${academicYear}-${semester}`;
    
    // 检查semester字段格式
    const schedules = await Schedule.find({
      semester: semesterKey,
      status: 'active'
    }).select('semester academicYear dayOfWeek period');
    
    if (schedules.length === 0) {
      console.log('⚠️  没有找到排课记录进行格式检查');
      return;
    }
    
    console.log('📋 数据格式检查结果:');
    
    // 检查semester格式
    const semesterFormats = new Set(schedules.map(s => s.semester));
    console.log(`   semester字段格式: ${Array.from(semesterFormats).join(', ')}`);
    
    // 检查academicYear格式
    const academicYearFormats = new Set(schedules.map(s => s.academicYear));
    console.log(`   academicYear字段格式: ${Array.from(academicYearFormats).join(', ')}`);
    
    // 检查时间字段范围
    const dayOfWeekRange = {
      min: Math.min(...schedules.map(s => s.dayOfWeek)),
      max: Math.max(...schedules.map(s => s.dayOfWeek))
    };
    const periodRange = {
      min: Math.min(...schedules.map(s => s.period)),
      max: Math.max(...schedules.map(s => s.period))
    };
    
    console.log(`   dayOfWeek范围: ${dayOfWeekRange.min} - ${dayOfWeekRange.max}`);
    console.log(`   period范围: ${periodRange.min} - ${periodRange.max}`);
    
    // 验证格式是否符合预期
    const expectedSemesterFormat = `${academicYear}-${semester}`;
    const formatConsistent = schedules.every(s => s.semester === expectedSemesterFormat);
    
    if (formatConsistent) {
      console.log('   ✅ 数据格式一致');
    } else {
      console.log('   ❌ 数据格式不一致，可能导致查询失败');
      console.log(`      期望格式: ${expectedSemesterFormat}`);
    }
    
  } catch (error) {
    console.error('❌ 检查数据格式一致性失败:', error);
    throw error;
  }
}

/**
 * 模拟前端查询测试
 */
async function testFrontendQuery(academicYear: string, semester: number): Promise<void> {
  console.log(`\n🧪 模拟前端查询测试...`);
  
  try {
    const semesterKey = `${academicYear}-${semester}`;
    
    // 获取一个班级进行测试
    const testClass = await Class.findOne({ isActive: true });
    if (!testClass) {
      console.log('⚠️  没有找到可用的班级进行测试');
      return;
    }
    
    console.log(`📚 测试班级: ${testClass.name}`);
    
    // 模拟前端查询逻辑
    const schedules = await Schedule.find({
      class: testClass._id,
      semester: semesterKey,
      status: 'active'
    })
    .populate('course', 'name subject')
    .populate('teacher', 'name')
    .populate('room', 'name roomNumber')
    .sort({ dayOfWeek: 1, period: 1 });
    
    console.log(`📅 查询到 ${schedules.length} 条排课记录`);
    
    if (schedules.length === 0) {
      console.log('⚠️  该班级没有排课记录');
      return;
    }
    
    // 构建前端所需的数据格式
    const weekSchedule: any = {};
    for (let day = 1; day <= 5; day++) {
      weekSchedule[day] = {};
      for (let period = 1; period <= 8; period++) {
        weekSchedule[day][period] = null;
      }
    }
    
    let totalHours = 0;
    schedules.forEach(schedule => {
      const course = schedule.course as any;
      const teacher = schedule.teacher as any;
      const room = schedule.room as any;
      
      if (course && teacher && room) {
        weekSchedule[schedule.dayOfWeek][schedule.period] = {
          courseId: course._id.toString(),
          courseName: course.name,
          subject: course.subject,
          teacherId: teacher._id.toString(),
          teacherName: teacher.name,
          roomId: room._id.toString(),
          roomName: room.name,
          duration: 1,
          notes: schedule.notes
        };
        totalHours++;
      }
    });
    
    console.log('📊 前端数据转换结果:');
    console.log(`   总课时数: ${totalHours}`);
    console.log(`   课表数据: ${JSON.stringify(weekSchedule, null, 2).substring(0, 200)}...`);
    
    // 检查是否有空课时段
    let emptySlots = 0;
    for (let day = 1; day <= 5; day++) {
      for (let period = 1; period <= 8; period++) {
        if (!weekSchedule[day][period]) {
          emptySlots++;
        }
      }
    }
    
    console.log(`   空课时段: ${emptySlots} 个`);
    console.log(`   排课覆盖率: ${((totalHours / (5 * 8)) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ 前端查询测试失败:', error);
    throw error;
  }
}

/**
 * 生成问题诊断报告
 */
async function generateDiagnosticReport(academicYear: string, semester: number): Promise<void> {
  console.log(`\n📋 生成问题诊断报告...`);
  
  try {
    const semesterKey = `${academicYear}-${semester}`;
    
    // 检查关键问题
    const issues: string[] = [];
    
    // 1. 检查是否有排课记录
    const scheduleCount = await Schedule.countDocuments({
      semester: semesterKey,
      status: 'active'
    });
    
    if (scheduleCount === 0) {
      issues.push('❌ 没有找到排课记录 - 可能是排课未执行或数据未保存');
    }
    
    // 2. 检查数据格式
    const schedules = await Schedule.find({
      semester: semesterKey,
      status: 'active'
    }).limit(1);
    
    if (schedules.length > 0) {
      const schedule = schedules[0];
      if (schedule.semester !== semesterKey) {
        issues.push(`❌ 数据格式不匹配 - 期望: ${semesterKey}, 实际: ${schedule.semester}`);
      }
    }
    
    // 3. 检查关联数据完整性
    const incompleteSchedules = await Schedule.find({
      semester: semesterKey,
      status: 'active',
      $or: [
        { class: { $exists: false } },
        { course: { $exists: false } },
        { teacher: { $exists: false } },
        { room: { $exists: false } }
      ]
    });
    
    if (incompleteSchedules.length > 0) {
      issues.push(`❌ 发现 ${incompleteSchedules.length} 条记录关联数据不完整`);
    }
    
    // 生成报告
    console.log('\n📊 问题诊断报告:');
    console.log('='.repeat(50));
    
    if (issues.length === 0) {
      console.log('✅ 未发现明显问题，排课数据正常');
      console.log('\n💡 建议检查:');
      console.log('   1. 前端是否正确调用了API');
      console.log('   2. 前端查询参数是否正确');
      console.log('   3. 网络请求是否成功');
    } else {
      console.log('❌ 发现以下问题:');
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
      
      console.log('\n🔧 修复建议:');
      if (scheduleCount === 0) {
        console.log('   1. 重新执行智能排课');
        console.log('   2. 检查排课任务是否成功完成');
        console.log('   3. 检查排课服务日志');
      }
      
      if (incompleteSchedules.length > 0) {
        console.log('   1. 检查教学计划数据完整性');
        console.log('   2. 重新生成测试数据');
        console.log('   3. 验证排课算法执行结果');
      }
    }
    
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ 生成诊断报告失败:', error);
    throw error;
  }
}

/**
 * 主执行函数
 */
async function main(): Promise<void> {
  try {
    console.log('🚀 开始调试智能排课结果问题...\n');
    
    // 连接数据库
    await connectDatabase();
    console.log('✅ 数据库连接成功\n');
    
    // 设置测试参数
    const academicYear = '2024-2025';
    const semester = 1;
    
    console.log(`🎯 测试参数: ${academicYear} 学年第 ${semester} 学期\n`);
    
    // 执行各项检查
    await checkDatabaseStatus();
    await checkScheduleData(academicYear, semester);
    await checkDataFormatConsistency(academicYear, semester);
    await testFrontendQuery(academicYear, semester);
    await generateDiagnosticReport(academicYear, semester);
    
    console.log('\n🎉 调试完成！');
    
  } catch (error) {
    console.error('❌ 调试过程出错:', error);
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

export { main as debugSchedulingResults };

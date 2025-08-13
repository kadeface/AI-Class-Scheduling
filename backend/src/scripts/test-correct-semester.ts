/**
 * 测试正确学期数据脚本
 * 
 * 用于测试 2025-2026-1 学期的排课数据
 * 验证前端查询逻辑是否正常
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Schedule, Class, Course, Teacher, Room } from '../models';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * 测试正确学期的排课数据
 */
async function testCorrectSemester(): Promise<void> {
  console.log('🧪 测试正确学期的排课数据...');
  
  try {
    const academicYear = '2025-2026';
    const semester = 1;
    const semesterKey = `${academicYear}-${semester}`;
    
    console.log(`🎯 测试学期: ${semesterKey}\n`);
    
    // 1. 检查排课记录总数
    const totalSchedules = await Schedule.countDocuments({
      semester: semesterKey,
      status: 'active'
    });
    
    console.log(`📊 排课记录总数: ${totalSchedules}`);
    
    if (totalSchedules === 0) {
      console.log('⚠️  该学期没有排课记录');
      return;
    }
    
    // 2. 检查班级排课情况
    const classSchedules = await Schedule.find({
      semester: semesterKey,
      status: 'active'
    })
    .populate('class', 'name grade')
    .populate('course', 'name subject')
    .populate('teacher', 'name')
    .populate('room', 'name roomNumber')
    .sort({ 'class.name': 1, dayOfWeek: 1, period: 1 });
    
    // 按班级分组
    const classStats = new Map<string, {
      schedules: any[];
      totalHours: number;
      subjects: Set<string>;
    }>();
    
    classSchedules.forEach(schedule => {
      const className = (schedule.class as any)?.name || '未知班级';
      const course = schedule.course as any;
      
      if (!classStats.has(className)) {
        classStats.set(className, {
          schedules: [],
          totalHours: 0,
          subjects: new Set()
        });
      }
      
      const stats = classStats.get(className)!;
      stats.schedules.push(schedule);
      stats.totalHours++;
      if (course?.subject) {
        stats.subjects.add(course.subject);
      }
    });
    
    console.log('\n📚 班级排课统计:');
    console.log('='.repeat(60));
    
    Array.from(classStats.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([className, stats]) => {
        console.log(`\n🏫 ${className}`);
        console.log(`   总课时: ${stats.totalHours}`);
        console.log(`   学科: ${Array.from(stats.subjects).join(', ')}`);
        
        // 显示课表预览
        const weekSchedule: any = {};
        for (let day = 1; day <= 5; day++) {
          weekSchedule[day] = {};
          for (let period = 1; period <= 8; period++) {
            weekSchedule[day][period] = null;
          }
        }
        
        stats.schedules.forEach(schedule => {
          const course = schedule.course as any;
          const teacher = schedule.teacher as any;
          const room = schedule.room as any;
          
          if (course && teacher && room) {
            weekSchedule[schedule.dayOfWeek][schedule.period] = {
              courseName: course.name,
              subject: course.subject,
              teacherName: teacher.name,
              roomName: room.name
            };
          }
        });
        
        // 显示课表网格
        console.log('   课表预览:');
        for (let period = 1; period <= 8; period++) {
          let row = `      ${period.toString().padStart(2)}: `;
          for (let day = 1; day <= 5; day++) {
            const slot = weekSchedule[day][period];
            if (slot) {
              row += `${slot.subject}(${slot.teacherName}) `.padEnd(20);
            } else {
              row += '空课 '.padEnd(20);
            }
          }
          console.log(row);
        }
      });
    
    // 3. 测试前端查询逻辑
    console.log('\n🧪 测试前端查询逻辑...');
    
    const testClass = await Class.findOne({ isActive: true });
    if (testClass) {
      console.log(`📚 测试班级: ${testClass.name}`);
      
      const classSchedules = await Schedule.find({
        class: testClass._id,
        semester: semesterKey,
        status: 'active'
      })
      .populate('course', 'name subject')
      .populate('teacher', 'name')
      .populate('room', 'name roomNumber')
      .sort({ dayOfWeek: 1, period: 1 });
      
      console.log(`📅 查询到 ${classSchedules.length} 条排课记录`);
      
      if (classSchedules.length > 0) {
        console.log('✅ 前端查询逻辑正常，能够获取到排课数据');
        
        // 构建前端数据格式
        const weekSchedule: any = {};
        for (let day = 1; day <= 5; day++) {
          weekSchedule[day] = {};
          for (let period = 1; period <= 8; period++) {
            weekSchedule[day][period] = null;
          }
        }
        
        let totalHours = 0;
        classSchedules.forEach(schedule => {
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
        
        console.log(`📊 数据转换结果:`);
        console.log(`   总课时数: ${totalHours}`);
        console.log(`   排课覆盖率: ${((totalHours / (5 * 8)) * 100).toFixed(1)}%`);
        
      } else {
        console.log('❌ 前端查询逻辑异常，无法获取排课数据');
      }
    }
    
  } catch (error) {
    console.error('❌ 测试正确学期数据失败:', error);
    throw error;
  }
}

/**
 * 生成修复建议
 */
async function generateFixSuggestions(): Promise<void> {
  console.log('\n📋 生成修复建议...');
  console.log('='.repeat(60));
  
  console.log('🔍 问题分析:');
  console.log('   1. 智能排课确实执行了，生成了 224 条排课记录');
  console.log('   2. 但是排课到了错误的学期: 2025-2026-1');
  console.log('   3. 前端查询 2024-2025-1 学期时返回空结果');
  
  console.log('\n🔧 修复方案:');
  console.log('   方案1 (推荐): 修改前端查询参数');
  console.log('      - 将前端查询的学期改为 2025-2026-1');
  console.log('      - 或者添加学期选择器让用户选择');
  console.log('      - 优点: 快速解决，无需重新排课');
  console.log('      - 缺点: 学期信息不准确');
  
  console.log('\n   方案2: 修复排课服务');
  console.log('      - 检查排课服务的学期参数处理');
  console.log('      - 重新执行排课到正确的学期');
  console.log('      - 优点: 数据准确，符合预期');
  console.log('      - 缺点: 需要重新排课，耗时较长');
  
  console.log('\n💡 建议:');
  console.log('   1. 先使用方案1快速验证前端显示是否正常');
  console.log('   2. 如果前端显示正常，再考虑方案2修复数据准确性');
  console.log('   3. 检查排课服务的学期参数配置');
  
  console.log('='.repeat(60));
}

/**
 * 主执行函数
 */
async function main(): Promise<void> {
  try {
    console.log('🚀 开始测试正确学期数据...\n');
    
    // 连接数据库
    await connectDatabase();
    console.log('✅ 数据库连接成功\n');
    
    // 执行测试
    await testCorrectSemester();
    await generateFixSuggestions();
    
    console.log('\n🎉 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程出错:', error);
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

export { main as testCorrectSemester };

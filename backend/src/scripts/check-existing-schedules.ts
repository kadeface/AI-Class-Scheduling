/**
 * 检查现有排课记录脚本
 * 
 * 用于分析数据库中现有排课记录的学期分布
 * 帮助诊断智能排课结果问题
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Schedule } from '../models/Schedule';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * 检查现有排课记录的学期分布
 */
async function checkExistingSchedules(): Promise<void> {
  console.log('🔍 检查现有排课记录的学期分布...');
  
  try {
    // 查询所有排课记录
    const allSchedules = await Schedule.find({}).select('semester academicYear status createdAt');
    
    console.log(`📊 总共找到 ${allSchedules.length} 条排课记录\n`);
    
    if (allSchedules.length === 0) {
      console.log('⚠️  数据库中没有排课记录');
      return;
    }
    
    // 按学期分组统计
    const semesterStats = new Map<string, {
      count: number;
      academicYears: Set<string>;
      statuses: Set<string>;
      dateRange: { min: Date; max: Date };
    }>();
    
    allSchedules.forEach(schedule => {
      const semester = schedule.semester;
      const academicYear = schedule.academicYear;
      const status = schedule.status;
      const createdAt = schedule.createdAt;
      
      if (!semesterStats.has(semester)) {
        semesterStats.set(semester, {
          count: 0,
          academicYears: new Set(),
          statuses: new Set(),
          dateRange: { min: createdAt, max: createdAt }
        });
      }
      
      const stats = semesterStats.get(semester)!;
      stats.count++;
      stats.academicYears.add(academicYear);
      stats.statuses.add(status);
      
      if (createdAt < stats.dateRange.min) stats.dateRange.min = createdAt;
      if (createdAt > stats.dateRange.max) stats.dateRange.max = createdAt;
    });
    
    // 显示统计结果
    console.log('📋 学期分布统计:');
    console.log('='.repeat(80));
    
    const sortedSemesters = Array.from(semesterStats.entries()).sort((a, b) => b[1].count - a[1].count);
    
    sortedSemesters.forEach(([semester, stats]) => {
      console.log(`\n📅 学期: ${semester}`);
      console.log(`   记录数量: ${stats.count}`);
      console.log(`   学年: ${Array.from(stats.academicYears).join(', ')}`);
      console.log(`   状态: ${Array.from(stats.statuses).join(', ')}`);
      console.log(`   创建时间范围: ${stats.dateRange.min.toLocaleDateString()} - ${stats.dateRange.max.toLocaleDateString()}`);
      
      // 检查是否是我们要找的学期
      if (semester === '2024-2025-1') {
        console.log(`   🎯 这是我们要找的目标学期！`);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    
    // 检查目标学期
    const targetSemester = '2025-2026-1';
    const targetSchedules = await Schedule.find({
      semester: targetSemester,
      status: 'active'
    }).populate('class course teacher room');
    
    console.log(`\n🎯 检查目标学期: ${targetSemester}`);
    console.log(`   找到 ${targetSchedules.length} 条记录`);
    
    if (targetSchedules.length > 0) {
      console.log('\n📚 前5条记录详情:');
      targetSchedules.slice(0, 5).forEach((schedule, index) => {
        const className = (schedule.class as any)?.name || '未知班级';
        const courseName = (schedule.course as any)?.name || '未知课程';
        const teacherName = (schedule.teacher as any)?.name || '未知教师';
        const roomName = (schedule.room as any)?.name || '未知教室';
        
        console.log(`   ${index + 1}. ${className} - ${courseName} - ${teacherName} - ${roomName}`);
        console.log(`      时间: 周${schedule.dayOfWeek}第${schedule.period}节`);
        console.log(`      状态: ${schedule.status}`);
      });
    } else {
      console.log('   ⚠️  目标学期没有排课记录');
      
      // 检查是否有其他格式的记录
      const alternativeSchedules = await Schedule.find({
        $or: [
          { semester: { $regex: /2024.*1/ } },
          { academicYear: '2024-2025' }
        ]
      }).select('semester academicYear');
      
      if (alternativeSchedules.length > 0) {
        console.log('\n💡 发现可能的替代记录:');
        const uniqueFormats = new Set(alternativeSchedules.map(s => `${s.academicYear}-${s.semester}`));
        uniqueFormats.forEach(format => {
          console.log(`   - ${format}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ 检查现有排课记录失败:', error);
    throw error;
  }
}

/**
 * 检查排课记录的创建时间分布
 */
async function checkScheduleTimeline(): Promise<void> {
  console.log('\n🕐 检查排课记录的时间线...');
  
  try {
    // 按创建时间分组统计
    const schedules = await Schedule.find({}).select('createdAt semester').sort({ createdAt: 1 });
    
    if (schedules.length === 0) return;
    
    const firstSchedule = schedules[0];
    const lastSchedule = schedules[schedules.length - 1];
    
    console.log(`📅 排课记录时间范围:`);
    console.log(`   最早: ${firstSchedule.createdAt.toLocaleString()}`);
    console.log(`   最晚: ${lastSchedule.createdAt.toLocaleString()}`);
    
    // 按月份分组统计
    const monthlyStats = new Map<string, number>();
    schedules.forEach(schedule => {
      const monthKey = schedule.createdAt.toISOString().substring(0, 7); // YYYY-MM
      monthlyStats.set(monthKey, (monthlyStats.get(monthKey) || 0) + 1);
    });
    
    console.log('\n📊 按月创建统计:');
    Array.from(monthlyStats.entries())
      .sort()
      .forEach(([month, count]) => {
        console.log(`   ${month}: ${count} 条`);
      });
    
  } catch (error) {
    console.error('❌ 检查排课记录时间线失败:', error);
  }
}

/**
 * 主执行函数
 */
async function main(): Promise<void> {
  try {
    console.log('🚀 开始检查现有排课记录...\n');
    
    // 连接数据库
    await connectDatabase();
    console.log('✅ 数据库连接成功\n');
    
    // 执行检查
    await checkExistingSchedules();
    await checkScheduleTimeline();
    
    console.log('\n🎉 检查完成！');
    
  } catch (error) {
    console.error('❌ 检查过程出错:', error);
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

export { main as checkExistingSchedules };

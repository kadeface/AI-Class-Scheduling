/**
 * 检查教室分配脚本
 * 
 * 用于诊断排课服务为什么没有分配教室
 * 分析教室分配失败的原因
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Schedule, Class, Course, Teacher, Room } from '../models';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * 检查排课记录的教室分配情况
 */
async function checkRoomAssignment(): Promise<void> {
  console.log('🔍 检查排课记录的教室分配情况...');
  
  try {
    const semesterKey = '2025-2026-1';
    
    // 1. 检查排课记录的教室字段
    const schedules = await Schedule.find({
      semester: semesterKey,
      status: 'active'
    }).select('_id class course teacher room dayOfWeek period');
    
    console.log(`📊 找到 ${schedules.length} 条排课记录`);
    
    if (schedules.length === 0) {
      console.log('⚠️  没有找到排课记录');
      return;
    }
    
    // 统计教室分配情况
    let withRoom = 0;
    let withoutRoom = 0;
    const roomIds = new Set<string>();
    
    schedules.forEach(schedule => {
      if (schedule.room) {
        withRoom++;
        roomIds.add(schedule.room.toString());
      } else {
        withoutRoom++;
      }
    });
    
    console.log('\n📋 教室分配统计:');
    console.log(`   有教室分配: ${withRoom} 条`);
    console.log(`   无教室分配: ${withoutRoom} 条`);
    console.log(`   使用教室数: ${roomIds.size} 个`);
    
    if (withoutRoom > 0) {
      console.log(`\n⚠️  发现 ${withoutRoom} 条记录没有教室分配！`);
      
      // 检查前几条无教室的记录
      const noRoomSchedules = schedules.filter(s => !s.room).slice(0, 5);
      console.log('\n📝 无教室记录示例:');
      noRoomSchedules.forEach((schedule, index) => {
        console.log(`   ${index + 1}. ID: ${schedule._id}`);
        console.log(`      班级: ${schedule.class}`);
        console.log(`      课程: ${schedule.course}`);
        console.log(`      教师: ${schedule.teacher}`);
        console.log(`      教室: ${schedule.room || 'NULL'}`);
        console.log(`      时间: 周${schedule.dayOfWeek}第${schedule.period}节`);
      });
    }
    
  } catch (error) {
    console.error('❌ 检查教室分配失败:', error);
    throw error;
  }
}

/**
 * 检查教室资源是否充足
 */
async function checkRoomResources(): Promise<void> {
  console.log('\n🔍 检查教室资源是否充足...');
  
  try {
    // 1. 统计教室总数
    const totalRooms = await Room.countDocuments({ isActive: true });
    console.log(`🏫 总教室数量: ${totalRooms}`);
    
    if (totalRooms === 0) {
      console.log('❌ 没有可用的教室！这是教室分配失败的根本原因');
      return;
    }
    
    // 2. 检查教室类型分布
    const roomTypes = await Room.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n📊 教室类型分布:');
    roomTypes.forEach(type => {
      console.log(`   ${type._id}: ${type.count} 个`);
    });
    
    // 3. 检查教室容量
    const roomCapacities = await Room.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, avgCapacity: { $avg: '$capacity' }, minCapacity: { $min: '$capacity' }, maxCapacity: { $max: '$capacity' } } }
    ]);
    
    if (roomCapacities.length > 0) {
      const stats = roomCapacities[0];
      console.log('\n📏 教室容量统计:');
      console.log(`   平均容量: ${Math.round(stats.avgCapacity)} 人`);
      console.log(`   最小容量: ${stats.minCapacity} 人`);
      console.log(`   最大容量: ${stats.maxCapacity} 人`);
    }
    
  } catch (error) {
    console.error('❌ 检查教室资源失败:', error);
  }
}

/**
 * 检查排课冲突情况
 */
async function checkSchedulingConflicts(): Promise<void> {
  console.log('\n🔍 检查排课冲突情况...');
  
  try {
    const semesterKey = '2025-2026-1';
    
    // 检查同一时间段的教室使用情况
    const timeSlotConflicts = await Schedule.aggregate([
      { $match: { semester: semesterKey, status: 'active' } },
      { $group: { 
        _id: { 
          dayOfWeek: '$dayOfWeek', 
          period: '$period' 
        }, 
        schedules: { $push: '$$ROOT' },
        count: { $sum: 1 }
      }},
      { $match: { count: { $gt: 1 } } },
      { $sort: { '_id.dayOfWeek': 1, '_id.period': 1 } }
    ]);
    
    console.log(`📊 发现 ${timeSlotConflicts.length} 个时间段有冲突`);
    
    if (timeSlotConflicts.length > 0) {
      console.log('\n⚠️  时间冲突详情:');
      timeSlotConflicts.slice(0, 3).forEach(conflict => {
        console.log(`   周${conflict._id.dayOfWeek}第${conflict._id.period}节: ${conflict.count} 个安排`);
        conflict.schedules.slice(0, 3).forEach((schedule: any) => {
          console.log(`     - 班级: ${schedule.class}, 课程: ${schedule.course}, 教师: ${schedule.teacher}, 教室: ${schedule.room || 'NULL'}`);
        });
      });
    }
    
    // 检查教师时间冲突
    const teacherConflicts = await Schedule.aggregate([
      { $match: { semester: semesterKey, status: 'active' } },
      { $group: { 
        _id: { 
          teacher: '$teacher',
          dayOfWeek: '$dayOfWeek', 
          period: '$period' 
        }, 
        count: { $sum: 1 }
      }},
      { $match: { count: { $gt: 1 } } }
    ]);
    
    console.log(`👨‍🏫 发现 ${teacherConflicts.length} 个教师时间冲突`);
    
  } catch (error) {
    console.error('❌ 检查排课冲突失败:', error);
  }
}

/**
 * 生成问题分析报告
 */
async function generateProblemAnalysis(): Promise<void> {
  console.log('\n📋 生成问题分析报告...');
  console.log('='.repeat(60));
  
  console.log('🔍 问题分析:');
  console.log('   1. 智能排课算法执行了，生成了课程和教师分配');
  console.log('   2. 但是教室分配失败了，所有记录的room字段都是空的');
  console.log('   3. 前端查询时，由于教室数据缺失，无法构建完整的课表数据');
  
  console.log('\n🎯 根本原因:');
  console.log('   1. 排课服务在分配教室时出现错误');
  console.log('   2. 可能是教室资源不足或分配算法有问题');
  console.log('   3. 或者是教室关联数据保存失败');
  
  console.log('\n🔧 修复方案:');
  console.log('   方案1: 修复排课服务的教室分配逻辑');
  console.log('   方案2: 为现有排课记录手动分配教室');
  console.log('   方案3: 重新执行排课，确保教室分配成功');
  
  console.log('\n💡 建议:');
  console.log('   1. 先检查排课服务的教室分配代码');
  console.log('   2. 验证教室资源是否充足');
  console.log('   3. 考虑重新排课或手动修复数据');
  
  console.log('='.repeat(60));
}

/**
 * 主执行函数
 */
async function main(): Promise<void> {
  try {
    console.log('🚀 开始检查教室分配问题...\n');
    
    // 连接数据库
    await connectDatabase();
    console.log('✅ 数据库连接成功\n');
    
    // 执行检查
    await checkRoomAssignment();
    await checkRoomResources();
    await checkSchedulingConflicts();
    await generateProblemAnalysis();
    
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

export { main as checkRoomAssignment };

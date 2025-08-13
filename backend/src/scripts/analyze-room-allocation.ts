/**
 * 分析教室分配算法脚本
 * 
 * 用于分析排课服务中教室分配算法的问题
 * 找出产生教室冲突的根本原因
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Schedule, Class, Course, Teacher, Room } from '../models';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * 分析教室分配算法问题
 */
async function analyzeRoomAllocation(): Promise<void> {
  console.log('🔍 分析教室分配算法问题...');
  
  try {
    const semesterKey = '2025-2026-1';
    
    // 1. 检查排课记录中的教室使用情况
    const schedules = await Schedule.find({
      semester: semesterKey,
      status: 'active'
    }).populate('class course teacher room');
    
    console.log(`📊 找到 ${schedules.length} 条排课记录`);
    
    if (schedules.length === 0) {
      console.log('⚠️  没有找到排课记录');
      return;
    }
    
    // 2. 分析教室分配模式
    console.log('\n🔍 分析教室分配模式...');
    
    // 按班级分组，检查每个班级的教室使用情况
    const classRoomUsage = new Map<string, {
      className: string;
      totalSchedules: number;
      uniqueRooms: Set<string>;
      roomDistribution: Map<string, number>;
    }>();
    
    schedules.forEach(schedule => {
      const className = (schedule.class as any)?.name || '未知班级';
      const roomId = (schedule.room as any)?._id?.toString() || '无教室';
      
      if (!classRoomUsage.has(className)) {
        classRoomUsage.set(className, {
          className,
          totalSchedules: 0,
          uniqueRooms: new Set(),
          roomDistribution: new Map()
        });
      }
      
      const classInfo = classRoomUsage.get(className)!;
      classInfo.totalSchedules++;
      classInfo.uniqueRooms.add(roomId);
      
      const roomCount = classInfo.roomDistribution.get(roomId) || 0;
      classInfo.roomDistribution.set(roomId, roomCount + 1);
    });
    
    // 显示每个班级的教室使用情况
    console.log('\n📚 班级教室使用情况:');
    console.log('='.repeat(80));
    
    Array.from(classRoomUsage.entries())
      .sort((a, b) => a[1].className.localeCompare(b[1].className))
      .forEach(([className, info]) => {
        console.log(`\n🏫 ${info.className}:`);
        console.log(`   总课时: ${info.totalSchedules}`);
        console.log(`   使用教室数: ${info.uniqueRooms.size}`);
        
        if (info.uniqueRooms.size === 1) {
          const roomId = Array.from(info.uniqueRooms)[0];
          const roomName = (schedules.find(s => 
            (s.class as any)?.name === className && 
            (s.room as any)?._id?.toString() === roomId
          )?.room as any)?.name || '未知教室';
          
          console.log(`   ✅ 固定教室: ${roomName} (${roomId})`);
        } else {
          console.log(`   ⚠️  使用多个教室:`);
          Array.from(info.uniqueRooms).forEach(roomId => {
            const roomName = (schedules.find(s => 
              (s.class as any)?.name === className && 
              (s.room as any)?._id?.toString() === roomId
            )?.room as any)?.name || '未知教室';
            const count = info.roomDistribution.get(roomId) || 0;
            console.log(`      - ${roomName}: ${count} 节课`);
          });
        }
      });
    
    // 3. 分析教室冲突详情
    console.log('\n🔍 分析教室冲突详情...');
    
    // 按时间段分组，检查每个时间段的教室使用情况
    const timeSlotRoomUsage = new Map<string, {
      dayOfWeek: number;
      period: number;
      schedules: any[];
      roomConflicts: Map<string, string[]>; // roomId -> [className1, className2, ...]
    }>();
    
    schedules.forEach(schedule => {
      const timeKey = `${schedule.dayOfWeek}_${schedule.period}`;
      const className = (schedule.class as any)?.name || '未知班级';
      const roomId = (schedule.room as any)?._id?.toString() || '无教室';
      
      if (!timeSlotRoomUsage.has(timeKey)) {
        timeSlotRoomUsage.set(timeKey, {
          dayOfWeek: schedule.dayOfWeek,
          period: schedule.period,
          schedules: [],
          roomConflicts: new Map()
        });
      }
      
      const timeSlot = timeSlotRoomUsage.get(timeKey)!;
      timeSlot.schedules.push(schedule);
      
      if (!timeSlot.roomConflicts.has(roomId)) {
        timeSlot.roomConflicts.set(roomId, []);
      }
      timeSlot.roomConflicts.get(roomId)!.push(className);
    });
    
    // 显示教室冲突详情
    console.log('\n⚠️  教室冲突详情:');
    console.log('='.repeat(80));
    
    let totalConflicts = 0;
    Array.from(timeSlotRoomUsage.entries())
      .sort((a, b) => {
        if (a[1].dayOfWeek !== b[1].dayOfWeek) return a[1].dayOfWeek - b[1].dayOfWeek;
        return a[1].period - b[1].period;
      })
      .forEach(([timeKey, timeSlot]) => {
        const conflicts = Array.from(timeSlot.roomConflicts.entries())
          .filter(([roomId, classes]) => classes.length > 1);
        
        if (conflicts.length > 0) {
          console.log(`\n📅 周${timeSlot.dayOfWeek}第${timeSlot.period}节:`);
          conflicts.forEach(([roomId, classes]) => {
            const roomName = (schedules.find(s => 
              (s.room as any)?._id?.toString() === roomId
            )?.room as any)?.name || '未知教室';
            
            console.log(`   🏫 ${roomName} (${roomId}): ${classes.length} 个班级`);
            classes.forEach(className => {
              console.log(`      - ${className}`);
            });
            totalConflicts += classes.length - 1; // 每个冲突班级算一次冲突
          });
        }
      });
    
    console.log(`\n📊 冲突统计:`);
    console.log(`   总冲突次数: ${totalConflicts}`);
    console.log(`   冲突时间段: ${Array.from(timeSlotRoomUsage.values()).filter(ts => 
      Array.from(ts.roomConflicts.values()).some(classes => classes.length > 1)
    ).length}`);
    
    // 4. 分析算法问题
    console.log('\n🔍 分析算法问题...');
    console.log('='.repeat(80));
    
    console.log('🎯 问题分析:');
    console.log('   1. 每个班级应该使用固定教室进行常规课');
    console.log('   2. 但算法为每个课程都分配了不同的教室');
    console.log('   3. 导致同一时间段多个班级使用同一教室');
    
    console.log('\n🔧 根本原因:');
    console.log('   1. 排课算法没有实现"班级固定教室"的约束');
    console.log('   2. 教室分配逻辑过于简单，没有考虑班级教室绑定');
    console.log('   3. 缺少教室分配的业务规则验证');
    
    console.log('\n💡 修复建议:');
    console.log('   1. 修改教室分配算法，实现班级固定教室');
    console.log('   2. 在排课前建立班级-教室的绑定关系');
    console.log('   3. 添加教室分配的业务规则检查');
    console.log('   4. 重新执行排课，确保每个班级使用固定教室');
    
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ 分析教室分配算法失败:', error);
    throw error;
  }
}

/**
 * 检查班级-教室绑定关系
 */
async function checkClassRoomBinding(): Promise<void> {
  console.log('\n🔍 检查班级-教室绑定关系...');
  
  try {
    // 检查班级模型是否有教室字段
    const sampleClass = await Class.findOne({});
    if (sampleClass) {
      console.log('📋 班级模型字段:');
      console.log(`   班级名称: ${sampleClass.name}`);
      console.log(`   年级: ${sampleClass.grade}`);
      console.log(`   教室字段: ${(sampleClass as any).room ? '存在' : '不存在'}`);
      
      if ((sampleClass as any).room) {
        console.log(`   分配教室: ${(sampleClass as any).room}`);
      } else {
        console.log('   ⚠️  班级模型没有教室字段，这是问题的根源！');
        console.log('   💡 建议: 在班级模型中添加教室字段，建立班级-教室绑定关系');
      }
    }
    
    // 检查教室模型
    const sampleRoom = await Room.findOne({});
    if (sampleRoom) {
      console.log('\n📋 教室模型字段:');
      console.log(`   教室名称: ${sampleRoom.name}`);
      console.log(`   教室类型: ${sampleRoom.type}`);
      console.log(`   容量: ${sampleRoom.capacity}`);
      console.log(`   班级字段: ${(sampleRoom as any).assignedClass ? '存在' : '不存在'}`);
    }
    
  } catch (error) {
    console.error('❌ 检查班级-教室绑定关系失败:', error);
  }
}

/**
 * 主执行函数
 */
async function main(): Promise<void> {
  try {
    console.log('🚀 开始分析教室分配算法问题...\n');
    
    // 连接数据库
    await connectDatabase();
    console.log('✅ 数据库连接成功\n');
    
    // 执行分析
    await analyzeRoomAllocation();
    await checkClassRoomBinding();
    
    console.log('\n🎉 分析完成！');
    
  } catch (error) {
    console.error('❌ 分析过程出错:', error);
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

export { main as analyzeRoomAllocation };

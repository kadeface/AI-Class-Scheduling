/**
 * 建立班级-教室绑定关系脚本
 * 
 * 通过名称匹配和现有字段建立班级与教室的关联关系
 * 为排课算法提供班级固定教室的基础数据
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Schedule, Class, Course, Teacher, Room } from '../models';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * 建立班级-教室绑定关系
 */
async function establishClassRoomBinding(): Promise<void> {
  console.log('🔗 建立班级-教室绑定关系...');
  
  try {
    // 1. 获取所有班级和教室
    const classes = await Class.find({ isActive: true }).select('_id name grade homeroom');
    const rooms = await Room.find({ isActive: true }).select('_id name type capacity assignedClass');
    
    console.log(`📚 找到 ${classes.length} 个班级`);
    console.log(`🏫 找到 ${rooms.length} 个教室`);
    
    // 2. 通过名称匹配建立关联
    console.log('\n🔍 通过名称匹配建立关联...');
    
    const bindingResults: {
      className: string;
      roomName: string;
      roomId: string;
      matchType: 'name' | 'existing' | 'none';
      action: 'created' | 'updated' | 'skipped';
    }[] = [];
    
    for (const classInfo of classes) {
      // 查找名称匹配的教室
      const matchingRoom = rooms.find(room => room.name === classInfo.name);
      
      if (matchingRoom) {
        console.log(`✅ 班级 "${classInfo.name}" 匹配教室 "${matchingRoom.name}"`);
        
        // 检查是否已经有绑定关系
        if (classInfo.homeroom && classInfo.homeroom.equals(matchingRoom._id as any)) {
          console.log(`   📋 绑定关系已存在，跳过`);
          bindingResults.push({
            className: classInfo.name,
            roomName: matchingRoom.name,
            roomId: (matchingRoom._id as any).toString(),
            matchType: 'existing',
            action: 'skipped'
          });
        } else {
          // 建立绑定关系
          try {
            // 更新班级的homeroom字段
            await Class.findByIdAndUpdate(classInfo._id, {
              homeroom: matchingRoom._id
            });
            
            // 更新教室的assignedClass字段
            await Room.findByIdAndUpdate(matchingRoom._id, {
              assignedClass: classInfo._id
            });
            
            console.log(`   🔗 成功建立绑定关系`);
            bindingResults.push({
              className: classInfo.name,
              roomName: matchingRoom.name,
              roomId: (matchingRoom._id as any).toString(),
              matchType: 'name',
              action: 'created'
            });
          } catch (error) {
            console.error(`   ❌ 建立绑定关系失败:`, error);
            bindingResults.push({
              className: classInfo.name,
              roomName: matchingRoom.name,
              roomId: (matchingRoom._id as any).toString(),
              matchType: 'name',
              action: 'skipped'
            });
          }
        }
      } else {
        console.log(`⚠️  班级 "${classInfo.name}" 没有找到匹配的教室`);
        bindingResults.push({
          className: classInfo.name,
          roomName: '无匹配',
          roomId: '无',
          matchType: 'none',
          action: 'skipped'
        });
      }
    }
    
    // 3. 显示绑定结果统计
    console.log('\n📊 绑定结果统计:');
    console.log('='.repeat(60));
    
    const created = bindingResults.filter(r => r.action === 'created').length;
    const updated = bindingResults.filter(r => r.action === 'updated').length;
    const skipped = bindingResults.filter(r => r.action === 'skipped').length;
    const nameMatches = bindingResults.filter(r => r.matchType === 'name').length;
    const existingMatches = bindingResults.filter(r => r.matchType === 'existing').length;
    const noMatches = bindingResults.filter(r => r.matchType === 'none').length;
    
    console.log(`✅ 新建立绑定: ${created} 个`);
    console.log(`🔄 更新绑定: ${updated} 个`);
    console.log(`⏭️  跳过绑定: ${skipped} 个`);
    console.log(`\n📋 匹配类型统计:`);
    console.log(`   名称匹配: ${nameMatches} 个`);
    console.log(`   已存在: ${existingMatches} 个`);
    console.log(`   无匹配: ${noMatches} 个`);
    
    // 4. 显示详细的绑定结果
    console.log('\n📋 详细绑定结果:');
    console.log('='.repeat(60));
    
    bindingResults.forEach((result, index) => {
      const status = result.action === 'created' ? '✅' : 
                    result.action === 'updated' ? '🔄' : '⏭️';
      const matchType = result.matchType === 'name' ? '名称匹配' :
                       result.matchType === 'existing' ? '已存在' : '无匹配';
      
      console.log(`${index + 1}. ${status} ${result.className} -> ${result.roomName} (${matchType})`);
    });
    
    // 5. 验证绑定关系
    console.log('\n🔍 验证绑定关系...');
    await verifyClassRoomBinding();
    
  } catch (error) {
    console.error('❌ 建立班级-教室绑定关系失败:', error);
    throw error;
  }
}

/**
 * 验证班级-教室绑定关系
 */
async function verifyClassRoomBinding(): Promise<void> {
  try {
    // 重新查询绑定后的数据
    const classes = await Class.find({ isActive: true })
      .populate('homeroom', 'name type capacity')
      .select('name grade homeroom');
    
    console.log('\n📋 绑定关系验证结果:');
    console.log('='.repeat(60));
    
    let boundClasses = 0;
    let unboundClasses = 0;
    
    classes.forEach(classInfo => {
      if (classInfo.homeroom) {
        const room = classInfo.homeroom as any;
        console.log(`✅ ${classInfo.name} -> ${room.name} (${room.type}, 容量: ${room.capacity})`);
        boundClasses++;
      } else {
        console.log(`❌ ${classInfo.name} -> 无绑定教室`);
        unboundClasses++;
      }
    });
    
    console.log(`\n📊 验证统计:`);
    console.log(`   已绑定: ${boundClasses} 个班级`);
    console.log(`   未绑定: ${unboundClasses} 个班级`);
    console.log(`   绑定率: ${((boundClasses / classes.length) * 100).toFixed(1)}%`);
    
    if (boundClasses > 0) {
      console.log('\n🎉 班级-教室绑定关系建立成功！');
      console.log('💡 现在可以修改排课算法，使用班级的固定教室进行排课');
    } else {
      console.log('\n⚠️  没有建立任何绑定关系，需要检查数据');
    }
    
  } catch (error) {
    console.error('❌ 验证绑定关系失败:', error);
  }
}

/**
 * 生成修复建议
 */
async function generateFixSuggestions(): Promise<void> {
  console.log('\n📋 生成修复建议...');
  console.log('='.repeat(60));
  
  console.log('🔧 下一步修复方案:');
  console.log('   1. ✅ 班级-教室绑定关系已建立');
  console.log('   2. 🔄 修改排课算法，使用班级固定教室');
  console.log('   3. 🔄 重新执行排课，确保教室分配正确');
  console.log('   4. 🔄 验证前端课表显示');
  
  console.log('\n💡 排课算法修改要点:');
  console.log('   1. 在教室分配时，优先使用班级的homeroom字段');
  console.log('   2. 如果班级有固定教室，强制使用该教室');
  console.log('   3. 避免多个班级在同一时间使用同一教室');
  console.log('   4. 特殊课程（如体育、音乐）可以例外处理');
  
  console.log('\n🎯 预期效果:');
  console.log('   1. 每个班级使用固定教室进行常规课');
  console.log('   2. 消除教室冲突问题');
  console.log('   3. 前端课表正常显示');
  console.log('   4. 排课结果符合实际教学需求');
  
  console.log('='.repeat(60));
}

/**
 * 主执行函数
 */
async function main(): Promise<void> {
  try {
    console.log('🚀 开始建立班级-教室绑定关系...\n');
    
    // 连接数据库
    await connectDatabase();
    console.log('✅ 数据库连接成功\n');
    
    // 执行绑定
    await establishClassRoomBinding();
    await generateFixSuggestions();
    
    console.log('\n🎉 绑定关系建立完成！');
    
  } catch (error) {
    console.error('❌ 绑定过程出错:', error);
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

export { main as establishClassRoomBinding };

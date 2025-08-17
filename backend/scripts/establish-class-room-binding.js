/**
 * 建立班级-教室绑定关系脚本
 * 
 * 解决固定教室配置问题，为每个班级分配固定的教室
 */

const mongoose = require('mongoose');
require('dotenv').config();

// 连接数据库
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-class-scheduling');
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
}

// 班级-教室绑定映射
const CLASS_ROOM_MAPPING = {
  '一年级1班': '101教室',
  '一年级2班': '102教室',
  '一年级3班': '103教室',
  '一年级4班': '104教室',
  '一年级5班': '105教室',
  '一年级6班': '106教室',
  '一年级7班': '107教室',
  '一年级8班': '108教室',
  // 可以根据实际情况添加更多班级
};

/**
 * 建立班级-教室绑定关系
 */
async function establishClassRoomBinding() {
  try {
    console.log('🚀 开始建立班级-教室绑定关系...');
    
    // 获取模型
    const Class = mongoose.model('Class');
    const Room = mongoose.model('Room');
    
    // 获取所有班级
    const classes = await Class.find({ isActive: true });
    console.log(`📋 找到 ${classes.length} 个活跃班级`);
    
    // 获取所有教室
    const rooms = await Room.find({ isActive: true, type: '普通教室' });
    console.log(`🏫 找到 ${rooms.length} 个普通教室`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // 为每个班级分配固定教室
    for (const classInfo of classes) {
      try {
        const targetRoomName = CLASS_ROOM_MAPPING[classInfo.name];
        
        if (!targetRoomName) {
          console.log(`⚠️  班级 ${classInfo.name} 没有预定义的教室映射，跳过`);
          continue;
        }
        
        // 查找目标教室
        const targetRoom = rooms.find(room => room.name === targetRoomName);
        
        if (!targetRoom) {
          console.log(`❌ 未找到教室: ${targetRoomName}，班级 ${classInfo.name} 配置失败`);
          errorCount++;
          continue;
        }
        
        // 检查教室是否已被其他班级占用
        if (targetRoom.assignedClass && targetRoom.assignedClass.toString() !== classInfo._id.toString()) {
          console.log(`⚠️  教室 ${targetRoomName} 已被班级 ${targetRoom.assignedClass} 占用，跳过`);
          continue;
        }
        
        // 更新教室的assignedClass字段
        await Room.findByIdAndUpdate(targetRoom._id, {
          assignedClass: classInfo._id
        });
        
        // 更新班级的homeroom字段
        await Class.findByIdAndUpdate(classInfo._id, {
          homeroom: targetRoom._id
        });
        
        console.log(`✅ 成功为班级 ${classInfo.name} 分配固定教室: ${targetRoomName}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ 为班级 ${classInfo.name} 配置固定教室时发生错误:`, error);
        errorCount++;
      }
    }
    
    console.log('\n📊 固定教室配置完成统计:');
    console.log(`   ✅ 成功配置: ${successCount} 个班级`);
    console.log(`   ❌ 配置失败: ${errorCount} 个班级`);
    console.log(`   📋 总班级数: ${classes.length}`);
    
    // 验证配置结果
    await verifyBindingResults();
    
  } catch (error) {
    console.error('❌ 建立班级-教室绑定关系时发生错误:', error);
  }
}

/**
 * 验证绑定结果
 */
async function verifyBindingResults() {
  console.log('\n🔍 开始验证绑定结果...');
  
  try {
    const Class = mongoose.model('Class');
    const Room = mongoose.model('Room');
    
    // 检查所有班级的固定教室配置
    const classesWithRooms = await Class.find({ isActive: true }).populate('homeroom');
    
    console.log('\n📋 班级固定教室配置详情:');
    for (const classInfo of classesWithRooms) {
      if (classInfo.homeroom) {
        const room = classInfo.homeroom;
        console.log(`   ✅ ${classInfo.name} -> ${room.name} (${room.roomNumber})`);
      } else {
        console.log(`   ❌ ${classInfo.name} -> 未配置固定教室`);
      }
    }
    
    // 检查所有教室的班级分配
    const roomsWithClasses = await Room.find({ isActive: true, type: '普通教室' }).populate('assignedClass');
    
    console.log('\n🏫 教室班级分配详情:');
    for (const room of roomsWithClasses) {
      if (room.assignedClass) {
        const classInfo = room.assignedClass;
        console.log(`   ✅ ${room.name} -> ${classInfo.name}`);
      } else {
        console.log(`   ❌ ${room.name} -> 未分配班级`);
      }
    }
    
  } catch (error) {
    console.error('❌ 验证绑定结果时发生错误:', error);
  }
}

/**
 * 创建默认教室（如果不存在）
 */
async function createDefaultRooms() {
  console.log('\n🏗️  开始创建默认教室...');
  
  try {
    const Room = mongoose.model('Room');
    
    const defaultRooms = [
      { name: '101教室', roomNumber: '101', type: '普通教室', capacity: 50, building: '教学楼A', floor: 1 },
      { name: '102教室', roomNumber: '102', type: '普通教室', capacity: 50, building: '教学楼A', floor: 1 },
      { name: '103教室', roomNumber: '103', type: '普通教室', capacity: 50, building: '教学楼A', floor: 1 },
      { name: '104教室', roomNumber: '104', type: '普通教室', capacity: 50, building: '教学楼A', floor: 1 },
      { name: '105教室', roomNumber: '105', type: '普通教室', capacity: 50, building: '教学楼A', floor: 1 },
      { name: '106教室', roomNumber: '106', type: '普通教室', capacity: 50, building: '教学楼A', floor: 1 },
      { name: '107教室', roomNumber: '107', type: '普通教室', capacity: 50, building: '教学楼A', floor: 1 },
      { name: '108教室', roomNumber: '108', type: '普通教室', capacity: 50, building: '教学楼A', floor: 1 },
    ];
    
    let createdCount = 0;
    for (const roomData of defaultRooms) {
      const existingRoom = await Room.findOne({ roomNumber: roomData.roomNumber });
      
      if (!existingRoom) {
        await Room.create({
          ...roomData,
          equipment: ['投影仪', '电脑', '智慧黑板'],
          isActive: true
        });
        console.log(`   ✅ 创建教室: ${roomData.name}`);
        createdCount++;
      } else {
        console.log(`   ℹ️  教室已存在: ${roomData.name}`);
      }
    }
    
    console.log(`📊 默认教室创建完成: ${createdCount} 个新教室`);
    
  } catch (error) {
    console.error('❌ 创建默认教室时发生错误:', error);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🎯 K12排课系统 - 班级-教室绑定工具');
  console.log('=====================================');
  
  try {
    // 1. 连接数据库
    await connectDB();
    
    // 2. 创建默认教室（如果需要）
    await createDefaultRooms();
    
    // 3. 建立班级-教室绑定关系
    await establishClassRoomBinding();
    
    console.log('\n🎉 班级-教室绑定完成！');
    console.log('\n💡 使用说明:');
    console.log('   1. 运行此脚本后，每个班级都会有固定的教室');
    console.log('   2. 排课系统将自动使用固定教室，避免教室冲突');
    console.log('   3. 如需修改配置，请编辑 CLASS_ROOM_MAPPING 对象');
    
  } catch (error) {
    console.error('❌ 执行过程中发生错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已断开');
  }
}

// 运行脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  establishClassRoomBinding,
  createDefaultRooms,
  verifyBindingResults
};

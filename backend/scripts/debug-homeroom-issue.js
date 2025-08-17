/**
 * 调试homeroom教室分配问题
 * 
 * 检查为什么班级的homeroom字段已指定，但系统仍说没有可用教室
 */

const mongoose = require('mongoose');
require('dotenv').config();

// 导入模型
require('../src/models/index.ts');

async function debugHomeroomIssue() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-class-scheduling');
    console.log('✅ 数据库连接成功\n');
    
    // 检查班级的homeroom
    const Class = mongoose.model('Class');
    const classData = await Class.findById('687649c0bd12a9ba7cdfe786');
    
    if (!classData) {
      console.log('❌ 找不到指定的班级');
      return;
    }
    
    console.log('📋 班级信息:');
    console.log('   班级ID:', classData._id);
    console.log('   班级名称:', classData.name);
    console.log('   homeroom:', classData.homeroom);
    console.log('   年级:', classData.grade);
    console.log('   学生数:', classData.studentCount);
    console.log('   是否激活:', classData.isActive);
    
    // 检查对应的教室
    const Room = mongoose.model('Room');
    const roomData = await Room.findById('687652c2449c7ab8bf667f2f');
    
    if (!roomData) {
      console.log('\n❌ 找不到homeroom指定的教室');
      console.log('   教室ID:', '687652c2449c7ab8bf667f2f');
      console.log('   可能原因: 教室已被删除或ID错误');
      return;
    }
    
    console.log('\n🏫 教室信息:');
    console.log('   教室ID:', roomData._id);
    console.log('   教室名称:', roomData.name);
    console.log('   教室编号:', roomData.roomNumber);
    console.log('   教室类型:', roomData.type);
    console.log('   教室容量:', roomData.capacity);
    console.log('   教室状态:', roomData.isActive);
    console.log('   assignedClass:', roomData.assignedClass);
    console.log('   楼层:', roomData.floor);
    
    // 检查教室是否被正确分配
    if (roomData.assignedClass) {
      console.log('\n🔍 教室分配状态检查:');
      console.log('   教室assignedClass:', roomData.assignedClass);
      console.log('   班级ID:', classData._id);
      console.log('   是否匹配:', roomData.assignedClass.toString() === classData._id.toString());
      
      if (roomData.assignedClass.toString() === classData._id.toString()) {
        console.log('   ✅ 教室已正确分配给该班级');
      } else {
        console.log('   ❌ 教室分配给其他班级，存在冲突');
        
        // 检查被分配给哪个班级
        const assignedClass = await Class.findById(roomData.assignedClass);
        if (assignedClass) {
          console.log('   当前占用班级:', assignedClass.name);
        }
      }
    } else {
      console.log('\n⚠️ 教室没有assignedClass字段');
    }
    
    // 检查所有可用教室
    const allRooms = await Room.find({ isActive: true });
    console.log('\n📊 所有可用教室:');
    allRooms.forEach((room, index) => {
      console.log(`   ${index + 1}. ${room._id} - ${room.name || '未命名'}`);
      console.log(`      assignedClass: ${room.assignedClass || '无'}`);
      console.log(`      类型: ${room.type}, 容量: ${room.capacity}`);
    });
    
    // 检查是否有其他教室分配给这个班级
    const roomsForThisClass = allRooms.filter(room => 
      room.assignedClass && room.assignedClass.toString() === classData._id.toString()
    );
    
    console.log('\n🔍 分配给该班级的教室:');
    if (roomsForThisClass.length > 0) {
      roomsForThisClass.forEach((room, index) => {
        console.log(`   ${index + 1}. ${room._id} - ${room.name || '未命名'}`);
      });
    } else {
      console.log('   ❌ 没有教室分配给该班级');
    }
    
    // 分析问题
    console.log('\n🔍 问题分析:');
    
    if (!roomData.isActive) {
      console.log('   ❌ 问题1: homeroom指定的教室未激活');
    }
    
    if (roomData.assignedClass && roomData.assignedClass.toString() !== classData._id.toString()) {
      console.log('   ❌ 问题2: homeroom指定的教室已分配给其他班级');
    }
    
    if (!roomData.assignedClass) {
      console.log('   ❌ 问题3: homeroom指定的教室没有assignedClass字段');
    }
    
    if (roomData.isActive && (!roomData.assignedClass || roomData.assignedClass.toString() === classData._id.toString())) {
      console.log('   ✅ 教室配置正确，问题可能在其他地方');
      console.log('   💡 建议: 检查排课引擎的教室查找逻辑');
    }
    
  } catch (error) {
    console.error('❌ 调试失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已断开');
  }
}

// 运行调试
if (require.main === module) {
  debugHomeroomIssue().catch(console.error);
}

module.exports = { debugHomeroomIssue };

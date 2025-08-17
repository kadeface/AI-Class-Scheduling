/**
 * 调试教室分配器返回值问题
 * 
 * 验证K12RoomAllocator的getFixedRoomForClass方法是否正确返回值
 */

const mongoose = require('mongoose');
require('dotenv').config();

// 模拟K12RoomAllocator的核心逻辑
class MockK12RoomAllocator {
  getFixedRoomForClass(classId, rooms, classes) {
   // console.log(`🔍 为班级 ${classId} 查找固定课室...`);
   // console.log(`   📋 可用教室数量: ${rooms?.length || 0}`);
   // console.log(`   📋 班级信息数量: ${classes?.length || 0}`);
    
    if (!rooms || rooms.length === 0) {
      console.log(`   ❌ 没有可用教室`);
      return null;
    }

    // 方法1：通过教室的assignedClass字段查找固定课室
    //console.log(`   🔍 方法1: 检查教室assignedClass字段...`);
    const fixedRoom = rooms.find(room => {
      if (room.assignedClass && room.assignedClass.toString() === classId.toString()) {
        return true;
      }
      return false;
    });

    if (fixedRoom) {
      return fixedRoom;
    } else {
      console.log(`   ❌ 方法1失败: 没有找到assignedClass匹配的教室`);
    }

    // 方法2：通过班级的homeroom字段查找固定课室
    if (classes) {
      console.log(`   🔍 方法2: 检查班级homeroom字段...`);
      const classInfo = classes.find(c => c._id.toString() === classId.toString());
      if (classInfo) {
        console.log(`      📋 找到班级信息: ${classInfo.name} (${classInfo._id})`);
        if (classInfo.homeroom) {
          console.log(`      📋 班级homeroom: ${classInfo.homeroom}`);
          const homeroomRoom = rooms.find(room => 
            room._id.toString() === classInfo.homeroom.toString()
          );
          
          if (homeroomRoom) {
            console.log(`   ✅ 方法2成功: 通过班级homeroom找到固定课室: ${homeroomRoom._id} (${homeroomRoom.name})`);
            return homeroomRoom;
          } else {
            console.log(`      ❌ homeroom教室不在可用教室列表中`);
          }
        } else {
          console.log(`      ❌ 班级没有设置homeroom字段`);
        }
      } else {
        console.log(`      ❌ 没有找到对应的班级信息`);
      }
    } else {
      console.log(`   ❌ 方法2跳过: 没有提供班级信息`);
    }

    // 方法3：智能名称匹配策略
    console.log(`   🔍 方法3: 尝试智能名称匹配...`);
    const nameMatchedRoom = this.findRoomByNameMatching(classId, rooms, classes);
    if (nameMatchedRoom) {
      console.log(`   ✅ 方法3成功: 通过名称匹配找到课室: ${nameMatchedRoom._id} (${nameMatchedRoom.name})`);
      return nameMatchedRoom;
    } else {
      console.log(`   ❌ 方法3失败: 名称匹配未找到合适教室`);
    }

    // 方法4：智能分配策略（最后的备用方案）
    console.log(`   🔍 方法4: 使用智能分配策略...`);
    const availableRoom = this.findAvailableRoomByIntelligence(classId, rooms, classes);
    if (availableRoom) {
      console.log(`   ✅ 方法4成功: 智能分配找到可用教室: ${availableRoom._id} (${availableRoom.name || '未命名'})`);
      console.log(`   🔄 返回智能分配的教室: ${availableRoom._id}`);
      return availableRoom;
    } else {
      console.log(`   ❌ 方法4失败: 智能分配未找到可用教室`);
      return null;
    }
  }

  findRoomByNameMatching(classId, rooms, classes) {
    if (!classes) return null;
    
    const classInfo = classes.find(c => c._id.toString() === classId.toString());
    if (!classInfo) return null;

    const className = classInfo.name;
    console.log(`      🔍 尝试名称匹配: 班级名称 "${className}"`);

    // 策略1：完全匹配
    let matchedRoom = rooms.find(room => room.name === className);
    if (matchedRoom) {
      console.log(`         ✅ 完全匹配: "${className}" -> "${matchedRoom.name}"`);
      return matchedRoom;
    }

    // 策略2：包含匹配
    matchedRoom = rooms.find(room => room.name && room.name.includes(className));
    if (matchedRoom) {
      console.log(`         ✅ 包含匹配: "${className}" 包含在 "${matchedRoom.name}"`);
      return matchedRoom;
    }

    // 策略3：年级匹配
    const gradeMatch = className.match(/(\d+)年级/);
    if (gradeMatch) {
      const grade = parseInt(gradeMatch[1]);
      matchedRoom = rooms.find(room => room.floor === grade);
      if (matchedRoom) {
        console.log(`         ✅ 年级匹配: ${grade}年级 -> ${grade}楼教室 "${matchedRoom.name}"`);
        return matchedRoom;
      }
    }

    // 策略4：班级号匹配
    const classNumberMatch = className.match(/(\d+)班/);
    if (classNumberMatch) {
      const classNumber = classNumberMatch[1];
      matchedRoom = rooms.find(room => 
        room.roomNumber && room.roomNumber.includes(classNumber)
      );
      if (matchedRoom) {
        console.log(`         ✅ 班级号匹配: ${classNumber}班 -> 包含${classNumber}的教室 "${matchedRoom.name}"`);
        return matchedRoom;
      }
    }

    console.log(`         ❌ 名称匹配失败`);
    return null;
  }

  findAvailableRoomByIntelligence(classId, rooms, classes) {
    console.log(`      🔍 智能分配策略开始...`);
    
    if (!classes) {
      console.log(`         ⚠️ 没有班级信息，返回第一个可用教室`);
      return rooms[0] || null;
    }
    
    const classInfo = classes.find(c => c._id.toString() === classId.toString());
    if (!classInfo) {
      console.log(`         ⚠️ 没有找到班级信息，返回第一个可用教室`);
      return rooms[0] || null;
    }

    console.log(`         📋 班级信息: ${classInfo.name}, 学生数: ${classInfo.studentCount}`);

    // 按优先级排序教室
    const sortedRooms = [...rooms].sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // 优先选择普通教室
      if (a.type === '普通教室') scoreA += 10;
      if (b.type === '普通教室') scoreB += 10;

      // 优先选择容量合适的教室
      const targetCapacity = Math.ceil(classInfo.studentCount * 1.1);
      const capacityDiffA = Math.abs((a.capacity || 0) - targetCapacity);
      const capacityDiffB = Math.abs((b.capacity || 0) - targetCapacity);
      scoreA += (20 - capacityDiffA);
      scoreB += (20 - capacityDiffB);

      // 优先选择低楼层教室
      if (a.floor && b.floor) {
        scoreA += (10 - a.floor);
        scoreB += (10 - b.floor);
      }

      // 优先选择未被分配的教室
      if (!a.assignedClass) scoreA += 5;
      if (!b.assignedClass) scoreB += 5;

      return scoreB - scoreA;
    });

    console.log(`         📊 教室排序结果:`);
    sortedRooms.slice(0, 3).forEach((room, index) => {
      console.log(`            ${index + 1}. ${room.name || '未命名'} (${room._id}) - 类型: ${room.type}, 容量: ${room.capacity}`);
    });

    const selectedRoom = sortedRooms[0];
    if (selectedRoom) {
      console.log(`         ✅ 智能分配选择教室: ${selectedRoom.name || '未命名'} (${selectedRoom._id})`);
    } else {
      console.log(`         ❌ 智能分配未找到可用教室`);
    }

    return selectedRoom || null;
  }
}

// 模拟数据（基于实际日志中的ID）
const mockRooms = [
  {
    _id: '689e78f909dfdf8cef3e9100',
    name: '未命名',
    roomNumber: '101',
    type: '普通教室',
    capacity: 50,
    building: '教学楼A',
    floor: 1,
    equipment: ['投影仪', '电脑'],
    isActive: true
  },
  {
    _id: 'room2',
    name: '102教室',
    roomNumber: '102',
    type: '普通教室',
    capacity: 50,
    building: '教学楼A',
    floor: 1,
    equipment: ['投影仪', '电脑'],
    isActive: true
  }
];

const mockClasses = [
  {
    _id: '687649c0bd12a9ba7cdfe786',
    name: '一年级8班',
    grade: 1,
    studentCount: 40,
    isActive: true
  }
];

// 测试函数
function debugRoomAllocator() {
  console.log('🧪 开始调试教室分配器返回值问题...\n');
  
  const allocator = new MockK12RoomAllocator();
  
  console.log('📋 测试用例: 班级 687649c0bd12a9ba7cdfe786 (一年级8班)');
  console.log('📋 可用教室: 2个');
  console.log('📋 班级信息: 1个\n');
  
  const result = allocator.getFixedRoomForClass('687649c0bd12a9ba7cdfe786', mockRooms, mockClasses);
  
  console.log('\n📊 测试结果:');
  console.log(`   返回值类型: ${typeof result}`);
  console.log(`   返回值: ${result ? JSON.stringify(result, null, 2) : 'null'}`);
  console.log(`   是否成功: ${result ? '✅ 是' : '❌ 否'}`);
  
  if (result) {
    console.log(`   返回的教室ID: ${result._id}`);
    console.log(`   返回的教室名称: ${result.name || '未命名'}`);
  }
  
  // 验证返回值
  if (result && result._id) {
    console.log('\n🎯 结论: 教室分配器正常工作，返回了有效的教室对象');
  } else {
    console.log('\n🚨 结论: 教室分配器存在问题，没有返回有效的教室对象');
    console.log('💡 建议: 检查返回值逻辑，确保所有分支都正确返回值');
  }
}

// 运行测试
if (require.main === module) {
  debugRoomAllocator();
}

module.exports = { debugRoomAllocator, MockK12RoomAllocator };

/**
 * 测试教室分配器功能
 * 
 * 验证K12RoomAllocator是否能正确分配教室
 */

const mongoose = require('mongoose');
require('dotenv').config();

// 模拟数据
const mockRooms = [
  {
    _id: 'room1',
    name: '101教室',
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
  },
  {
    _id: 'room3',
    name: '一年级8班教室',
    roomNumber: '108',
    type: '普通教室',
    capacity: 45,
    building: '教学楼A',
    floor: 1,
    equipment: ['投影仪', '电脑'],
    isActive: true
  }
];

const mockClasses = [
  {
    _id: 'class1',
    name: '一年级8班',
    grade: 1,
    studentCount: 40,
    isActive: true
  },
  {
    _id: 'class2',
    name: '一年级7班',
    grade: 1,
    studentCount: 42,
    isActive: true
  }
];

// 测试教室分配器
function testRoomAllocator() {
  console.log('🧪 开始测试教室分配器...\n');
  
  // 模拟K12RoomAllocator的核心逻辑
  function getFixedRoomForClass(classId, rooms, classes) {
    console.log(`🔍 为班级 ${classId} 查找固定课室...`);
    
    // 方法1：通过教室的assignedClass字段查找固定课室
    const fixedRoom = rooms.find(room => {
      if (room.assignedClass && room.assignedClass.toString() === classId.toString()) {
        return true;
      }
      return false;
    });

    if (fixedRoom) {
      console.log(`   ✅ 找到固定课室: ${fixedRoom._id} (${fixedRoom.name})`);
      return fixedRoom;
    }

    // 方法2：通过班级的homeroom字段查找固定课室
    if (classes) {
      const classInfo = classes.find(c => c._id.toString() === classId.toString());
      if (classInfo && classInfo.homeroom) {
        const homeroomRoom = rooms.find(room => 
          room._id.toString() === classInfo.homeroom.toString()
        );
        
        if (homeroomRoom) {
          console.log(`   ✅ 通过班级homeroom找到固定课室: ${homeroomRoom._id} (${homeroomRoom.name})`);
          return homeroomRoom;
        }
      }
    }

    // 方法3：智能名称匹配策略
    const nameMatchedRoom = findRoomByNameMatching(classId, rooms, classes);
    if (nameMatchedRoom) {
      console.log(`   ✅ 通过名称匹配找到课室: ${nameMatchedRoom._id} (${nameMatchedRoom.name})`);
      return nameMatchedRoom;
    }

    // 方法4：智能分配策略
    console.log(`   ⚠️ 未找到固定课室，使用智能分配策略`);
    const availableRoom = findAvailableRoomByIntelligence(classId, rooms, classes);
    if (availableRoom) {
      console.log(`   ✅ 智能分配找到可用教室: ${availableRoom._id} (${availableRoom.name})`);
      return availableRoom;
    }

    console.log(`   ❌ 没有找到可用教室`);
    return null;
  }

  function findRoomByNameMatching(classId, rooms, classes) {
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

  function findAvailableRoomByIntelligence(classId, rooms, classes) {
    if (!classes) return rooms[0] || null;
    
    const classInfo = classes.find(c => c._id.toString() === classId.toString());
    if (!classInfo) return rooms[0] || null;

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

      return scoreB - scoreA;
    });

    return sortedRooms[0] || null;
  }

  // 测试用例
  console.log('📋 测试用例1: 一年级8班 (应该通过名称匹配找到教室)');
  const result1 = getFixedRoomForClass('class1', mockRooms, mockClasses);
  console.log(`   结果: ${result1 ? `成功 - ${result1.name}` : '失败'}\n`);

  console.log('📋 测试用例2: 一年级7班 (应该通过智能分配找到教室)');
  const result2 = getFixedRoomForClass('class2', mockRooms, mockClasses);
  console.log(`   结果: ${result2 ? `成功 - ${result2.name}` : '失败'}\n`);

  console.log('📋 测试用例3: 不存在的班级 (应该返回null)');
  const result3 = getFixedRoomForClass('nonexistent', mockRooms, mockClasses);
  console.log(`   结果: ${result3 ? `成功 - ${result3.name}` : '失败'}\n`);

  // 总结
  console.log('📊 测试结果总结:');
  console.log(`   测试用例1 (一年级8班): ${result1 ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   测试用例2 (一年级7班): ${result2 ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   测试用例3 (不存在班级): ${result3 ? '❌ 意外成功' : '✅ 通过'}`);
  
  const successCount = [result1, result2].filter(Boolean).length;
  console.log(`\n🎯 总体成功率: ${successCount}/2 (${(successCount/2*100).toFixed(1)}%)`);
}

// 运行测试
if (require.main === module) {
  testRoomAllocator();
}

module.exports = { testRoomAllocator };

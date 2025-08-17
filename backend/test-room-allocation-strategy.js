/**
 * 测试新的课室分配策略
 * 验证核心课程、副科课程的课室分配逻辑
 */

const { K12RoomAllocator } = require('./dist/services/scheduling/k12-room-allocator');

// 模拟数据
const mockRooms = [
  // 固定课室（行政班课室）
  {
    _id: 'room1',
    name: '一年级1班',
    roomNumber: '101',
    type: '多媒体教室',
    capacity: 60,
    building: '第一教学楼',
    floor: 1,
    equipment: ['投影仪', '电脑', '音响设备', '空调'],
    isActive: true,
    assignedClass: 'class1'  // 固定分配给一年级1班
  },
  {
    _id: 'room2',
    name: '一年级2班',
    roomNumber: '102',
    type: '多媒体教室',
    capacity: 60,
    building: '第一教学楼',
    floor: 1,
    equipment: ['投影仪', '电脑', '音响设备', '空调'],
    isActive: true,
    assignedClass: 'class2'  // 固定分配给一年级2班
  },
  // 功能课室（动态分配）
  {
    _id: 'room3',
    name: '物理实验室',
    roomNumber: '301',
    type: '实验室',
    capacity: 30,
    building: '实验楼',
    floor: 3,
    equipment: ['实验台', '物理仪器', '投影仪'],
    isActive: true,
    assignedClass: null  // 未固定分配
  },
  {
    _id: 'room4',
    name: '体育场',
    roomNumber: '操场',
    type: '体育场',
    capacity: 200,
    building: '运动场',
    floor: 1,
    equipment: ['篮球架', '足球门', '跑道'],
    isActive: true,
    assignedClass: null  // 未固定分配
  },
  {
    _id: 'room5',
    name: '音乐教室',
    roomNumber: '401',
    type: '音乐教室',
    capacity: 40,
    building: '艺术楼',
    floor: 4,
    equipment: ['钢琴', '音响设备', '音乐器材'],
    isActive: true,
    assignedClass: null  // 未固定分配
  }
];

const mockClasses = [
  {
    _id: 'class1',
    name: '一年级1班',
    grade: 1,
    studentCount: 50
  },
  {
    _id: 'class2',
    name: '一年级2班',
    grade: 1,
    studentCount: 52
  }
];

// 测试课程
const testCourses = [
  // 核心课程
  { name: '语文', subject: '语文' },
  { name: '数学', subject: '数学' },
  { name: '英语', subject: '英语' },
  
  // 副科课程（必须使用功能课室）
  { name: '物理实验', subject: '物理' },
  { name: '体育课', subject: '体育' },
  
  // 副科课程（可选使用功能课室）
  { name: '音乐课', subject: '音乐' },
  { name: '美术课', subject: '美术' },
  
  // 副科课程（使用固定课室）
  { name: '历史课', subject: '历史' },
  { name: '地理课', subject: '地理' }
];

/**
 * 测试课室分配策略
 */
function testRoomAllocationStrategy() {
  console.log('🧪 开始测试新的课室分配策略\n');
  
  const roomAllocator = new K12RoomAllocator();
  
  // 测试核心课程分配
  console.log('📚 测试核心课程课室分配:');
  testCoreSubjectAllocation(roomAllocator);
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // 测试副科课程分配
  console.log('🎨 测试副科课程课室分配:');
  testElectiveSubjectAllocation(roomAllocator);
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // 测试课室分配优先级
  console.log('🏆 测试课室分配优先级:');
  testRoomAllocationPriority(roomAllocator);
}

/**
 * 测试核心课程分配
 */
function testCoreSubjectAllocation(roomAllocator) {
  const coreSubjects = ['语文', '数学', '英语'];
  
  for (const subject of coreSubjects) {
    for (const classInfo of mockClasses) {
      const course = { name: `${subject}课`, subject };
      const room = roomAllocator.getRoomAssignment(course, classInfo._id, mockRooms, mockClasses);
      
      if (room) {
        console.log(`   ✅ ${classInfo.name} ${subject}课 → ${room.name} (${room.type})`);
      } else {
        console.log(`   ❌ ${classInfo.name} ${subject}课 → 分配失败`);
      }
    }
  }
}

/**
 * 测试副科课程分配
 */
function testElectiveSubjectAllocation(roomAllocator) {
  // 测试必须使用功能课室的课程
  console.log('   🔬 必须使用功能课室的课程:');
  const mandatorySpecialSubjects = ['物理', '体育'];
  
  for (const subject of mandatorySpecialSubjects) {
    for (const classInfo of mockClasses) {
      const course = { name: `${subject}课`, subject };
      const room = roomAllocator.getRoomAssignment(course, classInfo._id, mockRooms, mockClasses);
      
      if (room) {
        console.log(`      ✅ ${classInfo.name} ${subject}课 → ${room.name} (${room.type})`);
      } else {
        console.log(`      ❌ ${classInfo.name} ${subject}课 → 分配失败`);
      }
    }
  }
  
  // 测试可选使用功能课室的课程
  console.log('\n   🎵 可选使用功能课室的课程:');
  const optionalSpecialSubjects = ['音乐', '美术'];
  
  for (const subject of optionalSpecialSubjects) {
    for (const classInfo of mockClasses) {
      const course = { name: `${subject}课`, subject };
      const room = roomAllocator.getRoomAssignment(course, classInfo._id, mockRooms, mockClasses);
      
      if (room) {
        console.log(`      ✅ ${classInfo.name} ${subject}课 → ${room.name} (${room.type})`);
      } else {
        console.log(`      ❌ ${classInfo.name} ${subject}课 → 分配失败`);
      }
    }
  }
  
  // 测试使用固定课室的副科课程
  console.log('\n   📖 使用固定课室的副科课程:');
  const fixedRoomSubjects = ['历史', '地理'];
  
  for (const subject of fixedRoomSubjects) {
    for (const classInfo of mockClasses) {
      const course = { name: `${subject}课`, subject };
      const room = roomAllocator.getRoomAssignment(course, classInfo._id, mockRooms, mockClasses);
      
      if (room) {
        console.log(`      ✅ ${classInfo.name} ${subject}课 → ${room.name} (${room.type})`);
      } else {
        console.log(`      ❌ ${classInfo.name} ${subject}课 → 分配失败`);
      }
    }
  }
}

/**
 * 测试课室分配优先级
 */
function testRoomAllocationPriority(roomAllocator) {
  console.log('   优先级1: 核心课程 → 固定课室');
  const coreCourse = { name: '语文课', subject: '语文' };
  const room1 = roomAllocator.getRoomAssignment(coreCourse, 'class1', mockRooms, mockClasses);
  console.log(`     语文课 → ${room1 ? room1.name : '分配失败'}`);
  
  console.log('\n   优先级2: 副科课程（必须功能课室）→ 功能课室');
  const physicsCourse = { name: '物理实验', subject: '物理' };
  const room2 = roomAllocator.getRoomAssignment(physicsCourse, 'class1', mockRooms, mockClasses);
  console.log(`     物理实验 → ${room2 ? room2.name : '分配失败'}`);
  
  console.log('\n   优先级3: 副科课程（可选功能课室）→ 功能课室（如可用）+ 固定课室（备选）');
  const musicCourse = { name: '音乐课', subject: '音乐' };
  const room3 = roomAllocator.getRoomAssignment(musicCourse, 'class1', mockRooms, mockClasses);
  console.log(`     音乐课 → ${room3 ? room3.name : '分配失败'}`);
  
  console.log('\n   优先级4: 副科课程（固定课室）→ 固定课室');
  const historyCourse = { name: '历史课', subject: '历史' };
  const room4 = roomAllocator.getRoomAssignment(historyCourse, 'class1', mockRooms, mockClasses);
  console.log(`     历史课 → ${room4 ? room4.name : '分配失败'}`);
}

// 运行测试
if (require.main === module) {
  testRoomAllocationStrategy();
}

module.exports = {
  testRoomAllocationStrategy,
  mockRooms,
  mockClasses,
  testCourses
};

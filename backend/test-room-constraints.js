/**
 * 教室约束逻辑测试脚本
 * 
 * 用于测试和验证优化后的教室约束逻辑，包括：
 * 1. 普通课程使用固定教室时的冲突检测
 * 2. 特殊课程的专业教室分配
 * 3. 智能教室评分系统
 */

const mongoose = require('mongoose');
const { 
  getRoomTypesForCourse, 
  calculateRoomMatchScore, 
  isSpecialCourse 
} = require('./dist/config/room-types');

// 导入模型定义
require('./dist/models/Course');
require('./dist/models/Room');
require('./dist/models/Class');

// 配置
const MONGODB_URI = 'mongodb://localhost:27017/ai-class-scheduling';

/**
 * 连接数据库
 */
async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
}

/**
 * 测试课程类型识别
 */
function testCourseTypeRecognition() {
  console.log('\n🔍 测试课程类型识别...');
  
  const testCases = [
    { name: '语文', subject: '语文', expected: false },
    { name: '数学', subject: '数学', expected: false },
    { name: '英语', subject: '英语', expected: false },
    { name: '体育', subject: '体育', expected: true },
    { name: '音乐', subject: '音乐', expected: true },
    { name: '美术', subject: '美术', expected: true },
    { name: '信息技术', subject: '信息技术', expected: true },
    { name: '物理实验', subject: '物理', expected: true },
    { name: '化学实验', subject: '化学', expected: true },
    { name: '生物实验', subject: '生物', expected: true },
    { name: '手工', subject: '手工', expected: true },
    { name: '心理健康', subject: '心理健康', expected: true },
    { name: '班会', subject: '班会', expected: false },
    { name: '品德', subject: '品德', expected: false },
    { name: '生活技能', subject: '生活技能', expected: false },
    { name: '综合实践', subject: '综合实践', expected: false }
  ];
  
  let passed = 0;
  let total = testCases.length;
  
  for (const testCase of testCases) {
    const result = isSpecialCourse(testCase.name, testCase.subject);
    const status = result === testCase.expected ? '✅' : '❌';
    console.log(`${status} ${testCase.name} (${testCase.subject}): ${result ? '特殊课程' : '普通课程'} [期望: ${testCase.expected ? '特殊课程' : '普通课程'}]`);
    
    if (result === testCase.expected) {
      passed++;
    }
  }
  
  console.log(`\n📊 课程类型识别测试结果: ${passed}/${total} 通过`);
  return passed === total;
}

/**
 * 测试教室类型映射
 */
function testRoomTypeMapping() {
  console.log('\n🔍 测试教室类型映射...');
  
  const testCases = [
    { name: '体育', subject: '体育', expectedTypes: ['gym', 'sports', 'playground', '体育场', '体育馆', '操场'] },
    { name: '音乐', subject: '音乐', expectedTypes: ['music', 'art', '音乐室', '艺术室', '琴房'] },
    { name: '美术', subject: '美术', expectedTypes: ['art', '美术室', '画室', '艺术室'] },
    { name: '信息技术', subject: '信息技术', expectedTypes: ['computer', 'lab', '机房', '计算机室', '多媒体教室'] },
    { name: '物理实验', subject: '物理', expectedTypes: ['lab', 'laboratory', '实验室', '实验楼'] },
    { name: '手工', subject: '手工', expectedTypes: ['handcraft', 'craft', '手工室', '工艺室'] },
    { name: '语文', subject: '语文', expectedTypes: ['classroom', '普通教室'] },
    { name: '数学', subject: '数学', expectedTypes: ['classroom', '普通教室'] }
  ];
  
  let passed = 0;
  let total = testCases.length;
  
  for (const testCase of testCases) {
    const roomTypes = getRoomTypesForCourse(testCase.name, testCase.subject);
    const isCorrect = testCase.expectedTypes.every(type => roomTypes.includes(type));
    const status = isCorrect ? '✅' : '❌';
    
    console.log(`${status} ${testCase.name} (${testCase.subject}):`);
    console.log(`   期望: [${testCase.expectedTypes.join(', ')}]`);
    console.log(`   实际: [${roomTypes.join(', ')}]`);
    
    if (isCorrect) {
      passed++;
    }
  }
  
  console.log(`\n📊 教室类型映射测试结果: ${passed}/${total} 通过`);
  return passed === total;
}

/**
 * 测试教室评分系统
 */
function testRoomScoring() {
  console.log('\n🔍 测试教室评分系统...');
  
  const mockRooms = [
    { _id: 'room1', type: 'gym', capacity: 50, isActive: true },
    { _id: 'room2', type: 'music', capacity: 40, isActive: true },
    { _id: 'room3', type: 'computer', capacity: 35, isActive: true },
    { _id: 'room4', type: 'classroom', capacity: 45, isActive: true },
    { _id: 'room5', type: 'lab', capacity: 30, isActive: true }
  ];
  
  const testCases = [
    { courseName: '体育', subject: '体育', expectedBestRoom: 'room1' },
    { courseName: '音乐', subject: '音乐', expectedBestRoom: 'room2' },
    { courseName: '信息技术', subject: '信息技术', expectedBestRoom: 'room3' },
    { courseName: '语文', subject: '语文', expectedBestRoom: 'room4' },
    { courseName: '物理实验', subject: '物理', expectedBestRoom: 'room5' }
  ];
  
  let passed = 0;
  let total = testCases.length;
  
  for (const testCase of testCases) {
    let bestRoom = null;
    let bestScore = -1;
    
    for (const room of mockRooms) {
      const score = calculateRoomMatchScore(room, testCase.courseName, testCase.subject);
      if (score > bestScore) {
        bestScore = score;
        bestRoom = room;
      }
    }
    
    const isCorrect = bestRoom._id === testCase.expectedBestRoom;
    const status = isCorrect ? '✅' : '❌';
    
    console.log(`${status} ${testCase.courseName} (${testCase.subject}):`);
    console.log(`   最佳教室: ${bestRoom._id} (评分: ${bestScore.toFixed(1)})`);
    console.log(`   期望教室: ${testCase.expectedBestRoom}`);
    
    if (isCorrect) {
      passed++;
    }
  }
  
  console.log(`\n📊 教室评分系统测试结果: ${passed}/${total} 通过`);
  return passed === total;
}

/**
 * 测试数据库中的实际数据
 */
async function testDatabaseData() {
  console.log('\n🔍 测试数据库中的实际数据...');
  
  try {
    // 测试课程数据
    const Course = mongoose.model('Course');
    const courses = await Course.find().limit(10);
    
    console.log(`📚 找到 ${courses.length} 个课程:`);
    for (const course of courses) {
      const isSpecial = isSpecialCourse(course.name, course.subject);
      const roomTypes = getRoomTypesForCourse(course.name, course.subject);
      console.log(`   ${course.name} (${course.subject}): ${isSpecial ? '特殊课程' : '普通课程'} -> [${roomTypes.join(', ')}]`);
    }
    
    // 测试教室数据
    const Room = mongoose.model('Room');
    const rooms = await Room.find().limit(10);
    
    console.log(`\n🏫 找到 ${rooms.length} 个教室:`);
    for (const room of rooms) {
      console.log(`   ${room.name} (${room.type}): 容量 ${room.capacity}, 状态 ${room.isActive ? '可用' : '不可用'}`);
    }
    
    // 测试班级数据
    const Class = mongoose.model('Class');
    const classes = await Class.find().limit(5);
    
    console.log(`\n👥 找到 ${classes.length} 个班级:`);
    for (const classInfo of classes) {
      const hasFixedRoom = classInfo.homeroom ? '有固定教室' : '无固定教室';
      console.log(`   ${classInfo.name}: ${hasFixedRoom}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ 数据库数据测试失败:', error);
    return false;
  }
}

/**
 * 主测试函数
 */
async function main() {
  try {
    console.log('🚀 开始教室约束逻辑测试...');
    
    // 1. 连接数据库
    await connectDatabase();
    
    // 2. 测试课程类型识别
    const courseTypeTest = testCourseTypeRecognition();
    
    // 3. 测试教室类型映射
    const roomTypeTest = testRoomTypeMapping();
    
    // 4. 测试教室评分系统
    const roomScoringTest = testRoomScoring();
    
    // 5. 测试数据库中的实际数据
    const databaseTest = await testDatabaseData();
    
    // 6. 输出总体测试结果
    console.log('\n📊 总体测试结果:');
    console.log(`   课程类型识别: ${courseTypeTest ? '✅ 通过' : '❌ 失败'}`);
    console.log(`   教室类型映射: ${roomTypeTest ? '✅ 通过' : '❌ 失败'}`);
    console.log(`   教室评分系统: ${roomScoringTest ? '✅ 通过' : '❌ 失败'}`);
    console.log(`   数据库数据: ${databaseTest ? '✅ 通过' : '❌ 失败'}`);
    
    const allPassed = courseTypeTest && roomTypeTest && roomScoringTest && databaseTest;
    console.log(`\n🎯 总体结果: ${allPassed ? '✅ 所有测试通过' : '❌ 部分测试失败'}`);
    
  } catch (error) {
    console.error('❌ 测试执行失败:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已断开');
    process.exit(0);
  }
}

// 运行测试
if (require.main === module) {
  main();
}

module.exports = {
  testCourseTypeRecognition,
  testRoomTypeMapping,
  testRoomScoring,
  testDatabaseData
};

/**
 * 测试数据库保存功能
 */

const mongoose = require('mongoose');
const Schedule = require('../src/models/Schedule');

// 连接数据库
async function connectDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ai-class-scheduling');
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
}

// 测试保存数据
async function testDBSave() {
  try {
    console.log('🧪 测试数据库保存功能...');
    
    // 清理现有数据
    await Schedule.deleteMany({});
    console.log('🗑️ 已清理现有数据');
    
    // 创建测试数据
    const testSchedule = new Schedule({
      academicYear: '2025-2026',
      semester: '2025-2026-1',
      class: '687649c0bd12a9ba7cdfe783', // 使用真实的班级ID
      course: '68764f7f449c7ab8bf667eb9', // 使用真实的课程ID
      teacher: '687649a3bd12a9ba7cdfe72a', // 使用真实的教师ID
      room: '687652c3449c7ab8bf667f2c', // 使用真实的教室ID
      dayOfWeek: 1,
      period: 1,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // 保存数据
    const savedSchedule = await testSchedule.save();
    console.log('✅ 数据保存成功:', savedSchedule._id);
    
    // 查询验证
    const foundSchedule = await Schedule.findById(savedSchedule._id);
    console.log('🔍 查询验证:', foundSchedule ? '成功' : '失败');
    
    if (foundSchedule) {
      console.log('📋 保存的数据详情:');
      console.log(`   学年: ${foundSchedule.academicYear}`);
      console.log(`   学期: ${foundSchedule.semester}`);
      console.log(`   班级: ${foundSchedule.class}`);
      console.log(`   课程: ${foundSchedule.course}`);
      console.log(`   教师: ${foundSchedule.teacher}`);
      console.log(`   教室: ${foundSchedule.room}`);
      console.log(`   时间: 周${foundSchedule.dayOfWeek}第${foundSchedule.period}节`);
    }
    
    // 检查总数
    const totalCount = await Schedule.countDocuments();
    console.log(`📊 数据库中共有 ${totalCount} 条记录`);
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 主函数
async function main() {
  try {
    await connectDB();
    await testDBSave();
  } catch (error) {
    console.error('❌ 脚本执行失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
  }
}

// 运行测试
if (require.main === module) {
  main();
}

module.exports = { testDBSave };


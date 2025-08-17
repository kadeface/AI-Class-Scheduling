/**
 * 测试K12引擎的数据保存功能
 */

const mongoose = require('mongoose');
const { K12SchedulingEngine } = require('../src/services/scheduling/k12-scheduling-engine');

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

// 测试K12引擎数据保存
async function testK12DataSave() {
  try {
    console.log('🧪 测试K12引擎数据保存功能...');
    
    // 创建K12引擎实例
    const engine = new K12SchedulingEngine();
    
    // 模拟排课数据
    const mockTeachingPlans = [
      {
        _id: 'test-plan-1',
        class: { _id: 'test-class-1', name: '一年级1班' },
        courseAssignments: [
          {
            course: { _id: 'test-course-1', name: '语文', subject: '语文' },
            teacher: { _id: 'test-teacher-1', name: '张老师' },
            weeklyHours: 2
          }
        ]
      }
    ];
    
    const mockRules = [
      {
        name: '测试规则',
        timeRules: {},
        teacherConstraints: {},
        roomConstraints: {},
        courseArrangementRules: {}
      }
    ];
    
    const mockTimeSlots = [
      { dayOfWeek: 1, period: 1 },
      { dayOfWeek: 1, period: 2 }
    ];
    
    const mockRooms = [
      { _id: 'test-room-1', name: '一年级1班', assignedClass: 'test-class-1' }
    ];
    
    // 执行排课
    console.log('🚀 开始执行K12排课...');
    const result = await engine.schedule(
      mockTeachingPlans, 
      mockRules, 
      mockTimeSlots, 
      mockRooms,
      '2025-2026',  // 学年
      '1'           // 学期
    );
    
    console.log('\n📊 K12排课结果:');
    console.log('成功:', result.success);
    console.log('已分配:', result.assignedVariables);
    console.log('未分配:', result.unassignedVariables);
    console.log('总评分:', result.totalScore);
    
    // 检查数据库中的数据
    console.log('\n🔍 检查数据库中的排课数据...');
    const Schedule = require('../src/models/Schedule');
    const schedules = await Schedule.find({}).populate('class course teacher room');
    
    console.log(`📊 Schedule表中共有 ${schedules.length} 条记录`);
    
    if (schedules.length > 0) {
      console.log('\n📋 排课记录详情:');
      schedules.forEach((schedule, index) => {
        console.log(`\n   记录 ${index + 1}:`);
        console.log(`     学年: ${schedule.academicYear}`);
        console.log(`     学期: ${schedule.semester}`);
        console.log(`     班级: ${schedule.class?.name || '未知'}`);
        console.log(`     课程: ${schedule.course?.name || '未知'}`);
        console.log(`     教师: ${schedule.teacher?.name || '未知'}`);
        console.log(`     教室: ${schedule.room?.name || '未知'}`);
        console.log(`     时间: 周${schedule.dayOfWeek}第${schedule.period}节`);
      });
    } else {
      console.log('❌ 数据库中没有找到排课记录！');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 主函数
async function main() {
  try {
    await connectDB();
    await testK12DataSave();
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

module.exports = { testK12DataSave };

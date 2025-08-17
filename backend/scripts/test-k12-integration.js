/**
 * 测试K12排课引擎集成
 * 
 * 验证K12排课引擎是否被正确调用
 */

const mongoose = require('mongoose');
require('dotenv').config();

// 导入模型
require('../src/models/index.ts');

// 模拟HTTP请求测试K12排课
async function testK12Integration() {
  console.log('🧪 开始测试K12排课引擎集成...\n');
  
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-class-scheduling');
    console.log('✅ 数据库连接成功');
    
    // 模拟排课请求
    const schedulingRequest = {
      academicYear: '2025-2026',
      semester: 1,
      classIds: [], // 空数组表示处理所有班级
      rulesId: null, // 使用默认规则
      algorithmConfig: {},
      preserveExisting: false,
      useK12: true // 启用K12排课引擎
    };
    
    console.log('📋 排课请求参数:');
    console.log(`   学年: ${schedulingRequest.academicYear}`);
    console.log(`   学期: ${schedulingRequest.semester}`);
    console.log(`   班级ID: ${schedulingRequest.classIds.length > 0 ? schedulingRequest.classIds.join(', ') : '所有班级'}`);
    console.log(`   排课规则: ${schedulingRequest.rulesId || '默认规则'}`);
    console.log(`   保留现有排课: ${schedulingRequest.preserveExisting}`);
    console.log(`   使用K12引擎: ${schedulingRequest.useK12}`);
    
    // 检查数据库中的教学计划
    const TeachingPlan = mongoose.model('TeachingPlan');
    const teachingPlans = await TeachingPlan.find({}).populate('class').populate('courseAssignments.course').populate('courseAssignments.teacher');
    
    console.log(`\n📊 数据库状态:`);
    console.log(`   教学计划数量: ${teachingPlans.length}`);
    
    if (teachingPlans.length > 0) {
      console.log(`   第一个教学计划:`);
      console.log(`     班级: ${teachingPlans[0].class?.name || '未知'}`);
      console.log(`     课程数量: ${teachingPlans[0].courseAssignments?.length || 0}`);
    }
    
    // 检查排课规则
    const SchedulingRules = mongoose.model('SchedulingRules');
    const rules = await SchedulingRules.findOne({ isDefault: true, isActive: true });
    
    console.log(`\n📋 排课规则:`);
    if (rules) {
      console.log(`   规则名称: ${rules.name}`);
      console.log(`   规则描述: ${rules.description}`);
      console.log(`   是否激活: ${rules.isActive}`);
      console.log(`   是否默认: ${rules.isDefault}`);
    } else {
      console.log(`   ⚠️ 没有找到默认的排课规则`);
    }
    
    // 检查教室
    const Room = mongoose.model('Room');
    const rooms = await Room.find({ isActive: true });
    
    console.log(`\n🏫 教室信息:`);
    console.log(`   可用教室数量: ${rooms.length}`);
    if (rooms.length > 0) {
      rooms.slice(0, 3).forEach((room, index) => {
        console.log(`     ${index + 1}. ${room.name || '未命名'} (${room._id}) - 类型: ${room.type}, 容量: ${room.capacity}`);
      });
    }
    
    console.log('\n🎯 集成测试完成');
    console.log('💡 现在可以通过API调用测试K12排课引擎:');
    console.log('   POST /api/scheduling/start');
    console.log('   Body: { "academicYear": "2025-2026", "semester": 1, "useK12": true }');
    
  } catch (error) {
    console.error('❌ 集成测试失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已断开');
  }
}

// 运行测试
if (require.main === module) {
  testK12Integration().catch(console.error);
}

module.exports = { testK12Integration };

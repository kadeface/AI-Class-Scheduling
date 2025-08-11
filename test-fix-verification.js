/**
 * 测试脚本：验证排课规则修复是否有效
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';

async function testGetSchedulingRules() {
  console.log('🧪 测试1: 获取排课规则列表');
  
  try {
    const response = await fetch(`${API_BASE}/scheduling-rules?page=1&limit=10`);
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ 获取排课规则列表成功');
      console.log(`   返回记录数: ${result.data.items.length}`);
      console.log(`   总记录数: ${result.data.total}`);
      
      // 检查返回的数据结构
      if (result.data.items.length > 0) {
        const firstRule = result.data.items[0];
        console.log(`   第一条记录ID: ${firstRule._id}`);
        console.log(`   创建人: ${firstRule.createdBy.username} (${firstRule.createdBy.profile.name})`);
      }
    } else {
      console.log('❌ 获取排课规则列表失败');
      console.log(`   错误: ${result.error}`);
    }
  } catch (error) {
    console.log('❌ 请求失败:', error.message);
  }
}

async function testCreateSchedulingRules() {
  console.log('\n🧪 测试2: 创建排课规则（无createdBy字段）');
  
  try {
    const testData = {
      name: "测试排课规则-" + Date.now(),
      description: "用于测试的排课规则",
      schoolType: "middle",
      academicYear: "2024-2025",
      semester: 1,
      timeRules: {
        dailyPeriods: 8,
        workingDays: [1, 2, 3, 4, 5],
        periodDuration: 45,
        breakDuration: 10,
        lunchBreakStart: 5,
        lunchBreakDuration: 60,
        morningPeriods: [1, 2, 3, 4],
        afternoonPeriods: [5, 6, 7, 8]
      },
      teacherConstraints: {
        maxDailyHours: 6,
        maxContinuousHours: 3,
        minRestBetweenCourses: 10,
        avoidFridayAfternoon: true,
        respectTeacherPreferences: true,
        allowCrossGradeTeaching: false
      },
      roomConstraints: {
        respectCapacityLimits: true,
        allowRoomSharing: false,
        preferFixedClassrooms: true,
        specialRoomPriority: "preferred"
      },
      courseArrangementRules: {
        allowContinuousCourses: true,
        maxContinuousHours: 2,
        distributionPolicy: "balanced",
        avoidFirstLastPeriod: ["体育", "音乐"],
        coreSubjectPriority: true,
        labCoursePreference: "afternoon"
      },
      conflictResolutionRules: {
        teacherConflictResolution: "strict",
        roomConflictResolution: "strict",
        classConflictResolution: "strict",
        allowOverride: false,
        priorityOrder: ["教师冲突", "教室冲突", "班级冲突"]
      },
      isDefault: false
    };
    
    const response = await fetch(`${API_BASE}/scheduling-rules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ 创建排课规则成功');
      console.log(`   规则ID: ${result.data._id}`);
      console.log(`   创建人: ${result.data.createdBy.username} (${result.data.createdBy.profile.name})`);
    } else {
      console.log('❌ 创建排课规则失败');
      console.log(`   错误: ${result.error}`);
    }
  } catch (error) {
    console.log('❌ 请求失败:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 开始运行排课规则修复验证测试...\n');
  
  try {
    await testGetSchedulingRules();
    await testCreateSchedulingRules();
    
    console.log('\n🎉 所有测试完成！');
    console.log('\n📋 测试结果说明:');
    console.log('   - 如果测试1成功，说明获取列表的修复有效');
    console.log('   - 如果测试2成功，说明创建功能的修复有效');
    console.log('   - 如果两个测试都成功，说明问题已完全解决');
    
  } catch (error) {
    console.error('❌ 测试执行失败:', error);
  }
}

// 运行测试
runAllTests();

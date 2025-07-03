/**
 * 排课规则API调试脚本
 * 
 * 用于测试排课规则的创建和查询功能
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000';

/**
 * 测试创建排课规则
 */
async function testCreateRule() {
  console.log('🔧 测试创建排课规则...');
  
  const testRuleData = {
    name: `测试排课规则_${new Date().toISOString().slice(0, 16)}`,
    description: '调试脚本创建的测试规则',
    schoolType: 'high',
    academicYear: '2024-2025',
    semester: 1,
    timeRules: {
      dailyPeriods: 8,
      workingDays: [1, 2, 3, 4, 5],
      periodDuration: 45,
      breakDuration: 10,
      lunchBreakStart: 4,
      lunchBreakDuration: 90,
      morningPeriods: [1, 2, 3, 4],
      afternoonPeriods: [5, 6, 7, 8],
      forbiddenSlots: []
    },
    teacherConstraints: {
      maxDailyHours: 6,
      maxContinuousHours: 3,
      minRestBetweenCourses: 1,
      avoidFridayAfternoon: true,
      respectTeacherPreferences: true,
      allowCrossGradeTeaching: true
    },
    roomConstraints: {
      respectCapacityLimits: true,
      allowRoomSharing: false,
      preferFixedClassrooms: true,
      specialRoomPriority: 'preferred'
    },
    courseArrangementRules: {
      allowContinuousCourses: true,
      maxContinuousHours: 2,
      distributionPolicy: 'balanced',
      avoidFirstLastPeriod: [],
      coreSubjectPriority: true,
      labCoursePreference: 'morning'
    },
    conflictResolutionRules: {
      teacherConflictResolution: 'strict',
      roomConflictResolution: 'strict',
      classConflictResolution: 'strict',
      allowOverride: false,
      priorityOrder: ['teacher', 'room', 'time']
    },
    isDefault: false
  };

  try {
    const response = await axios.post(`${API_BASE}/api/scheduling-rules`, testRuleData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('✅ 创建成功，响应状态:', response.status);
    console.log('📄 响应数据:', JSON.stringify(response.data, null, 2));
    
    return response.data.data;
  } catch (error) {
    console.error('❌ 创建失败:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 测试获取排课规则列表
 */
async function testGetRulesList() {
  console.log('\n📋 测试获取排课规则列表...');
  
  try {
    const response = await axios.get(`${API_BASE}/api/scheduling-rules`);
    
    console.log('✅ 查询成功，响应状态:', response.status);
    console.log('📊 总数据量:', response.data.data?.total || 0);
    console.log('📝 当前页数据:');
    
    if (response.data.data?.items?.length > 0) {
      response.data.data.items.forEach((rule, index) => {
        console.log(`  ${index + 1}. ${rule.name} (${rule.academicYear}-学期${rule.semester})`);
      });
    } else {
      console.log('  暂无数据');
    }
    
    return response.data.data;
  } catch (error) {
    console.error('❌ 查询失败:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 测试数据库连接
 */
async function testDatabaseConnection() {
  console.log('🔌 测试数据库连接...');
  
  try {
    const response = await axios.get(`${API_BASE}/api/health`);
    console.log('✅ 健康检查成功:', response.data);
    return true;
  } catch (error) {
    console.error('❌ 健康检查失败:', error.message);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🧪 排课规则API调试测试');
  console.log('='.repeat(50));
  
  // 1. 测试数据库连接
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    console.log('\n❌ 数据库连接失败，请检查后端服务');
    return;
  }
  
  // 2. 测试创建前的列表状态
  console.log('\n📋 创建前的规则列表:');
  const beforeList = await testGetRulesList();
  
  // 3. 测试创建规则
  const createdRule = await testCreateRule();
  
  if (createdRule) {
    console.log('\n⏳ 等待1秒后查询列表...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 4. 测试创建后的列表状态
    console.log('\n📋 创建后的规则列表:');
    const afterList = await testGetRulesList();
    
    // 5. 比较结果
    console.log('\n📈 比较结果:');
    const beforeCount = beforeList?.total || 0;
    const afterCount = afterList?.total || 0;
    
    if (afterCount > beforeCount) {
      console.log(`✅ 成功！规则数量从 ${beforeCount} 增加到 ${afterCount}`);
    } else {
      console.log(`❌ 问题！规则数量没有增加 (创建前:${beforeCount}, 创建后:${afterCount})`);
    }
  }
  
  console.log('\n🏁 测试完成');
}

// 执行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testCreateRule, testGetRulesList };
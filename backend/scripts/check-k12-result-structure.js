/**
 * 检查K12引擎返回结果的数据结构
 */

const mongoose = require('mongoose');
const { K12SchedulingEngine } = require('../src/services/scheduling/k12-scheduling-engine');

// 模拟数据
const mockTeachingPlans = [
  {
    _id: 'mock-plan-1',
    class: { _id: 'mock-class-1', name: '一年级1班' },
    courseAssignments: [
      {
        course: { _id: 'mock-course-1', name: '语文', subject: '语文' },
        teacher: { _id: 'mock-teacher-1', name: '张老师' },
        weeklyHours: 5
      }
    ]
  }
];

const mockRules = [
  {
    name: '默认规则',
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
  { _id: 'mock-room-1', name: '一年级1班', assignedClass: 'mock-class-1' }
];

async function checkK12ResultStructure() {
  try {
    console.log('🔍 检查K12引擎结果结构...');
    
    // 创建K12引擎实例
    const engine = new K12SchedulingEngine();
    
    // 执行排课
    const result = await engine.schedule(mockTeachingPlans, mockRules, mockTimeSlots, mockRooms);
    
    console.log('\n📊 K12引擎返回结果结构:');
    console.log('结果类型:', typeof result);
    console.log('结果键:', Object.keys(result));
    
    console.log('\n🔍 详细结构:');
    Object.entries(result).forEach(([key, value]) => {
      console.log(`${key}:`, {
        type: typeof value,
        value: value,
        isArray: Array.isArray(value),
        isMap: value instanceof Map
      });
    });
    
    // 检查currentAssignments
    if (engine.currentAssignments) {
      console.log('\n📋 currentAssignments内容:');
      console.log('类型:', typeof engine.currentAssignments);
      console.log('大小:', engine.currentAssignments.size);
      
      for (const [key, value] of engine.currentAssignments.entries()) {
        console.log(`键: ${key}`);
        console.log('值:', value);
        console.log('---');
      }
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

// 运行检查
checkK12ResultStructure();

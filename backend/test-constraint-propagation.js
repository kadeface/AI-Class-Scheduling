/**
 * 测试约束传播增强效果
 * 验证课室约束传播和完整约束检测
 */

const { K12SchedulingEngine } = require('./dist/services/scheduling/k12-scheduling-engine');

// 模拟数据
const mockTeachingPlans = [
  {
    _id: 'plan1',
    class: {
      _id: 'class1',
      name: '一年级1班',
      grade: 1,
      studentCount: 50
    },
    courseAssignments: [
      {
        _id: 'assignment1',
        course: {
          _id: 'course1',
          name: '语文',
          subject: '语文',
          hours: 8
        },
        teacher: {
          _id: 'teacher1',
          name: '张老师'
        },
        requiredHours: 8
      },
      {
        _id: 'assignment2',
        course: {
          _id: 'course2',
          name: '数学',
          subject: '数学',
          hours: 8
        },
        teacher: {
          _id: 'teacher2',
          name: '李老师'
        },
        requiredHours: 8
      },
      {
        _id: 'assignment3',
        course: {
          _id: 'course3',
          name: '物理实验',
          subject: '物理',
          hours: 2
        },
        teacher: {
          _id: 'teacher3',
          name: '王老师'
        },
        requiredHours: 2
      }
    ]
  }
];

const mockRooms = [
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
    assignedClass: 'class1'
  },
  {
    _id: 'room2',
    name: '物理实验室',
    roomNumber: '301',
    type: '实验室',
    capacity: 30,
    building: '实验楼',
    floor: 3,
    equipment: ['实验台', '物理仪器', '投影仪'],
    isActive: true,
    assignedClass: null
  }
];

const mockTimeSlots = [
  { dayOfWeek: 1, period: 1, startTime: '08:00', endTime: '08:45' },
  { dayOfWeek: 1, period: 2, startTime: '08:55', endTime: '09:40' },
  { dayOfWeek: 1, period: 3, startTime: '10:00', endTime: '10:45' },
  { dayOfWeek: 2, period: 1, startTime: '08:00', endTime: '08:45' },
  { dayOfWeek: 2, period: 2, startTime: '08:55', endTime: '09:40' }
];

const mockSchedulingRules = [
  {
    _id: 'rule1',
    name: '基本排课规则',
    constraints: {
      maxDailyClasses: 8,
      maxConsecutiveClasses: 4
    }
  }
];

/**
 * 测试约束传播增强
 */
async function testConstraintPropagationEnhancement() {
  console.log('🧪 开始测试约束传播增强效果\n');
  
  try {
    // 创建调度引擎
    const engine = new K12SchedulingEngine();
    
    console.log('📋 测试数据准备:');
    console.log(`   - 教学计划: ${mockTeachingPlans.length} 个`);
    console.log(`   - 课室: ${mockRooms.length} 个`);
    console.log(`   - 时间槽: ${mockTimeSlots.length} 个`);
    console.log(`   - 排课规则: ${mockSchedulingRules.length} 个`);
    
    // 设置测试数据
    engine['teachingPlans'] = mockTeachingPlans;
    engine['rooms'] = mockRooms;
    engine['schedulingRules'] = mockSchedulingRules;
    
    console.log('\n🔍 测试1: 基本约束检测');
    await testBasicConstraintDetection(engine);
    
    console.log('\n🔍 测试2: 课室约束传播');
    await testRoomConstraintPropagation(engine);
    
    console.log('\n🔍 测试3: 完整约束检测');
    await testCompleteConstraintDetection(engine);
    
    console.log('\n🎉 所有测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

/**
 * 测试基本约束检测
 */
async function testBasicConstraintDetection(engine) {
  console.log('   📚 测试基本约束检测...');
  
  try {
    // 创建测试变量
    const testVariable = {
      id: 'var1',
      courseId: 'course1',
      teacherId: 'teacher1',
      classId: 'class1',
      requiredHours: 1
    };
    
    const testTimeSlot = { dayOfWeek: 1, period: 1 };
    const testAssignments = new Map();
    
    // 测试基本冲突检测
    const isFeasible = engine['isTimeSlotFeasible'](testVariable, testTimeSlot, testAssignments);
    
    if (isFeasible) {
      console.log('      ✅ 基本约束检测通过');
    } else {
      console.log('      ❌ 基本约束检测失败');
    }
    
  } catch (error) {
    console.error('      ❌ 基本约束检测测试失败:', error);
  }
}

/**
 * 测试课室约束传播
 */
async function testRoomConstraintPropagation(engine) {
  console.log('   🏫 测试课室约束传播...');
  
  try {
    // 创建测试变量
    const testVariable = {
      id: 'var2',
      courseId: 'course3', // 物理实验，需要实验室
      teacherId: 'teacher3',
      classId: 'class1',
      requiredHours: 1
    };
    
    const testTimeSlot = { dayOfWeek: 1, period: 1 };
    const testAssignments = new Map();
    
    // 测试课室约束传播
    const isFeasible = engine['isTimeSlotFeasible'](testVariable, testTimeSlot, testAssignments);
    
    if (isFeasible) {
      console.log('      ✅ 课室约束传播通过');
    } else {
      console.log('      ❌ 课室约束传播失败');
    }
    
  } catch (error) {
    console.error('      ❌ 课室约束传播测试失败:', error);
  }
}

/**
 * 测试完整约束检测
 */
async function testCompleteConstraintDetection(engine) {
  console.log('   🔍 测试完整约束检测...');
  
  try {
    // 创建测试变量
    const testVariable = {
      id: 'var3',
      courseId: 'course2',
      teacherId: 'teacher2',
      classId: 'class1',
      requiredHours: 1
    };
    
    const testTimeSlot = { dayOfWeek: 1, period: 1 };
    const testAssignments = new Map();
    
    // 测试完整约束检测
    const isFeasible = engine['isTimeSlotFeasible'](testVariable, testTimeSlot, testAssignments);
    
    if (isFeasible) {
      console.log('      ✅ 完整约束检测通过');
    } else {
      console.log('      ❌ 完整约束检测失败');
    }
    
  } catch (error) {
    console.error('      ❌ 完整约束检测测试失败:', error);
  }
}

/**
 * 测试约束传播机制
 */
async function testConstraintPropagation() {
  console.log('   🔄 测试约束传播机制...');
  
  try {
    // 创建测试状态
    const testState = {
      assignments: new Map(),
      unassigned: ['var1', 'var2', 'var3'],
      isFeasible: true,
      isComplete: false,
      conflicts: []
    };
    
    // 创建测试变量
    const testVariables = [
      {
        id: 'var1',
        courseId: 'course1',
        teacherId: 'teacher1',
        classId: 'class1',
        requiredHours: 1,
        domain: []
      },
      {
        id: 'var2',
        courseId: 'course2',
        teacherId: 'teacher2',
        classId: 'class1',
        requiredHours: 1,
        domain: []
      }
    ];
    
    // 设置班级时间段
    engine['classTimeSlots'] = [
      {
        baseTimeSlot: { dayOfWeek: 1, period: 1 },
        classId: 'class1',
        isAvailable: true,
        className: '一年级1班'
      },
      {
        baseTimeSlot: { dayOfWeek: 1, period: 2 },
        classId: 'class1',
        isAvailable: true,
        className: '一年级1班'
      }
    ];
    
    // 测试约束传播
    engine['propagateConstraints'](testState, testVariables);
    
    console.log(`      📊 约束传播结果:`);
    console.log(`         - 状态可行: ${testState.isFeasible}`);
    console.log(`         - 冲突数量: ${testState.conflicts.length}`);
    console.log(`         - 变量1可行时间槽: ${testVariables[0].domain?.length || 0}`);
    console.log(`         - 变量2可行时间槽: ${testVariables[1].domain?.length || 0}`);
    
  } catch (error) {
    console.error('      ❌ 约束传播机制测试失败:', error);
  }
}

// 运行测试
if (require.main === module) {
  testConstraintPropagationEnhancement();
}

module.exports = {
  testConstraintPropagationEnhancement,
  mockTeachingPlans,
  mockRooms,
  mockTimeSlots,
  mockSchedulingRules
};

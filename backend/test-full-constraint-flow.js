const { K12ConstraintChecker } = require('./dist/services/scheduling/k12-constraint-checker');

console.log('🧪 测试完整约束检查流程...');

// 创建约束检测器实例
const constraintChecker = new K12ConstraintChecker();

// 模拟数据：美术课变量
const mockVariable = {
  id: 'test_variable',
  classId: 'class1',
  subject: '美术', // 明确设置科目
  teacherId: 'teacher1',
  courseId: 'course1'
};

// 模拟时间槽
const mockTimeSlot = {
  dayOfWeek: 1, // 周一
  period: 1
};

// 模拟课室
const mockRoom = {
  _id: 'room1',
  name: '美术教室',
  type: '美术教室',
  capacity: 30,
  isActive: true
};

// 模拟当前分配（周一已有美术课）
const mockCurrentAssignments = new Map();
mockCurrentAssignments.set('existing1', {
  classId: 'class1',
  subject: '美术', // 确保科目字段一致
  teacherId: 'teacher2',
  roomId: 'room2',
  timeSlot: { dayOfWeek: 1, period: 3 } // 周一第3节已有美术课
});

console.log('📋 测试场景：周一已有美术课，尝试在周一第1节再安排美术课');
console.log('预期结果：应该违反副科一天一节约束');

console.log('\n🔍 调试信息:');
console.log(`变量科目: ${mockVariable.subject}`);
console.log(`变量科目类型: ${typeof mockVariable.subject}`);
console.log(`现有分配科目: ${mockCurrentAssignments.get('existing1').subject}`);
console.log(`现有分配科目类型: ${typeof mockCurrentAssignments.get('existing1').subject}`);

console.log('\n🔍 现有分配详情:');
for (const [key, assignment] of mockCurrentAssignments.entries()) {
  console.log(`  ${key}: 班级=${assignment.classId}, 科目=${assignment.subject}, 时间=${assignment.timeSlot.dayOfWeek}-${assignment.timeSlot.period}`);
}

// 测试约束检查
console.log('\n🧪 开始约束检查...');
const result = constraintChecker.checkConstraints(
  mockVariable,
  mockTimeSlot,
  mockRoom,
  mockCurrentAssignments
);

console.log(`\n🎯 测试结果：${result ? '通过' : '失败'}`);
console.log(`预期：失败（违反副科一天一节约束）`);
console.log(`实际：${result ? '通过' : '失败'}`);

if (!result) {
  console.log('✅ 约束正常工作：成功阻止了副科一天安排多节课');
} else {
  console.log('❌ 约束未生效：允许了副科一天安排多节课');
}

console.log('\n🧪 测试完成');

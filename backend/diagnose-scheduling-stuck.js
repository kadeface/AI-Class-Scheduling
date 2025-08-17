/**
 * 排课进度卡住问题诊断脚本
 * 
 * 帮助分析排课进度在课程179-182之间无法继续的原因
 */

const mongoose = require('mongoose');

// 模拟排课状态
class MockScheduleState {
  constructor() {
    this.assignments = new Map();
    this.unassigned = [];
    this.isComplete = false;
  }
}

// 模拟排课变量
class MockScheduleVariable {
  constructor(id, courseId, classId, teacherId, domain = []) {
    this.id = id;
    this.courseId = courseId;
    this.classId = classId;
    this.teacherId = teacherId;
    this.domain = domain;
    this.priority = 5; // 默认优先级
    this.subject = null;
    this.courseName = null;
  }
}

// 模拟约束检测器
class MockConstraintDetector {
  async checkAllConflicts(assignment, existingAssignments) {
    // 模拟冲突检测
    const conflicts = [];
    
    // 检查教师时间冲突
    for (const [_, existing] of Array.from(existingAssignments.entries())) {
      if (existing.teacherId.equals(assignment.teacherId) &&
          this.isTimeSlotOverlap(assignment.timeSlot, existing.timeSlot)) {
        conflicts.push({
          type: 'teacher',
          message: '教师时间冲突',
          conflictingVariables: [existing.variableId]
        });
      }
    }
    
    // 检查班级时间冲突
    for (const [_, existing] of Array.from(existingAssignments.entries())) {
      if (existing.classId.equals(assignment.classId) &&
          this.isTimeSlotOverlap(assignment.timeSlot, existing.timeSlot)) {
        conflicts.push({
          type: 'class',
          message: '班级时间冲突',
          conflictingVariables: [existing.variableId]
        });
      }
    }
    
    return conflicts;
  }
  
  checkForbiddenTimeSlot(assignment) {
    // 模拟禁用时间段检查
    return null; // 假设没有禁用时间段
  }
  
  checkSubjectSpecificConstraints(assignment, existingAssignments) {
    // 模拟科目特定约束检查
    return []; // 假设没有科目特定约束违反
  }
  
  isTimeSlotOverlap(slot1, slot2) {
    return slot1.dayOfWeek === slot2.dayOfWeek && slot1.period === slot2.period;
  }
}

// 模拟排课引擎
class MockSchedulingEngine {
  constructor() {
    this.constraintDetector = new MockConstraintDetector();
    this.currentStage = 'GENERAL_COURSES';
  }
  
  async canAssign(variable, timeSlot, state) {
    console.log(`🔍 [约束检查] 开始检查变量 ${variable.id} 在时间段 ${timeSlot.dayOfWeek}-${timeSlot.period} 的分配可能性`);
    
    // 模拟教室选择
    const roomId = new mongoose.Types.ObjectId();
    console.log(`✅ [约束检查] 变量 ${variable.id} 教室选择成功: ${roomId}`);
    
    // 创建临时分配
    const tempAssignment = {
      variableId: variable.id,
      classId: variable.classId,
      courseId: variable.courseId,
      teacherId: variable.teacherId,
      roomId,
      timeSlot,
      isFixed: false
    };
    
    // 检查硬约束
    console.log(`🔍 [约束检查] 检查变量 ${variable.id} 的硬约束...`);
    const conflicts = await this.constraintDetector.checkAllConflicts(tempAssignment, state.assignments);
    if (conflicts.length > 0) {
      console.log(`❌ [约束检查] 变量 ${variable.id} 存在 ${conflicts.length} 个冲突:`);
      conflicts.forEach((conflict, index) => {
        console.log(`   ${index + 1}. ${conflict.type} 冲突: ${conflict.message}`);
        console.log(`      冲突变量: ${conflict.conflictingVariables.join(', ')}`);
      });
      return false;
    }
    console.log(`✅ [约束检查] 变量 ${variable.id} 硬约束检查通过`);
    
    // 检查禁用时间段约束
    const forbiddenViolation = this.constraintDetector.checkForbiddenTimeSlot(tempAssignment);
    if (forbiddenViolation && forbiddenViolation.isHard) {
      console.log(`❌ [约束检查] 变量 ${variable.id} 违反禁用时间段约束: ${forbiddenViolation.message}`);
      return false;
    }
    console.log(`✅ [约束检查] 变量 ${variable.id} 禁用时间段约束检查通过`);
    
    // 模拟其他约束检查
    console.log(`✅ [约束检查] 变量 ${variable.id} 轮换约束检查通过`);
    console.log(`✅ [约束检查] 变量 ${variable.id} 科目特定约束检查通过`);
    
    console.log(`✅ [约束检查] 变量 ${variable.id} 所有约束检查通过，可以分配`);
    return true;
  }
  
  selectVariable(state, variables) {
    const unassignedVars = variables.filter(v => state.unassigned.includes(v.id));
    
    if (unassignedVars.length === 0) {
      return null;
    }
    
    // 添加调试信息：显示当前进度
    const totalVars = variables.length;
    const assignedVars = totalVars - unassignedVars.length;
    console.log(`🔍 [变量选择] 当前进度: ${assignedVars}/${totalVars} (${(assignedVars/totalVars*100).toFixed(1)}%)`);
    console.log(`   📊 未分配变量数量: ${unassignedVars.length}`);
    
    // 使用简单的MRV策略
    let bestVar = unassignedVars[0];
    let bestScore = bestVar.domain.length;
    
    for (const variable of unassignedVars) {
      const currentScore = variable.domain.length;
      if (currentScore < bestScore) {
        bestVar = variable;
        bestScore = currentScore;
      }
    }
    
    console.log(`   🎯 选中变量: ${bestVar.id} (域大小: ${bestScore})`);
    return bestVar.id;
  }
  
  orderValues(variable, state) {
    const values = [...variable.domain];
    
    if (values.length === 0) {
      console.log(`⚠️ [时间槽排序] 变量 ${variable.id} 没有可用时间段`);
      return values;
    }
    
    console.log(`🔍 [时间槽排序] 变量 ${variable.id} 有 ${values.length} 个可用时间段`);
    
    // 简单排序：按天和节次排序
    values.sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) {
        return a.dayOfWeek - b.dayOfWeek;
      }
      return a.period - b.period;
    });
    
    // 显示排序后的前几个时间段
    if (values.length > 0) {
      const topSlots = values.slice(0, 3).map(slot => `${slot.dayOfWeek}-${slot.period}`);
      console.log(`   📋 [时间槽排序] 变量 ${variable.id} 排序后前3个时间段: ${topSlots.join(', ')}`);
    }
    
    return values;
  }
}

// 诊断函数
async function diagnoseSchedulingStuck() {
  console.log('🧪 开始诊断排课进度卡住问题...\n');
  
  // 创建模拟数据
  const state = new MockScheduleState();
  const engine = new MockSchedulingEngine();
  
  // 模拟179-182课程的情况
  const variables = [];
  for (let i = 179; i <= 182; i++) {
    const variable = new MockScheduleVariable(
      `var${i}`,
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
      [
        { dayOfWeek: 1, period: 1 },
        { dayOfWeek: 1, period: 2 },
        { dayOfWeek: 2, period: 1 },
        { dayOfWeek: 2, period: 2 }
      ]
    );
    variables.push(variable);
    state.unassigned.push(variable.id);
  }
  
  console.log(`📊 创建了 ${variables.length} 个测试变量 (179-182)`);
  console.log(`📋 变量列表: ${variables.map(v => v.id).join(', ')}\n`);
  
  // 模拟排课过程
  let iteration = 0;
  const maxIterations = 10;
  
  while (state.unassigned.length > 0 && iteration < maxIterations) {
    iteration++;
    console.log(`\n🔄 迭代 ${iteration}:`);
    
    // 选择变量
    const variableId = engine.selectVariable(state, variables);
    if (!variableId) {
      console.log('❌ 没有可选变量');
      break;
    }
    
    const variable = variables.find(v => v.id === variableId);
    console.log(`   🎯 选中变量: ${variableId}`);
    
    // 尝试分配
    let assigned = false;
    for (const timeSlot of engine.orderValues(variable, state)) {
      console.log(`   🔍 尝试时间段: ${timeSlot.dayOfWeek}-${timeSlot.period}`);
      
      if (await engine.canAssign(variable, timeSlot, state)) {
        console.log(`   ✅ 变量 ${variableId} 成功分配到时间段 ${timeSlot.dayOfWeek}-${timeSlot.period}`);
        
        // 模拟分配
        state.assignments.set(variableId, {
          variableId,
          classId: variable.classId,
          courseId: variable.courseId,
          teacherId: variable.teacherId,
          roomId: new mongoose.Types.ObjectId(),
          timeSlot,
          isFixed: false
        });
        
        state.unassigned = state.unassigned.filter(id => id !== variableId);
        assigned = true;
        break;
      } else {
        console.log(`   ❌ 变量 ${variableId} 无法分配到时间段 ${timeSlot.dayOfWeek}-${timeSlot.period}`);
      }
    }
    
    if (!assigned) {
      console.log(`   🚨 变量 ${variableId} 无法分配到任何时间段！`);
      console.log(`   💡 这可能是导致排课卡住的原因`);
      break;
    }
    
    console.log(`   📊 当前进度: ${state.assignments.size}/${variables.length} (${(state.assignments.size/variables.length*100).toFixed(1)}%)`);
  }
  
  // 诊断结果
  console.log('\n📋 诊断结果:');
  if (state.unassigned.length === 0) {
    console.log('✅ 所有变量都成功分配');
  } else {
    console.log(`❌ 仍有 ${state.unassigned.length} 个变量未分配:`);
    state.unassigned.forEach(id => {
      console.log(`   - ${id}`);
    });
  }
  
  console.log('\n💡 可能的卡住原因:');
  console.log('1. 硬约束无法满足（教师冲突、班级冲突等）');
  console.log('2. 可用时间段不足');
  console.log('3. 教师轮换约束过于严格');
  console.log('4. 算法配置不当（迭代次数、时间限制）');
  console.log('5. 特定课程的约束条件过严');
  
  console.log('\n🔧 建议解决方案:');
  console.log('1. 检查约束检测器的日志输出');
  console.log('2. 放宽某些硬约束条件');
  console.log('3. 增加可用时间段');
  console.log('4. 调整算法参数');
  console.log('5. 检查教师轮换逻辑');
}

// 运行诊断
diagnoseSchedulingStuck().catch(console.error);

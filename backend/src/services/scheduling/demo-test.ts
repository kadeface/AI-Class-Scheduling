/**
 * 排课算法功能验证脚本
 * 
 * 用于快速验证排课算法的基本功能
 */

import { SchedulingEngine } from './scheduling-engine';
import { 
  ScheduleVariable, 
  AlgorithmConfig, 
  TimeSlot,
  CourseAssignment,
  ConstraintType 
} from './types';
import mongoose from 'mongoose';

/**
 * 生成测试数据
 */
function generateTestData(): {
  variables: ScheduleVariable[];
  rules: any;
  config: AlgorithmConfig;
} {
  // 创建测试用的排课变量
  const variables: ScheduleVariable[] = [
    {
      id: 'class1_math_teacher1_1',
      classId: new mongoose.Types.ObjectId(),
      courseId: new mongoose.Types.ObjectId(),
      teacherId: new mongoose.Types.ObjectId(),
      requiredHours: 1,
      priority: 8,
      domain: [
        { dayOfWeek: 1, period: 1 },
        { dayOfWeek: 1, period: 2 },
        { dayOfWeek: 2, period: 1 },
        { dayOfWeek: 2, period: 2 }
      ]
    },
    {
      id: 'class1_english_teacher2_1',
      classId: new mongoose.Types.ObjectId(),
      courseId: new mongoose.Types.ObjectId(),
      teacherId: new mongoose.Types.ObjectId(),
      requiredHours: 1,
      priority: 7,
      domain: [
        { dayOfWeek: 1, period: 3 },
        { dayOfWeek: 1, period: 4 },
        { dayOfWeek: 2, period: 3 },
        { dayOfWeek: 2, period: 4 }
      ]
    },
    {
      id: 'class2_math_teacher1_1',
      classId: new mongoose.Types.ObjectId(),
      courseId: new mongoose.Types.ObjectId(),
      teacherId: new mongoose.Types.ObjectId(),
      requiredHours: 1,
      priority: 8,
      domain: [
        { dayOfWeek: 1, period: 1 },
        { dayOfWeek: 1, period: 2 },
        { dayOfWeek: 2, period: 1 },
        { dayOfWeek: 2, period: 2 }
      ]
    }
  ];

  // 简化的排课规则
  const rules = {
    timeSlots: {
      dailyPeriods: 8,
      workingDays: [1, 2, 3, 4, 5], // 周一到周五
      breakPeriods: [4], // 第4节课是午休
      forbiddenTimeSlots: []
    },
    constraints: {
      teacherMaxDailyHours: 6,
      teacherMaxWeeklyHours: 20,
      classMaxDailyHours: 7,
      allowTeacherBreakViolation: false,
      allowRoomConflict: false
    },
    preferences: {
      coreSubjectMorningWeight: 0.8,
      teacherPreferenceWeight: 0.6,
      continuousClassWeight: 0.7,
      workloadBalanceWeight: 0.5
    }
  };

  // 算法配置
  const config: AlgorithmConfig = {
    maxIterations: 1000,
    timeLimit: 30, // 30秒
    backtrackLimit: 100,
    enableLocalOptimization: true,
    localOptimizationIterations: 10,
    verbose: true
  };

  return { variables, rules, config };
}

/**
 * 执行测试
 */
async function runTest() {
  console.log('🧪 开始排课算法功能验证...\n');

  try {
    // 1. 生成测试数据
    console.log('📊 生成测试数据...');
    const { variables, rules, config } = generateTestData();
    console.log(`   ✅ 生成 ${variables.length} 个排课变量`);
    console.log(`   ✅ 配置规则和约束`);
    console.log(`   ✅ 设置算法参数\n`);

    // 2. 创建排课引擎（带进度回调）
    console.log('🔧 初始化排课引擎...');
    const progressCallback = (progress: any) => {
      console.log(`   📈 进度: ${progress.stage} - ${progress.percentage.toFixed(1)}% (${progress.assignedCount}/${progress.totalCount})`);
    };
    const engine = new SchedulingEngine(rules, config, progressCallback);
    console.log('   ✅ 排课引擎已创建\n');

    // 3. 执行排课
    console.log('🚀 开始执行排课算法...');
    const startTime = Date.now();
    
    const result = await engine.solve(variables, []);

    const duration = Date.now() - startTime;
    console.log(`\n⏱️  算法执行时间: ${duration}ms\n`);

    // 4. 分析结果
    console.log('📋 排课结果分析:');
    console.log(`   🎯 成功状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);
    console.log(`   📊 总变量数: ${result.statistics.totalVariables}`);
    console.log(`   ✅ 已分配: ${result.statistics.assignedVariables}`);
    console.log(`   ❌ 未分配: ${result.statistics.unassignedVariables}`);
    console.log(`   🔴 硬约束违反: ${result.statistics.hardViolations}`);
    console.log(`   🟡 软约束违反: ${result.statistics.softViolations}`);
    console.log(`   🏆 总评分: ${result.statistics.totalScore.toFixed(2)}`);
    console.log(`   🔄 迭代次数: ${result.statistics.iterations}\n`);

    // 5. 显示具体安排
    if (result.success && result.scheduleState.assignments.size > 0) {
      console.log('📅 具体排课安排:');
      for (const [variableId, assignment] of result.scheduleState.assignments) {
        const timeSlot = assignment.timeSlot;
        const dayName = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'][timeSlot.dayOfWeek];
        console.log(`   📚 ${variableId} -> ${dayName} 第${timeSlot.period}节`);
      }
      console.log();
    }

    // 6. 显示冲突和建议
    if (result.conflicts.length > 0) {
      console.log('⚠️  发现冲突:');
      result.conflicts.forEach((conflict, index) => {
        console.log(`   ${index + 1}. ${conflict.message} (${conflict.severity})`);
      });
      console.log();
    }

    if (result.suggestions.length > 0) {
      console.log('💡 优化建议:');
      result.suggestions.forEach((suggestion, index) => {
        console.log(`   ${index + 1}. ${suggestion}`);
      });
      console.log();
    }

    // 7. 总结
    console.log('🎉 功能验证完成!');
    if (result.success) {
      console.log('✅ 排课算法工作正常，能够成功生成排课方案');
    } else {
      console.log('⚠️  排课算法运行正常，但在当前约束下未能找到完整解决方案');
      console.log('💡 这可能是因为测试数据的约束过于严格，实际使用时可以调整参数');
    }

    return result.success;

  } catch (error) {
    console.error('❌ 测试执行失败:', error);
    return false;
  }
}

// 直接执行测试（如果作为脚本运行）
if (require.main === module) {
  runTest()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 测试脚本执行异常:', error);
      process.exit(1);
    });
}

export { runTest }; 
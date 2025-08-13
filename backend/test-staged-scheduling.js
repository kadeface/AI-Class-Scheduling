/**
 * 分阶段排课功能测试
 * 
 * 测试新实现的分阶段排课功能
 */

const mongoose = require('mongoose');
const { SchedulingEngine } = require('./dist/services/scheduling/scheduling-engine');
const { AlgorithmConfig } = require('./dist/services/scheduling/types');

// 模拟排课规则
const mockRules = {
  timeRules: {
    workingDays: [1, 2, 3, 4, 5], // 周一到周五
    dailyPeriods: 8, // 每天8节课
    forbiddenSlots: []
  },
  roomConstraints: {
    allowRoomSharing: false, // 不允许教室共享
    maxRoomCapacity: 50, // 最大教室容量
    specializedRooms: [] // 专业教室列表
  },
  teacherConstraints: {
    rotationStrategy: {
      enableRotation: false,
      rotationOrder: 'alphabetical',
      roundCompletion: false,
      minIntervalBetweenClasses: 0
    }
  },
  courseArrangementRules: {
    coreSubjectStrategy: {
      enableCoreSubjectStrategy: true,
      coreSubjects: ['语文', '数学', '英语', '物理', '化学', '生物'],
      maxDailyOccurrences: 2,
      minDaysPerWeek: 3,
      preferredTimeSlots: [1, 2, 3, 4],
      avoidTimeSlots: [7, 8],
      maxConcentration: 3
    }
  }
};

// 模拟算法配置
const mockConfig = {
  maxIterations: 10000,
  timeLimit: 300,
  backtrackLimit: 1000,
  enableLocalOptimization: true,
  localOptimizationIterations: 100,
  verbose: true
};

// 模拟排课变量
const mockVariables = [
  {
    id: 'var1',
    classId: new mongoose.Types.ObjectId(),
    courseId: new mongoose.Types.ObjectId(),
    teacherId: new mongoose.Types.ObjectId(),
    requiredHours: 5,
    priority: 9, // 核心课程 - 语文
    domain: [],
    timePreferences: [],
    timeAvoidance: []
  },
  {
    id: 'var2',
    classId: new mongoose.Types.ObjectId(),
    courseId: new mongoose.Types.ObjectId(),
    teacherId: new mongoose.Types.ObjectId(),
    requiredHours: 5,
    priority: 9, // 核心课程 - 数学
    domain: [],
    timePreferences: [],
    timeAvoidance: []
  },
  {
    id: 'var3',
    classId: new mongoose.Types.ObjectId(),
    courseId: new mongoose.Types.ObjectId(),
    teacherId: new mongoose.Types.ObjectId(),
    requiredHours: 5,
    priority: 9, // 核心课程 - 英语
    domain: [],
    timePreferences: [],
    timeAvoidance: []
  },
  {
    id: 'var4',
    classId: new mongoose.Types.ObjectId(),
    courseId: new mongoose.Types.ObjectId(),
    teacherId: new mongoose.Types.ObjectId(),
    requiredHours: 4,
    priority: 8, // 核心课程 - 物理
    domain: [],
    timePreferences: [],
    timeAvoidance: []
  },
  {
    id: 'var5',
    classId: new mongoose.Types.ObjectId(),
    courseId: new mongoose.Types.ObjectId(),
    teacherId: new mongoose.Types.ObjectId(),
    requiredHours: 4,
    priority: 8, // 核心课程 - 化学
    domain: [],
    timePreferences: [],
    timeAvoidance: []
  },
  {
    id: 'var6',
    classId: new mongoose.Types.ObjectId(),
    courseId: new mongoose.Types.ObjectId(),
    teacherId: new mongoose.Types.ObjectId(),
    requiredHours: 4,
    priority: 8, // 核心课程 - 生物
    domain: [],
    timePreferences: [],
    timeAvoidance: []
  },
  {
    id: 'var7',
    classId: new mongoose.Types.ObjectId(),
    courseId: new mongoose.Types.ObjectId(),
    teacherId: new mongoose.Types.ObjectId(),
    requiredHours: 3,
    priority: 6, // 一般课程 - 历史
    domain: [],
    timePreferences: [],
    timeAvoidance: []
  },
  {
    id: 'var8',
    classId: new mongoose.Types.ObjectId(),
    courseId: new mongoose.Types.ObjectId(),
    teacherId: new mongoose.Types.ObjectId(),
    requiredHours: 3,
    priority: 6, // 一般课程 - 地理
    domain: [],
    timePreferences: [],
    timeAvoidance: []
  },
  {
    id: 'var9',
    classId: new mongoose.Types.ObjectId(),
    courseId: new mongoose.Types.ObjectId(),
    teacherId: new mongoose.Types.ObjectId(),
    requiredHours: 3,
    priority: 6, // 一般课程 - 政治
    domain: [],
    timePreferences: [],
    timeAvoidance: []
  },
  {
    id: 'var10',
    classId: new mongoose.Types.ObjectId(),
    courseId: new mongoose.Types.ObjectId(),
    teacherId: new mongoose.Types.ObjectId(),
    requiredHours: 2,
    priority: 4, // 一般课程 - 体育
    domain: [],
    timePreferences: [],
    timeAvoidance: []
  }
];

// 模拟进度回调
const mockProgressCallback = (progress) => {
  console.log(`📊 进度: ${progress.percentage}% | ${progress.message}`);
  if (progress.stage) {
    console.log(`  阶段: ${progress.stage}`);
  }
  console.log(`  已分配: ${progress.assignedCount}/${progress.totalCount}`);
};

async function testStagedScheduling() {
  try {
    console.log('🚀 开始测试分阶段排课功能...\n');

    // 创建排课引擎实例
    const engine = new SchedulingEngine(mockRules, mockConfig, mockProgressCallback);
    
    console.log('✅ 排课引擎创建成功');
    console.log(`📚 排课变量数量: ${mockVariables.length}`);

    // 执行分阶段排课
    console.log('\n🔄 开始执行分阶段排课...');
    const result = await engine.solve(mockVariables);

    // 输出结果
    console.log('\n📋 排课结果:');
    console.log(`  成功: ${result.success}`);
    console.log(`  总变量: ${result.statistics.totalVariables}`);
    console.log(`  已分配: ${result.statistics.assignedVariables}`);
    console.log(`  未分配: ${result.statistics.unassignedVariables}`);
    console.log(`  硬约束违反: ${result.statistics.hardViolations}`);
    console.log(`  软约束违反: ${result.statistics.softViolations}`);
    console.log(`  执行时间: ${result.statistics.executionTime}ms`);
    console.log(`  消息: ${result.message}`);

    // 输出分阶段信息
    console.log('\n📊 分阶段信息:');
    const currentStage = engine.getCurrentStage();
    const stageProgress = engine.getStageProgress();
    const stageResults = engine.getStageResults();

    console.log(`  当前阶段: ${currentStage || '已完成'}`);
    
    if (stageProgress) {
      console.log(`  阶段进度: ${stageProgress.stageProgress}%`);
      console.log(`  总体进度: ${stageProgress.overallProgress}%`);
      console.log(`  阶段消息: ${stageProgress.stageMessage}`);
    }

    if (stageResults.size > 0) {
      console.log('\n📈 各阶段结果:');
      for (const [stageType, stageResult] of stageResults) {
        console.log(`  ${stageType}:`);
        console.log(`    成功: ${stageResult.success}`);
        console.log(`    已分配: ${stageResult.assignedVariables}`);
        console.log(`    未分配: ${stageResult.unassignedVariables}`);
        console.log(`    执行时间: ${stageResult.executionTime}ms`);
        console.log(`    消息: ${stageResult.message}`);
      }
    }

    // 输出建议
    if (result.suggestions && result.suggestions.length > 0) {
      console.log('\n💡 改进建议:');
      result.suggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion}`);
      });
    }

    console.log('\n✅ 分阶段排课测试完成!');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
if (require.main === module) {
  testStagedScheduling();
}

module.exports = { testStagedScheduling };

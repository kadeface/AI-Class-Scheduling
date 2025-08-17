/**
 * 调试课程分类逻辑
 */
const mongoose = require('mongoose');

async function testCourseClassificationDebug() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ai-class-scheduling');
    console.log('✅ 数据库连接成功\n');

    // 注册模型
    require('./dist/models/index');
    
    // 导入模型和服务
    const TeachingPlan = mongoose.model('TeachingPlan');
    const SchedulingEngine = require('./dist/services/scheduling/scheduling-engine').SchedulingEngine;
    const { StageType } = require('./dist/services/scheduling/types');

    console.log('🔍 调试课程分类逻辑');
    console.log('=====================================');
    
    // 1. 获取教学计划数据
    console.log('\n📋 1. 获取教学计划数据:');
    const plans = await TeachingPlan.find({})
      .populate('class')
      .populate('courseAssignments.course')
      .populate('courseAssignments.teacher');

    console.log(`教学计划数量: ${plans.length}`);
    
    // 2. 创建排课变量（模拟排课服务的逻辑）
    console.log('\n🔧 2. 创建排课变量:');
    const variables = [];
    
    for (const plan of plans) {
      for (const assignment of plan.courseAssignments) {
        const course = assignment.course;
        
        // 为每周需要的课时创建变量
        for (let hour = 0; hour < assignment.weeklyHours; hour++) {
          const variable = {
            id: `${plan.class}_${assignment.course}_${assignment.teacher}_${hour}`,
            classId: plan.class,
            courseId: assignment.course,
            teacherId: assignment.teacher,
            courseName: course.name,
            subject: course.subject,
            requiredHours: 1,
            timePreferences: [],
            timeAvoidance: [],
            continuous: false,
            continuousHours: 1,
            priority: getCoursePriority(course.subject),
            domain: []
          };
          
          variables.push(variable);
        }
      }
    }

    console.log(`排课变量总数: ${variables.length}`);
    
    // 3. 统计优先级分布
    console.log('\n📊 3. 优先级分布统计:');
    const priorityDistribution = new Map();
    for (const variable of variables) {
      const priority = variable.priority || 0;
      priorityDistribution.set(priority, (priorityDistribution.get(priority) || 0) + 1);
    }
    
    for (const [priority, count] of priorityDistribution) {
      console.log(`   优先级 ${priority}: ${count} 个`);
    }
    
    // 4. 统计核心课程和一般课程
    console.log('\n📚 4. 课程分类统计:');
    const coreCount = variables.filter(v => v.priority >= 8).length;
    const generalCount = variables.filter(v => v.priority < 8).length;
    
    console.log(`   核心课程 (优先级≥8): ${coreCount} 个`);
    console.log(`   一般课程 (优先级<8): ${generalCount} 个`);
    
    // 5. 显示核心课程详情
    if (coreCount > 0) {
      console.log('\n✅ 核心课程详情:');
      const coreCourses = variables.filter(v => v.priority >= 8);
      coreCourses.slice(0, 10).forEach((v, i) => {
        console.log(`   ${i+1}. ${v.subject} (${v.courseName}) - 优先级: ${v.priority}`);
      });
    }
    
    // 6. 显示一般课程详情
    if (generalCount > 0) {
      console.log('\n📚 一般课程详情:');
      const generalCourses = variables.filter(v => v.priority < 8);
      generalCourses.slice(0, 10).forEach((v, i) => {
        console.log(`   ${i+1}. ${v.subject} (${v.courseName}) - 优先级: ${v.priority}`);
      });
    }
    
    // 7. 测试排课引擎的课程分类
    console.log('\n🚀 5. 测试排课引擎课程分类:');
    if (coreCount > 0) {
      // 创建模拟排课规则和配置
      const mockRules = {
        teacherConstraints: {
          rotationStrategy: {
            rotationOrder: 'alphabetical'
          }
        }
      };
      
      const mockConfig = {
        maxIterations: 1000,
        timeLimit: 60,
        backtrackLimit: 100,
        enableLocalOptimization: true,
        localOptimizationIterations: 50,
        verbose: false
      };
      
      const engine = new SchedulingEngine(mockRules, mockConfig);
      
      // 调用课程分类方法（通过反射访问私有方法）
      const classification = engine.classifyCourses(variables);
      
      console.log(`   引擎分类结果:`);
      console.log(`     核心课程: ${classification.coreCourses.length} 个`);
      console.log(`     一般课程: ${classification.generalCourses.length} 个`);
      console.log(`     核心科目: ${classification.coreSubjects.join(', ')}`);
      
    } else {
      console.log('   ⚠️ 没有核心课程，无法测试分阶段排课');
    }

  } catch (error) {
    console.error('❌ 调试失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
  }
}

/**
 * 根据科目设置课程优先级
 */
function getCoursePriority(subject) {
  if (!subject) {
    console.warn('⚠️ 课程科目为空，使用默认优先级5');
    return 5;
  }

  // 扩展的核心科目列表
  const coreSubjects = [
    '语文', '数学', '英语', '物理', '化学', '生物',
    'chinese', 'math', 'mathematics', 'english', 'physics', 'chemistry', 'biology',
    '语文课', '数学课', '英语课', '物理课', '化学课', '生物课',
    '语文基础', '数学基础', '英语基础', '物理基础', '化学基础', '生物基础',
    '语', '数', '英', '物', '化', '生'
  ];

  // 检查是否为核心科目
  const lowerSubject = subject.toLowerCase();
  const isCoreSubject = coreSubjects.some(coreSubject => 
    lowerSubject.includes(coreSubject.toLowerCase()) || 
    coreSubject.toLowerCase().includes(lowerSubject)
  );

  const priority = isCoreSubject ? 9 : 5;
  
  return priority;
}

// 运行调试
testCourseClassificationDebug();

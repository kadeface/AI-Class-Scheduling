const mongoose = require('mongoose');
require('dotenv').config();

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-class-scheduling');

// 定义教学计划模型
const TeachingPlan = mongoose.model('TeachingPlan', {
  class: mongoose.Schema.Types.ObjectId,
  courseAssignments: [{
    course: mongoose.Schema.Types.ObjectId,
    teacher: mongoose.Schema.Types.ObjectId,
    weeklyHours: Number,
    preferredTimeSlots: [String],
    avoidTimeSlots: [String],
    requiresContinuous: Boolean,
    continuousHours: Number
  }]
});

// 定义课程模型
const Course = mongoose.model('Course', {
  name: String,
  subject: String
});

async function testDataFlow() {
  try {
    console.log('🔍 开始检查数据流...');
    
    // 1. 查询教学计划
    const teachingPlans = await TeachingPlan.find()
      .populate('class')
      .populate('courseAssignments.course')
      .populate('courseAssignments.teacher');
    
    console.log(`📊 找到 ${teachingPlans.length} 个教学计划`);
    
    // 2. 检查每个教学计划的教师分配
    for (const plan of teachingPlans) {
      console.log(`\n📋 班级: ${plan.class?.name || plan.class}`);
      console.log(`   课程分配数量: ${plan.courseAssignments.length}`);
      
      for (const assignment of plan.courseAssignments) {
        const course = assignment.course;
        const teacher = assignment.teacher;
        
        console.log(`   📚 课程: ${course?.name || '未知'} (${course?.subject || '未知科目'})`);
        console.log(`      - 教师: ${teacher?.name || '未知'} (ID: ${assignment.teacher})`);
        console.log(`      - 每周课时: ${assignment.weeklyHours}`);
        
        // 检查教师ID的类型和值
        console.log(`      - 教师ID类型: ${typeof assignment.teacher}`);
        console.log(`      - 教师ID值: ${assignment.teacher}`);
        if (assignment.teacher instanceof mongoose.Types.ObjectId) {
          console.log(`      - 教师ID字符串: ${assignment.teacher.toString()}`);
        }
      }
    }
    
    // 3. 模拟 generateScheduleVariables 的逻辑
    console.log('\n🔄 模拟 generateScheduleVariables 逻辑...');
    const variables = [];
    
    for (const plan of teachingPlans) {
      for (const assignment of plan.courseAssignments) {
        const course = assignment.course;
        
        // 为每周需要的课时创建变量
        for (let hour = 0; hour < assignment.weeklyHours; hour++) {
          const variable = {
            id: `${plan.class}_${assignment.course}_${assignment.teacher}_${hour}`,
            classId: plan.class,
            courseId: assignment.course,
            teacherId: assignment.teacher, // 这里是关键！
            courseName: course?.name,
            subject: course?.subject,
            requiredHours: 1,
            priority: 8 // 假设都是核心课程
          };
          
          variables.push(variable);
        }
      }
    }
    
    console.log(`📊 生成了 ${variables.length} 个排课变量`);
    
    // 4. 检查教师ID分布
    const teacherIdCounts = new Map();
    variables.forEach(v => {
      const teacherIdStr = v.teacherId.toString();
      teacherIdCounts.set(teacherIdStr, (teacherIdCounts.get(teacherIdStr) || 0) + 1);
    });
    
    console.log('\n📊 教师ID分布检查:');
    for (const [teacherId, count] of teacherIdCounts) {
      console.log(`   - 教师 ${teacherId}: ${count} 门课程`);
    }
    
    // 5. 检查是否有异常的教师ID分布
    const teacherIds = Array.from(teacherIdCounts.keys());
    if (teacherIds.length === 1) {
      console.log(`\n⚠️ 警告：所有课程都分配给同一个教师: ${teacherIds[0]}`);
      console.log('   这解释了为什么排课会失败！');
    } else if (teacherIds.length < 5) {
      console.log(`\n⚠️ 警告：教师数量过少，只有 ${teacherIds.length} 个教师`);
    } else {
      console.log(`\n✅ 教师分配正常，共 ${teacherIds.length} 个教师`);
    }
    
    // 6. 检查前几个变量的详细信息
    console.log('\n📋 前5个变量的详细信息:');
    for (let i = 0; i < Math.min(5, variables.length); i++) {
      const v = variables[i];
      console.log(`   变量${i+1}:`);
      console.log(`     - ID: ${v.id}`);
      console.log(`     - 科目: ${v.subject}`);
      console.log(`     - 教师ID: ${v.teacherId} (类型: ${typeof v.teacherId})`);
      console.log(`     - 班级ID: ${v.classId}`);
      console.log(`     - 课程ID: ${v.courseId}`);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    mongoose.disconnect();
  }
}

testDataFlow();

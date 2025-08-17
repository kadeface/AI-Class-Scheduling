// backend/diagnose-scheduling-flow.js
const mongoose = require('mongoose');

async function diagnoseSchedulingFlow() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ai-class-scheduling');
    console.log('✅ 数据库连接成功\n');

    // 注册模型
    require('./dist/models/index');
    
    // 导入模型
    const TeachingPlan = mongoose.model('TeachingPlan');
    const Schedule = mongoose.model('Schedule');
    const Course = mongoose.model('Course');
    const Class = mongoose.model('Class');

    console.log('🔍 诊断排课流程问题');
    console.log('=====================================');
    
    // 1. 检查教学计划数据
    console.log('\n📋 1. 检查教学计划数据:');
    const plans = await TeachingPlan.find({}).populate('courseAssignments.course', 'subject name');
    console.log(`教学计划数量: ${plans.length}`);
    
    // 统计核心课程和一般课程
    const coreSubjects = ['语文', '数学', '英语'];
    let totalCoreHours = 0;
    let totalGeneralHours = 0;
    
    plans.forEach(plan => {
      plan.courseAssignments.forEach(ca => {
        const subject = ca.course.subject;
        const hours = ca.weeklyHours;
        
        if (coreSubjects.includes(subject)) {
          totalCoreHours += hours;
        } else {
          totalGeneralHours += hours;
        }
      });
    });
    
    console.log(`核心课程总课时: ${totalCoreHours} 节/周`);
    console.log(`一般课程总课时: ${totalGeneralHours} 节/周`);
    
    // 2. 检查排课结果数据
    console.log('\n📊 2. 检查排课结果数据:');
    const schedules = await Schedule.find({}).populate('course', 'subject name');
    console.log(`排课记录总数: ${schedules.length}`);
    
    // 统计排课结果中的科目分布
    const scheduledSubjectCounts = {};
    schedules.forEach(s => {
      if (s.course && s.course.subject) {
        scheduledSubjectCounts[s.course.subject] = (scheduledSubjectCounts[s.course.subject] || 0) + 1;
      }
    });
    
    console.log('\n排课结果科目分布:');
    Object.entries(scheduledSubjectCounts).forEach(([subject, count]) => {
      const isCore = coreSubjects.includes(subject);
      const status = isCore ? '✅ 核心' : '�� 一般';
      console.log(`  ${status} ${subject}: ${count} 个`);
    });
    
    // 3. 问题诊断
    console.log('\n🔍 3. 问题诊断:');
    
    // 检查核心课程是否被排课
    const coreScheduled = coreSubjects.filter(subject => 
      scheduledSubjectCounts[subject] && scheduledSubjectCounts[subject] > 0
    );
    
    if (coreScheduled.length === 0) {
      console.log('❌ 严重问题: 核心课程完全没有被排课！');
      console.log('\n可能原因:');
      console.log('1. 排课算法没有处理核心课程');
      console.log('2. 排课变量生成时过滤了核心课程');
      console.log('3. 排课规则配置问题');
      console.log('4. 数据权限或范围限制');
    } else {
      console.log(`✅ 部分核心课程被排课: ${coreScheduled.join(', ')}`);
    }
    
    // 4. 检查排课变量生成
    console.log('\n🔧 4. 检查排课变量生成:');
    
    // 计算预期的排课变量数量
    let expectedCoreVariables = 0;
    let expectedGeneralVariables = 0;
    
    plans.forEach(plan => {
      plan.courseAssignments.forEach(ca => {
        const subject = ca.course.subject;
        const hours = ca.weeklyHours;
        
        if (coreSubjects.includes(subject)) {
          expectedCoreVariables += hours;
        } else {
          expectedGeneralVariables += hours;
        }
      });
    });
    
    console.log(`预期核心课程变量: ${expectedCoreVariables} 个`);
    console.log(`预期一般课程变量: ${expectedGeneralVariables} 个`);
    console.log(`预期总变量: ${expectedCoreVariables + expectedGeneralVariables} 个`);
    console.log(`实际排课记录: ${schedules.length} 个`);
    
    // 5. 修复建议
    console.log('\n💡 5. 修复建议:');
    
    if (schedules.length < (expectedCoreVariables + expectedGeneralVariables)) {
      console.log('1. 检查排课变量生成逻辑，确保所有课程都被转换为变量');
      console.log('2. 检查排课算法执行过程，确认没有课程被意外过滤');
      console.log('3. 检查排课规则配置，确保核心课程策略正确启用');
      console.log('4. 检查数据权限设置，确认没有范围限制');
    }
    
    if (coreScheduled.length === 0) {
      console.log('5. 优先修复核心课程排课问题，这是关键功能');
      console.log('6. 检查分阶段排课算法是否正确执行');
      console.log('7. 验证课程分类逻辑是否正常工作');
    }

  } catch (error) {
    console.error('❌ 诊断失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
  }
}

// 运行诊断
diagnoseSchedulingFlow();
/**
 * 诊断课程分类问题
 */
const mongoose = require('mongoose');

async function diagnoseCourseClassification() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ai-class-scheduling');
    console.log('✅ 数据库连接成功\n');

    // 注册模型
    require('./dist/models/index');
    
    // 导入模型
    const TeachingPlan = mongoose.model('TeachingPlan');
    const Course = mongoose.model('Course');

    console.log('🔍 诊断课程分类问题');
    console.log('=====================================');
    
    // 1. 检查课程数据
    console.log('\n📚 1. 检查课程数据:');
    const courses = await Course.find({});
    console.log(`课程总数: ${courses.length}`);
    
    const coreSubjects = ['语文', '数学', '英语'];
    const coreCourses = courses.filter(c => coreSubjects.includes(c.subject));
    const otherCourses = courses.filter(c => !coreSubjects.includes(c.subject));
    
    console.log(`核心课程: ${coreCourses.length} 个`);
    coreCourses.forEach(c => console.log(`  ✅ ${c.subject}: ${c.name}`));
    
    console.log(`其他课程: ${otherCourses.length} 个`);
    otherCourses.slice(0, 10).forEach(c => console.log(`  📚 ${c.subject}: ${c.name}`));

    // 2. 检查教学计划
    console.log('\n📋 2. 检查教学计划:');
    const plans = await TeachingPlan.find({})
      .populate('class')
      .populate('courseAssignments.course')
      .populate('courseAssignments.teacher');

    console.log(`教学计划数量: ${plans.length}`);
    
    let totalHours = 0;
    let coreHours = 0;
    const subjectHours = {};

    plans.forEach(plan => {
      plan.courseAssignments.forEach(ca => {
        const subject = ca.course.subject;
        const hours = ca.weeklyHours;
        
        totalHours += hours;
        
        if (!subjectHours[subject]) {
          subjectHours[subject] = 0;
        }
        subjectHours[subject] += hours;
        
        if (coreSubjects.includes(subject)) {
          coreHours += hours;
        }
      });
    });

    console.log(`总课时: ${totalHours} 节/周`);
    console.log(`核心课程课时: ${coreHours} 节/周`);

    console.log('\n📊 各科目课时分布:');
    Object.entries(subjectHours)
      .sort((a, b) => b[1] - a[1])
      .forEach(([subject, hours]) => {
        const status = coreSubjects.includes(subject) ? '✅ 核心' : '📚 其他';
        console.log(`  ${status} ${subject}: ${hours} 节/周`);
      });

    // 3. 问题诊断
    console.log('\n🔍 3. 问题诊断:');
    
    if (coreHours === 0) {
      console.log('❌ 严重问题: 教学计划中没有核心课程！');
      console.log('   可能原因:');
      console.log('   1. 课程数据中的 subject 字段为空');
      console.log('   2. 核心课程名称与预期不符');
      console.log('   3. 教学计划数据损坏');
    } else if (coreHours < 100) {
      console.log('⚠️  警告: 核心课程课时较少');
      console.log(`   当前: ${coreHours} 节/周`);
    } else {
      console.log('✅ 核心课程课时正常');
    }

    if (totalHours !== 224) {
      console.log(`⚠️  警告: 总课时不符合预期`);
      console.log(`   期望: 224 节/周`);
      console.log(`   实际: ${totalHours} 节/周`);
    } else {
      console.log('✅ 总课时符合预期');
    }

    // 4. 修复建议
    console.log('\n💡 4. 修复建议:');
    console.log('1. 检查课程数据中的 subject 字段是否完整');
    console.log('2. 确认核心课程名称是否为: 语文、数学、英语');
    console.log('3. 验证教学计划数据的完整性');

  } catch (error) {
    console.error('❌ 诊断失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
  }
}

// 运行诊断
diagnoseCourseClassification();

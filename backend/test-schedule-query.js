/**
 * 测试课表查询逻辑
 */
const mongoose = require('mongoose');

async function testScheduleQuery() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ai-class-scheduling');
    console.log('✅ 数据库连接成功\n');

    // 注册模型
    require('./dist/models/index');
    
    // 导入模型
    const Schedule = mongoose.model('Schedule');
    const Class = mongoose.model('Class');
    const Course = mongoose.model('Course');

    console.log('🔍 测试课表查询逻辑');
    console.log('=====================================');
    
    // 1. 检查班级数据
    console.log('\n📚 1. 检查班级数据:');
    const classes = await Class.find({ isActive: true }).limit(3);
    console.log(`活跃班级数量: ${classes.length}`);
    classes.forEach(c => console.log(`   ${c.name} (ID: ${c._id})`));
    
    if (classes.length === 0) {
      console.log('❌ 没有找到活跃班级');
      return;
    }
    
    const testClassId = classes[0]._id;
    console.log(`\n选择测试班级: ${classes[0].name}`);
    
    // 2. 检查排课数据
    console.log('\n📋 2. 检查排课数据:');
    
    // 检查所有排课记录
    const allSchedules = await Schedule.find({});
    console.log(`总排课记录数: ${allSchedules.length}`);
    
    if (allSchedules.length === 0) {
      console.log('❌ 没有找到排课记录');
      return;
    }
    
    // 检查学期标识格式
    const semesterFormats = [...new Set(allSchedules.map(s => s.semester))];
    console.log(`学期标识格式: ${semesterFormats.join(', ')}`);
    
    // 检查状态分布
    const statusCounts = {};
    allSchedules.forEach(s => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    });
    console.log(`状态分布:`, statusCounts);
    
    // 3. 模拟课表查看控制器的查询
    console.log('\n🔍 3. 模拟课表查看控制器查询:');
    
    // 测试不同的学期标识格式
    const testSemesters = [
      '2025-2026-1',  // 排课服务保存的格式
      '2025-2026-1',  // 课表查看控制器查询的格式
      '2025-2026-1'   // 前端传递的格式
    ];
    
    for (const testSemester of testSemesters) {
      console.log(`\n测试学期标识: "${testSemester}"`);
      
      const schedules = await Schedule.find({
        class: testClassId,
        semester: testSemester,
        status: 'active'
      })
      .populate('course', 'name subject')
      .populate('teacher', 'name')
      .populate('room', 'name roomNumber');
      
      console.log(`   查询结果: ${schedules.length} 条记录`);
      
      if (schedules.length > 0) {
        // 统计科目分布
        const subjectCounts = {};
        schedules.forEach(s => {
          const course = s.course;
          if (course && course.subject) {
            subjectCounts[course.subject] = (subjectCounts[course.subject] || 0) + 1;
          }
        });
        
        console.log(`   科目分布:`);
        Object.entries(subjectCounts).forEach(([subject, count]) => {
          const isCore = ['语文', '数学', '英语'].includes(subject);
          const status = isCore ? '✅ 核心' : '📚 一般';
          console.log(`     ${status} ${subject}: ${count} 个`);
        });
      }
    }
    
    // 4. 检查课程数据
    console.log('\n📚 4. 检查课程数据:');
    const courses = await Course.find({ isActive: true });
    console.log(`活跃课程数量: ${courses.length}`);
    
    // 统计核心课程和一般课程
    const coreSubjects = ['语文', '数学', '英语'];
    const coreCourses = courses.filter(c => coreSubjects.includes(c.subject));
    const generalCourses = courses.filter(c => !coreSubjects.includes(c.subject));
    
    console.log(`核心课程: ${coreCourses.length} 个`);
    coreCourses.slice(0, 5).forEach(c => console.log(`   ✅ ${c.subject}: ${c.name}`));
    
    console.log(`一般课程: ${generalCourses.length} 个`);
    generalCourses.slice(0, 5).forEach(c => console.log(`   📚 ${c.subject}: ${c.name}`));
    
    // 5. 问题诊断
    console.log('\n🔍 5. 问题诊断:');
    
    // 检查是否有核心课程的排课记录
    const coreCourseIds = coreCourses.map(c => c._id);
    const coreSchedules = await Schedule.find({
      course: { $in: coreCourseIds },
      status: 'active'
    });
    
    console.log(`核心课程排课记录: ${coreSchedules.length} 条`);
    
    if (coreSchedules.length === 0) {
      console.log('❌ 问题: 没有找到核心课程的排课记录！');
      console.log('   可能原因:');
      console.log('   1. 排课结果没有正确保存');
      console.log('   2. 学期标识格式不匹配');
      console.log('   3. 状态字段不是 "active"');
    } else {
      console.log('✅ 核心课程排课记录存在');
      
      // 检查学期标识
      const coreSemesters = [...new Set(coreSchedules.map(s => s.semester))];
      console.log(`   核心课程学期标识: ${coreSemesters.join(', ')}`);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
  }
}

// 运行测试
testScheduleQuery();

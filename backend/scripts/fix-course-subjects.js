/**
 * 修复课程科目分类问题
 * 
 * 问题：数据库中"一年级情商管理"等课程的subject字段被错误设置为"英语"
 * 需要将这些课程的subject字段修正为正确的科目名称
 */

const mongoose = require('mongoose');

async function fixCourseSubjects() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ai-class-scheduling');
    console.log('✅ 数据库连接成功\n');

    // 注册模型
    require('./dist/models/index');
    
    // 导入模型
    const Course = mongoose.model('Course');

    console.log('🔍 检查课程科目分类问题');
    console.log('=====================================');
    
    // 1. 检查所有课程数据
    console.log('\n📚 1. 检查所有课程数据:');
    const courses = await Course.find({});
    console.log(`课程总数: ${courses.length}`);
    
    // 2. 检查有问题的课程
    console.log('\n⚠️ 2. 检查有问题的课程:');
    const problematicCourses = [];
    
    courses.forEach(course => {
      // 检查课程名称和科目是否匹配
      const courseName = course.name.toLowerCase();
      const subject = course.subject;
      
      // 检查不匹配的情况
      if (courseName.includes('情商管理') && subject === '英语') {
        problematicCourses.push({
          id: course._id,
          name: course.name,
          subject: course.subject,
          issue: '情商管理课程被错误分类为英语'
        });
      }
      
      if (courseName.includes('语文') && subject !== '语文') {
        problematicCourses.push({
          id: course._id,
          name: course.name,
          subject: course.subject,
          issue: '语文课程科目不匹配'
        });
      }
      
      if (courseName.includes('数学') && subject !== '数学') {
        problematicCourses.push({
          id: course._id,
          name: course.name,
          subject: course.subject,
          issue: '数学课程科目不匹配'
        });
      }
      
      if (courseName.includes('英语') && subject !== '英语') {
        problematicCourses.push({
          id: course._id,
          name: course.name,
          subject: course.subject,
          issue: '英语课程科目不匹配'
        });
      }
    });
    
    if (problematicCourses.length === 0) {
      console.log('✅ 没有发现课程科目分类问题');
      return;
    }
    
    console.log(`发现 ${problematicCourses.length} 个有问题的课程:`);
    problematicCourses.forEach(course => {
      console.log(`  ❌ ${course.name} (ID: ${course.id})`);
      console.log(`      当前科目: ${course.subject}`);
      console.log(`      问题: ${course.issue}`);
    });
    
    // 3. 修复课程科目
    console.log('\n🔧 3. 开始修复课程科目:');
    
    for (const problematicCourse of problematicCourses) {
      const course = await Course.findById(problematicCourse.id);
      if (!course) continue;
      
      // 根据课程名称推断正确的科目
      let correctSubject = course.subject;
      
      if (course.name.includes('情商管理')) {
        correctSubject = '情商管理';
      } else if (course.name.includes('语文')) {
        correctSubject = '语文';
      } else if (course.name.includes('数学')) {
        correctSubject = '数学';
      } else if (course.name.includes('英语')) {
        correctSubject = '英语';
      } else if (course.name.includes('物理')) {
        correctSubject = '物理';
      } else if (course.name.includes('化学')) {
        correctSubject = '化学';
      } else if (course.name.includes('生物')) {
        correctSubject = '生物';
      } else if (course.name.includes('历史')) {
        correctSubject = '历史';
      } else if (course.name.includes('地理')) {
        correctSubject = '地理';
      } else if (course.name.includes('政治')) {
        correctSubject = '政治';
      } else if (course.name.includes('音乐')) {
        correctSubject = '音乐';
      } else if (course.name.includes('美术')) {
        correctSubject = '美术';
      } else if (course.name.includes('体育')) {
        correctSubject = '体育';
      } else if (course.name.includes('信息技术')) {
        correctSubject = '信息技术';
      }
      
      if (correctSubject !== course.subject) {
        console.log(`  🔧 修复课程: ${course.name}`);
        console.log(`      原科目: ${course.subject} → 新科目: ${correctSubject}`);
        
        // 更新课程科目
        course.subject = correctSubject;
        await course.save();
        
        console.log(`      ✅ 修复完成`);
      }
    }
    
    // 4. 验证修复结果
    console.log('\n🔍 4. 验证修复结果:');
    const updatedCourses = await Course.find({});
    let stillProblematic = 0;
    
    updatedCourses.forEach(course => {
      const courseName = course.name.toLowerCase();
      const subject = course.subject;
      
      if (courseName.includes('情商管理') && subject === '英语') {
        stillProblematic++;
      }
    });
    
    if (stillProblematic === 0) {
      console.log('✅ 所有课程科目分类问题已修复');
    } else {
      console.log(`⚠️ 仍有 ${stillProblematic} 个课程存在科目分类问题`);
    }
    
    console.log('\n📊 修复完成！');
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
  }
}

// 运行修复脚本
fixCourseSubjects();

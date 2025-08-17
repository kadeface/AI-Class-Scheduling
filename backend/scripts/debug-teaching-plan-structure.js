/**
 * 调试教学计划数据结构
 * 
 * 检查为什么核心课程识别为0
 */

const { MongoClient, ObjectId } = require('mongodb');

async function debugTeachingPlanStructure() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('✅ 连接到MongoDB');
    
    const db = client.db('ai-class-scheduling');
    
    // 1. 检查教学计划总数
    const totalPlans = await db.collection('teachingplans').countDocuments();
    console.log(`📊 教学计划总数: ${totalPlans}`);
    
    // 2. 检查教学计划结构
    const samplePlan = await db.collection('teachingplans').findOne();
    if (samplePlan) {
      console.log('\n🔍 教学计划样本结构:');
      console.log('   _id:', samplePlan._id);
      console.log('   academicYear:', samplePlan.academicYear);
      console.log('   semester:', samplePlan.semester);
      console.log('   class:', samplePlan.class);
      console.log('   courseAssignments 数量:', samplePlan.courseAssignments?.length || 0);
      
      if (samplePlan.courseAssignments && samplePlan.courseAssignments.length > 0) {
        const firstAssignment = samplePlan.courseAssignments[0];
        console.log('\n   📋 第一个课程分配:');
        console.log('     course:', firstAssignment.course);
        console.log('     teacher:', firstAssignment.teacher);
        console.log('     weeklyHours:', firstAssignment.weeklyHours);
        
        if (firstAssignment.course) {
          console.log('\n   📚 课程详情:');
          console.log('     _id:', firstAssignment.course._id);
          console.log('     name:', firstAssignment.course.name);
          console.log('     subject:', firstAssignment.course.subject);
          console.log('     code:', firstAssignment.course.code);
          console.log('     type:', firstAssignment.course.type);
          
          // 检查所有可能的科目字段
          console.log('\n   🔍 课程对象的所有字段:');
          Object.keys(firstAssignment.course).forEach(key => {
            console.log(`     ${key}:`, firstAssignment.course[key]);
          });
        }
      }
    }
    
    // 3. 检查所有课程的科目分布
    console.log('\n🔍 检查课程科目分布...');
    const courseSubjects = await db.collection('courses').distinct('subject');
    console.log('   📚 数据库中的科目列表:');
    courseSubjects.forEach(subject => {
      console.log(`     - ${subject}`);
    });
    
    // 4. 检查核心课程识别逻辑
    console.log('\n🔍 模拟核心课程识别逻辑...');
    const coreSubjects = ['语文', '数学', '英语'];
    console.log('   🎯 期望的核心科目:', coreSubjects);
    
    // 获取所有教学计划
    const allPlans = await db.collection('teachingplans').find({}).toArray();
    
    let coreCount = 0;
    let electiveCount = 0;
    let unknownCount = 0;
    
    allPlans.forEach((plan, index) => {
      if (plan.courseAssignments && plan.courseAssignments.length > 0) {
        const course = plan.courseAssignments[0].course;
        if (course && course.subject) {
          if (coreSubjects.includes(course.subject)) {
            coreCount++;
            console.log(`   ✅ 核心课程 ${index + 1}: ${course.subject} (${course.name})`);
          } else {
            electiveCount++;
            console.log(`   🎨 副科课程 ${index + 1}: ${course.subject} (${course.name})`);
          }
        } else {
          unknownCount++;
          console.log(`   ❓ 未知课程 ${index + 1}: course或subject为空`);
          if (course) {
            console.log(`      课程对象:`, course);
          }
        }
      } else {
        unknownCount++;
        console.log(`   ❓ 无效计划 ${index + 1}: 没有courseAssignments`);
      }
    });
    
    console.log('\n📊 识别结果统计:');
    console.log(`   核心课程: ${coreCount}`);
    console.log(`   副科课程: ${electiveCount}`);
    console.log(`   未知/无效: ${unknownCount}`);
    console.log(`   总计: ${coreCount + electiveCount + unknownCount}`);
    
    // 5. 检查科目名称是否完全匹配
    console.log('\n🔍 检查科目名称匹配问题...');
    const allSubjects = await db.collection('courses').find({}, { subject: 1, name: 1 }).toArray();
    const subjectMap = new Map();
    
    allSubjects.forEach(course => {
      if (course.subject) {
        if (!subjectMap.has(course.subject)) {
          subjectMap.set(course.subject, []);
        }
        subjectMap.get(course.subject).push(course.name);
      }
    });
    
    console.log('   📚 科目到课程名称的映射:');
    subjectMap.forEach((courses, subject) => {
      console.log(`     ${subject}: ${courses.join(', ')}`);
    });
    
    // 6. 检查是否有科目名称的变体
    console.log('\n🔍 检查科目名称变体...');
    const allSubjectNames = Array.from(subjectMap.keys());
    const coreSubjectVariants = {
      '语文': ['语文', '语文课', 'Chinese', 'chinese'],
      '数学': ['数学', '数学课', 'Math', 'math', 'Mathematics'],
      '英语': ['英语', '英语课', 'English', 'english']
    };
    
    Object.entries(coreSubjectVariants).forEach(([coreSubject, variants]) => {
      const foundVariants = variants.filter(variant => 
        allSubjectNames.some(name => name.includes(variant) || variant.includes(name))
      );
      console.log(`   ${coreSubject} 可能的变体: ${foundVariants.join(', ')}`);
    });
    
  } catch (error) {
    console.error('❌ 调试过程中发生错误:', error);
  } finally {
    await client.close();
    console.log('\n🔚 数据库连接已关闭');
  }
}

// 运行调试
debugTeachingPlanStructure().catch(console.error);

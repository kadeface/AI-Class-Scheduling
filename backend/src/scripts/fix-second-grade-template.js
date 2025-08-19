// 在 backend/scripts/ 目录下创建 fix-second-grade-template.js
import mongoose from 'mongoose';

async function fixSecondGradeTemplate() {
  try {
    // 连接到数据库
    await mongoose.connect('mongodb://localhost:27017/ai-class-scheduling', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ 数据库连接成功');

    // 获取数据库连接
    const db = mongoose.connection.db;
    
    // 执行更新
    const result = await db.collection('grade_templates').updateOne(
        { 
          _id: new mongoose.Types.ObjectId("68981f3278e801958517fb32"),
          grade: '二年级',
          isDefault: true
        },
        { 
          $push: { 
            courses: [
              JSON.stringify({
                courseId: "68764f7f449c7ab8bf667eba",
                courseName: "二年级班会",
                weeklyHours: 1,
                priority: "core",
                requiresContinuous: false,
                preferredTimeSlots: [],
                avoidTimeSlots: [],
                notes: ""
              }),
              JSON.stringify({
                courseId: "68764f7f449c7ab8bf667ec1",
                courseName: "二年级体活",
                weeklyHours: 1,
                priority: "activity",
                requiresContinuous: false,
                preferredTimeSlots: [],
                avoidTimeSlots: [],
                notes: ""
              }),
              JSON.stringify({
                courseId: "68764f7f449c7ab8bf667ec4",
                courseName: "二年级游戏",
                weeklyHours: 1,
                priority: "activity",
                requiresContinuous: false,
                preferredTimeSlots: [],
                avoidTimeSlots: [],
                notes: ""
              })
            ]
          }
        }
      );

    if (result.modifiedCount > 0) {
      console.log('✅ 二年级模板修复成功');
      
      // 验证结果
      const template = await db.collection('grade_templates').findOne({ 
        grade: '二年级', 
        isDefault: true 
      });
      
      console.log(`📊 修复后课程数量: ${template.courses.length}`);
      console.log('📚 课程列表:');
      template.courses.forEach((course, index) => {
        console.log(`   ${index + 1}. ${course.courseName}`);
      });
    } else {
      console.log('⚠️  没有找到需要修复的模板');
    }

  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已断开');
  }
}

// 运行修复
fixSecondGradeTemplate();
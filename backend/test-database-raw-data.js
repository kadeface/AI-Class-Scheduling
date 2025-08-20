/**
 * 测试数据库原始数据格式
 * 
 * 这个测试文件用于直接检查MongoDB中存储的原始数据格式
 */

const mongoose = require('mongoose');

async function testDatabaseRawData() {
  console.log('🧪 开始测试数据库原始数据格式...\n');
  
  try {
    // 连接数据库
    await mongoose.connect('mongodb://localhost:27017/ai-class-scheduling');
    console.log('✅ 数据库连接成功\n');
    
    // 1. 检查现有的排课规则数据
    console.log('🔍 检查现有的排课规则数据...');
    
    // 使用原生MongoDB驱动来获取原始数据
    const db = mongoose.connection.db;
    const collection = db.collection('schedulingrules');
    
    // 查找包含固定时间课程的规则
    const rules = await collection.find({
      'courseArrangementRules.fixedTimeCourses': { $exists: true }
    }).toArray();
    
    console.log(`📊 找到 ${rules.length} 个包含固定时间课程的排课规则\n`);
    
    if (rules.length > 0) {
      // 检查每个规则的数据格式
      rules.forEach((rule, index) => {
        console.log(`📋 规则 ${index + 1}: ${rule.name}`);
        console.log(`   ID: ${rule._id}`);
        console.log(`   学年: ${rule.academicYear}`);
        console.log(`   学期: ${rule.semester}`);
        
        if (rule.courseArrangementRules && rule.courseArrangementRules.fixedTimeCourses) {
          const fixedTimeCourses = rule.courseArrangementRules.fixedTimeCourses;
          
          console.log(`   🔒 固定时间课程配置:`);
          console.log(`      enabled: ${fixedTimeCourses.enabled} (类型: ${typeof fixedTimeCourses.enabled})`);
          console.log(`      priority: ${fixedTimeCourses.priority} (类型: ${typeof fixedTimeCourses.priority})`);
          console.log(`      allowOverride: ${fixedTimeCourses.allowOverride} (类型: ${typeof fixedTimeCourses.allowOverride})`);
          console.log(`      conflictStrategy: ${fixedTimeCourses.conflictStrategy} (类型: ${typeof fixedTimeCourses.conflictStrategy})`);
          
          // 检查courses字段
          if (fixedTimeCourses.courses) {
            console.log(`      courses 类型: ${typeof fixedTimeCourses.courses}`);
            console.log(`      courses 是否为数组: ${Array.isArray(fixedTimeCourses.courses)}`);
            
            if (Array.isArray(fixedTimeCourses.courses)) {
              console.log(`      courses 长度: ${fixedTimeCourses.courses.length}`);
              fixedTimeCourses.courses.forEach((course, courseIndex) => {
                console.log(`        课程 ${courseIndex + 1}:`);
                console.log(`          类型: ${course.type} (类型: ${typeof course.type})`);
                console.log(`          星期: ${course.dayOfWeek} (类型: ${typeof course.dayOfWeek})`);
                console.log(`          节次: ${course.period} (类型: ${typeof course.period})`);
                console.log(`          周次类型: ${course.weekType} (类型: ${typeof course.weekType})`);
                console.log(`          开始周次: ${course.startWeek} (类型: ${typeof course.startWeek})`);
                console.log(`          结束周次: ${course.endWeek} (类型: ${typeof course.endWeek})`);
                if (course.notes) {
                  console.log(`          备注: ${course.notes} (类型: ${typeof course.notes})`);
                }
              });
            } else {
              // 如果不是数组，尝试解析
              console.log(`      courses 原始值: ${fixedTimeCourses.courses}`);
              try {
                if (typeof fixedTimeCourses.courses === 'string') {
                  const parsed = JSON.parse(fixedTimeCourses.courses);
                  console.log(`      courses 解析后: ${JSON.stringify(parsed, null, 4)}`);
                }
              } catch (parseError) {
                console.log(`      ❌ courses 解析失败: ${parseError.message}`);
              }
            }
          } else {
            console.log(`      ❌ courses 字段不存在`);
          }
        } else {
          console.log(`   ❌ 没有固定时间课程配置`);
        }
        
        console.log('');
      });
    } else {
      console.log('❌ 没有找到包含固定时间课程的排课规则');
    }
    
    // 2. 检查数据库集合的Schema信息
    console.log('🔍 检查数据库集合的Schema信息...');
    
    try {
      const collectionInfo = await db.listCollections({ name: 'schedulingrules' }).toArray();
      if (collectionInfo.length > 0) {
        console.log('✅ 找到 schedulingrules 集合');
        console.log(`   集合名称: ${collectionInfo[0].name}`);
        console.log(`   集合类型: ${collectionInfo[0].type}`);
      }
    } catch (error) {
      console.log('⚠️ 无法获取集合信息:', error.message);
    }
    
    // 3. 尝试创建一个新的测试规则
    console.log('\n🚀 创建新的测试规则...');
    
    const testRule = {
      name: '测试规则-原始数据格式',
      description: '测试固定时间课程原始数据格式',
      schoolType: 'primary',
      academicYear: '2025-2026',
      semester: 1,
      timeRules: {
        dailyPeriods: 7,
        workingDays: [1, 2, 3, 4, 5],
        periodDuration: 40,
        breakDuration: 10,
        lunchBreakStart: 4,
        lunchBreakDuration: 90,
        morningPeriods: [1, 2, 3],
        afternoonPeriods: [5, 6, 7, 4],
        forbiddenSlots: []
      },
      teacherConstraints: {
        maxDailyHours: 6,
        maxContinuousHours: 2,
        minRestBetweenCourses: 1,
        avoidFridayAfternoon: false,
        respectTeacherPreferences: true,
        allowCrossGradeTeaching: true,
        rotationStrategy: {
          enableRotation: true,
          rotationMode: 'round_robin',
          roundCompletion: true,
          minIntervalBetweenClasses: 1,
          maxConsecutiveClasses: 2,
          rotationOrder: 'alphabetical',
          customRotationOrder: []
        }
      },
      roomConstraints: {
        respectCapacityLimits: true,
        allowRoomSharing: false,
        preferFixedClassrooms: true,
        specialRoomPriority: 'preferred'
      },
      courseArrangementRules: {
        allowContinuousCourses: false,
        maxContinuousHours: 2,
        distributionPolicy: 'balanced',
        avoidFirstLastPeriod: [],
        coreSubjectPriority: true,
        labCoursePreference: 'afternoon',
        subjectSpecificRules: [],
        enableSubjectConstraints: true,
        defaultSubjectInterval: 1,
        coreSubjectStrategy: {
          enableCoreSubjectStrategy: true,
          coreSubjects: ['语文', '数学', '英语'],
          distributionMode: 'daily',
          maxDailyOccurrences: 2,
          minDaysPerWeek: 5,
          avoidConsecutiveDays: true,
          preferredTimeSlots: [2, 3, 5, 6, 4, 1, 7],
          avoidTimeSlots: [8],
          maxConcentration: 1,
          balanceWeight: 100,
          enforceEvenDistribution: true
        },
        fixedTimeCourses: {
          enabled: true,
          courses: [
            {
              type: 'class-meeting',
              dayOfWeek: 1,
              period: 1,
              weekType: 'all',
              startWeek: 1,
              endWeek: 20,
              notes: '班主任主持班会'
            }
          ],
          priority: true,
          allowOverride: false,
          conflictStrategy: 'strict'
        }
      },
      conflictResolutionRules: {
        teacherConflictResolution: 'strict',
        roomConflictResolution: 'warn',
        classConflictResolution: 'warn',
        allowOverride: false,
        priorityOrder: ['teacher', 'room', 'time']
      },
      isDefault: false,
      isActive: true,
      createdBy: '68692a48c6a3f27c50bf8cba',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // 直接插入到集合中
    const insertResult = await collection.insertOne(testRule);
    console.log('✅ 测试规则创建成功，ID:', insertResult.insertedId);
    
    // 立即查询刚插入的数据
    const insertedRule = await collection.findOne({ _id: insertResult.insertedId });
    console.log('\n📊 刚插入的数据格式检查:');
    
    if (insertedRule.courseArrangementRules && insertedRule.courseArrangementRules.fixedTimeCourses) {
      const ftc = insertedRule.courseArrangementRules.fixedTimeCourses;
      console.log(`   fixedTimeCourses 类型: ${typeof ftc}`);
      console.log(`   courses 类型: ${typeof ftc.courses}`);
      console.log(`   courses 是否为数组: ${Array.isArray(ftc.courses)}`);
      
      if (Array.isArray(ftc.courses)) {
        console.log(`   courses 长度: ${ftc.courses.length}`);
        ftc.courses.forEach((course, index) => {
          console.log(`     课程 ${index + 1}: ${course.type} 周${course.dayOfWeek}第${course.period}节`);
        });
      } else {
        console.log(`   ❌ courses 不是数组，值: ${ftc.courses}`);
      }
    }
    
    // 清理测试数据
    console.log('\n🧹 清理测试数据...');
    await collection.deleteOne({ _id: insertResult.insertedId });
    console.log('✅ 测试数据已清理');
    
    console.log('\n✅ 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }
}

// 运行测试
testDatabaseRawData();

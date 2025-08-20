/**
 * 测试前端数据格式问题
 * 
 * 检查为什么fixedTimeCourses被存储为双重转义的JSON字符串
 */

const mongoose = require('mongoose');

async function testFrontendDataFormatIssue() {
  console.log('🧪 开始测试前端数据格式问题...\n');
  
  try {
    // 连接数据库
    await mongoose.connect('mongodb://localhost:27017/ai-class-scheduling');
    console.log('✅ 数据库连接成功\n');
    
    // 1. 检查现有的排课规则数据
    console.log('🔍 检查现有的排课规则数据...');
    
    const db = mongoose.connection.db;
    const collection = db.collection('schedulingrules');
    
    // 查找包含固定时间课程的规则
    const rules = await collection.find({
      'courseArrangementRules.fixedTimeCourses': { $exists: true }
    }).toArray();
    
    console.log(`📊 找到 ${rules.length} 个包含固定时间课程的排课规则\n`);
    
    if (rules.length > 0) {
      const rule = rules[0];
      console.log(`📋 规则: ${rule.name}`);
      console.log(`   ID: ${rule._id}`);
      
      if (rule.courseArrangementRules && rule.courseArrangementRules.fixedTimeCourses) {
        const ftc = rule.courseArrangementRules.fixedTimeCourses;
        
        console.log(`   🔒 固定时间课程配置:`);
        console.log(`      enabled: ${ftc.enabled} (类型: ${typeof ftc.enabled})`);
        console.log(`      priority: ${ftc.priority} (类型: ${typeof ftc.priority})`);
        console.log(`      allowOverride: ${ftc.allowOverride} (类型: ${typeof ftc.allowOverride})`);
        console.log(`      conflictStrategy: ${ftc.conflictStrategy} (类型: ${typeof ftc.conflictStrategy})`);
        
        // 检查courses字段
        if (ftc.courses) {
          console.log(`      courses 类型: ${typeof ftc.courses}`);
          console.log(`      courses 是否为数组: ${Array.isArray(ftc.courses)}`);
          console.log(`      courses 原始值: ${ftc.courses}`);
          
          if (typeof ftc.courses === 'string') {
            console.log(`\n   ⚠️ 问题发现: courses 字段是字符串而不是数组！`);
            console.log(`   🔍 尝试解析这个字符串...`);
            
            try {
              // 第一次解析
              const firstParse = JSON.parse(ftc.courses);
              console.log(`   ✅ 第一次解析成功: ${typeof firstParse}`);
              
              if (typeof firstParse === 'string') {
                console.log(`   ⚠️ 第一次解析结果仍然是字符串，尝试第二次解析...`);
                
                try {
                  // 第二次解析
                  const secondParse = JSON.parse(firstParse);
                  console.log(`   ✅ 第二次解析成功: ${typeof secondParse}`);
                  
                  if (Array.isArray(secondParse)) {
                    console.log(`   📊 最终解析结果: ${secondParse.length} 个课程`);
                    secondParse.forEach((course, index) => {
                      console.log(`      课程 ${index + 1}: ${course.type} 周${course.dayOfWeek}第${course.period}节`);
                    });
                  }
                } catch (secondError) {
                  console.log(`   ❌ 第二次解析失败: ${secondError.message}`);
                }
              } else if (Array.isArray(firstParse)) {
                console.log(`   📊 第一次解析结果: ${firstParse.length} 个课程`);
                firstParse.forEach((course, index) => {
                  console.log(`      课程 ${index + 1}: ${course.type} 周${course.dayOfWeek}第${course.period}节`);
                });
              }
            } catch (firstError) {
              console.log(`   ❌ 第一次解析失败: ${firstError.message}`);
            }
          } else if (Array.isArray(ftc.courses)) {
            console.log(`   ✅ courses 字段格式正确，包含 ${ftc.courses.length} 个课程`);
            ftc.courses.forEach((course, index) => {
              console.log(`      课程 ${index + 1}: ${course.type} 周${course.dayOfWeek}第${course.period}节`);
            });
          }
        } else {
          console.log(`   ❌ courses 字段不存在`);
        }
      } else {
        console.log(`   ❌ 没有固定时间课程配置`);
      }
    } else {
      console.log('❌ 没有找到包含固定时间课程的排课规则');
    }
    
    // 2. 分析问题原因
    console.log('\n🔍 问题分析:');
    console.log('   问题: fixedTimeCourses.courses 被存储为双重转义的JSON字符串');
    console.log('   原因分析:');
    console.log('   1. 前端可能将对象转换为字符串后发送');
    console.log('   2. 后端可能进行了额外的JSON序列化');
    console.log('   3. 数据在传输过程中被多次转义');
    
    console.log('\n🛠️ 解决方案:');
    console.log('   1. 检查前端数据提交逻辑');
    console.log('   2. 检查后端数据接收和处理逻辑');
    console.log('   3. 确保数据以正确格式存储');
    
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
testFrontendDataFormatIssue();

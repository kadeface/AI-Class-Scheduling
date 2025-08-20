/**
 * 测试API响应过程中的数据格式
 * 
 * 这个测试文件用于检查数据从数据库查询到API响应的完整流程
 */

const mongoose = require('mongoose');
const { SchedulingRules } = require('./dist/models');

async function testApiResponse() {
  console.log('🧪 开始测试API响应过程中的数据格式...\n');
  
  try {
    // 连接数据库
    await mongoose.connect('mongodb://localhost:27017/ai-class-scheduling');
    console.log('✅ 数据库连接成功\n');
    
    // 1. 查找包含固定时间课程的规则
    console.log('🔍 查找包含固定时间课程的规则...');
    
    const rules = await SchedulingRules.find({
      'courseArrangementRules.fixedTimeCourses': { $exists: true }
    }).lean(); // 使用lean()获取普通JavaScript对象
    
    console.log(`📊 找到 ${rules.length} 个规则\n`);
    
    if (rules.length > 0) {
      const rule = rules[0];
      console.log(`📋 规则: ${rule.name}`);
      console.log(`   ID: ${rule._id}`);
      console.log(`   学年: ${rule.academicYear}`);
      console.log(`   学期: ${rule.semester}\n`);
      
      // 2. 检查数据库查询后的数据格式
      console.log('📊 数据库查询后的数据格式:');
      if (rule.courseArrangementRules && rule.courseArrangementRules.fixedTimeCourses) {
        const ftc = rule.courseArrangementRules.fixedTimeCourses;
        
        console.log(`   fixedTimeCourses 类型: ${typeof ftc}`);
        console.log(`   fixedTimeCourses 值: ${JSON.stringify(ftc, null, 2)}`);
        
        if (ftc.courses) {
          console.log(`   courses 类型: ${typeof ftc.courses}`);
          console.log(`   courses 是否为数组: ${Array.isArray(ftc.courses)}`);
          console.log(`   courses 长度: ${ftc.courses ? ftc.courses.length : 'undefined'}`);
          
          if (Array.isArray(ftc.courses)) {
            ftc.courses.forEach((course, index) => {
              console.log(`     课程 ${index + 1}: ${course.type} 周${course.dayOfWeek}第${course.period}节`);
            });
          } else {
            console.log(`   ❌ courses 不是数组，值: ${ftc.courses}`);
          }
        }
      }
      console.log('');
      
      // 3. 模拟API响应格式
      console.log('🔄 模拟API响应格式...');
      
      const apiResponse = {
        success: true,
        data: rule,
        message: '查询成功'
      };
      
      console.log('📊 API响应格式:');
      console.log(`   success: ${apiResponse.success}`);
      console.log(`   message: ${apiResponse.message}`);
      console.log(`   data 类型: ${typeof apiResponse.data}`);
      
      if (apiResponse.data && apiResponse.data.courseArrangementRules) {
        const car = apiResponse.data.courseArrangementRules;
        console.log(`   courseArrangementRules 类型: ${typeof car}`);
        
        if (car.fixedTimeCourses) {
          const ftc = car.fixedTimeCourses;
          console.log(`   fixedTimeCourses 类型: ${typeof ftc}`);
          console.log(`   fixedTimeCourses 值: ${JSON.stringify(ftc, null, 2)}`);
          
          if (ftc.courses) {
            console.log(`   courses 类型: ${typeof ftc.courses}`);
            console.log(`   courses 是否为数组: ${Array.isArray(ftc.courses)}`);
            console.log(`   courses 长度: ${ftc.courses ? ftc.courses.length : 'undefined'}`);
          }
        }
      }
      console.log('');
      
      // 4. 测试JSON序列化过程
      console.log('🔄 测试JSON序列化过程...');
      
      try {
        const jsonString = JSON.stringify(apiResponse, null, 2);
        console.log('✅ JSON序列化成功');
        console.log(`   序列化后长度: ${jsonString.length} 字符`);
        
        // 检查序列化后的字符串中是否包含转义字符
        const escapeCount = (jsonString.match(/\\/g) || []).length;
        console.log(`   转义字符数量: ${escapeCount}`);
        
        if (escapeCount > 0) {
          console.log('⚠️ 发现转义字符，可能存在序列化问题');
        }
        
        // 解析回对象
        const parsedResponse = JSON.parse(jsonString);
        console.log('✅ JSON解析成功');
        
        // 检查解析后的数据
        if (parsedResponse.data && parsedResponse.data.courseArrangementRules) {
          const car = parsedResponse.data.courseArrangementRules;
          if (car.fixedTimeCourses && car.fixedTimeCourses.courses) {
            const courses = car.fixedTimeCourses.courses;
            console.log(`   解析后 courses 类型: ${typeof courses}`);
            console.log(`   解析后 courses 是否为数组: ${Array.isArray(courses)}`);
            console.log(`   解析后 courses 长度: ${courses ? courses.length : 'undefined'}`);
          }
        }
        
      } catch (error) {
        console.log(`❌ JSON序列化/解析失败: ${error.message}`);
      }
      console.log('');
      
      // 5. 检查Mongoose文档转换
      console.log('🔍 检查Mongoose文档转换...');
      
      const docRule = await SchedulingRules.findById(rule._id);
      console.log(`📊 Mongoose文档格式:`);
      console.log(`   文档类型: ${docRule.constructor.name}`);
      console.log(`   是否为Mongoose文档: ${docRule instanceof mongoose.Document}`);
      
      if (docRule.courseArrangementRules && docRule.courseArrangementRules.fixedTimeCourses) {
        const ftc = docRule.courseArrangementRules.fixedTimeCourses;
        console.log(`   fixedTimeCourses 类型: ${typeof ftc}`);
        console.log(`   courses 类型: ${typeof ftc.courses}`);
        console.log(`   courses 是否为数组: ${Array.isArray(ftc.courses)}`);
        
        // 转换为普通对象
        const plainRule = docRule.toObject();
        console.log(`\n📊 转换为普通对象后:`);
        if (plainRule.courseArrangementRules && plainRule.courseArrangementRules.fixedTimeCourses) {
          const plainFtc = plainRule.courseArrangementRules.fixedTimeCourses;
          console.log(`   fixedTimeCourses 类型: ${typeof plainFtc}`);
          console.log(`   courses 类型: ${typeof plainFtc.courses}`);
          console.log(`   courses 是否为数组: ${Array.isArray(plainFtc.courses)}`);
        }
      }
      
    } else {
      console.log('❌ 没有找到包含固定时间课程的规则');
    }
    
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
testApiResponse();

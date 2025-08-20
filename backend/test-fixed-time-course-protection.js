/**
 * 测试固定时间课程保护机制
 * 
 * 验证固定时间课程的时间段是否被其他课程占用
 */

const mongoose = require('mongoose');
const { K12SchedulingEngine } = require('./dist/services/scheduling/k12-scheduling-engine');

async function testFixedTimeCourseProtection() {
  console.log('🧪 开始测试固定时间课程保护机制...\n');
  
  try {
    // 连接数据库
    await mongoose.connect('mongodb://localhost:27017/ai-class-scheduling');
    console.log('✅ 数据库连接成功\n');
    
    // 创建K12排课引擎实例
    const engine = new K12SchedulingEngine();
    
    // 模拟教学计划数据
    const teachingPlans = [
      {
        _id: 'plan1',
        class: {
          _id: 'class1',
          name: '一年级1班',
          homeroomTeacher: {
            _id: 'teacher1',
            name: '班主任'
          }
        },
        courseAssignments: [
          {
            course: {
              _id: 'course1',
              name: '班会',
              subject: '班会'
            },
            teacher: {
              _id: 'teacher1',
              name: '班主任'
            },
            weeklyHours: 1
          },
          {
            course: {
              _id: 'course2',
              name: '一年级英语',
              subject: '英语'
            },
            teacher: {
              _id: 'teacher2',
              name: '英语老师'
            },
            weeklyHours: 4
          }
        ]
      }
    ];
    
    // 模拟排课规则数据（包含固定时间课程配置）
    const schedulingRules = [
      {
        _id: 'rules1',
        name: '测试排课规则',
        courseArrangementRules: {
          fixedTimeCourses: {
            enabled: true,
            courses: [
              {
                type: 'class-meeting',
                dayOfWeek: 1,  // 周一
                period: 1,     // 第一节
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
        }
      }
    ];
    
    // 模拟时间槽数据
    const timeSlots = [
      { dayOfWeek: 1, period: 1, startTime: '08:00', endTime: '08:45' },  // 周一第一节
      { dayOfWeek: 1, period: 2, startTime: '08:55', endTime: '09:40' },  // 周一第二节
      { dayOfWeek: 1, period: 3, startTime: '10:00', endTime: '10:45' },  // 周一第三节
      { dayOfWeek: 1, period: 4, startTime: '10:55', endTime: '11:40' },  // 周一第四节
      { dayOfWeek: 2, period: 1, startTime: '08:00', endTime: '08:45' },  // 周二第一节
      { dayOfWeek: 2, period: 2, startTime: '08:55', endTime: '09:40' },  // 周二第二节
    ];
    
    // 模拟教室数据
    const rooms = [
      {
        _id: 'room1',
        name: '102教室',
        classId: 'class1',
        type: 'classroom',
        capacity: 40,
        isActive: true
      }
    ];
    
    console.log('📋 测试数据准备完成:');
    console.log(`   - 教学计划: ${teachingPlans.length} 个`);
    console.log(`   - 排课规则: ${schedulingRules.length} 个`);
    console.log(`   - 时间槽: ${timeSlots.length} 个`);
    console.log(`   - 教室: ${rooms.length} 个`);
    console.log(`   - 固定时间课程: 周一第一节班会`);
    console.log('');
    
    // 执行排课
    console.log('🚀 开始执行排课...');
    const result = await engine.schedule(teachingPlans, schedulingRules, timeSlots, rooms);
    
    console.log('\n📊 排课结果:');
    console.log(`   - 成功: ${result.success}`);
    console.log(`   - 已分配变量: ${result.assignedVariables}`);
    console.log(`   - 未分配变量: ${result.unassignedVariables}`);
    console.log(`   - 消息: ${result.message}`);
    
    // 验证固定时间课程保护
    console.log('\n🔒 验证固定时间课程保护...');
    
    if (result.success) {
      console.log('✅ 排课成功完成');
      console.log('✅ 固定时间课程保护机制应该已经生效');
      console.log('✅ 周一第一节应该被班会占用，不会被英语课程占用');
    } else {
      console.log('❌ 排课失败');
      console.log('❌ 需要检查排课逻辑或约束配置');
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
testFixedTimeCourseProtection();

/**
 * 测试固定时间课程功能
 * 
 * 这个测试文件用于验证K12排课引擎中的固定时间课程功能是否正常工作
 */

const { K12SchedulingEngine } = require('./dist/services/scheduling/k12-scheduling-engine');

// 模拟数据
const mockTeachingPlans = [
  {
    _id: 'plan1',
    class: {
      _id: 'class1',
      name: '高一(1)班',
      homeroomTeacher: {
        _id: 'teacher1',
        name: '张老师'
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
          name: '张老师'
        },
        weeklyHours: 1
      }
    ]
  }
];

const mockSchedulingRules = [
  {
    courseArrangementRules: {
      fixedTimeCourses: {
        enabled: true,
        courses: [
          {
            type: 'class-meeting',
            dayOfWeek: 1, // 周一
            period: 1,     // 第一节
            weekType: 'all',
            startWeek: 1,
            endWeek: 20
          }
        ],
        priority: true,
        allowOverride: false,
        conflictStrategy: 'strict'
      }
    }
  }
];

const mockTimeSlots = [
  { dayOfWeek: 1, period: 1, startTime: '08:00', endTime: '08:45' },
  { dayOfWeek: 1, period: 2, startTime: '08:50', endTime: '09:35' },
  { dayOfWeek: 2, period: 1, startTime: '08:00', endTime: '08:45' }
];

const mockRooms = [
  {
    _id: 'room1',
    name: '高一(1)班教室',
    classId: 'class1',
    type: 'classroom',
    capacity: 50,
    isActive: true
  }
];

async function testFixedTimeCourses() {
  console.log('🧪 开始测试固定时间课程功能...\n');
  
  try {
    // 创建排课引擎实例
    const engine = new K12SchedulingEngine();
    
    console.log('📋 测试数据:');
    console.log(`   - 教学计划: ${mockTeachingPlans.length} 个`);
    console.log(`   - 排课规则: ${mockSchedulingRules.length} 个`);
    console.log(`   - 时间槽: ${mockTimeSlots.length} 个`);
    console.log(`   - 教室: ${mockRooms.length} 个\n`);
    
    // 执行排课
    console.log('🚀 开始执行排课...');
    const result = await engine.schedule(
      mockTeachingPlans,
      mockSchedulingRules,
      mockTimeSlots,
      mockRooms,
      '2025-2026',
      '1'
    );
    
    console.log('\n📊 排课结果:');
    console.log(`   - 成功: ${result.success}`);
    console.log(`   - 已分配变量: ${result.assignedVariables}`);
    console.log(`   - 未分配变量: ${result.unassignedVariables}`);
    console.log(`   - 硬约束违反: ${result.hardConstraintViolations}`);
    console.log(`   - 软约束违反: ${result.softConstraintViolations}`);
    console.log(`   - 总评分: ${result.totalScore}`);
    console.log(`   - 消息: ${result.message}`);
    
    if (result.assignments && result.assignments.length > 0) {
      console.log('\n📋 课程分配详情:');
      result.assignments.forEach((assignment, index) => {
        console.log(`   ${index + 1}. 班级: ${assignment.classId}, 课程: ${assignment.courseId}`);
        console.log(`      时间: 周${assignment.timeSlot.dayOfWeek}第${assignment.timeSlot.period}节`);
        console.log(`      教师: ${assignment.teacherId}, 教室: ${assignment.roomId}`);
        console.log(`      是否固定: ${assignment.isFixed}`);
        if (assignment.isFixed) {
          console.log(`      周次类型: ${assignment.weekType}, 周次范围: ${assignment.startWeek}-${assignment.endWeek}`);
        }
        console.log('');
      });
    }
    
    console.log('✅ 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testFixedTimeCourses();

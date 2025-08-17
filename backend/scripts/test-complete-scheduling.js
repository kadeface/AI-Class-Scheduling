/**
 * 完整排课流程测试
 * 
 * 验证从教室分配到约束检查的整个流程
 */

const mongoose = require('mongoose');
require('dotenv').config();

// 模拟完整的排课流程
class MockSchedulingFlow {
  constructor() {
    this.currentAssignments = new Map();
    this.timeSlots = this.generateTimeSlots();
    this.rooms = this.generateRooms();
    this.teachingPlans = this.generateTeachingPlans();
  }

  // 生成时间槽
  generateTimeSlots() {
    const timeSlots = [];
    for (let day = 1; day <= 5; day++) { // 周一到周五
      for (let period = 1; period <= 8; period++) { // 每天8节课
        timeSlots.push({
          dayOfWeek: day,
          period: period,
          startTime: `${8 + Math.floor((period - 1) / 2)}:${(period - 1) % 2 === 0 ? '00' : '30'}`,
          endTime: `${8 + Math.floor((period - 1) / 2)}:${(period - 1) % 2 === 0 ? '30' : '00'}`
        });
      }
    }
    return timeSlots;
  }

  // 生成教室
  generateRooms() {
    return [
      {
        _id: '689e78f909dfdf8cef3e9100',
        name: '101教室',
        roomNumber: '101',
        type: '普通教室',
        capacity: 50,
        building: '教学楼A',
        floor: 1,
        equipment: ['投影仪', '电脑'],
        isActive: true
      },
      {
        _id: 'room2',
        name: '102教室',
        roomNumber: '102',
        type: '普通教室',
        capacity: 50,
        building: '教学楼A',
        floor: 1,
        equipment: ['投影仪', '电脑'],
        isActive: true
      }
    ];
  }

  // 生成教学计划
  generateTeachingPlans() {
    return [
      {
        class: {
          _id: '687649c0bd12a9ba7cdfe786',
          name: '一年级8班',
          grade: 1,
          studentCount: 40
        },
        courseAssignments: [
          {
            course: {
              _id: 'course1',
              name: '一年级语文',
              subject: '语文',
              roomRequirements: {
                types: ['普通教室'],
                capacity: 45,
                equipment: ['投影仪', '电脑']
              }
            },
            teacher: {
              _id: 'teacher1',
              name: '张老师'
            },
            weeklyHours: 8
          }
        ]
      }
    ];
  }

  // 模拟教室分配器
  getFixedRoomForClass(classId, rooms, classes) {
    console.log(`🔍 为班级 ${classId} 查找固定课室...`);
    
    // 使用智能分配策略
    const availableRoom = this.findAvailableRoomByIntelligence(classId, rooms, classes);
    if (availableRoom) {
      console.log(`✅ 智能分配找到可用教室: ${availableRoom._id} (${availableRoom.name})`);
      return availableRoom;
    }
    
    console.log(`❌ 没有找到可用教室`);
    return null;
  }

  findAvailableRoomByIntelligence(classId, rooms, classes) {
    if (!classes) return rooms[0] || null;
    
    const classInfo = classes.find(c => c._id.toString() === classId.toString());
    if (!classInfo) return rooms[0] || null;

    // 按优先级排序教室
    const sortedRooms = [...rooms].sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      if (a.type === '普通教室') scoreA += 10;
      if (b.type === '普通教室') scoreB += 10;

      const targetCapacity = Math.ceil(classInfo.studentCount * 1.1);
      const capacityDiffA = Math.abs((a.capacity || 0) - targetCapacity);
      const capacityDiffB = Math.abs((b.capacity || 0) - targetCapacity);
      scoreA += (20 - capacityDiffA);
      scoreB += (20 - capacityDiffB);

      return scoreB - scoreA;
    });

    return sortedRooms[0] || null;
  }

  // 模拟约束检查器
  checkConstraints(variable, timeSlot, room, currentAssignments) {
    console.log(`🔍 检查变量 ${variable.id} 的约束...`);

    // 检查硬约束
    if (!this.checkHardConstraints(variable, timeSlot, room, currentAssignments)) {
      console.log(`❌ 硬约束检查失败`);
      return false;
    }

    console.log(`✅ 约束检查通过`);
    return true;
  }

  checkHardConstraints(variable, timeSlot, room, currentAssignments) {
    console.log(`   🔍 检查硬约束...`);

    // 1. 教师冲突检测
    if (this.checkTeacherConflict(variable, timeSlot, currentAssignments)) {
      console.log(`      ❌ 教师冲突`);
      return false;
    }

    // 2. 班级时间冲突检测
    if (this.checkClassTimeConflict(variable, timeSlot, currentAssignments)) {
      console.log(`      ❌ 班级时间冲突`);
      return false;
    }

    // 3. 课室冲突检测
    if (this.checkRoomConflict(variable, timeSlot, room, currentAssignments)) {
      console.log(`      ❌ 课室冲突`);
      return false;
    }

    // 4. 课室要求检测
    if (!this.checkRoomRequirements(variable, room)) {
      console.log(`      ❌ 课室要求不满足`);
      return false;
    }

    console.log(`      ✅ 硬约束检查通过`);
    return true;
  }

  checkTeacherConflict(variable, timeSlot, currentAssignments) {
    for (const assignment of Array.from(currentAssignments.values())) {
      if (assignment.teacherId.toString() === variable.teacherId.toString() &&
          assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
          assignment.timeSlot.period === timeSlot.period) {
        return true;
      }
    }
    return false;
  }

  checkClassTimeConflict(variable, timeSlot, currentAssignments) {
    for (const assignment of Array.from(currentAssignments.values())) {
      if (assignment.classId.toString() === variable.classId.toString() &&
          assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
          assignment.timeSlot.period === timeSlot.period) {
        return true;
      }
    }
    return false;
  }

  checkRoomConflict(variable, timeSlot, room, currentAssignments) {
    for (const assignment of Array.from(currentAssignments.values())) {
      if (assignment.roomId.toString() === room._id.toString() &&
          assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
          assignment.timeSlot.period === timeSlot.period) {
        return true;
      }
    }
    return false;
  }

  checkRoomRequirements(variable, room) {
    console.log(`      🔍 检查课室 ${room._id} 是否满足课程要求...`);
    
    try {
      if (!room || !room._id) {
        console.log(`         ❌ 课室信息无效`);
        return false;
      }

      if (room.isActive === false) {
        console.log(`         ❌ 课室未激活`);
        return false;
      }

      // 课室类型检查
      if (variable.course && variable.course.roomRequirements && variable.course.roomRequirements.types) {
        const requiredTypes = variable.course.roomRequirements.types;
        const roomType = room.type || room.roomType;
        
        if (!requiredTypes.includes(roomType)) {
          console.log(`         ❌ 课室类型不匹配: 需要 ${requiredTypes.join(', ')}, 课室类型 ${roomType}`);
          return false;
        }
        console.log(`         ✅ 课室类型匹配: ${roomType}`);
      }

      // 课室容量检查
      if (variable.course && variable.course.roomRequirements && variable.course.roomRequirements.capacity) {
        const requiredCapacity = variable.course.roomRequirements.capacity;
        const roomCapacity = room.capacity || 0;
        
        if (roomCapacity < requiredCapacity) {
          console.log(`         ❌ 课室容量不足: 需要 ${requiredCapacity}, 课室容量 ${roomCapacity}`);
          return false;
        }
        console.log(`         ✅ 课室容量满足: ${roomCapacity} >= ${requiredCapacity}`);
      }

      console.log(`         ✅ 课室要求检查通过`);
      return true;

    } catch (error) {
      console.error(`         ❌ 课室要求检查过程中发生错误:`, error);
      return true; // 发生错误时不阻止排课
    }
  }

  // 模拟排课引擎
  async scheduleTeachingPlan(plan, type) {
    try {
      console.log(`\n📚 开始安排 ${type} 课程: ${plan.class.name}`);
      
      for (const assignment of plan.courseAssignments) {
        const variable = this.createScheduleVariable(plan, assignment);
        console.log(`   📋 创建排课变量: ${variable.id}`);
        
        // 查找可用时间槽
        const timeSlot = this.findAvailableTimeSlot(variable);
        if (!timeSlot) {
          console.log(`   ⚠️ 变量 ${variable.id} 没有可用时间槽`);
          continue;
        }
        console.log(`   ✅ 找到可用时间槽: 第${timeSlot.dayOfWeek}天第${timeSlot.period}节`);

        // 分配固定课室
        const room = this.getFixedRoomForClass(plan.class._id, this.rooms, this.teachingPlans.map(p => p.class));
        console.log(`   🔍 教室分配结果:`, room ? `成功 - ${room.name || room._id}` : '失败');
        
        if (!room) {
          console.log(`   ❌ 班级 ${plan.class.name} 没有固定课室，跳过此课程`);
          continue;
        }

        console.log(`   ✅ 教室分配成功: ${room.name || room._id} (${room._id})`);

        // 检查约束
        if (!this.checkConstraints(variable, timeSlot, room, this.currentAssignments)) {
          console.log(`   ⚠️ 变量 ${variable.id} 违反约束`);
          continue;
        }

        // 创建课程分配
        const courseAssignment = {
          variableId: variable.id,
          classId: variable.classId,
          courseId: variable.courseId,
          teacherId: variable.teacherId,
          roomId: room._id,
          timeSlot: timeSlot,
          isFixed: false
        };

        // 保存分配
        this.currentAssignments.set(variable.id, courseAssignment);
        console.log(`   ✅ 成功安排 ${type} 课程: ${variable.id}`);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`   ❌ 安排教学计划时发生错误:`, error);
      return false;
    }
  }

  createScheduleVariable(plan, assignment) {
    const course = assignment.course;
    const teacher = assignment.teacher;
    const classInfo = plan.class;

    return {
      id: `${classInfo._id}_${course._id}_${teacher._id}_${assignment.weeklyHours}`,
      classId: classInfo._id,
      courseId: course._id,
      teacherId: teacher._id,
      course: course, // 添加课程信息用于约束检查
      requiredHours: assignment.weeklyHours || 1,
      priority: 5,
      domain: []
    };
  }

  findAvailableTimeSlot(variable) {
    // 按优先级排序时间槽
    const sortedTimeSlots = [...this.timeSlots].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) {
        return a.dayOfWeek - b.dayOfWeek;
      }
      return a.period - b.period;
    });

    for (const timeSlot of sortedTimeSlots) {
      if (this.isTimeSlotAvailable(variable, timeSlot)) {
        return timeSlot;
      }
    }

    return null;
  }

  isTimeSlotAvailable(variable, timeSlot) {
    // 检查教师冲突
    for (const assignment of Array.from(this.currentAssignments.values())) {
      if (assignment.teacherId.toString() === variable.teacherId.toString() &&
          assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
          assignment.timeSlot.period === timeSlot.period) {
        return false;
      }
    }

    // 检查班级冲突
    for (const assignment of Array.from(this.currentAssignments.values())) {
      if (assignment.classId.toString() === variable.classId.toString() &&
          assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
          assignment.timeSlot.period === timeSlot.period) {
        return false;
      }
    }

    return true;
  }
}

// 测试函数
async function testCompleteScheduling() {
  console.log('🧪 开始测试完整排课流程...\n');
  
  const scheduler = new MockSchedulingFlow();
  
  console.log('📊 初始化数据:');
  console.log(`   时间槽数量: ${scheduler.timeSlots.length}`);
  console.log(`   教室数量: ${scheduler.rooms.length}`);
  console.log(`   教学计划数量: ${scheduler.teachingPlans.length}\n`);
  
  // 测试排课
  const result = await scheduler.scheduleTeachingPlan(scheduler.teachingPlans[0], 'core');
  
  console.log('\n📊 测试结果:');
  console.log(`   排课成功: ${result ? '✅ 是' : '❌ 否'}`);
  console.log(`   已分配课程: ${scheduler.currentAssignments.size}`);
  
  if (result) {
    console.log('\n🎯 结论: 完整排课流程正常工作');
    console.log('💡 建议: 检查实际排课系统中的具体错误');
  } else {
    console.log('\n🚨 结论: 排课流程存在问题');
    console.log('💡 建议: 根据日志信息定位具体问题');
  }
}

// 运行测试
if (require.main === module) {
  testCompleteScheduling().catch(console.error);
}

module.exports = { testCompleteScheduling, MockSchedulingFlow };

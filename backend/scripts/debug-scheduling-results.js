/**
 * 调试排课结果脚本
 * 
 * 检查排课完成后，数据是否正确保存到数据库中
 */

const mongoose = require('mongoose');
const Schedule = require('../src/models/Schedule');
const Class = require('../src/models/Class');
const Course = require('../src/models/Course');
const Teacher = require('../src/models/Teacher');
const Room = require('../src/models/Room');

// 连接数据库
async function connectDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ai-class-scheduling');
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
}

// 检查排课结果
async function checkSchedulingResults() {
  console.log('\n🔍 检查排课结果...');
  
  try {
    // 1. 检查Schedule表中的数据
    const schedules = await Schedule.find({}).populate('class course teacher room');
    console.log(`📊 Schedule表中共有 ${schedules.length} 条记录`);
    
    if (schedules.length === 0) {
      console.log('❌ 没有找到任何排课记录！');
      return;
    }
    
    // 2. 按学期分组显示
    const semesterGroups = {};
    schedules.forEach(schedule => {
      const key = `${schedule.academicYear}-${schedule.semester}`;
      if (!semesterGroups[key]) {
        semesterGroups[key] = [];
      }
      semesterGroups[key].push(schedule);
    });
    
    console.log('\n📅 按学期分组的排课记录:');
    Object.entries(semesterGroups).forEach(([semester, semesterSchedules]) => {
      console.log(`\n   📚 ${semester} 学期: ${semesterSchedules.length} 条记录`);
      
      // 按班级分组显示
      const classGroups = {};
      semesterSchedules.forEach(schedule => {
        const className = schedule.class?.name || '未知班级';
        if (!classGroups[className]) {
          classGroups[className] = [];
        }
        classGroups[className].push(schedule);
      });
      
      Object.entries(classGroups).forEach(([className, classSchedules]) => {
        console.log(`      🏫 ${className}: ${classSchedules.length} 门课程`);
        
        // 显示具体的课程安排
        classSchedules.forEach(schedule => {
          const courseName = schedule.course?.name || '未知课程';
          const teacherName = schedule.teacher?.name || '未知教师';
          const roomName = schedule.room?.name || '未知教室';
          const dayName = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][schedule.dayOfWeek - 1] || '未知';
          
          console.log(`         📖 ${courseName} | ${teacherName} | ${roomName} | ${dayName}第${schedule.period}节`);
        });
      });
    });
    
    // 3. 检查数据完整性
    console.log('\n🔍 检查数据完整性...');
    let validSchedules = 0;
    let invalidSchedules = 0;
    
    schedules.forEach(schedule => {
      if (schedule.class && schedule.course && schedule.teacher && schedule.room) {
        validSchedules++;
      } else {
        invalidSchedules++;
        console.log(`   ⚠️ 数据不完整:`, {
          id: schedule._id,
          hasClass: !!schedule.class,
          hasCourse: !!schedule.course,
          hasTeacher: !!schedule.teacher,
          hasRoom: !!schedule.room
        });
      }
    });
    
    console.log(`   ✅ 有效记录: ${validSchedules}`);
    console.log(`   ❌ 无效记录: ${invalidSchedules}`);
    
    // 4. 检查特定学期的数据（用于前端显示）
    const targetSemester = '2025-2026-1';
    const targetSchedules = schedules.filter(s => 
      `${s.academicYear}-${s.semester}` === targetSemester
    );
    
    if (targetSchedules.length > 0) {
      console.log(`\n🎯 目标学期 ${targetSemester} 的排课数据:`);
      console.log(`   总课程数: ${targetSchedules.length}`);
      
      // 转换为前端期望的格式
      const weekSchedule = {};
      for (let day = 1; day <= 5; day++) {
        weekSchedule[day] = {};
        for (let period = 1; period <= 8; period++) {
          weekSchedule[day][period] = null;
        }
      }
      
      targetSchedules.forEach(schedule => {
        if (schedule.dayOfWeek >= 1 && schedule.dayOfWeek <= 5 && 
            schedule.period >= 1 && schedule.period <= 8) {
          weekSchedule[schedule.dayOfWeek][schedule.period] = {
            courseId: schedule.course._id.toString(),
            courseName: schedule.course.name,
            subject: schedule.course.subject,
            teacherId: schedule.teacher._id.toString(),
            teacherName: schedule.teacher.name,
            roomId: schedule.room._id.toString(),
            roomName: schedule.room.name,
            duration: 1,
            notes: schedule.notes
          };
        }
      });
      
      console.log('   📋 前端数据格式预览:');
      Object.entries(weekSchedule).forEach(([day, periods]) => {
        const dayName = ['周一', '周二', '周三', '周四', '周五'][parseInt(day) - 1];
        console.log(`      ${dayName}:`);
        Object.entries(periods).forEach(([period, course]) => {
          if (course) {
            console.log(`        第${period}节: ${course.courseName} (${course.subject}) | ${course.teacherName} | ${course.roomName}`);
          }
        });
      });
    }
    
  } catch (error) {
    console.error('❌ 检查排课结果失败:', error);
  }
}

// 主函数
async function main() {
  try {
    await connectDB();
    await checkSchedulingResults();
  } catch (error) {
    console.error('❌ 脚本执行失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { checkSchedulingResults };

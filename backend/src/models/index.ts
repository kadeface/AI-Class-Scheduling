/**
 * 数据模型统一导出
 * 
 * 提供所有数据模型的统一入口，方便其他模块导入使用
 */

export { User, IUser } from './User';
export { Teacher, ITeacher, ITimeSlot, ITeacherPreferences } from './Teacher';
export { Class, IClass } from './Class';
export { Course, ICourse, IRoomRequirement } from './Course';
export { Room, IRoom } from './Room';
export { Schedule, ISchedule } from './Schedule';
export { default as TeachingPlan, ITeachingPlan, ICourseAssignment } from './TeachingPlan';
export { SchedulingRules, ISchedulingRules, ITimeRules, ITeacherConstraints, IRoomConstraints, ICourseArrangementRules, IConflictResolutionRules } from './SchedulingRules';
export { PeriodTimeConfig, IPeriodTimeConfig } from './PeriodTimeConfig';
export { SemesterCalendar, ISemesterCalendar } from './SemesterCalendar';

/**
 * 数据库初始化工具
 * 
 * 创建默认的管理员账户和基础数据
 */
import { User } from './User';
import bcrypt from 'bcryptjs';

/**
 * 初始化默认管理员账户
 * 
 * Returns:
 *   Promise<void>: 初始化完成
 */
export const initializeDefaultData = async (): Promise<void> => {
  try {
    // 检查是否已存在管理员账户
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      // 创建默认管理员账户
      const defaultAdmin = new User({
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        profile: {
          name: '系统管理员',
          employeeId: 'ADMIN001',
          email: 'admin@school.edu',
          department: '教务处'
        }
      });
      
      await defaultAdmin.save();
      console.log('✅ 默认管理员账户创建成功');
      console.log('   用户名: admin');
      console.log('   密码: admin123');
      console.log('   请登录后及时修改密码！');
    }
    
  } catch (error) {
    console.error('❌ 初始化默认数据失败:', error);
  }
};
/**
 * 课表数据模型
 * 
 * 定义课表安排的数据结构，这是排课系统的核心数据模型
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * 课表接口定义
 */
export interface ISchedule extends Document {
  semester: string;
  academicYear: string;
  class: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  teacher: mongoose.Types.ObjectId;
  room: mongoose.Types.ObjectId;
  dayOfWeek: number;
  period: number;
  weekType?: 'all' | 'odd' | 'even';
  startWeek?: number;
  endWeek?: number;
  status: 'active' | 'suspended' | 'replaced';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 课表Schema定义
 */
const ScheduleSchema = new Schema<ISchedule>({
  semester: {
    type: String,
    required: [true, '学期不能为空'],
    trim: true,
    match: [/^\d{4}-\d{4}-(1|2)$/, '学期格式应为: 2023-2024-1']
  },
  
  academicYear: {
    type: String,
    required: [true, '学年不能为空'],
    trim: true,
    match: [/^\d{4}-\d{4}$/, '学年格式应为: 2023-2024']
  },
  
  class: {
    type: Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, '班级不能为空']
  },
  
  course: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, '课程不能为空']
  },
  
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher',
    required: [true, '教师不能为空']
  },
  
  room: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, '教室不能为空']
  },
  
  dayOfWeek: {
    type: Number,
    required: [true, '星期不能为空'],
    min: [1, '星期必须在1-7之间'],
    max: [7, '星期必须在1-7之间']
  },
  
  period: {
    type: Number,
    required: [true, '节次不能为空'],
    min: [1, '节次必须大于0'],
    max: [12, '节次不能超过12']
  },
  
  weekType: {
    type: String,
    enum: {
      values: ['all', 'odd', 'even'],
      message: '周次类型必须是: all(全周), odd(单周), even(双周) 中的一个'
    },
    default: 'all'
  },
  
  startWeek: {
    type: Number,
    min: [1, '开始周次不能小于1'],
    max: [30, '开始周次不能超过30'],
    default: 1
  },
  
  endWeek: {
    type: Number,
    min: [1, '结束周次不能小于1'],
    max: [30, '结束周次不能超过30'],
    default: 20
  },
  
  status: {
    type: String,
    enum: {
      values: ['active', 'suspended', 'replaced'],
      message: '状态必须是: active(正常), suspended(暂停), replaced(已调课) 中的一个'
    },
    default: 'active'
  },
  
  notes: {
    type: String,
    trim: true,
    maxlength: [500, '备注不能超过500个字符']
  }
}, {
  timestamps: true,
  versionKey: false
});

/**
 * 复合索引 - 确保同一时间段不会有冲突
 */
ScheduleSchema.index({ 
  semester: 1, 
  dayOfWeek: 1, 
  period: 1, 
  teacher: 1 
}, { 
  unique: true,
  partialFilterExpression: { status: 'active' }
});

ScheduleSchema.index({ 
  semester: 1, 
  dayOfWeek: 1, 
  period: 1, 
  class: 1 
}, { 
  unique: true,
  partialFilterExpression: { status: 'active' }
});

ScheduleSchema.index({ 
  semester: 1, 
  dayOfWeek: 1, 
  period: 1, 
  room: 1 
}, { 
  unique: true,
  partialFilterExpression: { status: 'active' }
});

/**
 * 其他索引
 */
ScheduleSchema.index({ semester: 1, class: 1 });
ScheduleSchema.index({ semester: 1, teacher: 1 });
ScheduleSchema.index({ semester: 1, room: 1 });
ScheduleSchema.index({ status: 1 });

/**
 * 虚拟字段：时间描述
 */
ScheduleSchema.virtual('timeDescription').get(function() {
  const dayNames = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  return `${dayNames[this.dayOfWeek]}第${this.period}节`;
});

/**
 * 静态方法：检查时间冲突
 * 
 * Args:
 *   semester: 学期
 *   dayOfWeek: 星期
 *   period: 节次
 *   teacherId?: 教师ID
 *   classId?: 班级ID
 *   roomId?: 教室ID
 * 
 * Returns:
 *   Promise<ISchedule[]>: 冲突的课程列表
 */
ScheduleSchema.statics.checkConflicts = function(
  semester: string,
  dayOfWeek: number,
  period: number,
  teacherId?: mongoose.Types.ObjectId,
  classId?: mongoose.Types.ObjectId,
  roomId?: mongoose.Types.ObjectId
) {
  const conflicts: any[] = [];
  
  if (teacherId) {
    conflicts.push({ semester, dayOfWeek, period, teacher: teacherId, status: 'active' });
  }
  
  if (classId) {
    conflicts.push({ semester, dayOfWeek, period, class: classId, status: 'active' });
  }
  
  if (roomId) {
    conflicts.push({ semester, dayOfWeek, period, room: roomId, status: 'active' });
  }
  
  return this.find({ $or: conflicts }).populate('class course teacher room');
};

export const Schedule = mongoose.model<ISchedule>('Schedule', ScheduleSchema);
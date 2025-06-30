/**
 * 教师数据模型
 * 
 * 定义教师信息的数据结构，包括基本信息、授课能力、时间约束等
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * 时间段接口定义
 */
export interface ITimeSlot {
  dayOfWeek: number;      // 0-6 (周日-周六)
  periods: number[];      // 节次数组，如 [1, 2, 3, 4]
}

/**
 * 教师偏好设置接口
 */
export interface ITeacherPreferences {
  preferredSlots?: ITimeSlot[];     // 偏好时间段
  avoidSlots?: ITimeSlot[];         // 避免时间段
  maxContinuousHours?: number;      // 最大连续课时
  preferMorning?: boolean;          // 是否偏好上午
  avoidFridayAfternoon?: boolean;   // 是否避免周五下午
}

/**
 * 教师接口定义
 */
export interface ITeacher extends Document {
  name: string;
  employeeId: string;
  subjects: string[];
  maxWeeklyHours: number;
  unavailableSlots: ITimeSlot[];
  preferences: ITeacherPreferences;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 时间段Schema
 */
const TimeSlotSchema = new Schema<ITimeSlot>({
  dayOfWeek: {
    type: Number,
    required: true,
    min: [0, '星期必须在0-6之间'],
    max: [6, '星期必须在0-6之间']
  },
  periods: [{
    type: Number,
    required: true,
    min: [1, '节次必须大于0'],
    max: [12, '节次不能超过12']
  }]
}, { _id: false });

/**
 * 教师偏好Schema
 */
const TeacherPreferencesSchema = new Schema<ITeacherPreferences>({
  preferredSlots: [TimeSlotSchema],
  avoidSlots: [TimeSlotSchema],
  maxContinuousHours: {
    type: Number,
    min: [1, '最大连续课时不能小于1'],
    max: [8, '最大连续课时不能超过8'],
    default: 4
  },
  preferMorning: {
    type: Boolean,
    default: false
  },
  avoidFridayAfternoon: {
    type: Boolean,
    default: false
  }
}, { _id: false });

/**
 * 教师Schema定义
 */
const TeacherSchema = new Schema<ITeacher>({
  name: {
    type: String,
    required: [true, '教师姓名不能为空'],
    trim: true,
    maxlength: [50, '教师姓名不能超过50个字符']
  },
  
  employeeId: {
    type: String,
    required: [true, '工号不能为空'],
    trim: true,
    maxlength: [20, '工号不能超过20个字符']
  },
  
  subjects: [{
    type: String,
    required: true,
    trim: true,
    maxlength: [50, '学科名称不能超过50个字符']
  }],
  
  maxWeeklyHours: {
    type: Number,
    required: [true, '周最大课时不能为空'],
    min: [1, '周最大课时不能小于1'],
    max: [40, '周最大课时不能超过40'],
    default: 20
  },
  
  unavailableSlots: [TimeSlotSchema],
  
  preferences: {
    type: TeacherPreferencesSchema,
    default: {}
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

/**
 * 创建索引
 */
TeacherSchema.index({ employeeId: 1 }, { unique: true });
TeacherSchema.index({ subjects: 1 });
TeacherSchema.index({ isActive: 1 });
TeacherSchema.index({ name: 'text' });

/**
 * 虚拟字段：当前周课时统计
 */
TeacherSchema.virtual('currentWeeklyHours').get(function() {
  // 这里可以通过关联查询计算当前实际课时
  // 暂时返回0，后续在业务逻辑中计算
  return 0;
});

export const Teacher = mongoose.model<ITeacher>('Teacher', TeacherSchema);
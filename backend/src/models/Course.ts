/**
 * 课程数据模型
 * 
 * 定义课程信息的数据结构，包括课程属性、场地要求、排课规则等
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * 场地要求接口定义
 */
export interface IRoomRequirement {
  types: string[];                    // 教室类型要求
  specificRoom?: mongoose.Types.ObjectId;  // 特定教室要求
  capacity?: number;                  // 容量要求
  equipment?: string[];               // 设备要求
}

/**
 * 课程接口定义
 */
export interface ICourse extends Document {
  name: string;
  subject: string;
  courseCode: string;
  weeklyHours: number;
  requiresContinuous: boolean;
  continuousHours?: number;
  roomRequirements: IRoomRequirement;
  isWeeklyAlternating?: boolean;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 场地要求Schema
 */
const RoomRequirementSchema = new Schema<IRoomRequirement>({
  types: [{
    type: String,
    required: true,
    trim: true,
    enum: {
      values: ['普通教室', '多媒体教室', '实验室', '计算机房', '语音室', '美术室', '音乐室', '体育馆', '操场'],
      message: '教室类型不在允许的范围内'
    }
  }],
  
  specificRoom: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    required: false
  },
  
  capacity: {
    type: Number,
    min: [1, '容量要求不能小于1'],
    max: [200, '容量要求不能超过200']
  },
  
  equipment: [{
    type: String,
    trim: true,
    maxlength: [50, '设备名称不能超过50个字符']
  }]
}, { _id: false });

/**
 * 课程Schema定义
 */
const CourseSchema = new Schema<ICourse>({
  name: {
    type: String,
    required: [true, '课程名称不能为空'],
    trim: true,
    maxlength: [100, '课程名称不能超过100个字符']
  },
  
  subject: {
    type: String,
    required: [true, '学科不能为空'],
    trim: true,
    maxlength: [50, '学科名称不能超过50个字符'],
    enum: {
      values: [
        '语文', '数学', '英语', '物理', '化学', '生物', 
        '历史', '地理', '政治', '音乐', '美术', '体育', 
        '信息技术', '通用技术', '心理健康', '班会'
      ],
      message: '学科不在允许的范围内'
    }
  },
  
  courseCode: {
    type: String,
    required: [true, '课程编码不能为空'],
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9]{3,10}$/, '课程编码格式不正确，应为3-10位大写字母或数字']
  },
  
  weeklyHours: {
    type: Number,
    required: [true, '周课时不能为空'],
    min: [1, '周课时不能小于1'],
    max: [20, '周课时不能超过20']
  },
  
  requiresContinuous: {
    type: Boolean,
    default: false
  },
  
  continuousHours: {
    type: Number,
    min: [2, '连排课时不能小于2'],
    max: [8, '连排课时不能超过8'],
    validate: {
      validator: function(this: ICourse, value: number) {
        return !this.requiresContinuous || (value && value >= 2);
      },
      message: '需要连排的课程必须设置连排课时数'
    }
  },
  
  roomRequirements: {
    type: RoomRequirementSchema,
    required: true
  },
  
  isWeeklyAlternating: {
    type: Boolean,
    default: false
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [500, '课程描述不能超过500个字符']
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
CourseSchema.index({ courseCode: 1 }, { unique: true });
CourseSchema.index({ subject: 1 });
CourseSchema.index({ isActive: 1 });
CourseSchema.index({ name: 'text', subject: 'text' });

/**
 * 虚拟字段：课程全名
 */
CourseSchema.virtual('fullName').get(function() {
  return `${this.subject}-${this.name}`;
});

/**
 * 静态方法：根据学科查找课程
 * 
 * Args:
 *   subject: 学科名称
 * 
 * Returns:
 *   Promise<ICourse[]>: 课程列表
 */
CourseSchema.statics.findBySubject = function(subject: string) {
  return this.find({ subject, isActive: true });
};

export const Course = mongoose.model<ICourse>('Course', CourseSchema);
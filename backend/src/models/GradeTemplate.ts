import mongoose, { Document, Schema } from 'mongoose';

/**
 * 年级课程模板接口
 */
export interface IGradeTemplate extends Document {
  grade: string;                    // 年级标识
  name: string;                     // 模板名称
  description: string;              // 模板描述
  courses: StandardCourse[];        // 标准课程配置
  isDefault: boolean;               // 是否为默认模板
  isActive: boolean;                // 是否激活
  createdBy: string;                // 创建者ID
  createdAt: Date;                  // 创建时间
  updatedAt: Date;                  // 更新时间
}

/**
 * 标准课程配置接口
 */
export interface StandardCourse {
  courseId: string;                 // 课程ID
  courseName: string;               // 课程名称
  weeklyHours: number;              // 周课时数
  priority: 'core' | 'elective' | 'activity';  // 课程优先级
  requiresContinuous: boolean;      // 是否需要连续排课
  continuousHours?: number;         // 连续课时数
  preferredTimeSlots: TimeSlot[];   // 偏好时间段
  avoidTimeSlots: TimeSlot[];       // 避免时间段
  notes?: string;                   // 备注
}

/**
 * 时间段接口
 */
export interface TimeSlot {
  dayOfWeek: number;                // 星期几 (1-7, 1=周一)
  period: number;                   // 第几节课 (1-8)
}

/**
 * 年级课程模板Schema
 */
const GradeTemplateSchema = new Schema<IGradeTemplate>({
  grade: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  courses: [{
    courseId: {
      type: String,
      required: true
    },
    courseName: {
      type: String,
      required: true,
      trim: true
    },
    weeklyHours: {
      type: Number,
      required: true,
      min: 1,
      max: 30
    },
    priority: {
      type: String,
      enum: ['core', 'elective', 'activity'],
      default: 'core'
    },
    requiresContinuous: {
      type: Boolean,
      default: false
    },
    continuousHours: {
      type: Number,
      min: 2,
      max: 4
    },
    preferredTimeSlots: [{
      dayOfWeek: {
        type: Number,
        min: 1,
        max: 7
      },
      period: {
        type: Number,
        min: 1,
        max: 8
      }
    }],
    avoidTimeSlots: [{
      dayOfWeek: {
        type: Number,
        min: 1,
        max: 7
      },
      period: {
        type: Number,
        min: 1,
        max: 8
      }
    }],
    notes: {
      type: String,
      trim: true
    }
  }],
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  collection: 'grade_templates'
});

// 创建复合索引
GradeTemplateSchema.index({ grade: 1, isDefault: 1 });
GradeTemplateSchema.index({ grade: 1, isActive: 1 });

// 确保每个年级只有一个默认模板
GradeTemplateSchema.pre('save', async function(next) {
  if (this.isDefault) {
    // 如果当前模板设为默认，则取消同年级其他模板的默认状态
    const GradeTemplateModel = this.constructor as any;
    await GradeTemplateModel.updateMany(
      { grade: this.grade, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

export const GradeTemplate = mongoose.model<IGradeTemplate>('GradeTemplate', GradeTemplateSchema);

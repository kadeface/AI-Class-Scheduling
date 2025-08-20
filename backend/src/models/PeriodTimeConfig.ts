import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * 课程时间配置接口
 */
export interface IPeriodTimeConfig extends Document {
  period: number;           // 节次 (1, 2, 3...)
  startTime: string;        // 开始时间 "08:00"
  endTime: string;          // 结束时间 "08:45"
  breakTime?: number;       // 课间休息时间(分钟)
  isActive: boolean;        // 是否启用
  academicYear: string;     // 学年
  semester: string;         // 学期
  description?: string;     // 描述信息
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 课程时间配置模型接口（包含静态方法）
 */
export interface IPeriodTimeConfigModel extends Model<IPeriodTimeConfig> {
  findByAcademicPeriod(academicYear: string, semester: string): Promise<IPeriodTimeConfig[]>;
}

/**
 * 课程时间配置Schema
 */
const periodTimeConfigSchema = new Schema<IPeriodTimeConfig>({
  period: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  startTime: {
    type: String,
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ // 时间格式验证
  },
  endTime: {
    type: String,
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ // 时间格式验证
  },
  breakTime: {
    type: Number,
    default: 10,
    min: 0,
    max: 180  // 允许午休时间等较长的休息时间
  },
  isActive: {
    type: Boolean,
    default: true
  },
  academicYear: {
    type: String,
    required: true,
    index: true
  },
  semester: {
    type: String,
    required: true,
    index: true
  },
  description: {
    type: String,
    maxlength: 200
  }
}, {
  timestamps: true,
  collection: 'period_time_configs'
});

// 复合索引：确保同一学年学期的节次唯一
periodTimeConfigSchema.index(
  { academicYear: 1, semester: 1, period: 1 }, 
  { unique: true }
);

// 验证结束时间必须晚于开始时间
periodTimeConfigSchema.pre('save', function(next) {
  if (this.startTime >= this.endTime) {
    return next(new Error('结束时间必须晚于开始时间'));
  }
  next();
});

// 静态方法：获取指定学年学期的时间配置
periodTimeConfigSchema.statics.findByAcademicPeriod = function(this: any, academicYear: string, semester: string) {
  return this.find({
    academicYear,
    semester,
    isActive: true
  }).sort({ period: 1 });
};

// 实例方法：获取时间段的分钟数
periodTimeConfigSchema.methods.getDurationMinutes = function(): number {
  const start = new Date(`2000-01-01T${this.startTime}:00`);
  const end = new Date(`2000-01-01T${this.endTime}:00`);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
};

export const PeriodTimeConfig = mongoose.model<IPeriodTimeConfig, IPeriodTimeConfigModel>('PeriodTimeConfig', periodTimeConfigSchema);

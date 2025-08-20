import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * 特殊日期接口
 */
interface ISpecialDay {
  date: Date;
  type: 'holiday' | 'exam' | 'activity' | 'makeup';
  description: string;
  isActive: boolean;
}

/**
 * 学期日历接口
 */
export interface ISemesterCalendar extends Document {
  academicYear: string;     // 学年
  semester: string;         // 学期
  startDate: Date;          // 学期开始日期
  endDate: Date;            // 学期结束日期
  weekDays: number[];       // 上课日 [1,2,3,4,5] (周一到周五)
  holidays: Date[];         // 节假日列表
  specialDays: ISpecialDay[]; // 特殊日期
  isActive: boolean;        // 是否启用
  description?: string;     // 描述信息
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 学期日历Schema
 */
const semesterCalendarSchema = new Schema<ISemesterCalendar>({
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
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  weekDays: {
    type: [Number],
    required: true,
    default: [1, 2, 3, 4, 5], // 默认周一到周五
    validate: {
      validator: function(v: number[]) {
        return v.every(day => day >= 1 && day <= 7) && v.length > 0;
      },
      message: '星期几必须在1-7之间，且不能为空'
    }
  },
  holidays: {
    type: [Date],
    default: []
  },
  specialDays: {
    type: [{
      date: {
        type: Date,
        required: true
      },
      type: {
        type: String,
        enum: ['holiday', 'exam', 'activity', 'makeup'],
        required: true
      },
      description: {
        type: String,
        required: true,
        maxlength: 200
      },
      isActive: {
        type: Boolean,
        default: true
      }
    }],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true,
  collection: 'semester_calendars'
});

// 复合索引：确保同一学年学期唯一
semesterCalendarSchema.index(
  { academicYear: 1, semester: 1 }, 
  { unique: true }
);

// 验证结束日期必须晚于开始日期
semesterCalendarSchema.pre('save', function(next) {
  if (this.startDate >= this.endDate) {
    return next(new Error('结束日期必须晚于开始日期'));
  }
  next();
});

// 静态方法：获取指定学年学期的日历
semesterCalendarSchema.statics.findByAcademicPeriod = function(this: any, academicYear: string, semester: string) {
  return this.findOne({
    academicYear,
    semester,
    isActive: true
  });
};

// 静态方法：获取所有活跃的学期日历
semesterCalendarSchema.statics.findActive = function(this: any) {
  return this.find({ isActive: true }).sort({ academicYear: -1, semester: -1 });
};

// 实例方法：检查指定日期是否为上课日
semesterCalendarSchema.methods.isSchoolDay = function(date: Date): boolean {
  const dayOfWeek = date.getDay(); // 0=周日, 1=周一, ..., 6=周六
  const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // 调整为1=周一, ..., 7=周日
  
  // 检查是否为节假日
  const isHoliday = this.holidays.some((holiday: Date) => 
    holiday.toDateString() === date.toDateString()
  );
  
  // 检查是否为特殊日期（非上课日）
  const specialDay = this.specialDays.find((sd: ISpecialDay) => 
    sd.isActive && sd.date.toDateString() === date.toDateString()
  );
  
  if (isHoliday || (specialDay && specialDay.type === 'holiday')) {
    return false;
  }
  
  // 检查是否为补课日
  if (specialDay && specialDay.type === 'makeup') {
    return true;
  }
  
  // 检查是否为正常上课日
  return this.weekDays.includes(adjustedDay);
};

// 实例方法：获取学期总周数
semesterCalendarSchema.methods.getTotalWeeks = function(): number {
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.ceil(diffDays / 7);
};

/**
 * 学期日历模型接口（包含静态方法）
 */
export interface ISemesterCalendarModel extends Model<ISemesterCalendar> {
  findByAcademicPeriod(academicYear: string, semester: string): Promise<ISemesterCalendar | null>;
  findActive(): Promise<ISemesterCalendar[]>;
}

export const SemesterCalendar = mongoose.model<ISemesterCalendar, ISemesterCalendarModel>('SemesterCalendar', semesterCalendarSchema);

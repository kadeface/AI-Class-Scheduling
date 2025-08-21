/**
 * 排课规则数据模型
 * 
 * 定义全局排课规则的数据结构，包括时间约束、教师约束、教室约束等
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * 时间规则接口定义
 * 
 * 定义排课时间相关的约束规则
 */
export interface ITimeRules {
  dailyPeriods: number;                // 每日课时数 (如: 8)
  workingDays: number[];               // 工作日 (如: [1,2,3,4,5] 表示周一到周五)
  periodDuration: number;              // 单节课时长(分钟)
  breakDuration: number;               // 课间休息时长(分钟)
  lunchBreakStart: number;             // 午休开始节次
  lunchBreakDuration: number;          // 午休时长(分钟)
  morningPeriods: number[];            // 上午节次 (如: [1,2,3,4])
  afternoonPeriods: number[];          // 下午节次 (如: [5,6,7,8])
  forbiddenSlots?: {                   // 禁用时间段
    dayOfWeek: number;
    periods: number[];
  }[];
    // 新增属性
    maxMorningPeriods?: number;          // 上午最多课时数
    maxAfternoonPeriods?: number;        // 下午最多课时数
    morningStartPeriod?: number;         // 上午开始节次
    afternoonStartPeriod?: number;       // 下午开始节次
}

/**
 * 教师轮换策略接口定义
 * 
 * 定义教师授课轮换的智能策略
 */
export interface ITeacherRotationStrategy {
  enableRotation: boolean;              // 是否启用教师轮换
  rotationMode: 'round_robin' | 'balanced' | 'custom'; // 轮换模式
  roundCompletion: boolean;             // 是否要求完成一轮后再下一轮
  minIntervalBetweenClasses: number;    // 同一班级间最小间隔节次
  maxConsecutiveClasses: number;        // 同一班级最大连续节次
  rotationOrder: 'alphabetical' | 'grade_based' | 'custom'; // 轮换顺序策略
  customRotationOrder?: string[];       // 自定义轮换顺序
}

/**
 * 教师约束规则接口定义
 * 
 * 定义教师排课相关的约束规则
 */
export interface ITeacherConstraints {
  maxDailyHours: number;               // 教师每日最大课时数
  maxContinuousHours: number;          // 教师最大连续课时数
  minRestBetweenCourses: number;       // 课程间最小休息时间(分钟)
  avoidFridayAfternoon: boolean;       // 是否避免周五下午排课
  respectTeacherPreferences: boolean;  // 是否尊重教师时间偏好
  allowCrossGradeTeaching: boolean;    // 是否允许跨年级教学
  
  // 新增：教师轮换策略
  rotationStrategy: ITeacherRotationStrategy; // 教师轮换策略
}

/**
 * 教室约束规则接口定义
 * 
 * 定义教室使用相关的约束规则
 */
export interface IRoomConstraints {
  respectCapacityLimits: boolean;      // 是否严格遵守教室容量限制
  allowRoomSharing: boolean;           // 是否允许教室共享
  preferFixedClassrooms: boolean;      // 是否优先使用固定教室
  specialRoomPriority: 'strict' | 'preferred' | 'flexible'; // 特殊教室优先级
}

/**
 * 科目特定约束规则接口定义
 * 
 * 定义特定科目的约束规则，如体育课不能连排等
 */
export interface ISubjectSpecificRules {
  subjectName: string;                    // 科目名称
  avoidConsecutive: boolean;              // 是否避免连续安排
  minInterval: number;                    // 最小间隔节次（0表示无限制）
  preferredTimeSlots: number[];           // 偏好时间段（节次数组）
  avoidTimeSlots: number[];               // 避免时间段（节次数组）
  relatedSubjects: string[];              // 关联科目（需要间隔安排的科目）
  maxDailyOccurrences: number;            // 每日最大出现次数
  priority: 'high' | 'medium' | 'low';   // 科目优先级
  specialConstraints?: {                  // 特殊约束
    type: 'physical' | 'lab' | 'theory' | 'art' | 'other'; // 科目类型
    requiresRest: boolean;                // 是否需要休息时间
    minRestPeriods: number;               // 最小休息节次数
  };
}

/**
 * 核心课程策略接口定义
 * 
 * 定义核心课程的分布和约束策略
 */
export interface ICoreSubjectStrategy {
  enableCoreSubjectStrategy: boolean;        // 是否启用核心课程策略
  coreSubjects: string[];                    // 核心课程列表（如：语文、数学、英语等）
  distributionMode: 'daily' | 'balanced' | 'concentrated'; // 分布模式
  maxDailyOccurrences: number;               // 每日最大出现次数（建议：1-2次）
  minDaysPerWeek: number;                    // 每周最少出现天数（建议：4-5天）
  avoidConsecutiveDays: boolean;             // 是否避免连续天安排
  preferredTimeSlots: number[];              // 偏好时间段（节次数组）
  avoidTimeSlots: number[];                  // 避免时间段（节次数组）
  maxConcentration: number;                  // 最大集中度（连续天数限制）
  balanceWeight: number;                     // 平衡权重（0-100）
  enforceEvenDistribution: boolean;          // 是否强制均匀分布
}

/**
 * 固定时间课程接口定义
 */
export interface IFixedTimeCourse {
  type: 'class-meeting' | 'flag-raising' | 'eye-exercise' | 'morning-reading' | 'afternoon-reading' | 'cleaning' | 'other';
  name: string;                         // 🆕 新增：课程名称，直接存储显示名称
  dayOfWeek: number;                    // 星期几 (1-7)
  period: number;                        // 第几节课 (1-12)
  weekType: 'all' | 'odd' | 'even';    // 周次类型
  startWeek: number;                    // 开始周次
  endWeek: number;                      // 结束周次
  notes?: string;                       // 备注信息
}

/**
 * 固定时间课程全局配置接口
 */
export interface IFixedTimeCoursesConfig {
  enabled: boolean;                     // 是否启用固定时间课程
  courses: IFixedTimeCourse[];          // 固定时间课程列表
  priority: boolean;                    // 是否优先于其他课程
  allowOverride: boolean;               // 是否允许手动调整
  conflictStrategy: 'strict' | 'flexible' | 'warning'; // 冲突处理策略
}

/**
 * 课程排列规则接口定义
 * 
 * 定义课程安排相关的约束规则
 */
export interface ICourseArrangementRules {
  allowContinuousCourses: boolean;     // 是否允许连排课程
  maxContinuousHours: number;          // 最大连排课时数
  distributionPolicy: 'balanced' | 'concentrated' | 'flexible'; // 课程分布策略
  avoidFirstLastPeriod: string[];      // 避免第一节或最后一节的科目
  coreSubjectPriority: boolean;        // 核心科目优先安排在黄金时段
  labCoursePreference: 'morning' | 'afternoon' | 'flexible'; // 实验课时间偏好
  
  // 新增：科目特定约束
  subjectSpecificRules: ISubjectSpecificRules[]; // 科目特定约束规则
  enableSubjectConstraints: boolean;   // 是否启用科目特定约束
  defaultSubjectInterval: number;      // 默认科目间隔节次
  
  // 新增：核心课程策略
  coreSubjectStrategy: ICoreSubjectStrategy; // 核心课程策略配置
  
  // 新增：固定时间课程配置
  fixedTimeCourses?: IFixedTimeCoursesConfig; // 固定时间课程配置
}

/**
 * 冲突处理规则接口定义
 * 
 * 定义排课冲突的处理策略
 */
export interface IConflictResolutionRules {
  teacherConflictResolution: 'strict' | 'warn' | 'ignore'; // 教师冲突处理
  roomConflictResolution: 'strict' | 'warn' | 'ignore';    // 教室冲突处理
  classConflictResolution: 'strict' | 'warn' | 'ignore';   // 班级冲突处理
  allowOverride: boolean;              // 是否允许手动覆盖冲突
  priorityOrder: string[];             // 冲突解决优先级顺序
}

/**
 * 排课规则接口定义
 * 
 * 定义完整的排课规则配置
 */
export interface ISchedulingRules extends Document {
  name: string;                        // 规则集名称
  description?: string;                // 规则集描述
  schoolType: 'primary' | 'middle' | 'high' | 'mixed'; // 学校类型
  academicYear: string;                // 适用学年
  semester: number;                    // 适用学期
  
  timeRules: ITimeRules;               // 时间规则
  teacherConstraints: ITeacherConstraints; // 教师约束
  roomConstraints: IRoomConstraints;   // 教室约束
  courseArrangementRules: ICourseArrangementRules; // 课程排列规则
  conflictResolutionRules: IConflictResolutionRules; // 冲突处理规则
  
  isDefault: boolean;                  // 是否为默认规则集
  isActive: boolean;                   // 是否有效
  createdBy: mongoose.Types.ObjectId;  // 创建人
  updatedBy?: mongoose.Types.ObjectId; // 最后修改人
  createdAt: Date;                     // 创建时间
  updatedAt: Date;                     // 更新时间

  // 实例方法
  setAsDefault(): Promise<ISchedulingRules>;
}

/**
 * 时间规则Schema定义
 */
const TimeRulesSchema = new Schema<ITimeRules>({
  dailyPeriods: {
    type: Number,
    required: [true, '每日课时数不能为空'],
    min: [4, '每日课时数至少为4'],
    max: [12, '每日课时数不能超过12']
  },
  
  workingDays: {
    type: [Number],
    required: [true, '工作日不能为空'],
    validate: {
      validator: function(days: number[]) {
        return days.length > 0 && days.every(day => day >= 0 && day <= 6);
      },
      message: '工作日必须是0-6之间的数字数组'
    }
  },
  
  periodDuration: {
    type: Number,
    required: [true, '单节课时长不能为空'],
    min: [30, '单节课时长至少30分钟'],
    max: [60, '单节课时长不能超过60分钟']
  },
  
  breakDuration: {
    type: Number,
    required: [true, '课间休息时长不能为空'],
    min: [5, '课间休息至少5分钟'],
    max: [20, '课间休息不能超过20分钟']
  },
  
  lunchBreakStart: {
    type: Number,
    required: [true, '午休开始节次不能为空'],
    min: [3, '午休开始节次至少为3'],
    max: [8, '午休开始节次不能超过8']
  },
  
  lunchBreakDuration: {
    type: Number,
    required: [true, '午休时长不能为空'],
    min: [60, '午休时长至少60分钟'],
    max: [120, '午休时长不能超过120分钟']
  },
  
  morningPeriods: {
    type: [Number],
    required: [true, '上午节次不能为空']
  },
  
  afternoonPeriods: {
    type: [Number], 
    required: [true, '下午节次不能为空']
  },
  
  forbiddenSlots: [{
    dayOfWeek: {
      type: Number,
      min: [0, '星期几必须在0-6之间'],
      max: [6, '星期几必须在0-6之间']
    },
    periods: [{
      type: Number,
      min: [1, '节次必须从1开始']
    }]
  }]
}, { _id: false });

/**
 * 教师轮换策略Schema定义
 */
const TeacherRotationStrategySchema = new Schema<ITeacherRotationStrategy>({
  enableRotation: {
    type: Boolean,
    default: true
  },
  
  rotationMode: {
    type: String,
    enum: ['round_robin', 'balanced', 'custom'],
    default: 'round_robin'
  },
  
  roundCompletion: {
    type: Boolean,
    default: true
  },
  
  minIntervalBetweenClasses: {
    type: Number,
    min: [0, '同一班级间最小间隔节次不能为负数'],
    default: 1
  },
  
  maxConsecutiveClasses: {
    type: Number,
    min: [1, '同一班级最大连续节次至少为1'],
    default: 2
  },
  
  rotationOrder: {
    type: String,
    enum: ['alphabetical', 'grade_based', 'custom'],
    default: 'alphabetical'
  },
  
  customRotationOrder: {
    type: [String],
    default: []
  }
}, { _id: false });

/**
 * 教师约束Schema定义
 */
const TeacherConstraintsSchema = new Schema<ITeacherConstraints>({
  maxDailyHours: {
    type: Number,
    required: [true, '教师每日最大课时数不能为空'],
    min: [2, '教师每日最大课时数至少为2'],
    max: [8, '教师每日最大课时数不能超过8']
  },
  
  maxContinuousHours: {
    type: Number,
    required: [true, '教师最大连续课时数不能为空'],
    min: [1, '教师最大连续课时数至少为1'],
    max: [4, '教师最大连续课时数不能超过4']
  },
  
  minRestBetweenCourses: {
    type: Number,
    default: 10,
    min: [0, '课程间最小休息时间不能为负数'],
    max: [30, '课程间最小休息时间不能超过30分钟']
  },
  
  avoidFridayAfternoon: {
    type: Boolean,
    default: true
  },
  
  respectTeacherPreferences: {
    type: Boolean,
    default: true
  },
  
  allowCrossGradeTeaching: {
    type: Boolean,
    default: true
  },
  
  // 新增：教师轮换策略
  rotationStrategy: {
    type: TeacherRotationStrategySchema,
    default: () => ({})
  }
}, { _id: false });

/**
 * 教室约束Schema定义
 */const RoomConstraintsSchema = new Schema<IRoomConstraints>({
  respectCapacityLimits: {
    type: Boolean,
    default: true
  },
  
  allowRoomSharing: {
    type: Boolean,
    default: false
  },
  
  preferFixedClassrooms: {
    type: Boolean,
    default: true
  },
  
  specialRoomPriority: {
    type: String,
    required: [true, '特殊教室优先级不能为空'],
    enum: ['strict', 'preferred', 'flexible'],
    default: 'preferred'
  }
}, { _id: false });

/**
 * 科目特定约束规则Schema定义
 */
const SubjectSpecificRulesSchema = new Schema<ISubjectSpecificRules>({
  subjectName: {
    type: String,
    required: [true, '科目名称不能为空'],
    trim: true
  },
  
  avoidConsecutive: {
    type: Boolean,
    default: false
  },
  
  minInterval: {
    type: Number,
    min: [0, '最小间隔节次不能为负数'],
    default: 0
  },
  
  preferredTimeSlots: {
    type: [Number],
    default: []
  },
  
  avoidTimeSlots: {
    type: [Number],
    default: []
  },
  
  relatedSubjects: {
    type: [String],
    default: []
  },
  
  maxDailyOccurrences: {
    type: Number,
    min: [1, '每日最大出现次数至少为1'],
    default: 2
  },
  
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  
  specialConstraints: {
    type: {
      type: String,
      enum: ['physical', 'lab', 'theory', 'art', 'other'],
      default: 'other'
    },
    requiresRest: {
      type: Boolean,
      default: false
    },
    minRestPeriods: {
      type: Number,
      min: [0, '最小休息节次数不能为负数'],
      default: 0
    }
  }
}, { _id: false });

/**
 * 核心课程策略Schema定义
 */
const CoreSubjectStrategySchema = new Schema<ICoreSubjectStrategy>({
  enableCoreSubjectStrategy: {
    type: Boolean,
    default: false
  },
  coreSubjects: {
    type: [String],
    default: []
  },
  distributionMode: {
    type: String,
    enum: ['daily', 'balanced', 'concentrated'],
    default: 'balanced'
  },
  maxDailyOccurrences: {
    type: Number,
    min: [1, '每日最大出现次数至少为1'],
    default: 2
  },
  minDaysPerWeek: {
    type: Number,
    min: [1, '每周最少出现天数至少为1'],
    default: 4
  },
  avoidConsecutiveDays: {
    type: Boolean,
    default: true
  },
  preferredTimeSlots: {
    type: [Number],
    default: []
  },
  avoidTimeSlots: {
    type: [Number],
    default: []
  },
  maxConcentration: {
    type: Number,
    min: [1, '最大集中度至少为1'],
    default: 2
  },
  balanceWeight: {
    type: Number,
    min: [0, '平衡权重不能为负数'],
    max: [100, '平衡权重不能超过100'],
    default: 50
  },
  enforceEvenDistribution: {
    type: Boolean,
    default: true
  }
}, { _id: false });

/**
 * 课程排列规则Schema定义
 */
const CourseArrangementRulesSchema = new Schema<ICourseArrangementRules>({
  allowContinuousCourses: {
    type: Boolean,
    default: true
  },
  
  maxContinuousHours: {
    type: Number,
    required: [true, '最大连排课时数不能为空'],
    min: [2, '最大连排课时数至少为2'],
    max: [4, '最大连排课时数不能超过4'],
    default: 2
  },
  
  distributionPolicy: {
    type: String,
    required: [true, '课程分布策略不能为空'],
    enum: ['balanced', 'concentrated', 'flexible'],
    default: 'balanced'
  },
  
  avoidFirstLastPeriod: {
    type: [String],
    default: []
  },
  
  coreSubjectPriority: {
    type: Boolean,
    default: true
  },
  
  labCoursePreference: {
    type: String,
    required: [true, '实验课时间偏好不能为空'],
    enum: ['morning', 'afternoon', 'flexible'],
    default: 'afternoon'
  },
  
  // 新增：科目特定约束
  subjectSpecificRules: {
    type: [SubjectSpecificRulesSchema],
    default: []
  },
  
  enableSubjectConstraints: {
    type: Boolean,
    default: true
  },
  
  defaultSubjectInterval: {
    type: Number,
    min: [0, '默认科目间隔节次不能为负数'],
    default: 1
  },
  
  // 新增：核心课程策略
  coreSubjectStrategy: {
    type: CoreSubjectStrategySchema,
    default: () => ({})
  },
  
  // 新增：固定时间课程配置
  fixedTimeCourses: {
    type: new Schema<IFixedTimeCoursesConfig>({
      enabled: {
        type: Boolean,
        default: false
      },
      courses: {
        type: [new Schema<IFixedTimeCourse>({
          type: {
            type: String,
            required: [true, '课程类型不能为空'],
            enum: {
              values: ['class-meeting', 'flag-raising', 'eye-exercise', 'morning-reading', 'afternoon-reading', 'cleaning', 'other'],
              message: '课程类型必须是有效的固定时间课程类型'
            }
          },
          name: {
            type: String,
            required: [true, '课程名称不能为空'],
            message: '课程名称用于显示和识别'
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
            min: [1, '节次必须从1开始'],
            max: [12, '节次不能超过12']
          },
          weekType: {
            type: String,
            required: [true, '周次类型不能为空'],
            enum: {
              values: ['all', 'odd', 'even'],
              message: '周次类型必须是: all(全周), odd(单周), even(双周) 中的一个'
            },
            default: 'all'
          },
          startWeek: {
            type: Number,
            required: [true, '开始周次不能为空'],
            min: [1, '开始周次不能小于1'],
            max: [30, '开始周次不能超过30'],
            default: 1
          },
          endWeek: {
            type: Number,
            required: [true, '结束周次不能为空'],
            min: [1, '结束周次不能小于1'],
            max: [30, '结束周次不能超过30'],
            default: 20
          },
          notes: {
            type: String,
            maxlength: [200, '备注信息不能超过200个字符']
          }
        }, { _id: false })],
        default: []
      },
      priority: {
        type: Boolean,
        default: false
      },
      allowOverride: {
        type: Boolean,
        default: false
      },
      conflictStrategy: {
        type: String,
        required: [true, '冲突处理策略不能为空'],
        enum: {
          values: ['strict', 'flexible', 'warning'],
          message: '冲突处理策略必须是: strict(严格), flexible(灵活), warning(警告) 中的一个'
        },
        default: 'strict'
      }
    }, { _id: false }),
    default: () => ({
      enabled: false,
      courses: [],
      priority: false,
      allowOverride: false,
      conflictStrategy: 'strict'
    })
  }
}, { _id: false });

/**
 * 冲突处理规则Schema定义
 */
const ConflictResolutionRulesSchema = new Schema<IConflictResolutionRules>({
  teacherConflictResolution: {
    type: String,
    required: [true, '教师冲突处理策略不能为空'],
    enum: ['strict', 'warn', 'ignore'],
    default: 'strict'
  },
  
  roomConflictResolution: {
    type: String,
    required: [true, '教室冲突处理策略不能为空'],
    enum: ['strict', 'warn', 'ignore'],
    default: 'strict'
  },
  
  classConflictResolution: {
    type: String,
    required: [true, '班级冲突处理策略不能为空'],
    enum: ['strict', 'warn', 'ignore'],
    default: 'strict'
  },
  
  allowOverride: {
    type: Boolean,
    default: false
  },
  
  priorityOrder: {
    type: [String],
    required: [true, '优先级顺序不能为空'],
    default: ['teacher', 'room', 'class']
  }
}, { _id: false });

/**
 * 排课规则Schema定义
 */
const SchedulingRulesSchema = new Schema<ISchedulingRules>({
  name: {
    type: String,
    required: [true, '规则集名称不能为空'],
    trim: true,
    maxlength: [100, '规则集名称不能超过100个字符']
  },
  
  description: {
    type: String,
    maxlength: [500, '规则集描述不能超过500个字符']
  },
  
  schoolType: {
    type: String,
    required: [true, '学校类型不能为空'],
    enum: ['primary', 'middle', 'high', 'mixed']
  },
  
  academicYear: {
    type: String,
    required: [true, '适用学年不能为空'],
    trim: true,
    match: [/^\d{4}-\d{4}$/, '学年格式应为: 2024-2025']
  },
  
  semester: {
    type: Number,
    required: [true, '适用学期不能为空'],
    enum: [1, 2]
  },
  
  timeRules: {
    type: TimeRulesSchema,
    required: [true, '时间规则不能为空']
  },
  
  teacherConstraints: {
    type: TeacherConstraintsSchema,
    required: [true, '教师约束不能为空']
  },
  
  roomConstraints: {
    type: RoomConstraintsSchema,
    required: [true, '教室约束不能为空']
  },
  
  courseArrangementRules: {
    type: CourseArrangementRulesSchema,
    required: [true, '课程排列规则不能为空']
  },
  
  conflictResolutionRules: {
    type: ConflictResolutionRulesSchema,
    required: [true, '冲突处理规则不能为空']
  },
  
  isDefault: {
    type: Boolean,
    default: false
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '创建人不能为空']
  },
  
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 创建复合索引确保默认规则集唯一性
SchedulingRulesSchema.index({ 
  academicYear: 1, 
  semester: 1, 
  isDefault: 1 
}, {
  unique: true,
  name: 'unique_default_rules',
  partialFilterExpression: { isDefault: true, isActive: true }
});

// 创建查询性能索引
SchedulingRulesSchema.index({ academicYear: 1, semester: 1 });
SchedulingRulesSchema.index({ schoolType: 1 });
SchedulingRulesSchema.index({ createdBy: 1 });

/**
 * 静态方法：获取默认排课规则
 * 
 * Args:
 *   academicYear: 学年
 *   semester: 学期
 * 
 * Returns:
 *   Promise<ISchedulingRules | null>: 默认排课规则或null
 */
SchedulingRulesSchema.statics.getDefaultRules = function(
  academicYear: string, 
  semester: number
) {
  return this.findOne({
    academicYear,
    semester,
    isDefault: true,
    isActive: true
  }).populate([
    { path: 'createdBy', select: 'username profile.name' },
    { path: 'updatedBy', select: 'username profile.name' }
  ]);
};

/**
 * 实例方法：设置为默认规则集
 * 
 * Returns:
 *   Promise<ISchedulingRules>: 更新后的规则集
 */
SchedulingRulesSchema.methods.setAsDefault = async function() {
  // 先取消其他默认规则集
  await (this.constructor as Model<ISchedulingRules>).updateMany(
    {
      academicYear: this.academicYear,
      semester: this.semester,
      isDefault: true,
      _id: { $ne: this._id }
    },
    { isDefault: false }
  );
  
  // 设置当前规则集为默认
  this.isDefault = true;
  return await this.save();
};

export const SchedulingRules = mongoose.model<ISchedulingRules>('SchedulingRules', SchedulingRulesSchema);
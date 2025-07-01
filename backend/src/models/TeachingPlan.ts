/**
 * 教学计划数据模型
 * 
 * 定义班级教学计划的数据结构，用于配置某个班级在某个学期应该上哪些课程，
 * 每门课程由哪个教师教授，以及相关的教学安排信息
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * 课程安排接口定义
 * 
 * 描述单个课程在班级中的教学安排
 */
export interface ICourseAssignment {
  course: mongoose.Types.ObjectId;      // 课程ID (关联Course表)
  teacher: mongoose.Types.ObjectId;     // 授课教师ID (关联Teacher表)
  weeklyHours: number;                  // 每周课时数
  requiresContinuous?: boolean;         // 是否需要连排
  continuousHours?: number;             // 连排课时数（如果需要连排）
  preferredTimeSlots?: {                // 偏好时间段
    dayOfWeek: number;                  // 星期几 (0-6)
    periods: number[];                  // 偏好节次
  }[];
  avoidTimeSlots?: {                    // 避免时间段
    dayOfWeek: number;                  // 星期几 (0-6)
    periods: number[];                  // 避免节次
  }[];
  notes?: string;                       // 备注信息
}

/**
 * 教学计划接口定义
 * 
 * 定义某个班级在特定学期的完整教学计划
 */
export interface ITeachingPlan extends Document {
  class: mongoose.Types.ObjectId;      // 班级ID (关联Class表)
  academicYear: string;                // 学年 (如: 2024-2025)
  semester: number;                    // 学期 (1或2)
  courseAssignments: ICourseAssignment[]; // 课程安排列表
  totalWeeklyHours: number;            // 总周课时数
  status: 'draft' | 'approved' | 'active' | 'archived'; // 计划状态
  approvedBy?: mongoose.Types.ObjectId; // 审批人 (关联User表)
  approvedAt?: Date;                   // 审批时间
  notes?: string;                      // 计划备注
  createdBy: mongoose.Types.ObjectId;  // 创建人 (关联User表)
  updatedBy?: mongoose.Types.ObjectId; // 最后修改人 (关联User表)
  isActive: boolean;                   // 是否有效
  createdAt: Date;                     // 创建时间
  updatedAt: Date;                     // 更新时间
}

/**
 * 教学计划模型静态方法接口
 */
export interface ITeachingPlanModel extends Model<ITeachingPlan> {
  findCurrentPlan(
    classId: mongoose.Types.ObjectId, 
    academicYear: string, 
    semester: number
  ): Promise<ITeachingPlan | null>;
}

/**
 * 课程安排Schema定义
 */
const CourseAssignmentSchema = new Schema<ICourseAssignment>({
  course: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, '课程不能为空']
  },
  
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher',
    required: [true, '授课教师不能为空']
  },
  
  weeklyHours: {
    type: Number,
    required: [true, '每周课时数不能为空'],
    min: [1, '每周课时数至少为1'],
    max: [10, '每周课时数不能超过10']
  },
  
  requiresContinuous: {
    type: Boolean,
    default: false
  },
  
  continuousHours: {
    type: Number,
    min: [2, '连排课时数至少为2'],
    max: [4, '连排课时数不能超过4']
  },
  
  preferredTimeSlots: [{
    dayOfWeek: {
      type: Number,
      min: [0, '星期几必须在0-6之间'],
      max: [6, '星期几必须在0-6之间']
    },
    periods: [{
      type: Number,
      min: [1, '节次必须从1开始'],
      max: [12, '节次不能超过12']
    }]
  }],
  
  avoidTimeSlots: [{
    dayOfWeek: {
      type: Number,
      min: [0, '星期几必须在0-6之间'],
      max: [6, '星期几必须在0-6之间']
    },
    periods: [{
      type: Number,
      min: [1, '节次必须从1开始'],
      max: [12, '节次不能超过12']
    }]
  }],
  
  notes: {
    type: String,
    maxlength: [500, '备注信息不能超过500个字符']
  }
}, { _id: false });

/**
 * 教学计划Schema定义
 */
const TeachingPlanSchema = new Schema<ITeachingPlan>({
  class: {
    type: Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, '班级不能为空']
  },
  
  academicYear: {
    type: String,
    required: [true, '学年不能为空'],
    trim: true,
    match: [/^\d{4}-\d{4}$/, '学年格式应为: 2024-2025']
  },
  
  semester: {
    type: Number,
    required: [true, '学期不能为空'],
    enum: [1, 2],
    validate: {
      validator: function(value: number) {
        return [1, 2].includes(value);
      },
      message: '学期只能是1或2'
    }
  },
  
  courseAssignments: {
    type: [CourseAssignmentSchema],
    required: [true, '课程安排不能为空'],
    validate: {
      validator: function(assignments: ICourseAssignment[]) {
        return assignments && assignments.length > 0;
      },
      message: '至少需要安排一门课程'
    }
  },
  
  totalWeeklyHours: {
    type: Number,
    required: [true, '总周课时数不能为空'],
    min: [1, '总周课时数至少为1'],
    max: [50, '总周课时数不能超过50']
  },
  
  status: {
    type: String,
    required: [true, '计划状态不能为空'],
    enum: ['draft', 'approved', 'active', 'archived'],
    default: 'draft'
  },
  
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  approvedAt: {
    type: Date
  },
  
  notes: {
    type: String,
    maxlength: [1000, '计划备注不能超过1000个字符']
  },
  
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '创建人不能为空']
  },
  
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 创建复合索引确保唯一性
TeachingPlanSchema.index({ 
  class: 1, 
  academicYear: 1, 
  semester: 1 
}, { 
  unique: true,
  name: 'unique_teaching_plan',
  partialFilterExpression: { isActive: true }
});

// 创建查询性能索引
TeachingPlanSchema.index({ academicYear: 1, semester: 1 });
TeachingPlanSchema.index({ status: 1 });
TeachingPlanSchema.index({ createdBy: 1 });

/**
 * 中间件：保存前计算总课时数
 */
TeachingPlanSchema.pre('save', function(next) {
  if (this.courseAssignments && this.courseAssignments.length > 0) {
    this.totalWeeklyHours = this.courseAssignments.reduce(
      (total, assignment) => total + assignment.weeklyHours, 
      0
    );
  }
  next();
});

/**
 * 中间件：验证连排设置
 */
TeachingPlanSchema.pre('save', function(next) {
  const errors: string[] = [];
  
  this.courseAssignments.forEach((assignment, index) => {
    if (assignment.requiresContinuous && !assignment.continuousHours) {
      errors.push(`课程安排 ${index + 1}: 需要连排时必须指定连排课时数`);
    }
    
    if (assignment.continuousHours && assignment.continuousHours > assignment.weeklyHours) {
      errors.push(`课程安排 ${index + 1}: 连排课时数不能超过每周课时数`);
    }
  });
  
  if (errors.length > 0) {
    return next(new Error(errors.join('; ')));
  }
  
  next();
});

/**
 * 静态方法：查找班级的当前教学计划
 * 
 * Args:
 *   classId: 班级ID
 *   academicYear: 学年
 *   semester: 学期
 * 
 * Returns:
 *   Promise<ITeachingPlan | null>: 教学计划或null
 */
TeachingPlanSchema.statics.findCurrentPlan = function(
  classId: mongoose.Types.ObjectId, 
  academicYear: string, 
  semester: number
) {
  return this.findOne({
    class: classId,
    academicYear,
    semester,
    isActive: true
  }).populate([
    { path: 'class', select: 'name grade' },
    { path: 'courseAssignments.course', select: 'name subject courseCode weeklyHours' },
    { path: 'courseAssignments.teacher', select: 'name employeeId subjects' },
    { path: 'createdBy', select: 'username profile.name' },
    { path: 'updatedBy', select: 'username profile.name' },
    { path: 'approvedBy', select: 'username profile.name' }
  ]);
};

const TeachingPlan = mongoose.model<ITeachingPlan, ITeachingPlanModel>('TeachingPlan', TeachingPlanSchema);

export { TeachingPlan };
export default TeachingPlan;
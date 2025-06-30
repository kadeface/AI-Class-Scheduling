/**
 * 班级数据模型
 * 
 * 定义行政班级的数据结构，包括基本信息、学生数量、固定教室等
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * 班级接口定义
 */
export interface IClass extends Document {
  name: string;
  grade: number;
  studentCount: number;
  homeroom?: mongoose.Types.ObjectId;
  classTeacher?: mongoose.Types.ObjectId;
  academicYear: string;
  semester: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 班级Schema定义
 */
const ClassSchema = new Schema<IClass>({
  name: {
    type: String,
    required: [true, '班级名称不能为空'],
    trim: true,
    maxlength: [100, '班级名称不能超过100个字符']
  },
  
  grade: {
    type: Number,
    required: [true, '年级不能为空'],
    min: [1, '年级不能小于1'],
    max: [12, '年级不能超过12']
  },
  
  studentCount: {
    type: Number,
    required: [true, '学生人数不能为空'],
    min: [1, '学生人数不能小于1'],
    max: [100, '学生人数不能超过100']
  },
  
  homeroom: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    required: false
  },
  
  classTeacher: {
    type: Schema.Types.ObjectId,
    ref: 'Teacher',
    required: false
  },
  
  academicYear: {
    type: String,
    required: [true, '学年不能为空'],
    trim: true,
    match: [/^\d{4}-\d{4}$/, '学年格式应为: 2023-2024']
  },
  
  semester: {
    type: Number,
    required: [true, '学期不能为空'],
    enum: {
      values: [1, 2],
      message: '学期必须是1(上学期)或2(下学期)'
    }
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
ClassSchema.index({ name: 1 }, { unique: true });
ClassSchema.index({ grade: 1, academicYear: 1, semester: 1 });
ClassSchema.index({ isActive: 1 });
ClassSchema.index({ classTeacher: 1 });
ClassSchema.index({ homeroom: 1 });

/**
 * 虚拟字段：班级完整标识
 */
ClassSchema.virtual('fullName').get(function() {
  return `${this.academicYear}学年第${this.semester}学期-${this.name}`;
});

/**
 * 静态方法：根据年级查找班级
 * 
 * Args:
 *   grade: 年级
 *   academicYear: 学年
 *   semester: 学期
 * 
 * Returns:
 *   Promise<IClass[]>: 班级列表
 */
ClassSchema.statics.findByGrade = function(grade: number, academicYear?: string, semester?: number) {
  const query: any = { grade, isActive: true };
  
  if (academicYear) query.academicYear = academicYear;
  if (semester) query.semester = semester;
  
  return this.find(query).populate('homeroom classTeacher');
};

export const Class = mongoose.model<IClass>('Class', ClassSchema);
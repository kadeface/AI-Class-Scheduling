/**
 * 用户数据模型
 * 
 * 定义系统用户的数据结构，包括管理员、教务员、教师等角色
 */

import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * 用户接口定义
 */
export interface IUser extends Document {
  username: string;
  password: string;
  role: 'admin' | 'staff' | 'teacher';
  profile: {
    name: string;
    employeeId?: string;
    email?: string;
    phone?: string;
    department?: string;
  };
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // 方法
  comparePassword(candidatePassword: string): Promise<boolean>;
}

/**
 * 用户Schema定义
 */
const UserSchema = new Schema<IUser>({
  username: {
    type: String,
    required: [true, '用户名不能为空'],
    trim: true,
    minlength: [3, '用户名至少3个字符'],
    maxlength: [50, '用户名不能超过50个字符']
  },
  
  password: {
    type: String,
    required: [true, '密码不能为空'],
    minlength: [6, '密码至少6个字符']
  },
  
  role: {
    type: String,
    required: [true, '用户角色不能为空'],
    enum: {
      values: ['admin', 'staff', 'teacher'],
      message: '用户角色必须是: admin, staff, teacher 中的一个'
    },
    default: 'teacher'
  },
  
  profile: {
    name: {
      type: String,
      required: [true, '姓名不能为空'],
      trim: true,
      maxlength: [50, '姓名不能超过50个字符']
    },
    employeeId: {
      type: String,
      trim: true,
      maxlength: [20, '工号不能超过20个字符']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, '邮箱格式不正确']
    },
    phone: {
      type: String,
      trim: true,
      match: [/^1[3-9]\d{9}$/, '手机号格式不正确']
    },
    department: {
      type: String,
      trim: true,
      maxlength: [100, '部门名称不能超过100个字符']
    }
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true,
  versionKey: false
});

/**
 * 密码加密中间件
 * 在保存用户前自动加密密码
 */
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

/**
 * 密码比较方法
 * 
 * Args:
 *   candidatePassword: 要验证的密码
 * 
 * Returns:
 *   Promise<boolean>: 密码是否匹配
 */
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * 创建索引
 */
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ 'profile.employeeId': 1 });
UserSchema.index({ role: 1, isActive: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
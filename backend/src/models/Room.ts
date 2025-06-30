/**
 * 教室/场室数据模型
 * 
 * 定义各类教学场所的数据结构，包括普通教室、专用教室、体育场地等
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * 教室接口定义
 */
export interface IRoom extends Document {
  name: string;
  roomNumber: string;
  type: string;
  capacity: number;
  building?: string;
  floor?: number;
  equipment: string[];
  assignedClass?: mongoose.Types.ObjectId;
  isActive: boolean;
  unavailableSlots?: {
    dayOfWeek: number;
    periods: number[];
    reason?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 不可用时间段Schema
 */
const UnavailableSlotSchema = new Schema({
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
  }],
  reason: {
    type: String,
    trim: true,
    maxlength: [200, '原因说明不能超过200个字符']
  }
}, { _id: false });

/**
 * 教室Schema定义
 */
const RoomSchema = new Schema<IRoom>({
  name: {
    type: String,
    required: [true, '教室名称不能为空'],
    trim: true,
    maxlength: [100, '教室名称不能超过100个字符']
  },
  
  roomNumber: {
    type: String,
    required: [true, '教室编号不能为空'],
    trim: true,
    maxlength: [50, '教室编号不能超过50个字符']
  },
  
  type: {
    type: String,
    required: [true, '教室类型不能为空'],
    enum: {
      values: [
        '普通教室', '多媒体教室', '实验室', '计算机房', 
        '语音室', '美术室', '音乐室', '舞蹈室', 
        '体育馆', '操场', '图书馆', '会议室'
      ],
      message: '教室类型不在允许的范围内'
    }
  },
  
  capacity: {
    type: Number,
    required: [true, '教室容量不能为空'],
    min: [1, '教室容量不能小于1'],
    max: [500, '教室容量不能超过500']
  },
  
  building: {
    type: String,
    trim: true,
    maxlength: [50, '楼栋名称不能超过50个字符']
  },
  
  floor: {
    type: Number,
    min: [-3, '楼层不能低于-3'],
    max: [50, '楼层不能超过50']
  },
  
  equipment: [{
    type: String,
    trim: true,
    maxlength: [50, '设备名称不能超过50个字符'],
    enum: {
      values: [
        '投影仪', '电脑', '智慧黑板', '音响设备', '空调', 
        '实验台', '显微镜', '钢琴', '体育器材', '网络设备'
      ],
      message: '设备类型不在允许的范围内'
    }
  }],
  
  assignedClass: {
    type: Schema.Types.ObjectId,
    ref: 'Class',
    required: false
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  unavailableSlots: [UnavailableSlotSchema]
}, {
  timestamps: true,
  versionKey: false
});

/**
 * 创建索引
 */
RoomSchema.index({ roomNumber: 1 }, { unique: true });
RoomSchema.index({ type: 1, capacity: 1 });
RoomSchema.index({ building: 1, floor: 1 });
RoomSchema.index({ isActive: 1 });
RoomSchema.index({ assignedClass: 1 });

/**
 * 虚拟字段：教室完整位置
 */
RoomSchema.virtual('fullLocation').get(function() {
  if (this.building && this.floor !== undefined) {
    return `${this.building}${this.floor}楼-${this.name}`;
  }
  return this.name;
});

/**
 * 静态方法：根据类型和容量查找可用教室
 * 
 * Args:
 *   type: 教室类型
 *   minCapacity: 最小容量要求
 *   equipment?: 设备要求
 * 
 * Returns:
 *   Promise<IRoom[]>: 符合条件的教室列表
 */
RoomSchema.statics.findAvailableRooms = function(
  type: string, 
  minCapacity: number, 
  equipment?: string[]
) {
  const query: any = {
    type,
    capacity: { $gte: minCapacity },
    isActive: true
  };
  
  if (equipment && equipment.length > 0) {
    query.equipment = { $all: equipment };
  }
  
  return this.find(query).populate('assignedClass');
};

export const Room = mongoose.model<IRoom>('Room', RoomSchema);
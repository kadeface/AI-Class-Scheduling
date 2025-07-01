/**
 * 场室控制器
 * 
 * 处理场室相关的业务逻辑，包括场室的CRUD操作和场室管理
 */

import { Request, Response } from 'express';
import { Room, IRoom } from '../models/Room';
import { 
  ApiResponse, 
  CreateRoomRequest, 
  UpdateRoomRequest, 
  RoomResponse, 
  RoomQueryOptions, 
  PaginatedResponse 
} from '../types/api';

/**
 * 转换场室对象为响应格式
 * 
 * Args:
 *   room: 场室模型实例或lean对象
 * 
 * Returns:
 *   RoomResponse: 场室响应对象
 */
const transformRoomToResponse = (room: IRoom | any): RoomResponse => {
  return {
    _id: room._id?.toString() || room.id?.toString(),
    name: room.name,
    roomNumber: room.roomNumber,
    type: room.type,
    capacity: room.capacity,
    building: room.building,
    floor: room.floor,
    equipment: room.equipment || [],
    assignedClass: room.assignedClass ? {
      _id: room.assignedClass._id?.toString() || room.assignedClass,
      name: room.assignedClass.name || '',
      grade: room.assignedClass.grade || 0
    } : undefined,
    unavailableSlots: room.unavailableSlots || [],
    isActive: room.isActive,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt
  };
};

/**
 * 创建新场室
 * 
 * Args:
 *   req: Express请求对象，包含CreateRoomRequest数据
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 创建成功返回新场室信息，失败返回错误信息
 */
export const createRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const roomData: CreateRoomRequest = req.body;

    // 检查教室编号是否已存在
    const existingRoom = await Room.findOne({ roomNumber: roomData.roomNumber });
    if (existingRoom) {
      const response: ApiResponse = {
        success: false,
        message: '场室创建失败',
        error: '教室编号已存在'
      };
      res.status(409).json(response);
      return;
    }

    // 创建新场室
    const newRoom = new Room(roomData);
    const savedRoom = await newRoom.save();
    
    // 查询关联数据
    const populatedRoom = await Room.findById(savedRoom._id)
      .populate('assignedClass', 'name grade');

    const response: ApiResponse<RoomResponse> = {
      success: true,
      message: '场室创建成功',
      data: transformRoomToResponse(populatedRoom)
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('创建场室失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '场室创建失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};/**
 * 获取场室列表（支持分页和筛选）
 * 
 * Args:
 *   req: Express请求对象，包含查询参数
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回场室列表或错误信息
 */
export const getRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      keyword,
      type,
      building,
      capacity,
      isActive
    } = req.query;

    // 构建查询条件
    const query: any = {};

    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { roomNumber: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }

    if (type) {
      query.type = type;
    }

    if (building) {
      query.building = building;
    }

    if (capacity) {
      query.capacity = { $gte: Number(capacity) };
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // 构建排序条件
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // 计算跳过的文档数量
    const skip = (Number(page) - 1) * Number(limit);

    // 查询数据
    const [rooms, total] = await Promise.all([
      Room.find(query)
        .populate('assignedClass', 'name grade')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Room.countDocuments(query)
    ]);

    // 转换数据格式
    const transformedRooms = rooms.map(transformRoomToResponse);

    const paginatedResponse: PaginatedResponse<RoomResponse> = {
      items: transformedRooms,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    };

    const response: ApiResponse<PaginatedResponse<RoomResponse>> = {
      success: true,
      message: '场室列表获取成功',
      data: paginatedResponse
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('获取场室列表失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '获取场室列表失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};

/**
 * 根据ID获取单个场室
 * 
 * Args:
 *   req: Express请求对象，包含场室ID参数
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回场室信息或错误信息
 */
export const getRoomById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const room = await Room.findById(id)
      .populate('assignedClass', 'name grade')
      .lean();
    
    if (!room) {
      const response: ApiResponse = {
        success: false,
        message: '场室不存在',
        error: '未找到指定ID的场室'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<RoomResponse> = {
      success: true,
      message: '场室信息获取成功',
      data: transformRoomToResponse(room)
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('获取场室信息失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '获取场室信息失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};

/**
 * 更新场室信息
 * 
 * Args:
 *   req: Express请求对象，包含场室ID和更新数据
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回更新后的场室信息或错误信息
 */
export const updateRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: UpdateRoomRequest = req.body;

    // 检查场室是否存在
    const existingRoom = await Room.findById(id);
    if (!existingRoom) {
      const response: ApiResponse = {
        success: false,
        message: '场室不存在',
        error: '未找到指定ID的场室'
      };
      res.status(404).json(response);
      return;
    }

    // 如果更新房间号，检查是否与其他场室重复
    if (updateData.roomNumber && updateData.roomNumber !== existingRoom.roomNumber) {
      const duplicateRoom = await Room.findOne({
        roomNumber: updateData.roomNumber,
        building: updateData.building || existingRoom.building,
        _id: { $ne: id }
      });
      
      if (duplicateRoom) {
        const response: ApiResponse = {
          success: false,
          message: '场室更新失败',
          error: '该建筑的房间号已存在'
        };
        res.status(409).json(response);
        return;
      }
    }

    // 更新场室信息
    const updatedRoom = await Room.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
      .populate('assignedClass', 'name grade');

    const response: ApiResponse<RoomResponse> = {
      success: true,
      message: '场室更新成功',
      data: transformRoomToResponse(updatedRoom)
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('更新场室失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '场室更新失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};

/**
 * 删除场室（软删除）
 * 
 * Args:
 *   req: Express请求对象，包含场室ID参数
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回删除结果或错误信息
 */
export const deleteRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const room = await Room.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );
    
    if (!room) {
      const response: ApiResponse = {
        success: false,
        message: '场室不存在',
        error: '未找到指定ID的场室'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: '场室删除成功'
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('删除场室失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '删除场室失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};

/**
 * 永久删除场室（硬删除）
 * 
 * Args:
 *   req: Express请求对象，包含场室ID参数
 *   res: Express响应对象
 * 
 * Returns:
 *   Promise<void>: 返回删除结果或错误信息
 */
export const permanentDeleteRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const deletedRoom = await Room.findByIdAndDelete(id);
    
    if (!deletedRoom) {
      const response: ApiResponse = {
        success: false,
        message: '场室不存在',
        error: '未找到指定ID的场室'
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: '场室永久删除成功'
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('永久删除场室失败:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '永久删除场室失败',
      error: error.message || '服务器内部错误'
    };
    
    res.status(500).json(response);
  }
};
/**
 * API响应类型定义
 * 
 * 定义统一的API响应格式和相关类型
 */

/**
 * 统一API响应接口
 * 
 * Args:
 *   T: 响应数据的类型
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * 分页查询参数接口
 */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页响应数据接口
 * 
 * Args:
 *   T: 数据数组中元素的类型
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 用户创建请求接口
 */
export interface CreateUserRequest {
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
}

/**
 * 用户更新请求接口
 */
export interface UpdateUserRequest {
  username?: string;
  role?: 'admin' | 'staff' | 'teacher';
  profile?: {
    name?: string;
    employeeId?: string;
    email?: string;
    phone?: string;
    department?: string;
  };
  isActive?: boolean;
}

/**
 * 用户查询条件接口
 */
export interface UserQueryOptions extends PaginationQuery {
  role?: 'admin' | 'staff' | 'teacher';
  isActive?: string | boolean; // 查询参数为字符串，内部转换为boolean
  department?: string;
  keyword?: string; // 搜索用户名或姓名
}

/**
 * 用户响应数据接口（不包含密码）
 */
export interface UserResponse {
  _id: string;
  username: string;
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
}
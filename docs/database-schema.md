# 数据库模型文档 (DDL)

## 概述
本文档定义了K-12智能排课系统的完整数据模型，包括所有集合的字段定义、类型约束、索引和关联关系。

**重要规则：**
- ⚠️ 开发任何功能前必须先查阅此文档
- ⚠️ 所有数据访问必须考虑字段可能为null的情况
- ⚠️ 修改数据结构时必须同步更新此文档------------

## 1. 用户表 (User)

```typescript
interface IUser {
  _id: ObjectId;
  username: string;           // 必需，唯一，3-50字符
  password: string;           // 必需，加密存储
  email: string;              // 必需，唯一，邮箱格式
  name: string;               // 必需，真实姓名，1-50字符
  role: 'admin' | 'teacher' | 'student'; // 必需，用户角色
  avatar?: string;            // 可选，头像URL
  phone?: string;             // 可选，手机号
  status: 'active' | 'inactive'; // 必需，默认active
  lastLoginAt?: Date;         // 可选，最后登录时间
  createdAt: Date;            // 自动生成
  updatedAt: Date;            // 自动更新
}
```

**索引：**
- `{ username: 1 }` (唯一)
- `{ email: 1 }` (唯一)
- `{ role: 1, status: 1 }`

## 2. 教师表 (Teacher)

```typescript
interface ITeacher {
  _id: ObjectId;
  user?: ObjectId;            // 可选，关联User._id
  name: string;               // 必需，教师姓名，1-50字符
  employeeId: string;         // 必需，唯一，工号
  department: string;         // 必需，所属部门
  position: string;           // 必需，职位
  subjects: string[];         // 必需，教授科目数组，至少1个
  maxHoursPerWeek: number;    // 必需，每周最大课时，1-40
  unavailableSlots?: {        // 可选，不可用时间段
    dayOfWeek: number;        // 1-7
    periods: number[];        // 节次数组
  }[];
  phone?: string;             // 可选，联系电话
  email?: string;             // 可选，邮箱
  status: 'active' | 'inactive'; // 必需，默认active
  createdAt: Date;
  updatedAt: Date;
}
```

**索引：**
- `{ employeeId: 1 }` (唯一)
- `{ subjects: 1 }`
- `{ status: 1 }`

## 3. 班级表 (Class)

```typescript
interface IClass {
  _id: ObjectId;
  name: string;               // 必需，班级名称，唯一
  grade: number;              // 必需，年级，1-12
  studentCount: number;       // 必需，学生人数，1-100
  classTeacher?: ObjectId;    // 可选，班主任，关联Teacher._id
  academicYear: string;       // 必需，学年，格式：2024-2025
  status: 'active' | 'graduated' | 'disbanded'; // 必需
  createdAt: Date;
  updatedAt: Date;
}
```

**索引：**
- `{ name: 1, academicYear: 1 }` (复合唯一)
- `{ grade: 1, academicYear: 1 }`## 4. 课程表 (Course)

```typescript
interface IRoomRequirement {
  types: string[];                    // 必需，教室类型要求数组
  specificRoom?: ObjectId;            // 可选，特定教室要求，关联Room._id
  capacity?: number;                  // 可选，容量要求，1-200
  equipment?: string[];               // 可选，设备要求数组
}

interface ICourse {
  _id: ObjectId;
  name: string;                       // 必需，课程名称，最大100字符
  subject: string;                    // 必需，学科分类，枚举值
  courseCode: string;                 // 必需，唯一，课程编码，3-10位大写字母数字
  weeklyHours: number;                // 必需，每周课时，1-20
  requiresContinuous: boolean;        // 必需，是否需要连排，默认false
  continuousHours?: number;           // 可选，连排课时数，2-8，连排时必需
  roomRequirements: IRoomRequirement; // 必需，教室要求对象
  isWeeklyAlternating?: boolean;      // 可选，是否隔周上课，默认false
  description?: string;               // 可选，课程描述，最大500字符
  isActive: boolean;                  // 必需，是否启用，默认true
  createdAt: Date;
  updatedAt: Date;
}
```

**枚举值：**
- `subject`: 语文、数学、英语、物理、化学、生物、历史、地理、政治、音乐、美术、体育、信息技术、通用技术、心理健康、班会

**索引：**
- `{ courseCode: 1 }` (唯一)
- `{ subject: 1 }`
- `{ isActive: 1 }`
- `{ name: 'text', subject: 'text' }` (全文搜索)

## 5. 教室表 (Room)

```typescript
interface IRoom {
  _id: ObjectId;
  name: string;               // 必需，教室名称，最大100字符
  roomNumber: string;         // 必需，教室编号，唯一，最大50字符
  type: string;               // 必需，教室类型，枚举值
  capacity: number;           // 必需，容纳人数，1-500
  building?: string;          // 可选，所在建筑，最大50字符
  floor?: number;             // 可选，楼层，-3到50
  equipment: string[];        // 必需，设备列表，枚举值数组
  assignedClass?: ObjectId;   // 可选，固定班级，关联Class._id
  isActive: boolean;          // 必需，是否启用，默认true
  unavailableSlots?: {        // 可选，不可用时间段
    dayOfWeek: number;        // 星期，0-6 (0=周日)
    periods: number[];        // 节次数组，1-12
    reason?: string;          // 原因说明，最大200字符
  }[];
  createdAt: Date;
  updatedAt: Date;
}
```

**枚举值：**
- `type`: 普通教室、多媒体教室、实验室、计算机房、语音室、美术室、音乐室、舞蹈室、体育馆、操场、图书馆、会议室
- `equipment`: 投影仪、电脑、智慧黑板、音响设备、空调、实验台、显微镜、钢琴、体育器材、网络设备

**索引：**
- `{ roomNumber: 1 }` (唯一)
- `{ type: 1, capacity: 1 }`
- `{ building: 1, floor: 1 }`
- `{ isActive: 1 }`
- `{ assignedClass: 1 }`## 6. 课程安排表 (Schedule) ⭐ 核心表

```typescript
interface ISchedule {
  _id: ObjectId;
  // === 基础信息 ===
  semester: string;           // 必需，完整学期，格式：2024-2025-1
  academicYear: string;       // 必需，学年，格式：2024-2025
  
  // === 关联外键 ===
  class: ObjectId;            // 必需，关联Class._id
  course: ObjectId;           // 必需，关联Course._id  
  teacher: ObjectId;          // 必需，关联Teacher._id
  room: ObjectId;             // 必需，关联Room._id
  
  // === 时间信息 ===
  dayOfWeek: number;          // 必需，星期，1-7 (1=周一)
  period: number;             // 必需，节次，1-12
  
  // === 扩展信息 ===
  weekType: 'all' | 'odd' | 'even'; // 必需，周次类型，默认all
  startWeek: number;          // 必需，开始周次，1-30，默认1
  endWeek: number;            // 必需，结束周次，1-30，默认20
  status: 'active' | 'suspended' | 'replaced'; // 必需，默认active
  notes?: string;             // 可选，备注，最大500字符
  
  createdAt: Date;
  updatedAt: Date;
}
```

**重要索引：**
- `{ semester: 1, dayOfWeek: 1, period: 1, teacher: 1 }` (唯一，防冲突)
- `{ semester: 1, dayOfWeek: 1, period: 1, class: 1 }` (唯一，防冲突)  
- `{ semester: 1, dayOfWeek: 1, period: 1, room: 1 }` (唯一，防冲突)
- `{ semester: 1, class: 1 }`
- `{ semester: 1, teacher: 1 }`## 🔗 关联关系说明

### 直接外键关联

1. **Schedule → Class/Teacher/Room/Course** (多对一)
   - 每个课程安排必须关联到一个班级、教师、教室、课程

2. **Room → Class** (一对一，可选)
   - 教室可以固定分配给某个班级 (`assignedClass`)

3. **Teacher → User** (一对一，可选)
   - 教师可以关联到用户账户

### 软关联 (通过字段匹配)

1. **Course → Room** (通过类型匹配)
   ```typescript
   // Course的roomRequirements.types 匹配 Room的type
   const matchingRooms = await Room.find({
     type: { $in: course.roomRequirements.types },
     capacity: { $gte: course.roomRequirements.capacity || 1 },
     equipment: { $all: course.roomRequirements.equipment || [] },
     isActive: true
   });
   ```

2. **Course → Room** (特定教室指定)
   ```typescript
   // Course可以直接指定特定教室
   if (course.roomRequirements.specificRoom) {
     const specificRoom = await Room.findById(course.roomRequirements.specificRoom);
   }
   ```

### Populate 模式

```typescript
// Schedule表的完整populate
Schedule.find()
  .populate('class', 'name grade')           // 班级：名称、年级
  .populate('teacher', 'name subjects')      // 教师：姓名、科目
  .populate('room', 'name roomNumber type capacity') // 教室：名称、编号、类型、容量
  .populate('course', 'name subject weeklyHours roomRequirements'); // 课程：完整信息

// Course表的populate（查询特定教室要求）
Course.findById(courseId)
  .populate('roomRequirements.specificRoom', 'name roomNumber type capacity');

// Room表的populate（查询固定班级）
Room.find()
  .populate('assignedClass', 'name grade');
```

### 数据完整性规则

1. **必须存在检查**：所有ObjectId引用在创建前必须验证目标文档存在
2. **级联删除**：删除被引用文档时必须处理或阻止删除
3. **状态一致性**：关联文档状态变更时需要检查影响
4. **教室匹配验证**：创建Schedule时必须验证Course的教室要求与实际分配的Room匹配

## 📋 API响应标准格式

```typescript
// 统一响应格式
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
  };
}

// 分页响应格式
interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}
```## ⚠️ 数据访问安全规则

### 1. 空值检查模式
```typescript
// ❌ 危险的直接访问
const className = schedule.class.name;

// ✅ 安全的访问方式
const className = schedule.class?.name || '未知班级';
```

### 2. 类型守卫函数
```typescript
// 使用类型守卫确保数据完整性
function isValidSchedule(schedule: any): schedule is ISchedule {
  return schedule && 
         schedule.class && 
         schedule.teacher && 
         schedule.room && 
         schedule.course;
}
```

### 3. 数据访问包装函数（即将实现）
```typescript
// 安全的数据访问助手
function getScheduleDisplayName(schedule: ISchedule): string;
function getTeacherSubjects(teacher: ITeacher): string[];
```

## 🚀 开发规范

### 必须遵循的流程：
1. **开发前检查**：每个功能开发前先查阅此DDL文档
2. **类型安全**：使用TypeScript严格模式，避免any类型
3. **空值保护**：所有对象属性访问必须使用可选链操作符(?.)
4. **数据验证**：API接收数据时必须验证完整性
5. **错误处理**：优雅处理数据缺失和关联失效的情况

### 代码审查检查点：
- [ ] 是否查阅了DDL文档？
- [ ] 是否使用了安全的数据访问方式？
- [ ] 是否处理了null/undefined情况？
- [ ] 是否验证了关联数据的存在性？

---

**📅 文档版本：** v1.0  
**📅 最后更新：** 2024年12月  
**👤 维护者：** 开发团队  
**🔄 更新频率：** 每次数据结构变更时必须更新
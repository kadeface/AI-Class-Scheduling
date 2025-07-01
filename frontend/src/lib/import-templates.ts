/**
 * 导入模板定义
 * 
 * 定义各种资源的CSV导入模板、验证规则和示例数据
 */

import { 
  CreateTeacherRequest, 
  CreateClassRequest, 
  CreateCourseRequest, 
  CreateRoomRequest,
  SUBJECTS,
  ROOM_TYPES,
  EQUIPMENT_TYPES
} from './api';

/**
 * 导入模板接口
 */
export interface ImportTemplate<T> {
  name: string;
  headers: string[];
  requiredFields: string[];
  exampleData: Record<string, string>[];
  validator: (rowData: Record<string, string>, rowIndex: number) => { data?: T; errors: string[] };
  formatter: (item: T) => string[];
}

/**
 * 教师导入模板
 */
export const teacherImportTemplate: ImportTemplate<CreateTeacherRequest> = {
  name: '教师信息',
  headers: ['姓名*', '工号*', '任教学科*', '周最大课时*', '备注'],
  requiredFields: ['姓名*', '工号*', '任教学科*', '周最大课时*'],
  exampleData: [
    {
      '姓名*': '张老师',
      '工号*': 'T001',
      '任教学科*': '数学,物理',
      '周最大课时*': '20',
      '备注': '高级教师',
    },
    {
      '姓名*': '李老师',
      '工号*': 'T002',
      '任教学科*': '语文',
      '周最大课时*': '18',
      '备注': '',
    },
  ],
  validator: (rowData, rowIndex) => {
    const errors: string[] = [];
    
    // 验证必填字段
    if (!rowData['姓名*']?.trim()) {
      errors.push('姓名不能为空');
    }
    
    if (!rowData['工号*']?.trim()) {
      errors.push('工号不能为空');
    }
    
    if (!rowData['任教学科*']?.trim()) {
      errors.push('任教学科不能为空');
    }
    
    if (!rowData['周最大课时*']?.trim()) {
      errors.push('周最大课时不能为空');
    }
    
    // 验证数据格式
    const maxWeeklyHours = parseInt(rowData['周最大课时*']);
    if (isNaN(maxWeeklyHours) || maxWeeklyHours < 1 || maxWeeklyHours > 40) {
      errors.push('周最大课时必须是1-40之间的数字');
    }
    
    // 验证学科
    const subjects = rowData['任教学科*']?.split(',').map(s => s.trim()).filter(Boolean) || [];
    const invalidSubjects = subjects.filter(subject => !SUBJECTS.includes(subject));
    if (invalidSubjects.length > 0) {
      errors.push(`无效的学科: ${invalidSubjects.join(', ')}。可选学科: ${SUBJECTS.join(', ')}`);
    }
    
    if (errors.length > 0) {
      return { errors };
    }
    
    const data: CreateTeacherRequest = {
      name: rowData['姓名*'].trim(),
      employeeId: rowData['工号*'].trim(),
      subjects: subjects,
      maxWeeklyHours: maxWeeklyHours,
      unavailableSlots: [],
      preferences: {},
    };
    
    return { data, errors: [] };
  },
  formatter: (item) => [
    item.name,
    item.employeeId,
    item.subjects.join(','),
    item.maxWeeklyHours.toString(),
    '',
  ],
};

/**
 * 班级导入模板
 */
export const classImportTemplate: ImportTemplate<CreateClassRequest> = {
  name: '班级信息',
  headers: ['班级名称*', '年级*', '学生人数*', '学年*', '学期*', '备注'],
  requiredFields: ['班级名称*', '年级*', '学生人数*', '学年*', '学期*'],
  exampleData: [
    {
      '班级名称*': '高一(1)班',
      '年级*': '10',
      '学生人数*': '45',
      '学年*': '2024-2025',
      '学期*': '1',
      '备注': '重点班',
    },
    {
      '班级名称*': '高一(2)班',
      '年级*': '10',
      '学生人数*': '42',
      '学年*': '2024-2025',
      '学期*': '1',
      '备注': '',
    },
  ],
  validator: (rowData, rowIndex) => {
    const errors: string[] = [];
    
    // 验证必填字段
    if (!rowData['班级名称*']?.trim()) {
      errors.push('班级名称不能为空');
    }
    
    if (!rowData['年级*']?.trim()) {
      errors.push('年级不能为空');
    }
    
    if (!rowData['学生人数*']?.trim()) {
      errors.push('学生人数不能为空');
    }
    
    if (!rowData['学年*']?.trim()) {
      errors.push('学年不能为空');
    }
    
    if (!rowData['学期*']?.trim()) {
      errors.push('学期不能为空');
    }
    
    // 验证数据格式
    const grade = parseInt(rowData['年级*']);
    if (isNaN(grade) || grade < 1 || grade > 12) {
      errors.push('年级必须是1-12之间的数字');
    }
    
    const studentCount = parseInt(rowData['学生人数*']);
    if (isNaN(studentCount) || studentCount < 1 || studentCount > 60) {
      errors.push('学生人数必须是1-60之间的数字');
    }
    
    const semester = parseInt(rowData['学期*']);
    if (isNaN(semester) || (semester !== 1 && semester !== 2)) {
      errors.push('学期必须是1或2');
    }
    
    // 验证学年格式
    const academicYear = rowData['学年*'].trim();
    if (!/^\d{4}-\d{4}$/.test(academicYear)) {
      errors.push('学年格式错误，应为YYYY-YYYY格式，如2024-2025');
    }
    
    if (errors.length > 0) {
      return { errors };
    }
    
    const data: CreateClassRequest = {
      name: rowData['班级名称*'].trim(),
      grade: grade,
      studentCount: studentCount,
      academicYear: academicYear,
      semester: semester,
    };
    
    return { data, errors: [] };
  },
  formatter: (item) => [
    item.name,
    item.grade.toString(),
    item.studentCount.toString(),
    item.academicYear,
    item.semester.toString(),
    '',
  ],
};

/**
 * 课程导入模板
 */
export const courseImportTemplate: ImportTemplate<CreateCourseRequest> = {
  name: '课程信息',
  headers: ['课程名称*', '课程代码*', '学科*', '周课时*', '需要连排', '连排课时', '教室类型要求', '设备要求', '描述'],
  requiredFields: ['课程名称*', '课程代码*', '学科*', '周课时*'],
  exampleData: [
    {
      '课程名称*': '高等数学',
      '课程代码*': 'MATH001',
      '学科*': '数学',
      '周课时*': '4',
      '需要连排': '是',
      '连排课时': '2',
      '教室类型要求': '多媒体教室',
      '设备要求': '投影仪,电脑',
      '描述': '基础数学课程',
    },
    {
      '课程名称*': '物理实验',
      '课程代码*': 'PHYS101',
      '学科*': '物理',
      '周课时*': '2',
      '需要连排': '否',
      '连排课时': '',
      '教室类型要求': '实验室',
      '设备要求': '实验台,显微镜',
      '描述': '',
    },
  ],
  validator: (rowData, rowIndex) => {
    const errors: string[] = [];
    
    // 验证必填字段
    if (!rowData['课程名称*']?.trim()) {
      errors.push('课程名称不能为空');
    }
    
    if (!rowData['课程代码*']?.trim()) {
      errors.push('课程代码不能为空');
    }
    
    if (!rowData['学科*']?.trim()) {
      errors.push('学科不能为空');
    }
    
    if (!rowData['周课时*']?.trim()) {
      errors.push('周课时不能为空');
    }
    
    // 验证数据格式
    const weeklyHours = parseInt(rowData['周课时*']);
    if (isNaN(weeklyHours) || weeklyHours < 1 || weeklyHours > 20) {
      errors.push('周课时必须是1-20之间的数字');
    }
    
    // 验证学科
    const subject = rowData['学科*'].trim();
    if (!SUBJECTS.includes(subject)) {
      errors.push(`无效的学科: ${subject}。可选学科: ${SUBJECTS.join(', ')}`);
    }
    
    // 验证连排设置
    const requiresContinuous = rowData['需要连排']?.trim().toLowerCase();
    const isContinuous = requiresContinuous === '是' || requiresContinuous === 'true' || requiresContinuous === '1';
    
    let continuousHours = 2;
    if (isContinuous && rowData['连排课时']) {
      continuousHours = parseInt(rowData['连排课时']);
      if (isNaN(continuousHours) || continuousHours < 2 || continuousHours > 6) {
        errors.push('连排课时必须是2-6之间的数字');
      }
    }
    
    // 验证教室类型
    const roomTypes = rowData['教室类型要求']?.split(',').map(t => t.trim()).filter(Boolean) || [];
    const invalidRoomTypes = roomTypes.filter(type => !ROOM_TYPES.includes(type));
    if (invalidRoomTypes.length > 0) {
      errors.push(`无效的教室类型: ${invalidRoomTypes.join(', ')}。可选类型: ${ROOM_TYPES.join(', ')}`);
    }
    
    // 验证设备要求
    const equipment = rowData['设备要求']?.split(',').map(e => e.trim()).filter(Boolean) || [];
    const invalidEquipment = equipment.filter(eq => !EQUIPMENT_TYPES.includes(eq));
    if (invalidEquipment.length > 0) {
      errors.push(`无效的设备类型: ${invalidEquipment.join(', ')}。可选设备: ${EQUIPMENT_TYPES.join(', ')}`);
    }
    
    if (errors.length > 0) {
      return { errors };
    }
    
    const data: CreateCourseRequest = {
      name: rowData['课程名称*'].trim(),
      courseCode: rowData['课程代码*'].trim(),
      subject: subject,
      weeklyHours: weeklyHours,
      requiresContinuous: isContinuous,
      continuousHours: isContinuous ? continuousHours : undefined,
      roomRequirements: {
        types: roomTypes,
        equipment: equipment,
      },
      description: rowData['描述']?.trim() || undefined,
    };
    
    return { data, errors: [] };
  },
  formatter: (item) => [
    item.name,
    item.courseCode,
    item.subject,
    item.weeklyHours.toString(),
    item.requiresContinuous ? '是' : '否',
    item.continuousHours?.toString() || '',
    item.roomRequirements.types?.join(',') || '',
    item.roomRequirements.equipment?.join(',') || '',
    item.description || '',
  ],
};

/**
 * 场室导入模板
 */
export const roomImportTemplate: ImportTemplate<CreateRoomRequest> = {
  name: '场室信息',
  headers: ['场室名称*', '房间号*', '类型*', '容量*', '建筑', '楼层', '设备', '备注'],
  requiredFields: ['场室名称*', '房间号*', '类型*', '容量*'],
  exampleData: [
    {
      '场室名称*': '多媒体教室1',
      '房间号*': 'A101',
      '类型*': '多媒体教室',
      '容量*': '50',
      '建筑': 'A栋教学楼',
      '楼层': '1',
      '设备': '投影仪,电脑,音响设备',
      '备注': '新装修',
    },
    {
      '场室名称*': '物理实验室',
      '房间号*': 'B201',
      '类型*': '实验室',
      '容量*': '30',
      '建筑': 'B栋实验楼',
      '楼层': '2',
      '设备': '实验台,显微镜',
      '备注': '',
    },
  ],
  validator: (rowData, rowIndex) => {
    const errors: string[] = [];
    
    // 验证必填字段
    if (!rowData['场室名称*']?.trim()) {
      errors.push('场室名称不能为空');
    }
    
    if (!rowData['房间号*']?.trim()) {
      errors.push('房间号不能为空');
    }
    
    if (!rowData['类型*']?.trim()) {
      errors.push('类型不能为空');
    }
    
    if (!rowData['容量*']?.trim()) {
      errors.push('容量不能为空');
    }
    
    // 验证数据格式
    const capacity = parseInt(rowData['容量*']);
    if (isNaN(capacity) || capacity < 1 || capacity > 500) {
      errors.push('容量必须是1-500之间的数字');
    }
    
    // 验证类型
    const type = rowData['类型*'].trim();
    if (!ROOM_TYPES.includes(type)) {
      errors.push(`无效的场室类型: ${type}。可选类型: ${ROOM_TYPES.join(', ')}`);
    }
    
    // 验证楼层
    if (rowData['楼层']) {
      const floor = parseInt(rowData['楼层']);
      if (isNaN(floor) || floor < 1 || floor > 50) {
        errors.push('楼层必须是1-50之间的数字');
      }
    }
    
    // 验证设备
    const equipment = rowData['设备']?.split(',').map(e => e.trim()).filter(Boolean) || [];
    const invalidEquipment = equipment.filter(eq => !EQUIPMENT_TYPES.includes(eq));
    if (invalidEquipment.length > 0) {
      errors.push(`无效的设备类型: ${invalidEquipment.join(', ')}。可选设备: ${EQUIPMENT_TYPES.join(', ')}`);
    }
    
    if (errors.length > 0) {
      return { errors };
    }
    
    const data: CreateRoomRequest = {
      name: rowData['场室名称*'].trim(),
      roomNumber: rowData['房间号*'].trim(),
      type: type,
      capacity: capacity,
      building: rowData['建筑']?.trim() || undefined,
      floor: rowData['楼层'] ? parseInt(rowData['楼层']) : undefined,
      equipment: equipment,
    };
    
    return { data, errors: [] };
  },
  formatter: (item) => [
    item.name,
    item.roomNumber,
    item.type,
    item.capacity.toString(),
    item.building || '',
    item.floor?.toString() || '',
    item.equipment?.join(',') || '',
    '',
  ],
};

/**
 * 获取所有导入模板
 */
export const importTemplates = {
  teacher: teacherImportTemplate,
  class: classImportTemplate,
  course: courseImportTemplate,
  room: roomImportTemplate,
} as const;

export type ImportResourceType = keyof typeof importTemplates;
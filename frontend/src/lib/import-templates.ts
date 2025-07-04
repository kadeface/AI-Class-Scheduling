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
import { safeTrim } from './utils';

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
  headers: [
    '姓名*',         // name
    '工号*',         // employeeId
    '部门*',         // department
    '职务*',         // position
    '任教学科*',     // subjects
    '周最大课时*',   // maxHoursPerWeek
    '状态*',         // status
    '备注',          // 可选
  ],
  requiredFields: [
    '姓名*', '工号*', '部门*', '职务*', '任教学科*', '周最大课时*', '状态*'
  ],
  exampleData: [
    {
      '姓名*': '张老师',
      '工号*': 'T001',
      '部门*': '数学组',
      '职务*': '高级教师',
      '任教学科*': '数学,物理',
      '周最大课时*': '20',
      '状态*': 'true',
      '备注': '骨干教师',
    },
  ],
  validator: (rowData, rowIndex) => {
    const errors: string[] = [];
    
    // 验证必填字段
    if (!safeTrim(rowData['姓名*'])) {
      errors.push('姓名不能为空');
    }
    
    if (!safeTrim(rowData['工号*'])) {
      errors.push('工号不能为空');
    }
    
    if (!safeTrim(rowData['部门*'])) {
      errors.push('部门不能为空');
    }
    
    if (!safeTrim(rowData['职务*'])) {
      errors.push('职务不能为空');
    }
    
    if (!safeTrim(rowData['任教学科*'])) {
      errors.push('任教学科不能为空');
    }
    
    if (!safeTrim(rowData['周最大课时*'])) {
      errors.push('周最大课时不能为空');
    }
    
    if (!safeTrim(rowData['状态*'])) {
      errors.push('状态不能为空');
    }
    
    // 验证数据格式
    const maxWeeklyHours = parseInt(safeTrim(rowData['周最大课时*']));
    if (isNaN(maxWeeklyHours) || maxWeeklyHours < 1 || maxWeeklyHours > 40) {
      errors.push('周最大课时必须是1-40之间的数字');
    }
    
    // 验证学科
    const subjects = safeTrim(rowData['任教学科*'])
      .split(',')
      .map(safeTrim)
      .filter(Boolean);
    const invalidSubjects = subjects.filter(subject => !SUBJECTS.includes(subject));
    if (invalidSubjects.length > 0) {
      errors.push(`无效的学科: ${invalidSubjects.join(', ')}。可选学科: ${SUBJECTS.join(', ')}`);
    }
    
    if (errors.length > 0) {
      return { errors };
    }
    
    const data: CreateTeacherRequest = {
      name: safeTrim(rowData['姓名*']),
      employeeId: safeTrim(rowData['工号*']),
      department: safeTrim(rowData['部门*']),
      position: safeTrim(rowData['职务*']),
      subjects: subjects,
      maxWeeklyHours: maxWeeklyHours,
      status: safeTrim(rowData['状态*']),
      unavailableSlots: [],
      preferences: {},
    };
    
    return { data, errors: [] };
  },
  formatter: (item) => [
    item.name,
    item.employeeId,
    item.department,
    item.position,
    item.subjects.join(','),
    item.maxWeeklyHours.toString(),
    item.status,
    '',
  ],
};

/**
 * 班级导入模板
 */
export const classImportTemplate: ImportTemplate<CreateClassRequest> = {
  name: '班级信息',
  headers: [
    '班级名称*',     // name
    '年级*',         // grade
    '学生人数*',     // studentCount
    '学年*',         // academicYear
    '状态*',         // status
    '班主任',        // classTeacher（可选）
    '备注',          // 可选
  ],
  requiredFields: [
    '班级名称*', '年级*', '学生人数*', '学年*', '状态*'
  ],
  exampleData: [
    {
      '班级名称*': '高一(1)班',
      '年级*': '10',
      '学生人数*': '45',
      '学年*': '2024-2025',
      '状态*': 'true',
      '班主任': '张老师',
      '备注': '重点班',
    },
  ],
  validator: (rowData, rowIndex) => {
    const errors: string[] = [];
    
    // 验证必填字段
    if (!safeTrim(rowData['班级名称*'])) {
      errors.push('班级名称不能为空');
    }
    
    if (!safeTrim(rowData['年级*'])) {
      errors.push('年级不能为空');
    }
    
    if (!safeTrim(rowData['学生人数*'])) {
      errors.push('学生人数不能为空');
    }
    
    if (!safeTrim(rowData['学年*'])) {
      errors.push('学年不能为空');
    }
    
    if (!safeTrim(rowData['状态*'])) {
      errors.push('状态不能为空');
    }
    
    // 验证数据格式
    const grade = parseInt(safeTrim(rowData['年级*']));
    if (isNaN(grade) || grade < 1 || grade > 12) {
      errors.push('年级必须是1-12之间的数字');
    }
    
    const studentCount = parseInt(safeTrim(rowData['学生人数*']));
    if (isNaN(studentCount) || studentCount < 1 || studentCount > 60) {
      errors.push('学生人数必须是1-60之间的数字');
    }
    
    // 验证学年格式
    const academicYear = safeTrim(rowData['学年*']);
    if (!/^\d{4}-\d{4}$/.test(academicYear)) {
      errors.push('学年格式错误，应为YYYY-YYYY格式，如2024-2025');
    }
    
    if (errors.length > 0) {
      return { errors };
    }
    
    const data: CreateClassRequest = {
      name: safeTrim(rowData['班级名称*']),
      grade: grade,
      studentCount: studentCount,
      academicYear: academicYear,
      semester: 1,
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
export const courseImportTemplate: ImportTemplate<Record<string, string>> = {
  name: '课程信息',
  headers: [
    '课程名称*',         // name
    '课程代码*',         // courseCode
    '学科*',             // subject
    '周课时*',           // weeklyHours
    '需要连排*',         // requiresContinuous
    '连排课时',          // continuousHours（可选）
    '教室类型要求',      // roomRequirements.types（可选）
    '设备要求',          // roomRequirements.equipment（可选）
    '描述',              // 可选
  ],
  requiredFields: [
    '课程名称*', '课程代码*', '学科*', '周课时*', '需要连排*'
  ],
  exampleData: [
    {
      '课程名称*': '一年级数学',
      '课程代码*': 'MATH001',
      '学科*': '数学',
      '周课时*': '4',
      '需要连排*': '是',
      '连排课时': '2',
      '教室类型要求': '多媒体教室',
      '设备要求': '投影仪,电脑',
      '描述': '基础数学课程',
    },
  ],
  validator: (rowData, rowIndex) => {
    const errors: string[] = [];
    
    // 验证必填字段
    if (!safeTrim(rowData['课程名称*'])) {
      errors.push('课程名称不能为空');
    }
    
    if (!safeTrim(rowData['课程代码*'])) {
      errors.push('课程代码不能为空');
    }
    
    if (!safeTrim(rowData['学科*'])) {
      errors.push('学科不能为空');
    }
    
    if (!safeTrim(rowData['周课时*'])) {
      errors.push('周课时不能为空');
    }
    
    // 验证数据格式
    const weeklyHours = parseInt(safeTrim(rowData['周课时*']));
    if (isNaN(weeklyHours) || weeklyHours < 1 || weeklyHours > 20) {
      errors.push('周课时必须是1-20之间的数字');
    }
    
    // 验证学科
    const subject = safeTrim(rowData['学科*']);
    if (!SUBJECTS.includes(subject)) {
      errors.push(`无效的学科: ${subject}。可选学科: ${SUBJECTS.join(', ')}`);
    }
    
    // 验证连排设置
    const requiresContinuous = safeTrim(rowData['需要连排*'])?.toLowerCase();
    const isContinuous = requiresContinuous === '是' || requiresContinuous === 'true' || requiresContinuous === '1';
    
    let continuousHours = 2;
    if (isContinuous && rowData['连排课时']) {
      continuousHours = parseInt(safeTrim(rowData['连排课时']));
      if (isNaN(continuousHours) || continuousHours < 2 || continuousHours > 6) {
        errors.push('连排课时必须是2-6之间的数字');
      }
    }
    
    // 验证教室类型
    const roomTypes = safeTrim(rowData['教室类型要求'])?.split(',').map(safeTrim).filter(Boolean) || [];
    const invalidRoomTypes = roomTypes.filter(type => !ROOM_TYPES.includes(type));
    if (invalidRoomTypes.length > 0) {
      errors.push(`无效的教室类型: ${invalidRoomTypes.join(', ')}。可选类型: ${ROOM_TYPES.join(', ')}`);
    }
    
    // 验证设备要求
    const equipment = safeTrim(rowData['设备要求'])?.split(',').map(safeTrim).filter(Boolean) || [];
    const invalidEquipment = equipment.filter(eq => !EQUIPMENT_TYPES.includes(eq));
    if (invalidEquipment.length > 0) {
      errors.push(`无效的设备类型: ${invalidEquipment.join(', ')}。可选设备: ${EQUIPMENT_TYPES.join(', ')}`);
    }
    
    if (errors.length > 0) {
      return { errors };
    }
    
    // 只返回拍平字段
    const data = {
      '课程名称*': safeTrim(rowData['课程名称*']),
      '课程代码*': safeTrim(rowData['课程代码*']),
      '学科*': subject,
      '周课时*': weeklyHours.toString(),
      '需要连排*': isContinuous ? '是' : '否',
      '连排课时': isContinuous ? continuousHours.toString() : '',
      '教室类型要求': roomTypes.join(','),
      '设备要求': equipment.join(','),
      '描述': safeTrim(rowData['描述']) || '',
    };
    
    return { data, errors: [] };
  },
  formatter: (item: any) => [
    item['课程名称*'],
    item['课程代码*'],
    item['学科*'],
    item['周课时*'],
    item['需要连排*'],
    item['连排课时'],
    item['教室类型要求'],
    item['设备要求'],
    item['描述'],
  ],
};

/**
 * 场室导入模板
 */
export const roomImportTemplate: ImportTemplate<CreateRoomRequest> = {
  name: '场室信息',
  headers: [
    '场室名称*',     // name
    '房间号*',       // roomNumber
    '类型*',         // type
    '容量*',         // capacity
    '状态*',         // status
    '建筑',          // building（可选）
    '楼层',          // floor（可选）
    '设备',          // equipment（可选）
    '备注',          // 可选
  ],
  requiredFields: [
    '场室名称*', '房间号*', '类型*', '容量*', '状态*'
  ],
  exampleData: [
    {
      '场室名称*': '多媒体教室1',
      '房间号*': 'A101',
      '类型*': '多媒体教室',
      '容量*': '50',
      '状态*': 'true',
      '建筑': 'A栋教学楼',
      '楼层': '1',
      '设备': '投影仪,电脑,音响设备',
      '备注': '新装修',
    },
  ],
  validator: (rowData, rowIndex) => {
    const errors: string[] = [];
    
    // 验证必填字段
    if (!safeTrim(rowData['场室名称*'])) {
      errors.push('场室名称不能为空');
    }
    
    if (!safeTrim(rowData['房间号*'])) {
      errors.push('房间号不能为空');
    }
    
    if (!safeTrim(rowData['类型*'])) {
      errors.push('类型不能为空');
    }
    
    if (!safeTrim(rowData['容量*'])) {
      errors.push('容量不能为空');
    }
    
    if (!safeTrim(rowData['状态*'])) {
      errors.push('状态不能为空');
    }
    
    // 验证数据格式
    const capacity = parseInt(safeTrim(rowData['容量*']));
    if (isNaN(capacity) || capacity < 1 || capacity > 500) {
      errors.push('容量必须是1-500之间的数字');
    }
    
    // 验证类型
    const type = safeTrim(rowData['类型*']);
    if (!ROOM_TYPES.includes(type)) {
      errors.push(`无效的场室类型: ${type}。可选类型: ${ROOM_TYPES.join(', ')}`);
    }
    
    // 验证楼层
    if (rowData['楼层']) {
      const floor = parseInt(safeTrim(rowData['楼层']));
      if (isNaN(floor) || floor < 1 || floor > 50) {
        errors.push('楼层必须是1-50之间的数字');
      }
    }
    
    // 验证设备
    const equipment = safeTrim(rowData['设备'])?.split(',').map(safeTrim).filter(Boolean) || [];
    const invalidEquipment = equipment.filter(eq => !EQUIPMENT_TYPES.includes(eq));
    if (invalidEquipment.length > 0) {
      errors.push(`无效的设备类型: ${invalidEquipment.join(', ')}。可选设备: ${EQUIPMENT_TYPES.join(', ')}`);
    }
    
    if (errors.length > 0) {
      return { errors };
    }
    
    const data: CreateRoomRequest = {
      name: safeTrim(rowData['场室名称*']),
      roomNumber: safeTrim(rowData['房间号*']),
      type: type,
      capacity: capacity,
      building: safeTrim(rowData['建筑']) || undefined,
      floor: rowData['楼层'] ? parseInt(safeTrim(rowData['楼层'])) : undefined,
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

export const teacherFieldDescriptions = {
  '姓名*': '必填，教师姓名',
  '工号*': '必填，唯一工号',
  '部门*': '必填，所属部门/教研组',
  '职务*': '必填，如"高级教师"',
  '任教学科*': '必填，多个学科用英文逗号分隔',
  '周最大课时*': '必填，1-40之间的数字',
  '状态*': '必填，true=在职，false=离职',
  '备注': '可选，其他说明',
};
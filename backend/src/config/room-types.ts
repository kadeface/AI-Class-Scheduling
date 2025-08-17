/**
 * 教室类型配置文件
 * 
 * 定义各种课程类型与教室类型的映射关系，用于智能教室分配
 */

/**
 * 课程类型到教室类型的映射
 */
export const COURSE_TO_ROOM_TYPE_MAP = {
  // 体育类课程
  '体育': ['gym', 'sports', 'playground', '体育场', '体育馆', '操场'],
  'pe': ['gym', 'sports', 'playground', '体育场', '体育馆', '操场'],
  'physical': ['gym', 'sports', 'playground', '体育场', '体育馆', '操场'],
  'gym': ['gym', 'sports', 'playground', '体育场', '体育馆', '操场'],
  'sports': ['gym', 'sports', 'playground', '体育场', '体育馆', '操场'],
  'athletics': ['gym', 'sports', 'playground', '体育场', '体育馆', '操场'],
  
  // 音乐类课程
  '音乐': ['music', 'art', '音乐室', '艺术室', '琴房'],
  'music': ['music', 'art', '音乐室', '艺术室', '琴房'],
  '声乐': ['music', 'art', '音乐室', '艺术室', '琴房'],
  '器乐': ['music', 'art', '音乐室', '艺术室', '琴房'],
  
  // 美术类课程
  '美术': ['art', '美术室', '画室', '艺术室'],
  'art': ['art', '美术室', '画室', '艺术室'],
  '绘画': ['art', '美术室', '画室', '艺术室'],
  '素描': ['art', '美术室', '画室', '艺术室'],
  '水彩': ['art', '美术室', '画室', '艺术室'],
  '油画': ['art', '美术室', '画室', '艺术室'],
  
  // 舞蹈类课程
  '舞蹈': ['dance', 'art', '舞蹈室', '艺术室', '练功房'],
  'dance': ['dance', 'art', '舞蹈室', '艺术室', '练功房'],
  '芭蕾': ['dance', 'art', '舞蹈室', '艺术室', '练功房'],
  '民族舞': ['dance', 'art', '舞蹈室', '艺术室', '练功房'],
  
  // 信息技术类课程
  '信息技术': ['computer', 'lab', '机房', '计算机室', '多媒体教室'],
  'computer': ['computer', 'lab', '机房', '计算机室', '多媒体教室'],
  '编程': ['computer', 'lab', '机房', '计算机室', '多媒体教室'],
  'programming': ['computer', 'lab', '机房', '计算机室', '多媒体教室'],
  '通用技术': ['tech', 'lab', '技术室', '创客空间'],
  'tech': ['tech', 'lab', '技术室', '创客空间'],
  
  // 实验类课程
  '实验': ['lab', 'laboratory', '实验室', '实验楼'],
  'lab': ['lab', 'laboratory', '实验室', '实验楼'],
  'laboratory': ['lab', 'laboratory', '实验室', '实验楼'],
  '化学实验': ['chemistry', 'lab', '化学实验室', '实验楼'],
  '物理实验': ['physics', 'lab', '物理实验室', '实验楼'],
  '生物实验': ['biology', 'lab', '生物实验室', '实验楼'],
  
  // 手工类课程
  '手工': ['handcraft', 'craft', '手工室', '工艺室'],
  'handcraft': ['handcraft', 'craft', '手工室', '工艺室'],
  'craft': ['handcraft', 'craft', '手工室', '工艺室'],
  '木工': ['woodwork', 'craft', '木工室', '工艺室'],
  'woodwork': ['woodwork', 'craft', '木工室', '工艺室'],
  '金工': ['metalwork', 'craft', '金工室', '工艺室'],
  'metalwork': ['metalwork', 'craft', '金工室', '工艺室'],
  
  // 心理健康类课程
  '心理健康': ['counseling', '心理室', '咨询室', '普通教室'],
  'counseling': ['counseling', '心理室', '咨询室', '普通教室'],
  '心理': ['counseling', '心理室', '咨询室', '普通教室'],
  '心理健康教育': ['counseling', '心理室', '咨询室', '普通教室'],
  
  // 班会类课程
  '班会': ['classroom', '普通教室', '行政班教室'],
  '班会课': ['classroom', '普通教室', '行政班教室'],
  
  // 品德类课程
  '品德': ['classroom', '普通教室', '道德讲堂'],
  '道德': ['classroom', '普通教室', '道德讲堂'],
  '思想品德': ['classroom', '普通教室', '道德讲堂'],
  
  // 生活技能类课程
  '生活技能': ['life', 'skill', '生活技能室', '普通教室'],
  'life': ['life', 'skill', '生活技能室', '普通教室'],
  'skill': ['life', 'skill', '生活技能室', '普通教室'],
  
  // 综合实践类课程
  '综合实践': ['practical', '实践室', '活动室', '普通教室'],
  'practical': ['practical', '实践室', '活动室', '普通教室'],
  '实践活动': ['practical', '实践室', '活动室', '普通教室']
};

/**
 * 教室类型优先级配置
 * 
 * 定义不同类型教室的优先级，数值越高优先级越高
 */
export const ROOM_TYPE_PRIORITY: Record<string, number> = {
  // 专业教室 - 最高优先级
  'gym': 100,
  'sports': 100,
  'playground': 100,
  '体育场': 100,
  '体育馆': 100,
  '操场': 100,
  
  'music': 95,
  '音乐室': 95,
  'art': 90,
  '美术室': 90,
  '画室': 90,
  '艺术室': 90,
  
  'computer': 85,
  '机房': 85,
  '计算机室': 85,
  '多媒体教室': 85,
  
  'lab': 80,
  'laboratory': 80,
  '实验室': 80,
  '实验楼': 80,
  
  // 普通教室 - 中等优先级
  'classroom': 50,
  '普通教室': 50,
  '行政班教室': 50,
  
  // 备用教室 - 较低优先级
  '备用教室': 30,
  '临时教室': 20
};

/**
 * 获取课程对应的教室类型列表
 * 
 * Args:
 *   courseName: 课程名称
 *   subject: 科目名称
 * 
 * Returns:
 *   string[]: 适合的教室类型列表
 */
export function getRoomTypesForCourse(courseName: string, subject: string): string[] {
  const lowerCourseName = courseName.toLowerCase();
  const lowerSubject = subject.toLowerCase();
  
  // 遍历映射表，查找匹配的课程类型
  for (const [courseType, roomTypes] of Object.entries(COURSE_TO_ROOM_TYPE_MAP)) {
    if (lowerCourseName.includes(courseType.toLowerCase()) || 
        lowerSubject.includes(courseType.toLowerCase())) {
      return roomTypes;
    }
  }
  
  // 如果没有找到匹配，返回默认教室类型
  return ['classroom', '普通教室'];
}

/**
 * 计算教室的匹配度评分
 * 
 * Args:
 *   room: 教室信息
 *   courseName: 课程名称
 *   subject: 科目名称
 * 
 * Returns:
 *   number: 匹配度评分 (0-100)
 */
export function calculateRoomMatchScore(room: any, courseName: string, subject: string): number {
  const targetRoomTypes = getRoomTypesForCourse(courseName, subject);
  const roomType = room.type || '';
  
  // 检查教室类型是否匹配
  if (targetRoomTypes.includes(roomType)) {
    // 类型匹配，给予高分
    const baseScore = 80;
    const priorityBonus = ROOM_TYPE_PRIORITY[roomType] || 50;
    return Math.min(100, baseScore + (priorityBonus - 50) * 0.4);
  }
  
  // 类型不匹配，给予低分
  return 20;
}

/**
 * 判断是否为特殊课程
 * 
 * Args:
 *   courseName: 课程名称
 *   subject: 科目名称
 * 
 * Returns:
 *   boolean: 是否为特殊课程
 */
export function isSpecialCourse(courseName: string, subject: string): boolean {
  const lowerCourseName = courseName.toLowerCase();
  const lowerSubject = subject.toLowerCase();
  
  // 特殊课程关键词列表
  const specialKeywords = [
    '体育', 'pe', 'physical', 'gym', 'sports', 'athletics',
    '音乐', '美术', '舞蹈', 'art', 'music', 'dance',
    '信息技术', 'computer', 'tech', 'programming', '编程',
    '实验', 'lab', 'laboratory', 'practical',
    '手工', 'handcraft', 'craft', 'woodwork', 'metalwork',
    '心理健康', '心理', 'counseling'
  ];
  
  for (const keyword of specialKeywords) {
    if (lowerCourseName.includes(keyword.toLowerCase()) || 
        lowerSubject.includes(keyword.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

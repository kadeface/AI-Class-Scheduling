import mongoose from 'mongoose';

/**
 * K12约束检测器
 * 
 * 核心功能：
 * 1. 硬约束检测（教师冲突、班级时间冲突）
 * 2. 软约束评分（主科分散、教师工作量等）
 * 3. 约束违反统计
 */
export class K12ConstraintChecker {

  /**
   * 检查所有约束
   * 
   * @param variable 排课变量
   * @param timeSlot 时间槽
   * @param room 课室
   * @param currentAssignments 当前所有分配
   * @returns 是否满足所有约束
   */
  checkConstraints(
    variable: any, 
    timeSlot: any, 
    room: any, 
    currentAssignments: Map<string, any>
  ): boolean {
    //console.log(`         🔍 [约束检测] 检查变量 ${variable.id} 的约束...`);

    // 检查硬约束
    if (!this.checkHardConstraints(variable, timeSlot, room, currentAssignments)) {
      console.log(`         ❌ 硬约束检查失败`);
      return false;
    }

    // 检查软约束（不阻止排课，但影响评分）
    const softConstraintScore = this.checkSoftConstraints(variable, timeSlot, room, currentAssignments);
   // console.log(`         📊 软约束评分: ${softConstraintScore}`);

   // console.log(`         ✅ 约束检查通过`);
    return true;
  }

  /**
   * 检查硬约束（必须满足）
   * 
   * @param variable 排课变量
   * @param timeSlot 时间槽
   * @param room 课室
   * @param currentAssignments 当前所有分配
   * @returns 是否满足硬约束
   */
  private checkHardConstraints(
    variable: any, 
    timeSlot: any, 
    room: any, 
    currentAssignments: Map<string, any>
  ): boolean {
    //console.log(`            🔍 [硬约束] 检查硬约束...`);

    // 1. 教师冲突检测：教师不可同时在两个班上课
    if (this.checkTeacherConflict(variable, timeSlot, currentAssignments)) {
      console.log(`               ❌ 硬约束违反: 教师冲突`);
      return false;
    }

    // 2. 班级时间冲突检测：同一班级不能在同一时间槽安排多门课
    if (this.checkClassTimeConflict(variable, timeSlot, currentAssignments)) {
      console.log(`               ❌ 硬约束违反: 班级时间冲突`);
      return false;
    }

    // 3. 课室冲突检测：同一课室不能在同一时间槽安排多门课
    if (this.checkRoomConflict(variable, timeSlot, room, currentAssignments)) {
      console.log(`               ❌ 硬约束违反: 课室冲突`);
      return false;
    }

    // 4. 课室要求检测：课室必须满足课程的基本要求
    if (!this.checkRoomRequirements(variable, room)) {
      console.log(`               ❌ 硬约束违反: 课室要求不满足`);
      return false;
    }

    // 5. 副科一天一节检测：副科每天最多1节
    if (!this.checkElectiveSubjectDailyLimit(variable, timeSlot, currentAssignments)) {
      console.log(`               ❌ 硬约束违反: 副科一天一节限制`);
      return false;
    }

    //console.log(`               ✅ 硬约束检查通过`);
    return true;
  }

  /**
   * 检查软约束（尽量满足）
   * 
   * @param variable 排课变量
   * @param timeSlot 时间槽
   * @param room 课室
   * @param currentAssignments 当前所有分配
   * @returns 软约束评分（0-100，越高越好）
   */
  private checkSoftConstraints(
    variable: any, 
    timeSlot: any, 
    room: any, 
    currentAssignments: Map<string, any>
  ): number {
   // console.log(`            🔍 [软约束] 计算软约束评分...`);

    let totalScore = 0;
    let maxScore = 0;

    // 1. 主科分散度评分（主科应该分散在不同时间段）
    const dispersionScore = this.calculateSubjectDispersionScore(variable, timeSlot, currentAssignments);
    totalScore += dispersionScore;
    maxScore += 25;

    // 2. 教师工作量平衡评分
    const workloadScore = this.calculateTeacherWorkloadScore(variable, timeSlot, currentAssignments);
    totalScore += workloadScore;
    maxScore += 25;

    // 3. 学生疲劳度评分（避免连续排课）
    const fatigueScore = this.calculateStudentFatigueScore(variable, timeSlot, currentAssignments);
    totalScore += fatigueScore;
    maxScore += 25;

    // 4. 课程分布均匀性评分
    const distributionScore = this.calculateCourseDistributionScore(variable, timeSlot, currentAssignments);
    totalScore += distributionScore;
    maxScore += 25;

    const finalScore = Math.round((totalScore / maxScore) * 100);
    //console.log(`               📊 软约束评分详情:`);
    //console.log(`                  - 主科分散度: ${dispersionScore}/25`);
    //console.log(`                  - 教师工作量: ${workloadScore}/25`);
    //console.log(`                  - 学生疲劳度: ${fatigueScore}/25`);
    //console.log(`                  - 课程分布: ${distributionScore}/25`);
    //console.log(`                  - 总分: ${finalScore}/100`);

    return finalScore;
  }

  /**
   * 检查教师冲突
   */
  private checkTeacherConflict(variable: any, timeSlot: any, currentAssignments: Map<string, any>): boolean {
    for (const assignment of Array.from(currentAssignments.values())) {
      if (assignment.teacherId.toString() === variable.teacherId.toString() &&
          assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
          assignment.timeSlot.period === timeSlot.period) {
        console.log(`                  ❌ 教师冲突: 教师 ${variable.teacherId} 在时间槽 ${timeSlot.dayOfWeek}-${timeSlot.period} 已有课程`);
        return true;
      }
    }
    return false;
  }

  /**
   * 检查班级时间冲突
   */
  private checkClassTimeConflict(variable: any, timeSlot: any, currentAssignments: Map<string, any>): boolean {
    for (const assignment of Array.from(currentAssignments.values())) {
      if (assignment.classId.toString() === variable.classId.toString() &&
          assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
          assignment.timeSlot.period === timeSlot.period) {
        console.log(`                  ❌ 班级时间冲突: 班级 ${variable.classId} 在时间槽 ${timeSlot.dayOfWeek}-${timeSlot.period} 已有课程`);
        return true;
      }
    }
    return false;
  }

  /**
   * 检查课室冲突
   */
  private checkRoomConflict(variable: any, timeSlot: any, room: any, currentAssignments: Map<string, any>): boolean {
    for (const assignment of Array.from(currentAssignments.values())) {
      if (assignment.roomId.toString() === room._id.toString() &&
          assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
          assignment.timeSlot.period === timeSlot.period) {
        console.log(`                  ❌ 课室冲突: 课室 ${room._id} 在时间槽 ${timeSlot.dayOfWeek}-${timeSlot.period} 已被占用`);
        return true;
      }
    }
    return false;
  }

  /**
   * 检查课室要求
   */
  private checkRoomRequirements(variable: any, room: any): boolean {
    //console.log(`               🔍 [课室要求] 检查课室 ${room._id} 是否满足课程要求...`);
    
    try {
      // 基本课室信息检查
      if (!room || !room._id) {
        console.log(`                  ❌ 课室信息无效`);
        return false;
      }

      // 课室状态检查
      if (room.isActive === false) {
        console.log(`                  ❌ 课室未激活`);
        return false;
      }

      // 课室类型检查（如果有课程要求）
      if (variable.course && variable.course.roomRequirements && variable.course.roomRequirements.types) {
        const requiredTypes = variable.course.roomRequirements.types;
        const roomType = room.type || room.roomType;
        
        if (!requiredTypes.includes(roomType)) {
          console.log(`                  ❌ 课室类型不匹配: 需要 ${requiredTypes.join(', ')}, 课室类型 ${roomType}`);
          return false;
        }
        console.log(`                  ✅ 课室类型匹配: ${roomType}`);
      }

      // 课室容量检查（如果有课程要求）
      if (variable.course && variable.course.roomRequirements && variable.course.roomRequirements.capacity) {
        const requiredCapacity = variable.course.roomRequirements.capacity;
        const roomCapacity = room.capacity || 0;
        
        if (roomCapacity < requiredCapacity) {
          console.log(`                  ❌ 课室容量不足: 需要 ${requiredCapacity}, 课室容量 ${roomCapacity}`);
          return false;
        }
        console.log(`                  ✅ 课室容量满足: ${roomCapacity} >= ${requiredCapacity}`);
      }

      // 课室设备检查（如果有课程要求）
      if (variable.course && variable.course.roomRequirements && variable.course.roomRequirements.equipment) {
        const requiredEquipment = variable.course.roomRequirements.equipment;
        const roomEquipment = room.equipment || [];
        
        const missingEquipment = requiredEquipment.filter(
          (req: string) => !roomEquipment.includes(req)
        );
        
        if (missingEquipment.length > 0) {
          console.log(`                  ⚠️ 课室设备不完整: 缺少 ${missingEquipment.join(', ')}`);
          // 设备要求不是硬约束，只记录警告
        } else {
          console.log(`                  ✅ 课室设备满足要求`);
        }
      }

      //console.log(`                  ✅ 课室要求检查通过`);
      return true;

    } catch (error) {
      console.error(`                  ❌ 课室要求检查过程中发生错误:`, error);
      // 发生错误时，为了不阻止排课，返回true
      return true;
    }
  }

  /**
   * 计算主科分散度评分
   */
  private calculateSubjectDispersionScore(variable: any, timeSlot: any, currentAssignments: Map<string, any>): number {
    const coreSubjects = ['语文', '数学', '英语'];
    if (!coreSubjects.includes(variable.subject)) {
      return 25; // 非主科满分
    }

    // 统计同一天内主科的数量
    const sameDayCoreSubjects = Array.from(currentAssignments.values())
      .filter(assignment => 
        assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
        coreSubjects.includes(assignment.subject)
      ).length;

    // 主科越分散，分数越高
    if (sameDayCoreSubjects === 0) return 25;
    if (sameDayCoreSubjects === 1) return 20;
    if (sameDayCoreSubjects === 2) return 15;
    if (sameDayCoreSubjects === 3) return 10;
    return 5;
  }

  /**
   * 计算教师工作量评分
   */
  private calculateTeacherWorkloadScore(variable: any, timeSlot: any, currentAssignments: Map<string, any>): number {
    // 统计该教师当天的课程数量
    const sameDayTeacherCourses = Array.from(currentAssignments.values())
      .filter(assignment => 
        assignment.teacherId.toString() === variable.teacherId.toString() &&
        assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek
      ).length;

    // 教师每天课程越少，分数越高
    if (sameDayTeacherCourses === 0) return 25;
    if (sameDayTeacherCourses === 1) return 20;
    if (sameDayTeacherCourses === 2) return 15;
    if (sameDayTeacherCourses === 3) return 10;
    if (sameDayTeacherCourses === 4) return 5;
    return 0;
  }

  /**
   * 计算学生疲劳度评分
   */
  private calculateStudentFatigueScore(variable: any, timeSlot: any, currentAssignments: Map<string, any>): number {
    // 统计该班级连续课程的情况
    const classAssignments = Array.from(currentAssignments.values())
      .filter(assignment => assignment.classId.toString() === variable.classId.toString())
      .sort((a, b) => {
        if (a.timeSlot.dayOfWeek !== b.timeSlot.dayOfWeek) {
          return a.timeSlot.dayOfWeek - b.timeSlot.dayOfWeek;
        }
        return a.timeSlot.period - b.timeSlot.period;
      });

    // 检查是否有连续课程
    let consecutiveCount = 0;
    for (let i = 0; i < classAssignments.length; i++) {
      const current = classAssignments[i];
      if (current.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
          Math.abs(current.timeSlot.period - timeSlot.period) === 1) {
        consecutiveCount++;
      }
    }

    // 连续课程越少，分数越高
    if (consecutiveCount === 0) return 25;
    if (consecutiveCount === 1) return 20;
    if (consecutiveCount === 2) return 15;
    if (consecutiveCount === 3) return 10;
    return 5;
  }

  /**
   * 计算课程分布均匀性评分
   */
  private calculateCourseDistributionScore(variable: any, timeSlot: any, currentAssignments: Map<string, any>): number {
    // 统计该班级一周内各天的课程分布
    const weeklyDistribution = new Array(5).fill(0); // 假设一周5天
    
    for (const assignment of Array.from(currentAssignments.values())) {
      if (assignment.classId.toString() === variable.classId.toString()) {
        const dayIndex = assignment.timeSlot.dayOfWeek - 1; // 假设dayOfWeek从1开始
        if (dayIndex >= 0 && dayIndex < 5) {
          weeklyDistribution[dayIndex]++;
        }
      }
    }

    // 计算分布的标准差，标准差越小分布越均匀
    const mean = weeklyDistribution.reduce((sum, count) => sum + count, 0) / 5;
    const variance = weeklyDistribution.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / 5;
    const stdDev = Math.sqrt(variance);

    // 标准差越小，分数越高
    if (stdDev === 0) return 25;
    if (stdDev <= 1) return 20;
    if (stdDev <= 2) return 15;
    if (stdDev <= 3) return 10;
    return 5;
  }

  /**
   * 统计硬约束违反数量
   */
  countHardConstraintViolations(currentAssignments: Map<string, any>): number {
    let violations = 0;
    
    // 这里可以实现更详细的硬约束违反统计
    // 暂时返回0，后续完善
    
    return violations;
  }

  /**
   * 检查副科一天一节约束（硬约束）
   * 
   * @param variable 排课变量
   * @param timeSlot 时间槽
   * @param currentAssignments 当前所有分配
   * @returns 是否满足副科一天一节约束
   */
  private checkElectiveSubjectDailyLimit(
    variable: any, 
    timeSlot: any, 
    currentAssignments: Map<string, any>
  ): boolean {
    //console.log(`            🔍 [副科约束] 检查变量 ${variable.id} 的副科一天一节约束...`);
    //console.log(`               - 科目: ${variable.subject}`);
    //console.log(`               - 班级: ${variable.classId}`);
    //console.log(`               - 时间: 周${timeSlot.dayOfWeek}第${timeSlot.period}节`);
    
    // 跳过核心课程检查
    if (this.isCoreSubject(variable.subject)) {
      //console.log(`               ✅ 核心课程 ${variable.subject}，跳过检查`);
      return true;
    }

    //console.log(`               🔍 副科 ${variable.subject}，开始检查一天一节约束...`);

    const classId = variable.classId;
    const dayOfWeek = timeSlot.dayOfWeek;
    let dailyCount = 1; // 当前要安排的课程

    // 统计当天该科目的课程数量
    for (const assignment of Array.from(currentAssignments.values())) {
      //console.log(`               🔍 检查分配: 班级=${assignment.classId}, 时间=${assignment.timeSlot.dayOfWeek}-${assignment.timeSlot.period}, 科目=${assignment.subject}`);
      
      if (assignment.classId.toString() === classId.toString() && 
          assignment.timeSlot.dayOfWeek === dayOfWeek &&
          assignment.subject === variable.subject) {
        dailyCount++;
        console.log(`               ⚠️ 发现同一天同科目课程: ${assignment.subject} (${assignment.timeSlot.dayOfWeek}-${assignment.timeSlot.period})`);
      }
    }

    //console.log(`               📊 当天 ${variable.subject} 课程数量: ${dailyCount}`);

    // 副科每日最多1节（硬约束）
    if (dailyCount > 1) {
      console.log(`                  ❌ 副科 ${variable.subject} 当天已有课程，违反一天一节约束`);
      return false;
    }

   // console.log(`               ✅ 副科 ${variable.subject} 一天一节约束检查通过`);
    return true;
  }

  /**
   * 判断是否为核心课程
   * 
   * @param subjectName 科目名称
   * @returns 是否为核心课程
   */
  private isCoreSubject(subjectName: string): boolean {
    const coreSubjects = ['语文', '数学', '英语', '物理', '化学', '生物'];
    return coreSubjects.includes(subjectName);
  }

  /**
   * 统计软约束违反数量
   */
  countSoftConstraintViolations(currentAssignments: Map<string, any>): number {
    let violations = 0;
    
    // 这里可以实现更详细的软约束违反统计
    // 暂时返回0，后续完善
    
    return violations;
  }
}

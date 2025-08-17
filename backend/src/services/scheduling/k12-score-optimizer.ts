/**
 * K12评分优化器
 * 
 * 核心功能：
 * 1. 课程分布评分算法
 * 2. 学生疲劳度评估
 * 3. 教师工作量平衡评分
 * 4. 总体排课质量评估
 */
export class K12ScoreOptimizer {

  /**
   * 计算课程分散度评分
   * 
   * @param plan 教学计划
   * @returns 分散度评分（0-100）
   */
  calculateCourseDispersionScore(plan: any): number {
    try {
      const course = plan.courseAssignments[0]?.course;
      if (!course) return 0;

      const subject = course.subject;
      
      // 核心课程分散度评分
      if (this.isCoreSubject(subject)) {
        return this.calculateCoreSubjectDispersionScore(plan);
      }
      
      // 副科课程分散度评分
      return this.calculateElectiveSubjectDispersionScore(plan);

    } catch (error) {
      console.error('计算课程分散度评分时发生错误:', error);
      return 0;
    }
  }

  /**
   * 计算核心课程分散度评分
   */
  private calculateCoreSubjectDispersionScore(plan: any): number {
    const subject = plan.courseAssignments[0]?.course?.subject;
    const weeklyHours = plan.courseAssignments[0]?.weeklyHours || 0;

    // 核心课程应该分散在不同天
    if (weeklyHours <= 3) return 100; // 课时少，容易分散
    if (weeklyHours <= 5) return 80;  // 课时中等
    if (weeklyHours <= 7) return 60;  // 课时较多
    if (weeklyHours <= 9) return 40;  // 课时很多
    return 20; // 课时过多，难以分散
  }

  /**
   * 计算副科课程分散度评分
   */
  private calculateElectiveSubjectDispersionScore(plan: any): number {
    const subject = plan.courseAssignments[0]?.course?.subject;
    const weeklyHours = plan.courseAssignments[0]?.weeklyHours || 0;

    // 副科课程可以相对集中
    if (weeklyHours <= 2) return 100; // 课时少，容易安排
    if (weeklyHours <= 4) return 90;  // 课时中等
    if (weeklyHours <= 6) return 80;  // 课时较多
    if (weeklyHours <= 8) return 70;  // 课时很多
    return 60; // 课时过多
  }

  /**
   * 计算学生疲劳度评分
   * 
   * @param plan 教学计划
   * @returns 疲劳度评分（0-100，越高越好）
   */
  calculateStudentFatigueScore(plan: any): number {
    try {
      const course = plan.courseAssignments[0]?.course;
      if (!course) return 0;

      const subject = course.subject;
      const weeklyHours = plan.courseAssignments[0]?.weeklyHours || 0;
      const requiresContinuous = plan.courseAssignments[0]?.requiresContinuous || false;

      let baseScore = 100;

      // 连续课程会增加疲劳度
      if (requiresContinuous) {
        baseScore -= 20;
      }

      // 课时过多会增加疲劳度
      if (weeklyHours > 8) {
        baseScore -= 30;
      } else if (weeklyHours > 6) {
        baseScore -= 20;
      } else if (weeklyHours > 4) {
        baseScore -= 10;
      }

      // 某些科目天然容易疲劳
      if (subject === '体育') {
        baseScore += 10; // 体育课相对轻松
      } else if (subject === '数学') {
        baseScore -= 10; // 数学课相对疲劳
      }

      return Math.max(0, Math.min(100, baseScore));

    } catch (error) {
      console.error('计算学生疲劳度评分时发生错误:', error);
      return 50;
    }
  }

  /**
   * 计算教师工作量平衡评分
   * 
   * @param plan 教学计划
   * @returns 工作量平衡评分（0-100）
   */
  calculateTeacherWorkloadScore(plan: any): number {
    try {
      const weeklyHours = plan.courseAssignments[0]?.weeklyHours || 0;
      
      // 教师工作量应该相对平衡
      if (weeklyHours <= 4) return 100;  // 工作量适中
      if (weeklyHours <= 6) return 90;   // 工作量稍多
      if (weeklyHours <= 8) return 80;   // 工作量较多
      if (weeklyHours <= 10) return 70;  // 工作量很多
      if (weeklyHours <= 12) return 60;  // 工作量过多
      return 50; // 工作量过重

    } catch (error) {
      console.error('计算教师工作量平衡评分时发生错误:', error);
      return 50;
    }
  }

  /**
   * 计算课程时间偏好评分
   * 
   * @param plan 教学计划
   * @param timeSlot 时间槽
   * @returns 时间偏好评分（0-100）
   */
  calculateTimePreferenceScore(plan: any, timeSlot: any): number {
    try {
      const course = plan.courseAssignments[0]?.course;
      if (!course) return 50;

      const subject = course.subject;
      const dayOfWeek = timeSlot.dayOfWeek;
      const period = timeSlot.period;

      let score = 50; // 基础分数

      // 主科优先安排在上午
      if (this.isCoreSubject(subject)) {
        if (period <= 2) score += 30;      // 第1-2节
        else if (period <= 4) score += 20; // 第3-4节
        else if (period <= 6) score += 10; // 第5-6节
        else score -= 10;                  // 第7-8节
      }

      // 体育课避免安排在上午第1-2节
      if (subject === '体育' && period <= 2) {
        score -= 20;
      }

      // 音乐、美术等艺术课程可以安排在下午
      if (['音乐', '美术', '信息技术'].includes(subject) && period > 4) {
        score += 10;
      }

      return Math.max(0, Math.min(100, score));

    } catch (error) {
      console.error('计算课程时间偏好评分时发生错误:', error);
      return 50;
    }
  }

  /**
   * 计算总体排课质量评分
   * 
   * @param currentAssignments 当前所有分配
   * @returns 总体评分（0-100）
   */
  calculateTotalScore(currentAssignments: Map<string, any>): number {
    try {
      if (currentAssignments.size === 0) return 0;

      let totalScore = 0;
      let maxScore = 0;

      // 1. 课程分布均匀性评分（25分）
      const distributionScore = this.calculateOverallDistributionScore(currentAssignments);
      totalScore += distributionScore;
      maxScore += 25;

      // 2. 教师工作量平衡评分（25分）
      const workloadScore = this.calculateOverallWorkloadScore(currentAssignments);
      totalScore += workloadScore;
      maxScore += 25;

      // 3. 学生疲劳度评分（25分）
      const fatigueScore = this.calculateOverallFatigueScore(currentAssignments);
      totalScore += fatigueScore;
      maxScore += 25;

      // 4. 时间偏好满足度评分（25分）
      const preferenceScore = this.calculateOverallPreferenceScore(currentAssignments);
      totalScore += preferenceScore;
      maxScore += 25;

      const finalScore = Math.round((totalScore / maxScore) * 100);
      
      console.log(`📊 [总体评分] 排课质量评估:`);
      console.log(`   - 课程分布: ${distributionScore}/25`);
      console.log(`   - 教师工作量: ${workloadScore}/25`);
      console.log(`   - 学生疲劳度: ${fatigueScore}/25`);
      console.log(`   - 时间偏好: ${preferenceScore}/25`);
      console.log(`   - 总分: ${finalScore}/100`);

      return finalScore;

    } catch (error) {
      console.error('计算总体排课质量评分时发生错误:', error);
      return 0;
    }
  }

  /**
   * 计算整体课程分布均匀性评分
   */
  private calculateOverallDistributionScore(currentAssignments: Map<string, any>): number {
    try {
      // 统计每个班级每天的课程数量
      const classDailyDistribution = new Map<string, number[]>();
      
      for (const assignment of Array.from(currentAssignments.values())) {
        const classId = assignment.classId.toString();
        const dayOfWeek = assignment.timeSlot.dayOfWeek;
        
        if (!classDailyDistribution.has(classId)) {
          classDailyDistribution.set(classId, new Array(5).fill(0));
        }
        
        const distribution = classDailyDistribution.get(classId)!;
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          distribution[dayOfWeek - 1]++;
        }
      }

      // 计算每个班级分布的标准差
      let totalStdDev = 0;
      let classCount = 0;

      for (const distribution of Array.from(classDailyDistribution.values())) {
        const mean = distribution.reduce((sum, count) => sum + count, 0) / 5;
        const variance = distribution.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / 5;
        const stdDev = Math.sqrt(variance);
        totalStdDev += stdDev;
        classCount++;
      }

      if (classCount === 0) return 0;

      const averageStdDev = totalStdDev / classCount;
      
      // 标准差越小，分布越均匀，分数越高
      if (averageStdDev === 0) return 25;
      if (averageStdDev <= 1) return 20;
      if (averageStdDev <= 2) return 15;
      if (averageStdDev <= 3) return 10;
      return 5;

    } catch (error) {
      console.error('计算整体课程分布均匀性评分时发生错误:', error);
      return 0;
    }
  }

  /**
   * 计算整体教师工作量平衡评分
   */
  private calculateOverallWorkloadScore(currentAssignments: Map<string, any>): number {
    try {
      // 统计每个教师每天的课程数量
      const teacherDailyWorkload = new Map<string, number[]>();
      
      for (const assignment of Array.from(currentAssignments.values())) {
        const teacherId = assignment.teacherId.toString();
        const dayOfWeek = assignment.timeSlot.dayOfWeek;
        
        if (!teacherDailyWorkload.has(teacherId)) {
          teacherDailyWorkload.set(teacherId, new Array(5).fill(0));
        }
        
        const workload = teacherDailyWorkload.get(teacherId)!;
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          workload[dayOfWeek - 1]++;
        }
      }

      // 计算每个教师工作量的标准差
      let totalStdDev = 0;
      let teacherCount = 0;

      for (const workload of Array.from(teacherDailyWorkload.values())) {
        const mean = workload.reduce((sum, count) => sum + count, 0) / 5;
        const variance = workload.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / 5;
        const stdDev = Math.sqrt(variance);
        totalStdDev += stdDev;
        teacherCount++;
      }

      if (teacherCount === 0) return 0;

      const averageStdDev = totalStdDev / teacherCount;
      
      // 标准差越小，工作量越平衡，分数越高
      if (averageStdDev === 0) return 25;
      if (averageStdDev <= 1) return 20;
      if (averageStdDev <= 2) return 15;
      if (averageStdDev <= 3) return 10;
      return 5;

    } catch (error) {
      console.error('计算整体教师工作量平衡评分时发生错误:', error);
      return 0;
    }
  }

  /**
   * 计算整体学生疲劳度评分
   */
  private calculateOverallFatigueScore(currentAssignments: Map<string, any>): number {
    try {
      // 统计每个班级连续课程的情况
      const classConsecutiveCount = new Map<string, number>();
      
      for (const assignment of Array.from(currentAssignments.values())) {
        const classId = assignment.classId.toString();
        const dayOfWeek = assignment.timeSlot.dayOfWeek;
        const period = assignment.timeSlot.period;
        
        if (!classConsecutiveCount.has(classId)) {
          classConsecutiveCount.set(classId, 0);
        }
        
        // 检查是否有连续课程
        for (const otherAssignment of Array.from(currentAssignments.values())) {
          if (otherAssignment.classId.toString() === classId &&
              otherAssignment.timeSlot.dayOfWeek === dayOfWeek &&
              Math.abs(otherAssignment.timeSlot.period - period) === 1) {
            const currentCount = classConsecutiveCount.get(classId)!;
            classConsecutiveCount.set(classId, currentCount + 1);
          }
        }
      }

      // 计算连续课程的平均数量
      let totalConsecutive = 0;
      let classCount = 0;

      for (const consecutiveCount of Array.from(classConsecutiveCount.values())) {
        totalConsecutive += consecutiveCount;
        classCount++;
      }

      if (classCount === 0) return 25;

      const averageConsecutive = totalConsecutive / classCount;
      
      // 连续课程越少，疲劳度越低，分数越高
      if (averageConsecutive === 0) return 25;
      if (averageConsecutive <= 2) return 20;
      if (averageConsecutive <= 4) return 15;
      if (averageConsecutive <= 6) return 10;
      return 5;

    } catch (error) {
      console.error('计算整体学生疲劳度评分时发生错误:', error);
      return 0;
    }
  }

  /**
   * 计算整体时间偏好满足度评分
   */
  private calculateOverallPreferenceScore(currentAssignments: Map<string, any>): number {
    try {
      let totalScore = 0;
      let assignmentCount = 0;

      for (const assignment of Array.from(currentAssignments.values())) {
        // 这里需要根据具体的教学计划来计算时间偏好
        // 暂时给一个基础分数
        totalScore += 20; // 基础分数
        assignmentCount++;
      }

      if (assignmentCount === 0) return 0;

      const averageScore = totalScore / assignmentCount;
      return Math.round(averageScore);

    } catch (error) {
      console.error('计算整体时间偏好满足度评分时发生错误:', error);
      return 0;
    }
  }

  /**
   * 判断是否为核心课程
   */
  private isCoreSubject(subject: string): boolean {
    const coreSubjects = ['语文', '数学', '英语'];
    return coreSubjects.includes(subject);
  }
}

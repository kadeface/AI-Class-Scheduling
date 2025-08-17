/**
 * 局部搜索优化器
 * 
 * 职责：
 * 1. 基于约束检测结果优化排课质量
 * 2. 实现课程交换算法
 * 3. 提升软约束满足度
 */

import { CourseAssignment, ScheduleVariable } from './types';
import { EnhancedConstraintDetector, ScheduleQualityResult } from './constraint-detector';
import { ISchedulingRules } from '../../models/SchedulingRules';

export interface OptimizationResult {
  success: boolean;
  originalScore: number;
  optimizedScore: number;
  improvement: number;
  iterations: number;
  message: string;
  optimizedAssignments: Map<string, CourseAssignment>;
}

export interface SwapOperation {
  variableId1: string;
  variableId2: string;
  scoreImprovement: number;
  reason: string;
}

/**
 * 局部搜索优化器
 */
export class LocalSearchOptimizer {
  private constraintDetector: EnhancedConstraintDetector;
  private maxIterations: number;
  private improvementThreshold: number;
  private maxSwapsPerIteration: number;

  constructor(
    rules: ISchedulingRules,
    maxIterations: number = 1000,
    improvementThreshold: number = 0.1,
    maxSwapsPerIteration: number = 5
  ) {
    this.constraintDetector = new EnhancedConstraintDetector(rules);
    this.maxIterations = maxIterations;
    this.improvementThreshold = improvementThreshold;
    this.maxSwapsPerIteration = maxSwapsPerIteration;
  }

  /**
   * 优化排课结果
   */
  async optimize(
    assignments: Map<string, CourseAssignment>
  ): Promise<OptimizationResult> {
    console.log('🔍 [局部搜索优化] 开始优化排课质量...');
    
    // 1. 评估初始质量
    const initialQuality = this.constraintDetector.evaluateScheduleQuality(assignments);
    console.log(`📊 初始排课质量: ${initialQuality.totalScore.toFixed(2)}`);
    
    // 2. 执行局部搜索优化
    const optimizedAssignments = await this.performLocalSearch(assignments, initialQuality.totalScore);
    
    // 3. 评估优化后质量
    const finalQuality = this.constraintDetector.evaluateScheduleQuality(optimizedAssignments);
    const improvement = finalQuality.totalScore - initialQuality.totalScore;
    
    console.log(`📊 优化后排课质量: ${finalQuality.totalScore.toFixed(2)}`);
    console.log(`📈 质量提升: ${improvement.toFixed(2)}`);
    
    return {
      success: improvement > 0,
      originalScore: initialQuality.totalScore,
      optimizedScore: finalQuality.totalScore,
      improvement,
      iterations: this.maxIterations,
      message: improvement > 0 ? '排课质量得到提升' : '排课质量未得到明显提升',
      optimizedAssignments: optimizedAssignments
    };
  }

  /**
   * 执行局部搜索
   */
  private async performLocalSearch(
    assignments: Map<string, CourseAssignment>,
    initialScore: number
  ): Promise<Map<string, CourseAssignment>> {
    let currentAssignments = new Map(assignments);
    let currentScore = initialScore;
    let iterations = 0;
    let noImprovementCount = 0;
    
    while (iterations < this.maxIterations && noImprovementCount < 50) {
      iterations++;
      
      // 寻找最佳交换操作
      const bestSwap = this.findBestSwap(currentAssignments, currentScore);
      
      if (bestSwap && bestSwap.scoreImprovement > this.improvementThreshold) {
        // 执行交换
        currentAssignments = this.executeSwap(currentAssignments, bestSwap);
        currentScore += bestSwap.scoreImprovement;
        noImprovementCount = 0;
        
        if (iterations % 100 === 0) {
          console.log(`�� 迭代 ${iterations}: 质量提升到 ${currentScore.toFixed(2)}`);
        }
      } else {
        noImprovementCount++;
      }
    }
    
    console.log(`✅ 局部搜索完成，共迭代 ${iterations} 次`);
    return currentAssignments;
  }

  /**
   * 寻找最佳交换操作
   */
  private findBestSwap(
    assignments: Map<string, CourseAssignment>,
    currentScore: number
  ): SwapOperation | null {
    const assignmentsArray = Array.from(assignments.values());
    let bestSwap: SwapOperation | null = null;
    let bestImprovement = 0;
    
    // 随机选择交换候选
    const swapCandidates = this.generateSwapCandidates(assignmentsArray);
    
    for (const candidate of swapCandidates) {
      const { variableId1, variableId2 } = candidate;
      
      // 尝试交换
      const swappedAssignments = this.simulateSwap(assignments, variableId1, variableId2);
      
      // 评估交换后的质量
      const newQuality = this.constraintDetector.evaluateScheduleQuality(swappedAssignments);
      const improvement = newQuality.totalScore - currentScore;
      
      if (improvement > bestImprovement) {
        bestImprovement = improvement;
        bestSwap = {
          variableId1,
          variableId2,
          scoreImprovement: improvement,
          reason: `质量提升 ${improvement.toFixed(2)}`
        };
      }
    }
    
    return bestSwap;
  }

  /**
   * 生成交换候选
   */
  private generateSwapCandidates(assignments: CourseAssignment[]): Array<{variableId1: string, variableId2: string}> {
    const candidates: Array<{variableId1: string, variableId2: string}> = [];
    const maxCandidates = Math.min(this.maxSwapsPerIteration * 2, assignments.length);
    
    // 随机选择交换候选
    for (let i = 0; i < maxCandidates; i++) {
      const idx1 = Math.floor(Math.random() * assignments.length);
      const idx2 = Math.floor(Math.random() * assignments.length);
      
      if (idx1 !== idx2) {
        candidates.push({
          variableId1: assignments[idx1].variableId,
          variableId2: assignments[idx2].variableId
        });
      }
    }
    
    return candidates;
  }

  /**
   * 模拟交换操作
   */
  private simulateSwap(
    assignments: Map<string, CourseAssignment>,
    variableId1: string,
    variableId2: string
  ): Map<string, CourseAssignment> {
    const swapped = new Map(assignments);
    const assignment1 = swapped.get(variableId1);
    const assignment2 = swapped.get(variableId2);
    
    if (assignment1 && assignment2) {
      // 交换时间段
      const tempTimeSlot = assignment1.timeSlot;
      assignment1.timeSlot = assignment2.timeSlot;
      assignment2.timeSlot = tempTimeSlot;
      
      // 更新ID以反映新的时间段
      const newVariableId1 = `${assignment1.classId}_${assignment1.courseId}_${assignment1.teacherId}_${assignment1.timeSlot.period}`;
      const newVariableId2 = `${assignment2.classId}_${assignment2.courseId}_${assignment2.teacherId}_${assignment2.timeSlot.period}`;
      
      // 更新Map中的键
      swapped.delete(variableId1);
      swapped.delete(variableId2);
      swapped.set(newVariableId1, { ...assignment1, variableId: newVariableId1 });
      swapped.set(newVariableId2, { ...assignment2, variableId: newVariableId2 });
    }
    
    return swapped;
  }

  /**
   * 执行交换操作
   */
  private executeSwap(
    assignments: Map<string, CourseAssignment>,
    swap: SwapOperation
  ): Map<string, CourseAssignment> {
    return this.simulateSwap(assignments, swap.variableId1, swap.variableId2);
  }

  /**
   * 获取优化统计信息
   */
  getOptimizationStats(): {
    maxIterations: number;
    improvementThreshold: number;
    maxSwapsPerIteration: number;
  } {
    return {
      maxIterations: this.maxIterations,
      improvementThreshold: this.improvementThreshold,
      maxSwapsPerIteration: this.maxSwapsPerIteration
    };
  }
}
'use client';

import React from 'react';
import { WeekSchedule, CourseSlot, TIME_CONFIG } from '../types';
import { ScheduleCard, EmptyScheduleCard } from './ScheduleCard';
import { cn } from '@/lib/utils';

/**
 * 课表网格组件属性接口
 */
interface ScheduleGridProps {
  weekSchedule: WeekSchedule;
  className?: string;
  onCourseClick?: (courseSlot: CourseSlot) => void;
  onCourseHover?: (courseSlot: CourseSlot | null) => void;
}

/**
 * 课表网格组件
 * 
 * 展示5天×8节课的完整课表网格
 * 
 * @param props 组件属性
 * @returns 课表网格组件
 */
export function ScheduleGrid({
  weekSchedule,
  className,
  onCourseClick,
  onCourseHover
}: ScheduleGridProps) {
  return (
    <div className={cn('bg-white rounded-lg shadow-lg overflow-hidden', className)}>
      {/* 课表表格 */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          {/* 表头 */}
          <thead>
            <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
              {/* 时间列标题 */}
              <th className="w-24 p-4 text-left border-r border-gray-200">
                <div className="text-sm font-semibold text-gray-600">时间</div>
              </th>
              
              {/* 星期列标题 */}
              {TIME_CONFIG.DAYS.map((day) => (
                <th
                  key={day.value}
                  className="p-4 text-center border-r border-gray-200 last:border-r-0"
                >
                  <div className="space-y-1">
                    <div className="text-lg font-bold text-gray-800">
                      {day.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {day.short}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* 表体 */}
          <tbody>
            {TIME_CONFIG.PERIODS.map((period) => (
              <tr key={period.value} className="border-b border-gray-200">
                {/* 时间信息列 */}
                <td className="w-24 p-4 bg-gray-50 border-r border-gray-200">
                  <div className="text-center space-y-1">
                    <div className="text-sm font-semibold text-gray-800">
                      {period.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {period.time}
                    </div>
                  </div>
                </td>

                {/* 课程内容列 */}
                {TIME_CONFIG.DAYS.map((day) => {
                  const courseSlot = weekSchedule[day.value]?.[period.value];
                  
                  return (
                    <td
                      key={`${day.value}-${period.value}`}
                      className="p-2 border-r border-gray-200 last:border-r-0 align-top"
                    >
                      <div className="min-h-[80px] w-full">
                        {courseSlot ? (
                          <ScheduleCard
                            courseSlot={courseSlot}
                            onClick={onCourseClick}
                            onHover={onCourseHover}
                            className="h-full"
                          />
                        ) : (
                          <EmptyScheduleCard className="h-full" />
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 表格底部说明 */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
          {/* 学科颜色图例 */}
          <div className="flex items-center gap-2">
            <span className="font-medium">学科图例：</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries({
                '语文': '#ff6b6b',
                '数学': '#4ecdc4',
                '英语': '#45b7d1',
                '物理': '#96ceb4',
                '化学': '#feca57'
              }).map(([subject, color]) => (
                <div key={subject} className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs">{subject}</span>
                </div>
              ))}
              <span className="text-xs text-gray-400">等</span>
            </div>
          </div>

          {/* 说明 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-white/20 rounded px-1 py-0.5 text-xs border">连排</div>
              <span className="text-xs">连续课程</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-100 border-2 border-dashed border-gray-300 rounded-sm"></div>
              <span className="text-xs">空课时段</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 课表加载骨架屏组件
 */
export function ScheduleGridSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          {/* 表头骨架 */}
          <thead>
            <tr className="bg-gray-50">
              <th className="w-24 p-4 border-r border-gray-200">
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
              </th>
              {Array.from({ length: 5 }).map((_, index) => (
                <th key={index} className="p-4 border-r border-gray-200">
                  <div className="space-y-2">
                    <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* 表体骨架 */}
          <tbody>
            {Array.from({ length: 8 }).map((_, periodIndex) => (
              <tr key={periodIndex} className="border-b border-gray-200">
                <td className="w-24 p-4 bg-gray-50 border-r border-gray-200">
                  <div className="space-y-1">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </td>
                {Array.from({ length: 5 }).map((_, dayIndex) => (
                  <td key={dayIndex} className="p-2 border-r border-gray-200">
                    <div className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 
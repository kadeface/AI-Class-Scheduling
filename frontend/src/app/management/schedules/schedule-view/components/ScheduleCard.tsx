'use client';

import React, { useState } from 'react';
import { CourseSlot, SUBJECT_COLORS } from '../types';
import { cn } from '@/lib/utils';

/**
 * 课程卡片组件属性接口
 */
interface ScheduleCardProps {
  courseSlot: CourseSlot;
  className?: string;
  onClick?: (courseSlot: CourseSlot) => void;
  onHover?: (courseSlot: CourseSlot | null) => void;
}

/**
 * 课程卡片组件
 * 
 * 展示单个课程的详细信息，包括课程名、教师、教室等
 * 
 * @param props 组件属性
 * @returns 课程卡片组件
 */
export function ScheduleCard({ 
  courseSlot, 
  className,
  onClick,
  onHover 
}: ScheduleCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // 获取学科颜色
  const subjectColor = SUBJECT_COLORS[courseSlot.subject] || '#6b7280';

  // 处理点击事件
  const handleClick = () => {
    onClick?.(courseSlot);
  };

  // 处理悬停事件
  const handleMouseEnter = () => {
    setIsHovered(true);
    onHover?.(courseSlot);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onHover?.(null);
  };

  return (
    <div
      className={cn(
        'relative rounded-lg p-3 text-white text-sm cursor-pointer transition-all duration-200',
        'hover:shadow-lg hover:scale-105 hover:z-10',
        isHovered && 'ring-2 ring-white ring-opacity-50',
        courseSlot.duration > 1 && 'row-span-2', // 连排课程占两行
        className
      )}
      style={{
        backgroundColor: subjectColor,
        background: `linear-gradient(135deg, ${subjectColor} 0%, ${subjectColor}dd 100%)`
      }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 主要内容 */}
      <div className="space-y-1">
        {/* 课程名称 */}
        <div className="font-semibold text-base leading-tight">
          {courseSlot.courseName}
        </div>
        
        {/* 教师信息 */}
        <div className="text-white/90 text-xs">
          👨‍🏫 {courseSlot.teacherName}
        </div>
        
        {/* 教室信息 */}
        <div className="text-white/90 text-xs">
          🏢 {courseSlot.roomName}
        </div>
        
        {/* 连排标识 */}
        {courseSlot.duration > 1 && (
          <div className="absolute top-1 right-1">
            <div className="bg-white/20 rounded px-1 py-0.5 text-xs">
              连排
            </div>
          </div>
        )}
        
        {/* 备注信息 */}
        {courseSlot.notes && (
          <div className="text-white/80 text-xs mt-1 truncate">
            📝 {courseSlot.notes}
          </div>
        )}
      </div>

      {/* 悬停时的详细信息 */}
      {isHovered && (
        <div className="absolute left-full top-0 ml-2 z-20 bg-gray-900 text-white p-3 rounded-lg shadow-xl min-w-[200px]">
          <div className="space-y-2 text-sm">
            <div className="font-semibold border-b border-gray-700 pb-1">
              {courseSlot.courseName}
            </div>
            <div>
              <span className="text-gray-400">学科：</span>
              {courseSlot.subject}
            </div>
            <div>
              <span className="text-gray-400">教师：</span>
              {courseSlot.teacherName}
            </div>
            <div>
              <span className="text-gray-400">教室：</span>
              {courseSlot.roomName}
            </div>
            {courseSlot.duration > 1 && (
              <div>
                <span className="text-gray-400">时长：</span>
                {courseSlot.duration} 节课（连排）
              </div>
            )}
            {courseSlot.notes && (
              <div>
                <span className="text-gray-400">备注：</span>
                {courseSlot.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 空课时卡片组件
 */
export function EmptyScheduleCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg p-3 bg-gray-50 border-2 border-dashed border-gray-200',
        'text-gray-400 text-center text-sm',
        'hover:bg-gray-100 transition-colors duration-200',
        className
      )}
    >
      <div className="flex flex-col items-center justify-center h-full min-h-[60px]">
        <div className="text-2xl mb-1">📅</div>
        <div>空课</div>
      </div>
    </div>
  );
} 
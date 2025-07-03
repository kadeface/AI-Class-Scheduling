/**
 * 课表网格组件
 * 
 * 显示完整课表的网格组件，支持拖拽操作
 * 这是课表系统的核心UI组件
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  CollisionDetection,
  rectIntersection,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardContent } from './card';
import { DraggableCourseCard, CourseCard, CourseCardSkeleton } from './course-card';
import { cn } from '@/lib/utils';
import { 
  ScheduleGridProps, 
  ScheduleItem, 
  DragData, 
  DropData,
  TimeSlot 
} from '@/types/schedule';

/**
 * 工作日名称映射
 */
const WEEKDAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

/**
 * 默认时间段配置
 */
const DEFAULT_TIME_SLOTS = [
  { period: 1, startTime: '08:00', endTime: '08:45' },
  { period: 2, startTime: '08:55', endTime: '09:40' },
  { period: 3, startTime: '10:00', endTime: '10:45' },
  { period: 4, startTime: '10:55', endTime: '11:40' },
  { period: 5, startTime: '14:00', endTime: '14:45' },
  { period: 6, startTime: '14:55', endTime: '15:40' },
  { period: 7, startTime: '16:00', endTime: '16:45' },
  { period: 8, startTime: '16:55', endTime: '17:40' },
];

/**
 * 课表网格单元格组件
 */
interface GridCellProps {
  dayOfWeek: number;
  period: number;
  item?: ScheduleItem;
  isDropZone?: boolean;
  isValidDropTarget?: boolean;
  onClick?: () => void;
  className?: string;
}

function GridCell({ 
  dayOfWeek, 
  period, 
  item, 
  isDropZone = false, 
  isValidDropTarget = false,
  onClick,
  className 
}: GridCellProps) {
  return (
    <div
      className={cn(
        'min-h-[80px] border border-gray-200 bg-white',
        'hover:bg-gray-50 transition-colors duration-150',
        isDropZone && 'bg-blue-50 border-blue-300',
        isValidDropTarget && 'bg-green-50 border-green-300',
        !isValidDropTarget && isDropZone && 'bg-red-50 border-red-300',
        className
      )}
      onClick={onClick}
    >
      {item ? (
        <div className="p-1 h-full">
          <DraggableCourseCard
            item={item}
            showDetails={true}
            compact={false}
          />
        </div>
      ) : (
        <div className="p-1 h-full flex items-center justify-center">
          <span className="text-gray-400 text-xs">
            {isDropZone ? '放置到这里' : ''}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * 课表网格组件
 */
export function ScheduleGrid({
  schedule,
  config,
  onItemMove,
  onItemClick,
  onCellClick,
  onItemEdit,
  onItemDelete,
  loading = false,
  className,
}: ScheduleGridProps) {
  const [activeItem, setActiveItem] = useState<ScheduleItem | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ dayOfWeek: number; period: number } | null>(null);

  // 传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // 工作日范围
  const workdays = config.showWeekends ? 7 : 5;
  const weekdays = WEEKDAY_NAMES.slice(0, workdays);

  // 构建网格数据结构
  const gridData = useMemo(() => {
    const grid: (ScheduleItem | null)[][] = [];
    const maxPeriods = schedule.rows || 8;

    // 初始化网格
    for (let period = 1; period <= maxPeriods; period++) {
      grid[period - 1] = new Array(workdays).fill(null);
    }

    // 填充课程数据
    schedule.cells.forEach(row => {
      row.forEach(cell => {
        if (cell.item && cell.dayOfWeek <= workdays) {
          const periodIndex = cell.period - 1;
          const dayIndex = cell.dayOfWeek - 1;
          if (periodIndex >= 0 && periodIndex < maxPeriods && dayIndex >= 0 && dayIndex < workdays) {
            grid[periodIndex][dayIndex] = cell.item;
          }
        }
      });
    });

    return grid;
  }, [schedule, workdays]);

  // 获取所有可拖拽项目的ID
  const sortableItems = useMemo(() => {
    const items: string[] = [];
    gridData.forEach(row => {
      row.forEach(item => {
        if (item && config.enableDragDrop) {
          items.push(item._id);
        }
      });
    });
    return items;
  }, [gridData, config.enableDragDrop]);

  // 拖拽开始处理
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const dragData = active.data.current as { item: ScheduleItem };
    
    if (dragData?.item) {
      setActiveItem(dragData.item);
    }
  }, []);

  // 拖拽悬停处理
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    
    if (over?.data?.current) {
      const { dayOfWeek, period } = over.data.current;
      setDragOverCell({ dayOfWeek, period });
    } else {
      setDragOverCell(null);
    }
  }, []);

  // 拖拽结束处理
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveItem(null);
    setDragOverCell(null);

    if (!over || !activeItem) return;

    const dropData = over.data.current;
    if (!dropData?.dayOfWeek || !dropData?.period) return;

    // 构建移动数据
    const fromSlot: TimeSlot = {
      dayOfWeek: activeItem.dayOfWeek,
      period: activeItem.period,
      startTime: '',
      endTime: '',
    };

    const toSlot: TimeSlot = {
      dayOfWeek: dropData.dayOfWeek,
      period: dropData.period,
      startTime: '',
      endTime: '',
    };

    // 检查是否移动到相同位置
    if (fromSlot.dayOfWeek === toSlot.dayOfWeek && fromSlot.period === toSlot.period) {
      return;
    }

    // 调用移动处理函数
    if (onItemMove) {
      try {
        const success = await onItemMove(activeItem, fromSlot, toSlot);
        if (!success) {
          console.warn('课程移动失败');
        }
      } catch (error) {
        console.error('课程移动错误:', error);
      }
    }
  }, [activeItem, onItemMove]);

  // 检查投放目标是否有效
  const isValidDropTarget = useCallback((dayOfWeek: number, period: number): boolean => {
    if (!activeItem || !config.enableDragDrop) return false;

    // 检查目标位置是否已被占用
    const targetItem = gridData[period - 1]?.[dayOfWeek - 1];
    if (targetItem && targetItem._id !== activeItem._id) {
      return false;
    }

    // 这里可以添加更多业务逻辑验证
    // 比如检查教师冲突、教室冲突等

    return true;
  }, [activeItem, gridData, config.enableDragDrop]);

  // 渲染加载状态
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-6 gap-2">
          {/* 表头骨架 */}
          <div></div>
          {weekdays.map((_, index) => (
            <div key={index} className="h-8 bg-gray-200 rounded animate-pulse" />
          ))}
          
          {/* 网格骨架 */}
          {Array.from({ length: 8 }).map((_, periodIndex) => (
            <React.Fragment key={periodIndex}>
              <div className="h-20 bg-gray-200 rounded animate-pulse" />
              {weekdays.map((_, dayIndex) => (
                <div key={dayIndex} className="h-20 border border-gray-200">
                  <CourseCardSkeleton />
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={cn('w-full overflow-auto', className)}>
        <div className="min-w-[800px]">
          {/* 课表表头 */}
          <div className="grid grid-cols-6 lg:grid-cols-8 gap-0 border-b border-gray-300">
            {/* 时间列头 */}
            <div className="p-3 bg-gray-50 border-r border-gray-300 font-medium text-center">
              {config.showTimeSlots ? '时间' : '节次'}
            </div>
            
            {/* 工作日列头 */}
            {weekdays.map((weekday, index) => (
              <div 
                key={index}
                className="p-3 bg-gray-50 border-r border-gray-300 font-medium text-center"
              >
                {weekday}
              </div>
            ))}
          </div>

          {/* 课表网格 */}
          <SortableContext items={sortableItems} strategy={rectSortingStrategy}>
            {gridData.map((row, periodIndex) => {
              const period = periodIndex + 1;
              const timeSlot = schedule.timeSlots?.[periodIndex] || DEFAULT_TIME_SLOTS[periodIndex];
              
              return (
                <div key={period} className="grid grid-cols-6 lg:grid-cols-8 gap-0 border-b border-gray-200">
                  {/* 时间/节次列 */}
                  <div className="p-3 bg-gray-50 border-r border-gray-300 text-center text-sm">
                    <div className="font-medium">{period}</div>
                    {config.showTimeSlots && timeSlot && (
                      <div className="text-xs text-gray-600 mt-1">
                        {timeSlot.startTime}-{timeSlot.endTime}
                      </div>
                    )}
                  </div>

                  {/* 课程网格单元格 */}
                  {row.map((item, dayIndex) => {
                    const dayOfWeek = dayIndex + 1;
                    const isDropZone = dragOverCell?.dayOfWeek === dayOfWeek && dragOverCell?.period === period;
                    const isValidDrop = isValidDropTarget(dayOfWeek, period);

                    return (
                      <div
                        key={`${dayOfWeek}-${period}`}
                        data-day={dayOfWeek}
                        data-period={period}
                        className="border-r border-gray-200"
                      >
                        <GridCell
                          dayOfWeek={dayOfWeek}
                          period={period}
                          item={item || undefined}
                          isDropZone={isDropZone}
                          isValidDropTarget={isValidDrop}
                          onClick={() => onCellClick?.(dayOfWeek, period)}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </SortableContext>
        </div>

        {/* 拖拽覆盖层 */}
        <DragOverlay>
          {activeItem && (
            <CourseCard
              item={activeItem}
              isDragging={true}
              showDetails={true}
              className="rotate-3 shadow-xl"
            />
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

export default ScheduleGrid;
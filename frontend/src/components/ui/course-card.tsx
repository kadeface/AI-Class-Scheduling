/**
 * 课程卡片组件
 * 
 * 在课表网格中显示单个课程信息的卡片组件
 * 支持拖拽、点击、编辑等交互功能
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { MoreHorizontal, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CourseCardProps, ScheduleItem } from '@/types/schedule';

/**
 * 课程颜色映射
 */
const COURSE_COLORS: Record<string, string> = {
  '语文': 'bg-red-100 border-red-200 text-red-800',
  '数学': 'bg-blue-100 border-blue-200 text-blue-800',
  '英语': 'bg-green-100 border-green-200 text-green-800',
  '物理': 'bg-purple-100 border-purple-200 text-purple-800',
  '化学': 'bg-orange-100 border-orange-200 text-orange-800',
  '生物': 'bg-emerald-100 border-emerald-200 text-emerald-800',
  '历史': 'bg-amber-100 border-amber-200 text-amber-800',
  '地理': 'bg-cyan-100 border-cyan-200 text-cyan-800',
  '政治': 'bg-pink-100 border-pink-200 text-pink-800',
  '体育': 'bg-lime-100 border-lime-200 text-lime-800',
  '音乐': 'bg-violet-100 border-violet-200 text-violet-800',
  '美术': 'bg-rose-100 border-rose-200 text-rose-800',
  '信息技术': 'bg-indigo-100 border-indigo-200 text-indigo-800',
  '通用技术': 'bg-slate-100 border-slate-200 text-slate-800',
};

/**
 * 获取课程颜色样式
 */
function getCourseColorClass(subject: string): string {
  return COURSE_COLORS[subject] || 'bg-gray-100 border-gray-200 text-gray-800';
}

/**
 * 获取冲突状态样式
 */
function getConflictClass(conflictStatus?: 'none' | 'warning' | 'error'): string {
  switch (conflictStatus) {
    case 'warning':
      return 'ring-2 ring-yellow-400 ring-opacity-50';
    case 'error':
      return 'ring-2 ring-red-400 ring-opacity-50';
    default:
      return '';
  }
}

/**
 * 可拖拽的课程卡片组件
 */
export function DraggableCourseCard({ 
  item, 
  onClick, 
  onEdit, 
  onDelete, 
  showDetails = true,
  compact = false,
  className 
}: CourseCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item._id,
    data: {
      type: 'course',
      item,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50 scale-105 shadow-lg',
        className
      )}
    >
      <CourseCard
        item={item}
        isDragging={isDragging}
        onClick={onClick}
        onEdit={onEdit}
        onDelete={onDelete}
        showDetails={showDetails}
        compact={compact}
      />
    </div>
  );
}

/**
 * 基础课程卡片组件
 */
export function CourseCard({
  item,
  isDragging = false,
  isDroppable = false,
  onClick,
  onEdit,
  onDelete,
  showDetails = true,
  compact = false,
  className,
}: CourseCardProps) {
  const colorClass = getCourseColorClass(item.course.subject);
  const conflictClass = getConflictClass(item.conflictStatus);

  return (
    <Card
      className={cn(
        'relative cursor-pointer transition-all duration-200 hover:shadow-md',
        colorClass,
        conflictClass,
        compact && 'p-1',
        isDragging && 'shadow-lg scale-105',
        isDroppable && 'ring-2 ring-blue-400 ring-opacity-50',
        className
      )}
      onClick={onClick}
    >
      <CardContent className={cn('p-2', compact && 'p-1')}>
        {/* 冲突警告图标 */}
        {item.conflictStatus !== 'none' && (
          <AlertTriangle 
            className={cn(
              'absolute top-1 right-1 h-3 w-3',
              item.conflictStatus === 'error' ? 'text-red-500' : 'text-yellow-500'
            )}
          />
        )}

        {/* 课程名称 */}
        <div className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>
          {item.course.name}
        </div>

        {/* 详细信息 */}
        {showDetails && !compact && (
          <div className="space-y-1 mt-1">
            {/* 教师信息 */}
            <div className="text-xs opacity-80">
              👨‍🏫 {item.teacher.name}
            </div>
            
            {/* 教室信息 */}
            <div className="text-xs opacity-80">
              🏫 {item.room.name}
            </div>
            
            {/* 班级信息 */}
            <div className="text-xs opacity-80">
              👥 {item.class.name}
            </div>

            {/* 固定标识 */}
            {item.isFixed && (
              <Badge variant="secondary" className="text-xs">
                固定
              </Badge>
            )}
          </div>
        )}

        {/* 紧凑模式显示 */}
        {compact && (
          <div className="text-xs opacity-80 truncate">
            {item.teacher.name} · {item.room.name}
          </div>
        )}

        {/* 操作按钮 */}
        {(onEdit || onDelete) && !compact && (
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex space-x-1">
              {onEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 课程卡片骨架屏
 */
export function CourseCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card className={cn('animate-pulse', compact && 'h-12')}>
      <CardContent className={cn('p-2', compact && 'p-1')}>
        <div className={cn('h-4 bg-gray-200 rounded', compact && 'h-3')} />
        {!compact && (
          <div className="space-y-1 mt-1">
            <div className="h-3 bg-gray-200 rounded" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CourseCard;
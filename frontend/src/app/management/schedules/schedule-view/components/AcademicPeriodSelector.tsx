'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';

/**
 * 学年学期选择器组件属性接口
 */
interface AcademicPeriodSelectorProps {
  value: {
    academicYear: string;
    semester: string;
  };
  onChange: (value: { academicYear: string; semester: string }) => void;
  className?: string;
}

/**
 * 学年学期选择器组件
 * 
 * 提供学年学期的动态选择功能
 */
export function AcademicPeriodSelector({ value, onChange, className }: AcademicPeriodSelectorProps) {
  const [periods, setPeriods] = useState<Array<{
    semester: string;
    academicYear: string;
    semesterNumber: string;
    displayName: string;
  }>>([]);
  
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 获取可用的学年学期列表
   */
  useEffect(() => {
    const fetchAcademicPeriods = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/schedule-view/academic-periods');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setPeriods(data.data.periods || []);
            setAcademicYears(data.data.academicYears || []);
            setCurrentPeriod(data.data.currentPeriod || '');
            
            // 如果没有设置当前值，使用数据库中的当前活跃学期
            if (!value.academicYear && !value.semester && data.data.currentPeriod) {
              const [year, semester] = data.data.currentPeriod.split('-');
              onChange({ academicYear: year, semester });
            }
          } else {
            setError(data.message || '获取学年学期失败');
          }
        } else {
          setError(`API调用失败: ${response.status}`);
        }
      } catch (error) {
        console.error('获取学年学期失败:', error);
        setError('网络错误，请检查连接');
      } finally {
        setLoading(false);
      }
    };

    fetchAcademicPeriods();
  }, [value.academicYear, value.semester, onChange]);

  /**
   * 处理学年变化
   */
  const handleAcademicYearChange = (newYear: string) => {
    // 找到该学年下的第一个学期
    const yearPeriods = periods.filter(p => p.academicYear === newYear);
    const firstSemester = yearPeriods.length > 0 ? yearPeriods[0].semesterNumber : '1';
    
    onChange({
      academicYear: newYear,
      semester: firstSemester
    });
  };

  /**
   * 处理学期变化
   */
  const handleSemesterChange = (newSemester: string) => {
    onChange({
      academicYear: value.academicYear,
      semester: newSemester
    });
  };

  /**
   * 获取当前学年的可用学期
   */
  const getCurrentYearSemesters = () => {
    return periods.filter(p => p.academicYear === value.academicYear);
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Calendar className="h-4 w-4 animate-pulse" />
        <span className="text-sm text-gray-500">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Calendar className="h-4 w-4 text-red-500" />
        <span className="text-sm text-red-500">{error}</span>
      </div>
    );
  }

  if (periods.length === 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Calendar className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-400">暂无数据</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-700">学年学期:</span>
      </div>
      
      {/* 学年选择 */}
      <select 
        value={value.academicYear} 
        onChange={(e) => handleAcademicYearChange(e.target.value)}
        className="w-32 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {academicYears.map((year) => (
          <option key={year} value={year}>
            {year}学年
          </option>
        ))}
      </select>

      {/* 学期选择 */}
      <select 
        value={value.semester} 
        onChange={(e) => handleSemesterChange(e.target.value)}
        className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {getCurrentYearSemesters().map((period) => (
          <option key={period.semesterNumber} value={period.semesterNumber}>
            第{period.semesterNumber}学期
          </option>
        ))}
      </select>

      {/* 当前活跃学期标识 */}
      {currentPeriod === `${value.academicYear}-${value.semester}` && (
        <Badge variant="secondary" className="text-xs">
          当前活跃
        </Badge>
      )}
    </div>
  );
}

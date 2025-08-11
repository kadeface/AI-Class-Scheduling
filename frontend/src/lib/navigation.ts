/**
 * 导航配置
 * 
 * 定义系统的导航菜单结构和路由配置
 */

import { NavigationItem } from '@/types/navigation';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  BookOpen,
  MapPin,
  Calendar,
  Settings,
  BarChart3,
  FileText,
  UserCheck,
  Building2
} from 'lucide-react';

/**
 * 主导航菜单配置
 */
export const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: '仪表盘',
    href: '/',
    icon: LayoutDashboard
  },
  {
    id: 'management',
    label: '基础数据管理',
    href: '/management',
    icon: Settings,
    children: [
      {
        id: 'users',
        label: '用户管理',
        href: '/management/users',
        icon: Users
      },
      {
        id: 'teachers',
        label: '教师管理',
        href: '/management/teachers',
        icon: GraduationCap
      },
      {
        id: 'classes',
        label: '班级管理',
        href: '/management/classes',
        icon: School
      },
      {
        id: 'courses',
        label: '课程管理',
        href: '/management/courses',
        icon: BookOpen
      },
      {
        id: 'rooms',
        label: '场室管理',
        href: '/management/rooms',
        icon: MapPin
      },
      {
        id: 'grade-templates',
        label: '年级模板',
        href: '/management/grade-templates',
        icon: BookOpen
      },
      {
        id: 'schedules',
        label: '排课设置',
        href: '/management/schedules',
        icon: Calendar
      }
    ]
  },
  {
    id: 'scheduling',
    label: '排课管理',
    href: '/management/schedules',
    icon: Calendar,
    children: [
      {
        id: 'manual-schedule',
        label: '手动排课',
        href: '/management/schedules/manual',
        icon: Calendar
      },
      {
        id: 'auto-schedule',
        label: '智能排课',
        href: '/management/schedules/integrated',
        icon: Settings
      },
      {
        id: 'view-schedule',
        label: '查看课表',
        href: '/management/schedules/schedule-view',
        icon: BookOpen
      }
    ]
  },
  {
    id: 'reports',
    label: '报表统计',
    href: '/reports',
    icon: BarChart3,
    children: [
      {
        id: 'teacher-workload',
        label: '教师工作量',
        href: '/reports/teacher-workload',
        icon: UserCheck
      },
      {
        id: 'room-utilization',
        label: '场室利用率',
        href: '/reports/room-utilization',
        icon: Building2
      },
      {
        id: 'class-schedule',
        label: '班级课表',
        href: '/reports/class-schedule',
        icon: FileText
      }
    ]
  }
];
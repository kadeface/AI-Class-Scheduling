/**
 * 场室管理页面
 * 
 * 提供场室信息的增删改查功能界面
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable, TableColumn } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ImportDialog } from '@/components/ui/import-dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Plus, Search, Filter, Home, Users, MapPin, Settings, Building, Upload } from 'lucide-react';
import { 
  Room, 
  CreateRoomRequest, 
  roomApi, 
  Class,
  classApi,
  ROOM_TYPES,
  EQUIPMENT_TYPES,
  WEEKDAYS,
  PaginatedResponse 
} from '@/lib/api';
import { formatDateTime, safeTrim } from '@/lib/utils';

/**
 * 场室管理页面组件
 * 
 * Returns:
 *   React.ReactElement: 场室管理页面
 */
export default function RoomsPage() {
  // 状态管理
  const [rooms, setRooms] = useState<Room[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  
  // 搜索和筛选状态
  const [searchParams, setSearchParams] = useState({
    keyword: '',
    type: '',
    building: '',
    isActive: '',
  });
  
  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  
  // 表单状态
  const [formData, setFormData] = useState<CreateRoomRequest>({
    name: '',
    roomNumber: '',
    type: '',
    capacity: 30,
    building: '',
    floor: 1,
    equipment: [],
    assignedClass: '',
    unavailableSlots: [],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  /**
   * 获取场室列表
   */
  const fetchRooms = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page: pagination.current,
        limit: pagination.pageSize,
      };
      
      if (searchParams.keyword) params.keyword = searchParams.keyword;
      if (searchParams.type) params.type = searchParams.type;
      if (searchParams.building) params.building = searchParams.building;
      if (searchParams.isActive) params.isActive = searchParams.isActive;
      
      const response = await roomApi.getList(params);
      
      if (response.success && response.data) {
        setRooms(response.data.items);
        setPagination(prev => ({
          ...prev,
          total: response.data!.total,
        }));
      }
    } catch (error) {
      console.error('获取场室列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 获取班级列表用于下拉选择
   */
  const fetchClasses = async () => {
    try {
      const response = await classApi.getList({ limit: 100 });
      if (response.success && response.data) {
        setClasses(response.data.items);
      }
    } catch (error) {
      console.error('获取班级数据失败:', error);
    }
  };

  // 页面加载时获取数据
  useEffect(() => {
    fetchRooms();
  }, [pagination.current, pagination.pageSize, searchParams]);

  useEffect(() => {
    fetchClasses();
  }, []);

  /**
   * 表格列配置
   */  const columns: TableColumn<Room>[] = [
    {
      key: 'name',
      title: '场室信息',
      dataIndex: 'name',
      render: (value, record) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-8 w-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <Home className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium">{value}</div>
            <div className="text-xs text-gray-500">
              {record.roomNumber} · {record.type}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'location',
      title: '位置',
      render: (_, record) => (
        <div className="space-y-1">
          {record.building && (
            <div className="flex items-center text-sm">
              <Building className="h-4 w-4 mr-1 text-gray-400" />
              {record.building}
            </div>
          )}
          {record.floor && (
            <div className="text-xs text-gray-500">
              {record.floor}楼
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'capacity',
      title: '容量',
      dataIndex: 'capacity',
      render: (value) => (
        <div className="flex items-center text-sm">
          <Users className="h-4 w-4 mr-1 text-gray-400" />
          {value} 人
        </div>
      ),
    },
    {
      key: 'assignedClass',
      title: '分配班级',
      dataIndex: 'assignedClass',
      render: (classInfo) => classInfo ? (
        <div className="text-sm">
          <div className="font-medium">{classInfo.name}</div>
          <div className="text-xs text-gray-500">{classInfo.grade}年级</div>
        </div>
      ) : (
        <span className="text-gray-400">未分配</span>
      ),
    },
    {
      key: 'equipment',
      title: '设备',
      dataIndex: 'equipment',
      render: (equipment: string[]) => (
        <div className="flex flex-wrap gap-1">
          {equipment.slice(0, 3).map((item, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
            >
              <Settings className="h-3 w-3 mr-1" />
              {item}
            </span>
          ))}
          {equipment.length > 3 && (
            <span className="text-xs text-gray-500">
              +{equipment.length - 3}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'isActive',
      title: '状态',
      dataIndex: 'isActive',
      render: (value) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          value 
            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
        }`}>
          {value ? '可用' : '停用'}
        </span>
      ),
    },
  ];

  /**
   * 处理分页变化
   */
  const handlePageChange = (page: number, pageSize: number) => {
    setPagination(prev => ({ ...prev, current: page, pageSize }));
  };

  /**
   * 处理搜索
   */
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    // 强制重新获取数据
    fetchRooms();
  };

  /**
   * 重置搜索
   */
  const handleResetSearch = () => {
    setSearchParams({
      keyword: '',
      type: '',
      building: '',
      isActive: '',
    });
  };

  /**
   * 打开新建对话框
   */
  const handleCreate = () => {
    setEditingRoom(null);
    setFormData({
      name: '',
      roomNumber: '',
      type: '',
      capacity: 30,
      building: '',
      floor: 1,
      equipment: [],
      assignedClass: '',
      unavailableSlots: [],
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  /**
   * 打开编辑对话框
   */
  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      roomNumber: room.roomNumber,
      type: room.type,
      capacity: room.capacity,
      building: room.building || '',
      floor: room.floor || 1,
      equipment: room.equipment,
      assignedClass: room.assignedClass?._id || '',
      unavailableSlots: room.unavailableSlots,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  /**
   * 打开删除确认对话框
   */
  const handleDelete = (room: Room) => {
    setDeletingRoom(room);
    setDeleteDialogOpen(true);
  };

  /**
   * 表单验证
   */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!safeTrim(formData.name)) {
      errors.name = '请输入场室名称';
    }

    if (!formData.roomNumber.trim()) {
      errors.roomNumber = '请输入房间号';
    }

    if (!formData.type) {
      errors.type = '请选择场室类型';
    }

    if (isNaN(formData.capacity) || formData.capacity < 1 || formData.capacity > 500) {
      errors.capacity = '容量必须在1-500之间';
    }

    if (
      formData.floor === undefined ||
      isNaN(formData.floor) ||
      formData.floor < 1 ||
      formData.floor > 50
    ) {
      errors.floor = '楼层必须在1-50之间';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * 提交表单
   */
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const submitData = {
        ...formData,
        assignedClass: formData.assignedClass || undefined,
        building: formData.building || undefined,
        floor: formData.floor || undefined,
      };

      if (editingRoom) {
        await roomApi.update(editingRoom._id, submitData);
      } else {
        await roomApi.create(submitData);
      }

      setDialogOpen(false);
      fetchRooms();
    } catch (error) {
      console.error('保存场室失败:', error);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 确认删除场室
   */
  const handleConfirmDelete = async () => {
    if (!deletingRoom) return;

    try {
      await roomApi.delete(deletingRoom._id);
      setDeleteDialogOpen(false);
      setDeletingRoom(null);
      fetchRooms();
    } catch (error) {
      console.error('删除场室失败:', error);
    }
  };

  /**
   * 处理批量导入
   */
  const handleBatchImport = async (data: CreateRoomRequest[]) => {
    try {
      // 批量创建场室
      const promises = data.map(roomData => roomApi.create(roomData));
      await Promise.all(promises);
      
      fetchRooms(); // 重新获取数据
      // TODO: 显示成功提示
    } catch (error) {
      console.error('批量导入失败:', error);
      throw error; // 让导入组件处理错误显示
    }
  };

  /**
   * 处理设备选择
   */
  const handleEquipmentToggle = (equipment: string) => {
    const currentEquipment = formData.equipment || [];
    const newEquipment = currentEquipment.includes(equipment)
      ? currentEquipment.filter(e => e !== equipment)
      : [...currentEquipment, equipment];
    
    setFormData(prev => ({ ...prev, equipment: newEquipment }));
  };

  // 获取建筑列表（从现有数据中提取）
  const buildingOptions = Array.from(new Set(rooms.map(room => room.building).filter(Boolean)))
    .map(building => ({ value: building!, label: building! }));

  // 一键清除处理函数
  const handleClearAll = async () => {
    setClearing(true);
    try {
      const res = await fetch('/api/import/rooms/clear', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('已清空全部场室数据');
        // 这里可以触发刷新列表
      } else {
        alert(data.message || '清空失败');
      }
    } catch (err) {
      alert('清空失败，请重试');
    } finally {
      setClearing(false);
      setClearDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">场室管理</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            管理教室、实验室等场室信息和设备配置
          </p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            新增场室
          </Button>
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            批量导入
          </Button>
          <Button variant="destructive" onClick={() => setClearDialogOpen(true)}>
            一键清除全部
          </Button>
        </div>
      </div>

      {/* 搜索和筛选栏 */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索场室名称、房间号..."
            value={searchParams.keyword}
            onChange={(e) => setSearchParams(prev => ({ ...prev, keyword: e.target.value }))}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
        
        <Select
          value={searchParams.type}
          onValueChange={(value) => setSearchParams(prev => ({ ...prev, type: value }))}
          options={[
            { value: '', label: '全部类型' },
            ...ROOM_TYPES.map(type => ({ value: type, label: type }))
          ]}
          className="w-40"
        />
        
        <Select
          value={searchParams.building}
          onValueChange={(value) => setSearchParams(prev => ({ ...prev, building: value }))}
          options={[
            { value: '', label: '全部建筑' },
            ...buildingOptions
          ]}
          className="w-32"
        />
        
        <Select
          value={searchParams.isActive}
          onValueChange={(value) => setSearchParams(prev => ({ ...prev, isActive: value }))}
          options={[
            { value: '', label: '全部状态' },
            { value: 'true', label: '可用' },
            { value: 'false', label: '停用' },
          ]}
          className="w-32"
        />
        
        <Button variant="outline" onClick={handleSearch}>
          <Filter className="h-4 w-4 mr-2" />
          搜索
        </Button>
        
        {(searchParams.keyword || searchParams.type || searchParams.building || searchParams.isActive) && (
          <Button variant="outline" onClick={handleResetSearch}>
            重置
          </Button>
        )}
      </div>

      {/* 场室列表 */}
      <DataTable
        columns={columns}
        dataSource={rooms}
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
        }}
        onPageChange={handlePageChange}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* 新建/编辑场室对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? '编辑场室' : '新增场室'}
            </DialogTitle>
            <DialogClose onClose={() => setDialogOpen(false)} />
          </DialogHeader>

          <div className="p-6 space-y-6">
            {/* 基本信息 */}
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <Home className="h-5 w-5 mr-2" />
                基本信息
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="场室名称"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                  required
                />
                
                <Input
                  label="房间号"
                  value={formData.roomNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, roomNumber: e.target.value }))}
                  error={!!formErrors.roomNumber}
                  helperText={formErrors.roomNumber}
                  required
                />

                <Select
                  label="场室类型"
                  value={formData.type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                  options={ROOM_TYPES.map(type => ({ value: type, label: type }))}
                  error={!!formErrors.type}
                  helperText={formErrors.type}
                  required
                />

                <Input
                  label="容量（人数）"
                  type="number"
                  min="1"
                  max="500"
                  value={formData.capacity}
                  onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                  error={!!formErrors.capacity}
                  helperText={formErrors.capacity}
                  required
                />
              </div>
            </div>

            {/* 位置信息 */}
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                位置信息
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="建筑名称"
                  value={formData.building}
                  onChange={(e) => setFormData(prev => ({ ...prev, building: e.target.value }))}
                  placeholder="如：教学楼A、实验楼"
                />
                
                <Input
                  label="楼层"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.floor || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, floor: parseInt(e.target.value) || undefined }))}
                  error={!!formErrors.floor}
                  helperText={formErrors.floor}
                />
              </div>
            </div>

            {/* 分配信息 */}
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                分配信息
              </h3>
              <Select
                label="分配班级"
                value={formData.assignedClass}
                onValueChange={(value) => setFormData(prev => ({ ...prev, assignedClass: value }))}
                options={[
                  { value: '', label: '无分配班级' },
                  ...classes.map(classItem => ({
                    value: classItem._id,
                    label: `${classItem.name} (${classItem.grade}年级)`
                  }))
                ]}
              />
            </div>

            {/* 设备配置 */}
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                设备配置
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {EQUIPMENT_TYPES.map((equipment) => (
                  <label
                    key={equipment}
                    className="flex items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={(formData.equipment || []).includes(equipment)}
                      onChange={() => handleEquipmentToggle(equipment)}
                      className="mr-2"
                    />
                    <span className="text-sm">{equipment}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogClose onClose={() => setDeleteDialogOpen(false)} />
          </DialogHeader>

          <div className="p-6">
            <p className="text-gray-600 dark:text-gray-400">
              确定要删除场室 <span className="font-medium">{deletingRoom?.name}</span> 吗？
              此操作会将场室设为停用状态，不会永久删除数据。
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量导入对话框 */}
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        resourceType="room"
        onImport={handleBatchImport}
      />

      {/* 二次确认对话框 */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>危险操作：清空全部场室数据</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-red-600">
            此操作将删除所有场室数据，且不可恢复。确定要继续吗？
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearDialogOpen(false)}>
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleClearAll}
              disabled={clearing}
            >
              {clearing ? '正在清空...' : '确认清空'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
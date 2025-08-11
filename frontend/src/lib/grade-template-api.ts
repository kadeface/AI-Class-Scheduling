import { 
  GradeTemplate, 
  CreateGradeTemplateRequest, 
  UpdateGradeTemplateRequest, 
  GradeTemplateQueryParams,
  CopyTemplateRequest,
  GradeTemplateListResponse,
  GradeTemplateResponse
} from '@/types/grade-template';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * 年级课程模板API服务
 * 
 * 提供与后端年级课程模板相关的所有API调用
 */
export const gradeTemplateApi = {
  /**
   * 获取年级课程模板列表
   * 
   * Args:
   *   params: 查询参数
   * 
   * Returns:
   *   Promise<GradeTemplateListResponse>
   */
  async getList(params: GradeTemplateQueryParams = {}): Promise<GradeTemplateListResponse> {
    try {
      const queryString = new URLSearchParams();
      
      if (params.grade) queryString.append('grade', params.grade);
      if (params.isActive !== undefined) queryString.append('isActive', params.isActive.toString());
      if (params.isDefault !== undefined) queryString.append('isDefault', params.isDefault.toString());
      if (params.keyword) queryString.append('keyword', params.keyword);
      
      const url = `${API_BASE_URL}/grade-templates${queryString.toString() ? `?${queryString.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('获取模板列表失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取模板列表失败',
        data: []
      };
    }
  },

  /**
   * 根据年级获取默认模板
   * 
   * Args:
   *   grade: 年级标识
   * 
   * Returns:
   *   Promise<GradeTemplateResponse>
   */
  async getDefaultByGrade(grade: string): Promise<GradeTemplateResponse> {
    try {
      const url = `${API_BASE_URL}/grade-templates/default/${encodeURIComponent(grade)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error: `未找到${grade}年级的默认模板`,
            data: {} as GradeTemplate
          };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('获取默认模板失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取默认模板失败',
        data: {} as GradeTemplate
      };
    }
  },

  /**
   * 创建年级课程模板
   * 
   * Args:
   *   data: 创建模板的数据
   * 
   * Returns:
   *   Promise<GradeTemplateResponse>
   */
  async create(data: CreateGradeTemplateRequest): Promise<GradeTemplateResponse> {
    try {
      const url = `${API_BASE_URL}/grade-templates`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('创建模板失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建模板失败',
        data: {} as GradeTemplate
      };
    }
  },

  /**
   * 更新年级课程模板
   * 
   * Args:
   *   id: 模板ID
   *   data: 更新数据
   * 
   * Returns:
   *   Promise<GradeTemplateResponse>
   */
  async update(id: string, data: UpdateGradeTemplateRequest): Promise<GradeTemplateResponse> {
    try {
      const url = `${API_BASE_URL}/grade-templates/${id}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('更新模板失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新模板失败',
        data: {} as GradeTemplate
      };
    }
  },

  /**
   * 删除年级课程模板
   * 
   * Args:
   *   id: 模板ID
   * 
   * Returns:
   *   Promise<{ success: boolean; message?: string; error?: string }>
   */
  async delete(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const url = `${API_BASE_URL}/grade-templates/${id}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('删除模板失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除模板失败'
      };
    }
  },

  /**
   * 设置默认模板
   * 
   * Args:
   *   id: 模板ID
   * 
   * Returns:
   *   Promise<GradeTemplateResponse>
   */
  async setDefault(id: string): Promise<GradeTemplateResponse> {
    try {
      const url = `${API_BASE_URL}/grade-templates/${id}/set-default`;
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('设置默认模板失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '设置默认模板失败',
        data: {} as GradeTemplate
      };
    }
  },

  /**
   * 复制模板
   * 
   * Args:
   *   id: 源模板ID
   *   data: 复制参数
   * 
   * Returns:
   *   Promise<GradeTemplateResponse>
   */
  async copy(id: string, data: CopyTemplateRequest): Promise<GradeTemplateResponse> {
    try {
      const url = `${API_BASE_URL}/grade-templates/${id}/copy`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('复制模板失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '复制模板失败',
        data: {} as GradeTemplate
      };
    }
  }
};

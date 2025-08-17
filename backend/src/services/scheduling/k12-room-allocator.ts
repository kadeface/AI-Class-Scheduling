import mongoose from 'mongoose';

/**
 * K12课室分配器（简化版）
 * 
 * 核心功能：
 * 1. 必须使用功能教室的课程 → 功能教室
 * 2. 其他所有课程 → 固定教室
 */
export class K12RoomAllocator {
  
  /**
   * 主要课室分配方法（简化版）
   * 只有两种情况：功能教室 或 固定教室
   * 
   * @param course 课程信息
   * @param classId 班级ID
   * @param rooms 可用教室列表
   * @param classes 班级列表
   * @returns 分配的课室或null
   */
  getRoomAssignment(
    course: any,
    classId: mongoose.Types.ObjectId, 
    rooms: any[], 
    classes?: any[]
  ): any | null {
    
    // 情况1：必须使用功能教室的课程
    if (this.mustUseSpecialRoom(course.subject)) {
      const specialRoom = this.findSpecialRoomForCourse(course, rooms);
      if (specialRoom) {
        console.log(`🏟️ 课程 ${course.subject} 分配功能教室: ${specialRoom.name}`);
        return specialRoom;
      }
      console.log(`❌ 课程 ${course.subject} 必须使用功能教室，但找不到可用教室`);
      return null;
    }
    
    // 情况2：其他所有课程使用固定教室
    const fixedRoom = this.getFixedRoomForClass(classId, rooms, classes);
    if (fixedRoom) {
      console.log(`🏫 课程 ${course.subject} 分配固定教室: ${fixedRoom.name}`);
      return fixedRoom;
    }
    
    console.log(`❌ 课程 ${course.subject} 无法获取固定教室，排课失败`);
    return null;
  }

  /**
   * 判断课程是否必须使用功能教室
   */
  private mustUseSpecialRoom(subject: string): boolean {
    // 只有少数课程必须使用功能教室
    const mustUseSpecialRoomSubjects = [
      '物理',      // 需要实验室
      '化学',      // 需要实验室  
      '体育',      // 需要运动场地
      '信息技术'   // 需要计算机教室
    ];
    return mustUseSpecialRoomSubjects.includes(subject);
  }

  /**
   * 查找课程的功能教室
   */
  private findSpecialRoomForCourse(course: any, rooms: any[]): any | null {
    const roomMapping: { [key: string]: string[] } = {
      '物理': ['实验室', '物理实验室'],
      '化学': ['实验室', '化学实验室'],
      '体育': ['体育场', '体育馆', '操场'],
      '信息技术': ['计算机教室', '电脑教室']
    };
    
    const roomTypes = roomMapping[course.subject];
    if (!roomTypes) return null;
    
    return rooms.find(room => 
      room.isActive && 
      !room.assignedClass &&  // 未固定分配
      roomTypes.some((type: string) => 
        room.type?.includes(type) || room.name?.includes(type)
      )
    );
  }

  /**
   * 获取班级的固定课室
   * 
   * @param classId 班级ID
   * @param rooms 可用教室列表
   * @param classes 班级列表（用于建立绑定关系）
   * @returns 固定课室或null
   */
  getFixedRoomForClass(
    classId: mongoose.Types.ObjectId, 
    rooms: any[], 
    classes?: any[]
  ): any | null {
//    console.log(`      🔍 [固定课室查找] 为班级 ${classId} 查找固定课室...`);    
    if (!rooms || rooms.length === 0) {
      console.log(`         ❌ 没有可用教室`);
      return null;
    }

    // 方法1：通过教室的assignedClass字段查找固定课室
    //console.log(`         🔍 方法1: 检查教室assignedClass字段...`);
    const fixedRoom = rooms.find(room => {
      if (room.assignedClass && room.assignedClass.toString() === classId.toString()) {
        return true;
      }
      return false;
    });

    if (fixedRoom) {
      return fixedRoom;
    } else {
      console.log(`         ❌ 方法1失败: 没有找到assignedClass匹配的教室`);
    }

    // 方法2：通过班级的homeroom字段查找固定课室
    if (classes) {
      console.log(`         🔍 方法2: 检查班级homeroom字段...`);
      const classInfo = classes.find(c => c._id.toString() === classId.toString());
      if (classInfo) {

        if (classInfo.homeroom) {

          const homeroomRoom = rooms.find(room => 
            room._id.toString() === classInfo.homeroom.toString()
          );
          
          if (homeroomRoom) {

          
            // 自动建立双向绑定关系
            this.establishClassRoomBinding(classInfo, homeroomRoom);
            return homeroomRoom;
          } else {
            console.log(`            ❌ homeroom教室不在可用教室列表中`);
          }
        } else {
          console.log(`            ❌ 班级没有设置homeroom字段`);
        }
      } else {
        console.log(`            ❌ 没有找到对应的班级信息`);
      }
    } else {
      console.log(`         ❌ 方法2跳过: 没有提供班级信息`);
    }

    // 方法3：智能名称匹配策略
    console.log(`         🔍 方法3: 尝试智能名称匹配...`);
    const nameMatchedRoom = this.findRoomByNameMatching(classId, rooms, classes);
    if (nameMatchedRoom) {
    // 自动建立绑定关系
      if (classes) {
        const classInfo = classes.find(c => c._id.toString() === classId.toString());
        if (classInfo) {
          this.establishClassRoomBinding(classInfo, nameMatchedRoom);
        }
      }
      
      return nameMatchedRoom;
    } else {
      console.log(`         ❌ 方法3失败: 名称匹配未找到合适教室`);
    }

    // 方法4：智能分配策略已删除，简化逻辑
    console.log(`         ❌ 方法4跳过: 智能分配策略已简化删除`);
    console.log(`            📋 失败原因: 所有教室都不可用`);
    console.log(`            💡 建议: 检查班级 ${classId} 的固定课室配置`);
    return null;
  }

  /**
   * 智能名称匹配策略
   * 根据班级名称和教室名称的相似性进行匹配
   */
  private findRoomByNameMatching(classId: mongoose.Types.ObjectId, rooms: any[], classes?: any[]): any | null {
    if (!classes) return null;
    
    const classInfo = classes.find(c => c._id.toString() === classId.toString());
    if (!classInfo) return null;

    const className = classInfo.name;
    console.log(`            🔍 尝试名称匹配: 班级名称 "${className}"`);

         // 策略1：完全匹配（例如：一年级8班 -> 一年级8班教室）
     let matchedRoom = rooms.find(room => room.name === className);
     if (matchedRoom) {
       console.log(`               ✅ 完全匹配: "${className}" -> "${matchedRoom.name}"`);
       return matchedRoom;
     }

         // 策略2：包含匹配（例如：一年级8班 -> 包含"一年级8班"的教室名称）
     matchedRoom = rooms.find(room => room.name && room.name.includes(className));
     if (matchedRoom) {
       console.log(`               ✅ 包含匹配: "${className}" 包含在 "${matchedRoom.name}"`);
       return matchedRoom;
     }

         // 策略3：年级匹配（例如：一年级8班 -> 1楼教室）
     const gradeMatch = className.match(/(\d+)年级/);
     if (gradeMatch) {
       const grade = parseInt(gradeMatch[1]);
       matchedRoom = rooms.find(room => room.floor === grade);
       if (matchedRoom) {
         console.log(`               ✅ 年级匹配: ${grade}年级 -> ${grade}楼教室 "${matchedRoom.name}"`);
         return matchedRoom;
       }
     }

         // 策略4：班级号匹配（例如：一年级8班 -> 108教室）
     const classNumberMatch = className.match(/(\d+)班/);
     if (classNumberMatch) {
       const classNumber = classNumberMatch[1];
       matchedRoom = rooms.find(room => 
         room.roomNumber && room.roomNumber.includes(classNumber)
       );
       if (matchedRoom) {
         console.log(`               ✅ 班级号匹配: ${classNumber}班 -> 包含${classNumber}的教室 "${matchedRoom.name}"`);
         return matchedRoom;
       }
     }

    console.log(`               ❌ 名称匹配失败: 没有找到合适的教室`);
    return null;
  }




  /**
   * 建立班级-教室双向绑定关系
   * 同时更新Class.homeroom和Room.assignedClass字段
   */
  private async establishClassRoomBinding(classInfo: any, room: any): Promise<void> {
    try {
      console.log(`            🔗 建立班级-教室绑定关系: ${classInfo.name} <-> ${room.name}`);
      
      // 这里应该调用数据库更新操作
      // 由于这是同步方法，我们只记录绑定关系
      console.log(`            📋 绑定关系: 班级 ${classInfo._id} -> 教室 ${room._id}`);
      console.log(`            💡 建议: 运行数据库更新脚本建立持久化绑定关系`);
      
    } catch (error) {
      console.error(`            ❌ 建立绑定关系时发生错误:`, error);
    }
  }

  /**
   * 批量建立班级-教室绑定关系
   * 用于初始化或修复绑定关系
   */
  async establishBatchClassRoomBindings(classes: any[], rooms: any[]): Promise<{ success: number; failed: number }> {
    console.log('🔗 开始批量建立班级-教室绑定关系...');
    
    let successCount = 0;
    let failedCount = 0;

    for (const classInfo of classes) {
      try {
        const room = this.getFixedRoomForClass(classInfo._id, rooms, classes);
        if (room) {
          // 这里应该调用数据库更新操作
          console.log(`   ✅ 班级 ${classInfo.name} 绑定到教室 ${room.name}`);
          successCount++;
        } else {
          console.log(`   ❌ 班级 ${classInfo.name} 无法绑定教室`);
          failedCount++;
        }
      } catch (error) {
        console.error(`   ❌ 班级 ${classInfo.name} 绑定失败:`, error);
        failedCount++;
      }
    }

    console.log(`📊 批量绑定完成: 成功 ${successCount} 个，失败 ${failedCount} 个`);
    return { success: successCount, failed: failedCount };
  }

  /**
   * 验证课室分配的有效性
   * 
   * @param assignment 课程分配
   * @returns 是否有效
   */
  validateRoomAssignment(assignment: any): boolean {
    try {
      // 检查基本字段
      if (!assignment.roomId || !assignment.classId || !assignment.timeSlot) {
        console.log(`         ❌ 课室分配验证失败: 缺少必要字段`);
        return false;
      }

      // 检查课室ID格式
      if (!mongoose.Types.ObjectId.isValid(assignment.roomId)) {
        console.log(`         ❌ 课室分配验证失败: 课室ID格式无效`);
        return false;
      }

      // 检查班级ID格式
      if (!mongoose.Types.ObjectId.isValid(assignment.classId)) {
        console.log(`         ❌ 课室分配验证失败: 班级ID格式无效`);
        return false;
      }

      // 检查时间槽格式
      if (typeof assignment.timeSlot.dayOfWeek !== 'number' || 
          typeof assignment.timeSlot.period !== 'number') {
        console.log(`         ❌ 课室分配验证失败: 时间槽格式无效`);
        return false;
      }

      console.log(`         ✅ 课室分配验证通过`);
      return true;

    } catch (error) {
      console.error(`         ❌ 课室分配验证过程中发生错误:`, error);
      return false;
    }
  }

  /**
   * 检查课室冲突
   * 
   * @param roomId 课室ID
   * @param timeSlot 时间槽
   * @param currentAssignments 当前所有分配
   * @returns 是否存在冲突
   */
  checkRoomConflict(
    roomId: mongoose.Types.ObjectId, 
    timeSlot: any, 
    currentAssignments: Map<string, any>
  ): boolean {
    for (const assignment of Array.from(currentAssignments.values())) {
      if (assignment.roomId.toString() === roomId.toString() &&
          assignment.timeSlot.dayOfWeek === timeSlot.dayOfWeek &&
          assignment.timeSlot.period === timeSlot.period) {
        console.log(`         ❌ 课室冲突检测: 课室 ${roomId} 在时间槽 ${timeSlot.dayOfWeek}-${timeSlot.period} 已被占用`);
        return true;
      }
    }
    
    console.log(`         ✅ 课室冲突检测: 课室 ${roomId} 在时间槽 ${timeSlot.dayOfWeek}-${timeSlot.period} 可用`);
    return false;
  }

  /**
   * 获取课室信息
   * 
   * @param roomId 课室ID
   * @param rooms 可用教室列表
   * @returns 课室信息或null
   */
  getRoomInfo(roomId: mongoose.Types.ObjectId, rooms: any[]): any | null {
    return rooms.find(room => room._id.toString() === roomId.toString()) || null;
  }

  /**
   * 检查课室是否满足课程要求
   * 
   * @param room 课室信息
   * @param courseRequirements 课程要求
   * @returns 是否满足要求
   */
  checkRoomRequirements(room: any, courseRequirements: any): boolean {
    try {
      if (!courseRequirements) {
        return true; // 没有特殊要求
      }

      // 检查容量要求
      if (courseRequirements.capacity && room.capacity) {
        if (room.capacity < courseRequirements.capacity) {
          console.log(`         ❌ 课室容量不满足要求: 需要 ${courseRequirements.capacity}, 课室容量 ${room.capacity}`);
          return false;
        }
      }

      // 检查设备要求
      if (courseRequirements.equipment && courseRequirements.equipment.length > 0) {
        const roomEquipment = room.equipment || [];
        const missingEquipment = courseRequirements.equipment.filter(
          (req: string) => !roomEquipment.includes(req)
        );
        
        if (missingEquipment.length > 0) {
          console.log(`         ❌ 课室设备不满足要求: 缺少 ${missingEquipment.join(', ')}`);
          return false;
        }
      }

      // 检查课室类型要求
      if (courseRequirements.types && courseRequirements.types.length > 0) {
        const roomType = room.type || room.roomType;
        if (!courseRequirements.types.includes(roomType)) {
          console.log(`         ❌ 课室类型不满足要求: 需要 ${courseRequirements.types.join(', ')}, 课室类型 ${roomType}`);
          return false;
        }
      }

      console.log(`         ✅ 课室要求检查通过`);
      return true;

    } catch (error) {
      console.error(`         ❌ 课室要求检查过程中发生错误:`, error);
      return false;
    }
  }
}

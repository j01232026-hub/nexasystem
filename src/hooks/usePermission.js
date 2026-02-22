import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * 權限管理 Hook
 * 提供 3 種角色的權限檢查
 * 
 * @returns {Object} 權限相關方法和狀態
 */
export const usePermission = () => {
  const [staff, setStaff] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 獲取當前員工資訊和角色
  useEffect(() => {
    const fetchStaffInfo = async () => {
      try {
        setLoading(true);
        
        // 獲取當前用戶
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setLoading(false);
          return;
        }

        // 查詢員工資訊和角色
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select(`
            *,
            roles (*)
          `)
          .eq('user_id', user.id)
          .single();

        if (staffError) {
          console.log('Staff not found, checking profile role...');
          
          // 如果沒有 staff 記錄，從 profile 獲取角色
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role, tenant_id')
            .eq('id', user.id)
            .single();

          if (profileData?.role) {
            // 根據 profile role 獲取對應的 role 記錄
            const { data: roleData } = await supabase
              .from('roles')
              .select('*')
              .eq('name', profileData.role === 'admin' ? 'admin' : 'staff')
              .single();

            setRole(roleData);
          }
        } else {
          setStaff(staffData);
          setRole(staffData.roles);
        }
      } catch (err) {
        console.error('Error fetching permission:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStaffInfo();
  }, []);

  /**
   * 檢查是否有特定權限
   * @param {string} permission - 權限名稱
   * @returns {boolean}
   */
  const can = useCallback((permission) => {
    if (!role?.permissions) return false;
    return role.permissions[permission] === true;
  }, [role]);

  /**
   * 檢查是否為老闆
   */
  const isAdmin = useCallback(() => {
    return role?.name === 'admin';
  }, [role]);

  /**
   * 檢查是否為店長
   */
  const isManager = useCallback(() => {
    return role?.name === 'manager';
  }, [role]);

  /**
   * 檢查是否為員工
   */
  const isStaff = useCallback(() => {
    return role?.name === 'staff';
  }, [role]);

  /**
   * 獲取當前用戶 ID
   */
  const getUserId = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  }, []);

  /**
   * 獲取當前 staff ID
   */
  const getStaffId = useCallback(() => {
    return staff?.id;
  }, [staff]);

  return {
    // 權限檢查
    can,
    isAdmin,
    isManager,
    isStaff,
    
    // 數據
    staff,
    role,
    loading,
    error,
    
    // 輔助方法
    getUserId,
    getStaffId,
  };
};

export default usePermission;

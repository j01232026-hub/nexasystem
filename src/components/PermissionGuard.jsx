import React from 'react';
import { usePermission } from '../hooks/usePermission';

/**
 * 權限守衛組件
 * 根據權限決定是否渲染子元素
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - 子元素
 * @param {string} [props.permission] - 需要的權限
 * @param {boolean} [props.adminOnly] - 僅老闆可見
 * @param {boolean} [props.managerOnly] - 僅店長以上可見
 * @param {React.ReactNode} [props.fallback] - 無權限時顯示的內容
 */
const PermissionGuard = ({ 
  children, 
  permission,
  adminOnly = false,
  managerOnly = false,
  fallback = null
}) => {
  const { can, isAdmin, isManager, loading } = usePermission();

  if (loading) {
    return null; // 或顯示載入狀態
  }

  let hasPermission = true;

  if (permission && !can(permission)) {
    hasPermission = false;
  }

  if (adminOnly && !isAdmin()) {
    hasPermission = false;
  }

  if (managerOnly && !(isAdmin() || isManager())) {
    hasPermission = false;
  }

  if (!hasPermission) {
    return fallback;
  }

  return children;
};

export default PermissionGuard;

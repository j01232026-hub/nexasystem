import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermission } from '../hooks/usePermission';
import { Lock } from '@phosphor-icons/react';

/**
 * 權限保護路由組件
 * 根據用戶權限決定是否顯示內容
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - 子組件
 * @param {string} [props.requiredPermission] - 需要的權限
 * @param {boolean} [props.requireAdmin] - 是否需要老闆權限
 * @param {boolean} [props.requireManager] - 是否需要店長以上權限
 * @param {boolean} [props.fallbackToLogin] - 無權限時是否跳轉登入頁
 */
const ProtectedRoute = ({ 
  children, 
  requiredPermission,
  requireAdmin = false,
  requireManager = false,
  fallbackToLogin = false
}) => {
  const { can, isAdmin, isManager, loading } = usePermission();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  // 檢查權限
  let hasPermission = true;

  if (requiredPermission && !can(requiredPermission)) {
    hasPermission = false;
  }

  if (requireAdmin && !isAdmin()) {
    hasPermission = false;
  }

  if (requireManager && !(isAdmin() || isManager())) {
    hasPermission = false;
  }

  if (!hasPermission) {
    if (fallbackToLogin) {
      return <Navigate to="/login" replace />;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50 p-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-rose-100/50 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-rose-500" weight="bold" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">無法訪問此頁面</h2>
          <p className="text-gray-500 mb-6">
            您沒有權限查看此內容，請聯繫管理員。
          </p>
          <button 
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-colors"
          >
            返回上一頁
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;

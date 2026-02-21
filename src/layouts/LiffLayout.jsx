
import React from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { House, CalendarCheck, Bell, User } from '@phosphor-icons/react';
import { useTheme } from '../context/ThemeContext';
import { useLiffAuth } from '../context/LiffAuthContext';
import LiffLoginPage from '../pages/liff/LiffLoginPage';

const LiffLayout = () => {
  const { themeColor } = useTheme();
  const { tenantId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useLiffAuth();

  const tabs = [
    { path: `/liff/${tenantId}/home`, icon: House, label: '首頁' },
    { path: `/liff/${tenantId}/records`, icon: CalendarCheck, label: '行程' },
    { path: `/liff/${tenantId}/news`, icon: Bell, label: '通知' },
    { path: `/liff/${tenantId}/profile`, icon: User, label: '我的' },
  ];

  // Helper to check if active
  const isActive = (path) => location.pathname.startsWith(path);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-rose-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LiffLoginPage />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center z-50 safe-area-bottom">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center space-y-1 w-16"
            >
              <tab.icon
                size={24}
                weight={active ? 'fill' : 'regular'}
                color={active ? themeColor : '#9CA3AF'}
              />
              <span
                className="text-xs font-medium"
                style={{ color: active ? themeColor : '#9CA3AF' }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LiffLayout;

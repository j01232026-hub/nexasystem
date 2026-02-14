import React from 'react';
import { useLiffAuth } from '../../context/LiffAuthContext';
import { Sparkle, User, ArrowRight } from '@phosphor-icons/react';
import { useTheme } from '../../context/ThemeContext';

const LiffLoginPage = () => {
  const { login, loading } = useLiffAuth();
  const { themeColor } = useTheme();

  const handleMockLogin = () => {
    // Mock user data mimicking LINE Profile
    const mockUser = {
      userId: 'Umock123456789',
      displayName: 'Amy (測試帳號)',
      pictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amy',
    };
    login(mockUser);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="w-full max-w-sm text-center space-y-8">
        
        {/* Logo / Branding */}
        <div className="flex justify-center mb-6">
           <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl transform rotate-3" style={{ backgroundColor: themeColor }}>
              <Sparkle weight="fill" className="text-white w-10 h-10" />
           </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">歡迎來到線上預約</h1>
          <p className="text-gray-500">請登入以繼續使用預約服務</p>
        </div>

        {/* Login Button Area */}
        <div className="pt-8 space-y-4">
          <button
            onClick={handleMockLogin}
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-white shadow-lg shadow-gray-200 flex items-center justify-center space-x-2 active:scale-95 transition-all"
            style={{ backgroundColor: '#00B900' }} // LINE Green
          >
            {loading ? (
              <span>登入中...</span>
            ) : (
              <>
                <User weight="bold" size={20} />
                <span>LINE 帳號登入 (模擬)</span>
              </>
            )}
          </button>
          
          <div className="text-xs text-gray-400 mt-4">
            開發模式：此按鈕將模擬 LINE Login 流程
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiffLoginPage;

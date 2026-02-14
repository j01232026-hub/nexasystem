
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useLiffAuth } from '../../context/LiffAuthContext';
import { Sparkle, CalendarPlus, Clock, ArrowRight } from '@phosphor-icons/react';

const LiffHomePage = () => {
  const { themeColor } = useTheme();
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { liffUser, loading, error } = useLiffAuth();

  // Get current hour for greeting
  const currentHour = new Date().getHours();
  let greeting = '早安';
  if (currentHour >= 11 && currentHour < 17) {
    greeting = '午安';
  } else if (currentHour >= 17) {
    greeting = '晚安';
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
            <div className="bg-white p-6 rounded-xl shadow-md max-w-sm w-full text-center">
                <h3 className="text-red-500 font-bold text-lg mb-2">Initialization Error</h3>
                <p className="text-gray-600 mb-4 text-sm">{error}</p>
                <p className="text-xs text-gray-400">LIFF ID: {import.meta.env.VITE_LIFF_ID || 'Not Set'}</p>
                <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm">Retry</button>
            </div>
        </div>
    );
  }

  const displayName = liffUser?.displayName || '訪客';
  const avatarUrl = liffUser?.pictureUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest';

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Hero Section */}
      <div className="relative bg-white shadow-sm overflow-hidden rounded-b-[40px]">
        {/* Decorative Background - Organic Shapes */}
        <div className="absolute top-[-50%] right-[-20%] w-[80%] h-[150%] rounded-[40%] bg-gradient-to-b from-transparent to-white opacity-20 transform rotate-12 z-0 pointer-events-none" style={{ backgroundColor: themeColor }}></div>
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[80%] rounded-[100%] blur-3xl opacity-15 pointer-events-none" style={{ backgroundColor: themeColor }}></div>
        <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] rounded-full blur-2xl opacity-5 pointer-events-none" style={{ backgroundColor: themeColor }}></div>
        
        <div className="p-6 pt-10 pb-12 relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">{greeting}，{displayName}</h1>
              <p className="text-gray-500 text-base font-medium">今天想做點什麼改變呢？</p>
            </div>
            <div className="w-12 h-12 rounded-full p-0.5 shadow-md bg-white">
               <img src={avatarUrl} alt="User" className="w-full h-full rounded-full object-cover" />
            </div>
          </div>
          
          <button
            onClick={() => navigate(`/liff/${tenantId}/booking/new`)}
            className="w-full py-5 rounded-2xl text-white font-bold text-lg shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)] flex items-center justify-between px-8 transform active:scale-[0.98] transition-all relative overflow-hidden group border border-white/20"
            style={{ 
                background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}dd 100%)`,
                boxShadow: `0 15px 30px -10px ${themeColor}60` 
            }}
          >
            {/* Glassy Shine Effect */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent opacity-60"></div>
            
            {/* Icon Circle */}
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
                 <CalendarPlus size={20} weight="fill" className="text-white" />
            </div>
            
            <span className="tracking-widest text-xl font-medium text-shadow-sm flex-1 text-center pl-2">立即預約</span>
            
            <div className="flex items-center space-x-1 opacity-80 group-hover:translate-x-1 transition-transform">
                <span className="text-xs font-light tracking-wider uppercase">Book Now</span>
                <ArrowRight size={18} />
            </div>
          </button>
        </div>
      </div>

      {/* Live Links / Smart Slots */}
      <div className="p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-gray-900 text-lg flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-yellow-100 text-yellow-600">
                <Sparkle weight="fill" size={16} />
            </div>
            <span>限時空檔</span>
          </h2>
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">剛剛更新</span>
        </div>

        <div className="space-y-4">
          {/* Card 1 */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center group hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="bg-red-50 text-red-600 text-[10px] px-2.5 py-1 rounded-full font-bold border border-red-100">今日</span>
                <span className="font-bold text-gray-900 text-lg">14:00 - 15:30</span>
              </div>
              <div className="flex items-center space-x-2">
                 <div className="w-5 h-5 rounded-full bg-gray-200 overflow-hidden">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica" alt="Staff" />
                 </div>
                 <p className="text-sm text-gray-500 font-medium">Jessica 店長 • 水飛梭</p>
              </div>
            </div>
            <button 
              className="px-5 py-2.5 rounded-full text-sm font-bold border transition-colors hover:text-white"
              style={{ borderColor: themeColor, color: themeColor }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = themeColor; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = themeColor; }}
            >
              搶約
            </button>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center group hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="bg-orange-50 text-orange-600 text-[10px] px-2.5 py-1 rounded-full font-bold border border-orange-100">明日</span>
                <span className="font-bold text-gray-900 text-lg">10:00 - 12:00</span>
              </div>
              <div className="flex items-center space-x-2">
                 <div className="w-5 h-5 rounded-full bg-gray-200 overflow-hidden">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Nana" alt="Staff" />
                 </div>
                 <p className="text-sm text-gray-500 font-medium">Nana • 造型美甲</p>
              </div>
            </div>
            <button 
              className="px-5 py-2.5 rounded-full text-sm font-bold border transition-colors hover:text-white"
              style={{ borderColor: themeColor, color: themeColor }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = themeColor; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = themeColor; }}
            >
              搶約
            </button>
          </div>
        </div>
      </div>

      {/* Upcoming Appointment Snippet */}
      <div className="px-5 mt-2">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
              <Clock weight="fill" size={16} />
          </div>
          <span>即將到來</span>
        </h2>
        
        <div className="bg-gray-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform">
           {/* Background Decoration */}
           <div className="absolute right-[-20px] bottom-[-40px] opacity-10 transform rotate-12 group-hover:rotate-0 transition-transform duration-500">
             <CalendarPlus size={140} />
           </div>
           
           <div className="relative z-10">
             <div className="flex justify-between items-start mb-4">
                 <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-white/90 border border-white/10">
                     距離預約還有 3 天
                 </span>
                 <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                     <ArrowRight size={16} />
                 </div>
             </div>
             
             <h3 className="text-xl font-bold mb-1">單色凝膠 (手部)</h3>
             <p className="text-white/60 text-sm mb-4">服務人員：Nana</p>
             
             <div className="flex items-center space-x-3 text-sm font-medium border-t border-white/10 pt-4">
                 <Clock size={16} className="text-white/60" />
                 <span>2月18日 (二) 14:00 - 15:00</span>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default LiffHomePage;

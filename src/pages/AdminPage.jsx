import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkle, UserList, Storefront, UserCircle, CaretRight, ImageSquare } from '@phosphor-icons/react';
import BackgroundDecoration from '../components/ui/BackgroundDecoration';

const AdminPage = () => {
  const navigate = useNavigate();

  const menuItems = [
    { 
      title: '服務項目管理', 
      subtitle: '設定服務名稱、價格與時長', 
      icon: Sparkle, 
      color: 'text-rose-500', 
      bg: 'bg-rose-50',
      path: '/services'
    },
    { 
      title: '員工與排班', 
      subtitle: '管理員工資料與工作時間', 
      icon: UserList, 
      color: 'text-blue-500', 
      bg: 'bg-blue-50',
      path: '/staff' // Placeholder
    },
    { 
      title: '店家資訊設定', 
      subtitle: '營業時間、地址與聯絡資訊', 
      icon: Storefront, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-50',
      path: '/store-profile' 
    },
    { 
      title: '美麗藝廊管理', 
      subtitle: '上傳作品、管理分類與標籤', 
      icon: ImageSquare, 
      color: 'text-pink-500', 
      bg: 'bg-pink-50',
      path: '/admin/gallery' 
    },
    { 
      title: '我的帳號', 
      subtitle: '個人資料與權限設定', 
      icon: UserCircle, 
      color: 'text-purple-500', 
      bg: 'bg-purple-50',
      path: '/manager-profile' 
    },
  ];

  return (
    <div className="relative">
      
      {/* Header (White) */}
      <div className="sticky top-0 z-30 bg-white border-b border-rose-100 px-4 py-3 shadow-sm">
        <div className="flex justify-between items-center min-h-[38px]">
          <h1 className="text-xl font-bold text-slate-800">管理中心</h1>
        </div>
      </div>

      <div className="p-4 space-y-4 relative z-10">
        <div className="space-y-4">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
            >
              <div className={`w-12 h-12 ${item.bg} rounded-xl flex items-center justify-center ${item.color} mr-4`}>
                <item.icon weight="fill" className="w-6 h-6" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-base font-bold text-slate-800">{item.title}</h3>
                <p className="text-xs text-slate-500">{item.subtitle}</p>
              </div>
              <CaretRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500" />
            </button>
          ))}
        </div>

        <div className="mt-8 px-2">
            <p className="text-xs text-center text-slate-400">NEXA SaaS v0.1.0</p>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;

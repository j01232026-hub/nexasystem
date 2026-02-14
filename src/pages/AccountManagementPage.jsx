import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sliders, 
  CalendarHeart, 
  ChatCircleDots, 
  UserCircle,
  Storefront,
  Phone,
  MapPin,
  PencilSimple,
  Plus,
  Sparkle
} from '@phosphor-icons/react';

const AccountManagementPage = () => {
  const navigate = useNavigate();
  return (
    <div className="bg-rose-50 min-h-screen pb-24 relative font-sans">
      {/* Background Decoration */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40"></div>
      </div>

      {/* Header (White) */}
      <header className="sticky top-0 z-30 bg-white border-b border-rose-100 px-4 py-3 shadow-sm flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800 tracking-wide">帳號管理</h1>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        
        {/* Quick Actions / Menu Grid */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => navigate('/services')}
            className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-100 hover:border-rose-200 group"
          >
            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 mb-3 group-hover:scale-110 transition-transform">
              <Sparkle className="w-6 h-6" weight="fill" />
            </div>
            <span className="text-slate-700 font-medium">服務項目管理</span>
          </button>
          
          <button className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-100 hover:border-blue-200 group">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 mb-3 group-hover:scale-110 transition-transform">
              <CalendarHeart className="w-6 h-6" weight="fill" />
            </div>
            <span className="text-slate-700 font-medium">行事曆排班</span>
          </button>
        </div>

        {/* Store Card */}
        <div className="bg-white rounded-3xl shadow-[0_4px_20px_0_rgba(0,0,0,0.03)] overflow-hidden border border-slate-100">
          {/* Cover Image */}
          <div className="h-32 bg-gradient-to-r from-rose-100 to-orange-100 relative">
            <button className="absolute top-3 right-3 p-1.5 bg-white/30 hover:bg-white/50 backdrop-blur-sm rounded-full text-white transition-all">
              <PencilSimple className="w-4 h-4" />
            </button>
          </div>
          
          <div className="px-6 pb-6">
            {/* Basic Info */}
            <div className="relative -mt-10 mb-6 flex items-end justify-between">
              <div>
                <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-md">
                  <div className="w-full h-full bg-rose-50 rounded-xl flex items-center justify-center text-rose-300">
                    <Storefront className="w-8 h-8" />
                  </div>
                </div>
                <div className="mt-3">
                  <h2 className="text-xl font-bold text-slate-800">NEXA 美學台北旗艦店</h2>
                  <p className="text-xs text-rose-500 font-medium tracking-wide uppercase mt-0.5">總店 Head Office</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex items-center text-sm text-slate-600">
                <Phone className="w-4 h-4 mr-3 text-slate-400" />
                02-1234-5678
              </div>
              <div className="flex items-center text-sm text-slate-600">
                <MapPin className="w-4 h-4 mr-3 text-slate-400" />
                台北市大安區忠孝東路四段 123 號
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100 my-6"></div>

            {/* Employee List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800">總店員工列表</h3>
                <button className="text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-md transition-colors flex items-center">
                  <Plus className="w-3 h-3 mr-1" />
                  新增員工
                </button>
              </div>

              {/* Employee Item */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 group hover:border-rose-200 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center overflow-hidden">
                      <UserCircle className="w-6 h-6 text-rose-400" />
                    </div>
                    <div>
                      <div className="flex items-center">
                        <p className="text-sm font-semibold text-slate-800">王小美</p>
                        <span className="ml-2 px-1.5 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded">管理人</span>
                      </div>
                      <p className="text-xs text-slate-500">0912-345-678</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Branch Management */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-lg font-bold text-slate-800">分店管理</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button className="col-span-1 h-32 rounded-2xl border-2 border-dashed border-slate-300 hover:border-rose-400 hover:bg-rose-50/50 flex flex-col items-center justify-center text-slate-400 hover:text-rose-500 transition-all group">
              <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-rose-100 flex items-center justify-center mb-2 transition-colors">
                <Plus className="w-6 h-6 text-slate-400 group-hover:text-rose-500" />
              </div>
              <span className="text-sm font-semibold">新增分店</span>
            </button>

            <button className="col-span-1 h-32 rounded-2xl border-2 border-dashed border-slate-300 hover:border-rose-400 hover:bg-rose-50/50 flex flex-col items-center justify-center text-slate-400 hover:text-rose-500 transition-all group">
              <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-rose-100 flex items-center justify-center mb-2 transition-colors">
                <UserCircle className="w-6 h-6 text-slate-400 group-hover:text-rose-500" />
              </div>
              <span className="text-sm font-semibold">新增分店員工</span>
            </button>
          </div>
        </div>

      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full h-20 pb-4 z-50 bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex justify-around items-center h-full max-w-2xl mx-auto">
          <a href="#" className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-slate-600 transition-colors group">
            <Sliders className="text-2xl mb-1 group-hover:-translate-y-0.5 transition-transform" />
            <span className="text-[10px] font-medium tracking-wide">設定</span>
          </a>

          <a href="#" className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-slate-600 transition-colors group">
            <CalendarHeart className="text-2xl mb-1 group-hover:-translate-y-0.5 transition-transform" />
            <span className="text-[10px] font-medium tracking-wide">預約</span>
          </a>

          <a href="#" className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-slate-600 transition-colors group">
            <ChatCircleDots className="text-2xl mb-1 group-hover:-translate-y-0.5 transition-transform" />
            <span className="text-[10px] font-medium tracking-wide">客服</span>
          </a>

          <a href="#" className="flex flex-col items-center justify-center w-full h-full text-rose-500 relative group">
            <div className="absolute top-2 w-12 h-10 bg-rose-50 rounded-xl -z-10 opacity-60"></div>
            <UserCircle className="text-2xl mb-1" weight="fill" />
            <span className="text-[10px] font-bold tracking-wide">帳號管理</span>
          </a>
        </div>
      </nav>

    </div>
  );
};

export default AccountManagementPage;

import React from 'react';
import BackgroundDecoration from '../components/ui/BackgroundDecoration';
import GlassPanel from '../components/ui/GlassPanel';
import { Camera, Envelope, PencilSimple, ArrowRight, ArrowLeft } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

const ManagerProfilePage = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-rose-50 min-h-screen p-6 relative overflow-hidden font-sans pb-24">
      <BackgroundDecoration />
      
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <button 
            onClick={() => navigate('/admin')} 
            className="p-2 bg-white/50 hover:bg-white rounded-full text-slate-600 transition-colors shadow-sm"
          >
            <ArrowLeft weight="bold" className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800">我的帳號</h1>
        </div>

        <GlassPanel className="w-full">
            {/* 資料表單 */}
            <form className="space-y-6">
            
            {/* 頭像上傳 */}
            <div className="flex flex-col items-center justify-center mb-6">
                <div className="relative group cursor-pointer">
                    <div className="w-24 h-24 rounded-full bg-rose-50 border-2 border-dashed border-rose-300 flex items-center justify-center overflow-hidden transition-all group-hover:border-rose-500 group-hover:bg-rose-100">
                        {/* 預設圖標 */}
                        <Camera className="h-8 w-8 text-rose-400 group-hover:scale-110 transition-transform" />
                        {/* 隱藏的 Input */}
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                    </div>
                    <div className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow-md border border-slate-100 group-hover:scale-110 transition-transform">
                        <PencilSimple className="h-3 w-3 text-slate-600" />
                    </div>
                </div>
                <span className="mt-2 text-xs text-slate-400 font-medium">上傳個人頭像</span>
            </div>

            {/* 姓名與電話 (Grid Layout) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">真實姓名</label>
                    <input type="text" placeholder="王小美" 
                        className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all placeholder:text-slate-300 text-slate-700 font-medium" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">聯絡電話</label>
                    <input type="tel" placeholder="0912-345-678" 
                        className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all placeholder:text-slate-300 text-slate-700 font-medium" />
                </div>
            </div>

            {/* 生日與 Email */}
            <div className="space-y-5">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">出生日期</label>
                    <div className="relative">
                        <input type="date" 
                            className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all text-slate-700 font-medium appearance-none" />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">電子信箱 Email</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Envelope className="h-5 w-5 text-slate-400" />
                        </div>
                        <input type="email" placeholder="example@nexa.com" 
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all placeholder:text-slate-300 text-slate-700 font-medium" />
                    </div>
                </div>
            </div>

            {/* Action Button */}
            <div className="pt-4">
                <button 
                  type="button" 
                  onClick={() => navigate('/admin')}
                  className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium shadow-lg shadow-slate-300 transform active:scale-[0.98] transition-all flex items-center justify-center group"
                >
                    儲存變更
                </button>
            </div>

        </form>
      </GlassPanel>
      </div>
    </div>
  );
};

export default ManagerProfilePage;

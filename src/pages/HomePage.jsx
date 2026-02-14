import React from 'react';
import BackgroundDecoration from '../components/ui/BackgroundDecoration';
import GlassPanel from '../components/ui/GlassPanel';
import { TrendUp, CalendarCheck, CheckCircle } from '@phosphor-icons/react';

const HomePage = () => {
  return (
    <div className="relative">
      
      {/* Header (White) */}
      <div className="sticky top-0 z-30 bg-white border-b border-rose-100 px-4 py-3 shadow-sm">
        <div className="flex justify-between items-center min-h-[38px]">
          <h1 className="text-xl font-bold text-slate-800">早安，NEXA (奈沙)</h1>
        </div>
      </div>

      <div className="p-4 space-y-6 relative z-10">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 gap-4">
          <GlassPanel className="p-4 flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-500">
              <CalendarCheck weight="fill" className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-slate-800">8</span>
            <span className="text-xs text-slate-500">今日預約</span>
          </GlassPanel>
          <GlassPanel className="p-4 flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-500">
              <TrendUp weight="fill" className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-slate-800">$12k</span>
            <span className="text-xs text-slate-500">預估營收</span>
          </GlassPanel>
        </div>

        {/* Todo / Notices */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800">待辦事項</h2>
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/50 space-y-3">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-slate-300" />
              <span className="text-slate-600 text-sm">確認明日預約 (3)</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-slate-300" />
              <span className="text-slate-600 text-sm">回覆 LINE 客戶訊息</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

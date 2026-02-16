import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import BackgroundDecoration from '../components/ui/BackgroundDecoration';
import GlassPanel from '../components/ui/GlassPanel';
import TopupModal from '../components/TopupModal';
import ScanPaymentModal from '../components/ScanPaymentModal';
import { TrendUp, CalendarCheck, CheckCircle, Wallet, QrCode, Plus, CreditCard } from '@phosphor-icons/react';

const HomePage = () => {
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [todayStats, setTodayStats] = useState({ appointments: 0, revenue: 0 });
  const [tenantId, setTenantId] = useState(null);
  const [operatorId, setOperatorId] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // 1. Get Tenant ID from Profile (Reliable)
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single();

        if (profile) {
          setTenantId(profile.tenant_id);
          fetchTodayStats(profile.tenant_id);
          
          // 2. Get Staff ID (For Operator actions)
          const { data: staffData } = await supabase
            .from('staff')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();
            
          if (staffData) {
            setOperatorId(staffData.id);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  };

  const fetchTodayStats = async (tid) => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    try {
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_items (price)
        `)
        .eq('tenant_id', tid)
        .gte('start_time', startOfDay.toISOString())
        .lt('start_time', endOfDay.toISOString());

      const count = appointments?.length || 0;
      const revenue = appointments?.reduce((sum, appt) => {
        const apptTotal = appt.appointment_items?.reduce((s, i) => s + (i.price || 0), 0) || 0;
        return sum + apptTotal;
      }, 0) || 0;
      
      setTodayStats({ appointments: count, revenue });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleTopupSuccess = () => {
    fetchTodayStats(tenantId);
  };

  const handleScanSuccess = () => {
    fetchTodayStats(tenantId);
  };

  return (
    <div className="relative">
      <div className="sticky top-0 z-30 bg-white border-b border-rose-100 px-4 py-3 shadow-sm">
        <div className="flex justify-between items-center min-h-[38px]">
          <h1 className="text-xl font-bold text-slate-800">早安，NEXA (奈沙)</h1>
        </div>
      </div>

      <div className="p-4 space-y-6 relative z-10">
        <div className="grid grid-cols-2 gap-4">
          <GlassPanel className="p-4 flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-500">
              <CalendarCheck weight="fill" className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-slate-800">{todayStats.appointments}</span>
            <span className="text-xs text-slate-500">今日預約</span>
          </GlassPanel>
          <GlassPanel className="p-4 flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-500">
              <TrendUp weight="fill" className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-slate-800">
              ${todayStats.revenue.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">預估營收</span>
          </GlassPanel>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">儲值金管理</h2>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Wallet className="w-4 h-4" />
              <span>客戶儲值與收款</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setShowTopupModal(true)}
              className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-100 rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all group"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-rose-400 to-orange-400 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200/50 group-hover:shadow-rose-300/50 transition-shadow">
                <Plus className="w-7 h-7 text-white" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-800">客戶儲值</p>
                <p className="text-xs text-slate-500 mt-1">現金 / 刷卡 / LINE Pay</p>
              </div>
            </button>

            <button
              onClick={() => setShowScanModal(true)}
              className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all group"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200/50 group-hover:shadow-emerald-300/50 transition-shadow">
                <QrCode className="w-7 h-7 text-white" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-800">掃碼收款</p>
                <p className="text-xs text-slate-500 mt-1">掃描客戶付款碼</p>
              </div>
            </button>
          </div>
        </div>

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

      <TopupModal
        isOpen={showTopupModal}
        onClose={() => setShowTopupModal(false)}
        tenantId={tenantId}
        operatorId={operatorId}
        onSuccess={handleTopupSuccess}
      />

      <ScanPaymentModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        tenantId={tenantId}
        operatorId={operatorId}
        onSuccess={handleScanSuccess}
      />

      <BackgroundDecoration />
    </div>
  );
};

export default HomePage;

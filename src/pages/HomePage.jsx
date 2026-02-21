import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import TopupModal from '../components/TopupModal';
import ScanPaymentModal from '../components/ScanPaymentModal';
import BackgroundDecoration from '../components/ui/BackgroundDecoration';
import { 
  TrendUp, CalendarCheck, Wallet, QrCode, 
  Plus, Bell, CaretRight, Clock, User
} from '@phosphor-icons/react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { useAppointmentsRealtime } from '../hooks/useAppointmentsRealtime';

const HomePage = () => {
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [todayStats, setTodayStats] = useState({ appointments: 0, revenue: 0 });
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [tenantId, setTenantId] = useState(null);
  const [userName, setUserName] = useState('NEXA');

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Realtime Update
  useAppointmentsRealtime(tenantId, () => {
    if (tenantId) {
      fetchTodayStats(tenantId);
      fetchUpcomingAppointments(tenantId);
      fetchUnreadCount(tenantId);
    }
  });

  const fetchInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get User Name
        if (user.user_metadata?.full_name) {
            setUserName(user.user_metadata.full_name);
        }

        // Get Tenant ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single();

        if (profile?.tenant_id) {
          setTenantId(profile.tenant_id);
          fetchTodayStats(profile.tenant_id);
          fetchUpcomingAppointments(profile.tenant_id);
          fetchUnreadCount(profile.tenant_id);
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
        .lt('start_time', endOfDay.toISOString())
        .neq('status', 'cancelled');

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

  const fetchUpcomingAppointments = async (tid) => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      const { data } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          status,
          customers (name),
          services (name),
          staff (display_name)
        `)
        .eq('tenant_id', tid)
        .gte('start_time', now.toISOString())
        .lt('start_time', tomorrow.toISOString())
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true })
        .limit(5);

      setUpcomingAppointments(data || []);
    } catch (err) {
      console.error('Error fetching upcoming:', err);
    }
  };

  const fetchUnreadCount = async (tid) => {
    try {
        // Count 'booked' status as unread
        const { count } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tid)
            .eq('status', 'booked');
        
        setUnreadCount(count || 0);
    } catch (err) {
        console.error('Error fetching unread count:', err);
    }
  };

  return (
    <div className="min-h-screen pb-24 relative">
      <BackgroundDecoration />
      
      {/* 1. Header with Notification */}
      <div className="sticky top-0 z-30 bg-white/60 backdrop-blur-md border-b border-rose-100 px-5 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-800">早安，{userName}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhTW })}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button className="relative p-2 rounded-full hover:bg-rose-100/50 transition-colors">
              <Bell size={24} weight="duotone" className="text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-white border border-rose-200 flex items-center justify-center overflow-hidden text-rose-500 font-bold shadow-sm">
               {userName[0]}
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-6 relative z-10">
        
        {/* 2. Key Metrics (Bento Grid) */}
        <div className="grid grid-cols-2 gap-4">
          {/* Appointments Card */}
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-rose-100 flex flex-col justify-between h-32 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <CalendarCheck size={64} weight="fill" className="text-rose-500" />
            </div>
            <span className="text-slate-500 text-sm font-medium">今日預約</span>
            <div className="flex items-baseline gap-1 mt-auto">
              <span className="text-3xl font-bold text-slate-800">{todayStats.appointments}</span>
              <span className="text-xs text-slate-400">筆</span>
            </div>
          </div>

          {/* Revenue Card */}
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-rose-100 flex flex-col justify-between h-32 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Wallet size={64} weight="fill" className="text-amber-500" />
            </div>
            <span className="text-slate-500 text-sm font-medium">今日營收</span>
            <div className="flex items-baseline gap-1 mt-auto">
              <span className="text-3xl font-bold text-slate-800">
                ${todayStats.revenue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Money Actions (Gradient Blocks) */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setShowTopupModal(true)}
            className="relative h-24 rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 text-white p-4 flex flex-col justify-between shadow-lg shadow-rose-200 hover:shadow-xl hover:scale-[1.02] transition-all group overflow-hidden"
          >
            <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm z-10">
              <Plus weight="bold" />
            </div>
            <div className="text-left z-10">
              <div className="font-bold text-lg">客戶儲值</div>
              <div className="text-xs text-rose-100 opacity-90">Top-up</div>
            </div>
            <Wallet size={64} weight="duotone" className="absolute -right-2 -bottom-4 opacity-20 group-hover:scale-110 transition-transform" />
          </button>

          <button 
            onClick={() => setShowScanModal(true)}
            className="relative h-24 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 text-white p-4 flex flex-col justify-between shadow-lg shadow-slate-200 hover:shadow-xl hover:scale-[1.02] transition-all group overflow-hidden"
          >
            <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm z-10">
              <QrCode weight="bold" />
            </div>
            <div className="text-left z-10">
              <div className="font-bold text-lg">掃碼收款</div>
              <div className="text-xs text-slate-300 opacity-90">Scan Pay</div>
            </div>
            <QrCode size={64} weight="duotone" className="absolute -right-2 -bottom-4 opacity-20 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* 4. Upcoming Timeline */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-rose-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Clock weight="duotone" className="text-rose-500" />
              即將到來
            </h2>
            <button className="text-xs text-rose-500 font-medium flex items-center hover:underline">
              查看全部 <CaretRight />
            </button>
          </div>
          
          <div className="space-y-0">
            {/* Empty State */}
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm bg-rose-50/50 rounded-xl border border-dashed border-rose-200">
                目前沒有即將到來的預約
              </div>
            ) : (
              upcomingAppointments.map((appt, index) => (
                <div key={appt.id} className="flex gap-3 items-start relative pl-4 pb-6 last:pb-0 border-l-2 border-rose-100 last:border-l-0">
                  <div className={`absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full ring-4 ring-white ${
                      appt.status === 'booked' ? 'bg-blue-500' : 'bg-rose-500'
                  }`}></div>
                  <div className="flex-1 -mt-1">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-800 text-lg leading-none">
                        {format(new Date(appt.start_time), 'HH:mm')}
                      </span>
                      <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-medium border border-rose-100">
                        {appt.staff?.display_name}
                      </span>
                    </div>
                    <div className="bg-white rounded-lg p-3 mt-2 border border-rose-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <User size={14} className="text-slate-400" />
                            <span className="text-sm font-medium text-slate-700">{appt.customers?.name}</span>
                        </div>
                        <div className="text-xs text-slate-500 pl-6">{appt.services?.name}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Modals */}
      <TopupModal 
        isOpen={showTopupModal} 
        onClose={() => setShowTopupModal(false)} 
        onSuccess={() => {
          setShowTopupModal(false);
          if(tenantId) fetchTodayStats(tenantId);
        }}
        tenantId={tenantId}
      />
      <ScanPaymentModal 
        isOpen={showScanModal} 
        onClose={() => setShowScanModal(false)}
        onSuccess={() => {
          setShowScanModal(false);
          if(tenantId) fetchTodayStats(tenantId);
        }}
      />
    </div>
  );
};

export default HomePage;

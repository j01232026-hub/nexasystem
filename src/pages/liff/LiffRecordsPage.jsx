import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useLiffAuth } from '../../context/LiffAuthContext';
import { supabase } from '../../lib/supabaseClient';
import { format, parseISO, isPast, isFuture, compareDesc, compareAsc } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { 
  CalendarCheck, 
  Clock, 
  MapPin, 
  Phone, 
  ArrowRight, 
  Trash, 
  Repeat, 
  Star,
  CalendarX,
  CheckCircle
} from '@phosphor-icons/react';

const LiffRecordsPage = () => {
  const { themeColor } = useTheme();
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { liffUser, loading: authLoading } = useLiffAuth();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [appointments, setAppointments] = useState({ upcoming: [], history: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (liffUser?.dbId) {
      fetchAppointments();
    }
  }, [liffUser]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          services (name, duration, price),
          staff (display_name)
        `)
        .eq('customer_id', liffUser.dbId)
        .order('start_time', { ascending: false });

      if (error) throw error;

      const now = new Date();
      const upcoming = data.filter(appt => 
        isFuture(parseISO(appt.start_time)) && 
        ['confirmed', 'scheduled'].includes(appt.status)
      ).sort((a, b) => compareAsc(parseISO(a.start_time), parseISO(b.start_time)));

      const history = data.filter(appt => 
        isPast(parseISO(appt.start_time)) || 
        ['completed', 'cancelled', 'no_show'].includes(appt.status)
      ).sort((a, b) => compareDesc(parseISO(a.start_time), parseISO(b.start_time)));

      setAppointments({ upcoming, history });
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (apptId) => {
    if (!window.confirm('確定要取消此預約嗎？')) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', apptId);

      if (error) throw error;
      fetchAppointments();
    } catch (err) {
      alert('取消失敗');
    }
  };

  const handleRebook = () => {
    navigate(`/liff/${tenantId}/booking/new`);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: themeColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-4 sticky top-0 z-20 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">我的行程</h1>
        
        {/* Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-xl">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'upcoming' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            進行中
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'history' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            歷史紀錄
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {activeTab === 'upcoming' ? (
          appointments.upcoming.length > 0 ? (
            appointments.upcoming.map(appt => (
              <UpcomingCard 
                key={appt.id} 
                appt={appt} 
                themeColor={themeColor} 
                onCancel={() => handleCancel(appt.id)}
              />
            ))
          ) : (
            <EmptyState 
              message="目前沒有預約" 
              actionText="立即預約" 
              onAction={handleRebook}
              themeColor={themeColor}
            />
          )
        ) : (
          appointments.history.length > 0 ? (
            appointments.history.map(appt => (
              <HistoryCard 
                key={appt.id} 
                appt={appt} 
                themeColor={themeColor}
                onRebook={handleRebook}
              />
            ))
          ) : (
            <EmptyState 
              message="尚無歷史紀錄" 
              actionText="去逛逛服務" 
              onAction={handleRebook}
              themeColor={themeColor}
            />
          )
        )}
      </div>
    </div>
  );
};

const UpcomingCard = ({ appt, themeColor, onCancel }) => {
  const startDate = parseISO(appt.start_time);
  
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden group">
      {/* Left Accent Bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: themeColor }}></div>
      
      <div className="flex justify-between items-start mb-4 pl-2">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm font-bold text-gray-900">
              {format(startDate, 'M月d日 (EEEE)', { locale: zhTW })}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              即將到來
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 font-mono">
            {format(startDate, 'HH:mm')}
          </div>
        </div>
        
        {/* Actions Menu (Simplified as cancel button for now) */}
      </div>

      <div className="pl-2 space-y-3 mb-5">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <CalendarCheck size={16} className="text-gray-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{appt.services?.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">服務人員：{appt.staff?.display_name || '不指定'}</p>
          </div>
        </div>

      </div>

      <div className="flex space-x-3 pl-2">
        <button 
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
        >
          取消預約
        </button>
        <button 
          className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold shadow-md hover:opacity-90 transition-opacity"
          style={{ backgroundColor: themeColor }}
        >
          聯絡店家
        </button>
      </div>
    </div>
  );
};

const HistoryCard = ({ appt, themeColor, onRebook }) => {
  const startDate = parseISO(appt.start_time);
  const isCompleted = appt.status === 'completed';
  const isCancelled = appt.status === 'cancelled';
  
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 pl-6 opacity-80 hover:opacity-100 transition-opacity">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-medium text-gray-400">
          {format(startDate, 'yyyy年M月d日', { locale: zhTW })}
        </span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          isCompleted ? 'bg-gray-100 text-gray-600' : 
          isCancelled ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-400'
        }`}>
          {isCompleted ? '已完成' : isCancelled ? '已取消' : appt.status}
        </span>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-bold text-gray-800 text-lg">{appt.services?.name}</h3>
          <p className="text-xs text-gray-400">服務人員：{appt.staff?.display_name}</p>
        </div>
      </div>

      <button 
        onClick={onRebook}
        className="w-full py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 flex items-center justify-center space-x-2"
      >
        <Repeat size={16} />
        <span>再次預約</span>
      </button>
    </div>
  );
};

const EmptyState = ({ message, actionText, onAction, themeColor }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
      <CalendarX size={32} className="text-gray-400" />
    </div>
    <p className="text-gray-500 font-medium mb-6">{message}</p>
    <button
      onClick={onAction}
      className="px-8 py-3 rounded-full text-white font-bold shadow-lg transform active:scale-95 transition-all"
      style={{ backgroundColor: themeColor }}
    >
      {actionText}
    </button>
  </div>
);

export default LiffRecordsPage;
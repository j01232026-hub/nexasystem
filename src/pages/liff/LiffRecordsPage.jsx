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
  CheckCircle,
  CurrencyDollar,
  Bank,
  WarningCircle
} from '@phosphor-icons/react';

const LiffRecordsPage = () => {
  const { themeColor } = useTheme();
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { liffUser, loading: authLoading } = useLiffAuth();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [appointments, setAppointments] = useState({ upcoming: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [depositConfig, setDepositConfig] = useState(null);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositAppt, setDepositAppt] = useState(null);
  const [reportMethod, setReportMethod] = useState('transfer');
  const [reportLastFive, setReportLastFive] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  useEffect(() => {
    if (liffUser?.dbId) {
      fetchAppointments();
    }
  }, [liffUser]);
  
  useEffect(() => {
    if (tenantId) {
      fetchTenantSettings();
    }
  }, [tenantId]);

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
        ['pending', 'confirmed', 'scheduled', 'pending_deposit'].includes(appt.status)
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
  
  const fetchTenantSettings = async () => {
    const { data, error } = await supabase
      .from('tenants')
      .select('deposit_config')
      .eq('id', tenantId)
      .single();
    
    if (!error && data?.deposit_config) {
      setDepositConfig(data.deposit_config);
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
  
  const handleOpenDeposit = (appt) => {
    setDepositAppt(appt);
    setDepositModalOpen(true);
    setReportMethod('transfer');
    setReportLastFive('');
    setReportSubmitted(false);
  };
  
  const handleCloseDeposit = () => {
    setDepositModalOpen(false);
    setDepositAppt(null);
    setReportMethod('transfer');
    setReportLastFive('');
    setReportSubmitted(false);
  };
  
  const handleSubmitReport = async () => {
    if (reportMethod === 'transfer' && reportLastFive.length < 5) return;
    
    try {
      const { error } = await supabase
        .from('deposit_reports')
        .insert([
          {
            appointment_id: depositAppt.id,
            user_id: liffUser.dbId,
            tenant_id: depositAppt.tenant_id,
            report_method: reportMethod,
            transfer_last_5: reportMethod === 'transfer' ? reportLastFive : null,
            status: 'pending_confirmation'
          }
        ]);
      
      if (error) throw error;
      setReportSubmitted(true);
    } catch (err) {
      console.error('Error submitting report:', err);
      alert('回報失敗，請稍後再試');
    }
  };
  
  const getDepositAmount = (appt) => {
    if (!depositConfig) return 0;
    if (depositConfig.mode === 'ratio') {
      const price = appt?.services?.price || 0;
      const ratio = Number(depositConfig.ratio) || 0;
      return Math.round((price * ratio) / 100);
    }
    return Number(depositConfig.amount) || 0;
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
                onPayDeposit={() => handleOpenDeposit(appt)}
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
      
      {depositModalOpen && depositAppt && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 pb-0">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-xl p-6 sm:p-7 pb-safe max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold text-orange-500">待付訂金</p>
                <h3 className="text-lg font-bold text-gray-900">支付訂金資訊</h3>
              </div>
              <button
                onClick={handleCloseDeposit}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
              >
                <span className="text-lg">×</span>
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-orange-500">
                    <CalendarCheck size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400">預約時間</p>
                    <p className="text-sm font-bold text-gray-900">
                      {format(parseISO(depositAppt.start_time), 'M月d日 (EEEE) HH:mm', { locale: zhTW })}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-2xl border border-gray-100 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                      <CurrencyDollar size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">訂金金額</p>
                      <p className="text-lg font-bold text-gray-900">${getDepositAmount(depositAppt)}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-orange-600 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-full">
                    {depositConfig?.mode === 'ratio' ? `${depositConfig?.ratio || 0}%` : '固定金額'}
                  </span>
                </div>
              </div>
              
              <div className="p-4 rounded-2xl border border-gray-100 bg-white">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 mt-0.5">
                    <Bank size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-1">匯款資訊</p>
                    <p className="text-sm font-semibold text-gray-800 whitespace-pre-line">
                      {depositConfig?.bank_info || '請聯絡店家取得匯款資訊'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-2xl border border-orange-100 bg-orange-50">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-orange-500">
                    <WarningCircle size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-orange-600 font-bold mb-1">提醒</p>
                    <p className="text-xs text-orange-700 leading-relaxed">請於 24 小時內完成匯款，逾期將自動取消預約。</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-2xl border border-gray-100 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-bold text-gray-900">我已完成匯款</p>
                    <p className="text-xs text-gray-400">請選擇付款方式</p>
                  </div>
                  {reportSubmitted && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                      已送出
                    </span>
                  )}
                </div>
                
                <div className="space-y-3">
                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${reportMethod === 'transfer' ? 'border-orange-200 bg-orange-50' : 'border-gray-200 hover:border-orange-200 hover:bg-orange-50/40'}`}>
                    <input
                      type="radio"
                      name="report_method"
                      checked={reportMethod === 'transfer'}
                      onChange={() => setReportMethod('transfer')}
                      className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-200"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">匯款</p>
                      <p className="text-xs text-gray-400">後五碼</p>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      value={reportLastFive}
                      onChange={(e) => setReportLastFive(e.target.value.replace(/\D/g, '').slice(0, 5))}
                      disabled={reportMethod !== 'transfer'}
                      placeholder="_____"
                      className="w-24 text-center text-sm font-bold tracking-[0.2em] py-2 rounded-lg border border-gray-200 bg-white focus:border-orange-300 focus:ring-2 focus:ring-orange-100 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </label>
                  
                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${reportMethod === 'linepay' ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/40'}`}>
                    <input
                      type="radio"
                      name="report_method"
                      checked={reportMethod === 'linepay'}
                      onChange={() => setReportMethod('linepay')}
                      className="w-4 h-4 text-emerald-500 border-gray-300 focus:ring-emerald-200"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">LINE PAY</p>
                      <p className="text-xs text-gray-400">付款完成即可送出</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSubmitReport}
                disabled={reportSubmitted || (reportMethod === 'transfer' && reportLastFive.length < 5)}
                className="flex-1 py-3 rounded-xl text-white text-sm font-bold shadow-md transition-all disabled:opacity-50 disabled:shadow-none"
                style={{ backgroundColor: themeColor }}
              >
                我已完成匯款
              </button>
              <button
                onClick={handleCloseDeposit}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-colors"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const UpcomingCard = ({ appt, themeColor, onCancel, onPayDeposit }) => {
  const startDate = parseISO(appt.start_time);
  const isPendingDeposit = appt.status === 'pending_deposit';
  
  const getStatusLabel = (status) => {
    const map = {
      'pending': { text: '已預約', color: 'bg-amber-100 text-amber-700' },
      'confirmed': { text: '已確認', color: 'bg-indigo-100 text-indigo-700' },
      'scheduled': { text: '已預約', color: 'bg-amber-100 text-amber-700' },
      'pending_deposit': { text: '待付訂金', color: 'bg-orange-100 text-orange-700' }
    };
    return map[status] || { text: status, color: 'bg-gray-100 text-gray-600' };
  };
  
  const statusInfo = getStatusLabel(appt.status);
  
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden group">
      {/* Left Accent Bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: isPendingDeposit ? '#f97316' : themeColor }}></div>
      
      <div className="flex justify-between items-start mb-4 pl-2">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm font-bold text-gray-900">
              {format(startDate, 'M月d日 (EEEE)', { locale: zhTW })}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.color}`}>
              {statusInfo.text}
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
            {isPendingDeposit && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <p className="text-xs text-orange-600 font-bold">請盡快聯繫店家完成匯款</p>
                  <button
                    onClick={onPayDeposit}
                    className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full hover:bg-orange-100 transition-colors"
                  >
                    支付訂金
                  </button>
                </div>
            )}
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
        {isPendingDeposit ? (
          <button 
            onClick={onPayDeposit}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold shadow-md hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#f97316' }}
          >
            支付訂金
          </button>
        ) : (
          <button 
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold shadow-md hover:opacity-90 transition-opacity"
            style={{ backgroundColor: themeColor }}
          >
            聯絡店家
          </button>
        )}
      </div>
    </div>
  );
};

const HistoryCard = ({ appt, themeColor, onRebook }) => {
  const startDate = parseISO(appt.start_time);
  
  const getStatusLabel = (status) => {
    const map = {
      'completed': { text: '已完成', color: 'bg-emerald-100 text-emerald-700' },
      'cancelled': { text: '已取消', color: 'bg-red-50 text-red-500' },
      'no_show': { text: '未到', color: 'bg-gray-200 text-gray-600' },
      'pending': { text: '已預約', color: 'bg-amber-100 text-amber-700' },
      'confirmed': { text: '已確認', color: 'bg-indigo-100 text-indigo-700' }
    };
    return map[status] || { text: status, color: 'bg-gray-100 text-gray-400' };
  };
  
  const statusInfo = getStatusLabel(appt.status);
  
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 pl-6 opacity-80 hover:opacity-100 transition-opacity">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-medium text-gray-400">
          {format(startDate, 'yyyy年M月d日', { locale: zhTW })}
        </span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusInfo.color}`}>
          {statusInfo.text}
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

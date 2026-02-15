import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabaseClient';
import { X, User, Calendar, Clock, Receipt, Note, Pencil, Trash, Lock, CheckCircle, Warning, Phone, Tag, Prohibit, HourglassMedium, CalendarCheck, XCircle, UserMinus } from '@phosphor-icons/react';
import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';

const AppointmentDetailsModal = ({ isOpen, onClose, appointmentId, onUpdate, onEdit }) => {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState(null);
  const [items, setItems] = useState([]);
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (appointmentId) {
        fetchDetails();
      }
    } else {
      document.body.style.overflow = 'unset';
      setDetails(null);
      setItems([]);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, appointmentId]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const { data: appt, error } = await supabase
        .from('appointments')
        .select(`
          *,
          customers (name, phone, notes),
          services (name, duration, price),
          staff (display_name, full_name)
        `)
        .eq('id', appointmentId)
        .single();

      if (error) throw error;
      setDetails(appt);

      const { data: apptItems, error: itemsError } = await supabase
        .from('appointment_items')
        .select(`
          *,
          services (name)
        `)
        .eq('appointment_id', appointmentId);

      if (itemsError) throw itemsError;
      setItems(apptItems || []);

    } catch (error) {
      console.error('Error fetching details:', error);
      alert('無法讀取預約詳情');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!confirm(`確定要將狀態更改為 "${getStatusLabel(newStatus)}" 嗎？`)) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;
      
      setDetails(prev => ({ ...prev, status: newStatus }));
      if (onUpdate) onUpdate();

    } catch (error) {
      alert('更新失敗: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('確定要刪除此預約嗎？此操作無法復原。')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;

      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      alert('刪除失敗: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    const map = {
      'pending': '已預約',
      'scheduled': '已預約',
      'confirmed': '已確認',
      'completed': '已完成',
      'cancelled': '已取消',
      'no_show': 'NoShow',
      'blocked': '鎖定/休息'
    };
    return map[status] || status;
  };

  const getStatusColor = (status) => {
    const map = {
      'pending': 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
      'scheduled': 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
      'confirmed': 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
      'completed': 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
      'cancelled': 'bg-slate-50 text-slate-500 ring-1 ring-slate-200 line-through',
      'no_show': 'bg-red-50 text-red-600 ring-1 ring-red-200',
      'blocked': 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
    };
    return map[status] || 'bg-gray-50 text-gray-600';
  };

  const getStatusIcon = (status) => {
    const map = {
      'pending': <HourglassMedium weight="fill" size={12} />,
      'scheduled': <HourglassMedium weight="fill" size={12} />,
      'confirmed': <CalendarCheck weight="fill" size={12} />,
      'completed': <CheckCircle weight="fill" size={12} />,
      'cancelled': <XCircle weight="fill" size={12} />,
      'no_show': <UserMinus weight="fill" size={12} />,
      'blocked': <Lock weight="fill" size={12} />
    };
    return map[status] || null;
  };

  if (!isOpen) return null;

  const isBlocked = details?.status === 'blocked';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] ring-1 ring-black/5 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-white px-6 py-4 flex justify-between items-center border-b border-slate-50 shrink-0">
           <div className="flex items-center gap-3">
             <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isBlocked ? 'bg-slate-100 text-slate-500' : 'bg-rose-50 text-rose-500'}`}>
                {isBlocked ? <Lock weight="duotone" size={24} /> : <Calendar weight="duotone" size={24} />}
             </div>
             <div>
               <h2 className="text-lg font-bold text-slate-800 leading-tight">
                 {isBlocked ? '時段鎖定' : '預約詳情'}
               </h2>
               <p className="text-[10px] font-mono text-slate-400 mt-0.5 tracking-wider uppercase">
                 #{appointmentId?.slice(0, 8)}
               </p>
             </div>
           </div>
           
           <div className="flex items-center gap-1">
             {/* Header Actions - Moved from bottom for better visibility on mobile */}
             {details && (
               <>
                  {/* Delete Button */}
                  <button 
                    onClick={handleDelete}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                    title="刪除預約"
                  >
                     <Trash size={18} weight="duotone" />
                  </button>

                  {/* Cancel Button */}
                  {details.status !== 'cancelled' && details.status !== 'completed' && (
                    <button 
                      onClick={() => handleStatusChange('cancelled')}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-orange-50 text-orange-400 hover:text-orange-500 transition-colors"
                      title="取消預約"
                  >
                    <Prohibit size={18} weight="duotone" />
                  </button>
                  )}
               </>
             )}
             
             {/* Close Button */}
             <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors ml-1">
               <X size={20} weight="bold" />
             </button>
           </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {loading && !details ? (
             <div className="flex flex-col items-center justify-center py-12 text-slate-300 gap-3">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-rose-400 rounded-full animate-spin"></div>
                <div className="text-sm">載入中...</div>
             </div>
          ) : details ? (
            <>
              {/* Status Banner */}
              <div className="flex justify-between items-center">
                 <span className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${getStatusColor(details.status)}`}>
                    {getStatusIcon(details.status)}
                    {getStatusLabel(details.status)}
                 </span>
                 <span className="text-xs text-slate-400 font-medium">
                    {format(parseISO(details.created_at), 'yyyy/MM/dd HH:mm')} 建立
                 </span>
              </div>
              
              {/* Confirmed At Info */}
              {details.confirmed_at && (
                <div className="text-xs text-indigo-500 font-medium flex items-center gap-1.5 -mt-4 ml-1">
                  <CalendarCheck size={12} weight="fill" />
                  {format(parseISO(details.confirmed_at), 'yyyy/MM/dd HH:mm')} 確認
                </div>
              )}

              {/* Main Info Card */}
              <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-4">
                 {/* Date & Time */}
                 <div className="flex gap-3 items-start">
                    <Clock size={20} className="text-slate-400 mt-0.5 shrink-0" weight="duotone" />
                    <div>
                       <div className="text-lg font-bold text-slate-800">
                         {format(parseISO(details.start_time), 'HH:mm')} - {format(parseISO(details.end_time), 'HH:mm')}
                       </div>
                       <div className="text-sm text-slate-500 font-medium">
                         {format(parseISO(details.start_time), 'yyyy年 M月 d日 (EEEE)', { locale: zhTW })}
                       </div>
                    </div>
                 </div>

                 <div className="h-px bg-slate-200/50 w-full"></div>

                 {/* Staff */}
                 <div className="flex gap-3 items-center">
                    <User size={20} className="text-slate-400 shrink-0" weight="duotone" />
                    <div className="flex items-center gap-2">
                       <span className="text-slate-600 text-sm font-medium">服務人員:</span>
                       <span className="text-slate-900 font-bold">{details.staff?.display_name}</span>
                    </div>
                 </div>
              </div>

              {/* Customer Info (Booking Only) */}
              {!isBlocked && (
                <div className="space-y-3">
                   <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">客戶資訊</h3>
                   <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-start justify-between group hover:border-indigo-100 transition-colors">
                      <div className="flex gap-3">
                         <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-600 font-bold text-sm shadow-inner">
                            {details.customers?.name?.[0]}
                         </div>
                         <div>
                            <div className="font-bold text-slate-800 text-base">{details.customers?.name || '未知客戶'}</div>
                            {details.customers?.phone && (
                              <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-0.5 font-mono">
                                 <Phone size={14} weight="fill" className="opacity-70" />
                                 {details.customers.phone}
                              </div>
                            )}
                         </div>
                      </div>
                      {/* Optional: Add action button like Call later */}
                   </div>
                </div>
              )}

              {/* Services List (Booking Only) */}
              {!isBlocked && (
                <div className="space-y-3">
                   <div className="flex justify-between items-end px-1">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">服務項目</h3>
                      <div className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                        總計: ${items.length > 0 
                          ? items.reduce((sum, i) => sum + i.price, 0) 
                          : (details.services?.price || 0)}
                      </div>
                   </div>
                   
                   <div className="space-y-2">
                      {/* Items List (Priority) */}
                      {items.length > 0 ? (
                        items.map(item => (
                           <div key={item.id} className="flex justify-between items-center bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
                                  <Tag size={16} weight="fill" />
                                </div>
                                <div>
                                   <div className="font-bold text-slate-700 text-sm">{item.services?.name}</div>
                                   <div className="text-xs text-slate-400">{item.duration} 分鐘</div>
                                </div>
                             </div>
                             <div className="font-mono font-bold text-slate-700 text-sm">
                               ${item.price}
                             </div>
                          </div>
                        ))
                      ) : (
                        /* Fallback to Primary Service if no items */
                        details.services && (
                          <div className="flex justify-between items-center bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500">
                                  <Receipt size={16} weight="fill" />
                                </div>
                                <div>
                                   <div className="font-bold text-slate-700 text-sm">{details.services.name}</div>
                                   <div className="text-xs text-slate-400">{details.services.duration} 分鐘</div>
                                </div>
                             </div>
                             <div className="font-mono font-bold text-slate-700 text-sm">
                               ${details.services.price}
                             </div>
                          </div>
                        )
                      )}
                   </div>
                </div>
              )}

              {/* Notes */}
              {details.notes && (
                 <div className="bg-yellow-50/50 p-4 rounded-2xl border border-yellow-100/50">
                    <div className="flex items-center gap-2 text-yellow-700 mb-2">
                       <Note size={16} weight="fill" />
                       <span className="text-xs font-bold uppercase tracking-wide">備註</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {details.notes}
                    </p>
                 </div>
              )}

            </>
          ) : null}
        </div>

        {/* Footer Actions - Fixed at Bottom */}
        {details && !isBlocked && (
          <div className="bg-white p-4 border-t border-slate-50 flex flex-col gap-3 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] z-10">
             {/* Status Action Buttons */}
             <div className="flex gap-2 flex-wrap">
               {/* Confirm Button (pending -> confirmed) */}
               {details.status === 'pending' && (
                  <button 
                    onClick={() => handleStatusChange('confirmed')}
                    className="flex-1 min-w-[100px] bg-indigo-500 hover:bg-indigo-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <CalendarCheck size={16} weight="bold" />
                    確認預約
                  </button>
               )}
               
               {/* Cancel Button (pending/confirmed -> cancelled) */}
               {(details.status === 'pending' || details.status === 'confirmed') && (
                  <button 
                    onClick={() => handleStatusChange('cancelled')}
                    className="flex-1 min-w-[100px] bg-slate-500 hover:bg-slate-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <XCircle size={16} weight="bold" />
                    取消預約
                  </button>
               )}
               
               {/* NoShow Button (confirmed -> no_show) */}
               {details.status === 'confirmed' && (
                  <button 
                    onClick={() => handleStatusChange('no_show')}
                    className="flex-1 min-w-[100px] bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <UserMinus size={16} weight="bold" />
                    NoShow
                  </button>
               )}
               
               {/* Complete Button (confirmed -> completed) */}
               {details.status === 'confirmed' && (
                  <button 
                    onClick={() => handleStatusChange('completed')}
                    className="flex-1 min-w-[100px] bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={16} weight="bold" />
                    完成服務
                  </button>
               )}
             </div>
             
             {/* Secondary Actions */}
             <div className="flex gap-3">
               {/* Edit Button */}
               {onEdit && details.status !== 'cancelled' && details.status !== 'completed' && details.status !== 'no_show' && (
                  <button 
                    onClick={() => onEdit(details, items)}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Pencil size={18} weight="bold" />
                    編輯預約
                  </button>
               )}

               {/* Re-confirm Button */}
               {(details.status === 'cancelled' || details.status === 'no_show') && (
                   <button 
                    onClick={() => handleStatusChange('confirmed')}
                    className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} weight="bold" />
                    重新確認
                  </button>
               )}
             </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default AppointmentDetailsModal;
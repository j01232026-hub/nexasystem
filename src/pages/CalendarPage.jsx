import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { format, addDays, startOfDay, endOfDay, isSameDay, parseISO, addMinutes, startOfWeek, endOfWeek, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, differenceInMinutes } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { CaretLeft, CaretRight, Plus, Calendar as CalendarIcon, User, Clock, CheckCircle, XCircle, Hourglass, Lock, CaretDown, Phone, CurrencyDollar, Note } from '@phosphor-icons/react';
import GlassPanel from '../components/ui/GlassPanel';
import BackgroundDecoration from '../components/ui/BackgroundDecoration';
import NewAppointmentModal from '../components/NewAppointmentModal';
import AppointmentDetailsModal from '../components/AppointmentDetailsModal';

// Constants
const OPEN_HOUR = 10;
const CLOSE_HOUR = 21;
const SLOT_HEIGHT = 60; // 1 hour = 60px height
const MINUTE_HEIGHT = SLOT_HEIGHT / 60;

const CalendarPage = () => {
  const { user } = useOutletContext() || {};
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState('day'); // 'day' | 'week' | 'month'
  const [staff, setStaff] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [editData, setEditData] = useState(null);
  const [isStaffSelectorOpen, setIsStaffSelectorOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedDate, view]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get Tenant ID
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', authUser.id)
        .single();

      if (!profile) return;

      // 2. Fetch Staff (if not already loaded)
      let currentStaff = staff;
      if (staff.length === 0) {
        const { data: staffData } = await supabase
          .from('staff')
          .select('*')
          .eq('tenant_id', profile.tenant_id)
          .eq('is_active', true)
          .order('created_at');
        
        currentStaff = staffData || [];
        setStaff(currentStaff);
        
        // Removed default selection logic to keep "選擇設計師" as default
      }

      // 3. Fetch Appointments
      let startRange, endRange;
      
      if (view === 'day') {
        startRange = startOfDay(selectedDate).toISOString();
        endRange = endOfDay(selectedDate).toISOString();
      } else if (view === 'week') {
        startRange = startOfWeek(selectedDate, { weekStartsOn: 0 }).toISOString();
        endRange = endOfWeek(selectedDate, { weekStartsOn: 0 }).toISOString();
      } else {
        // Month View: Fetch full grid range (including prev/next month days)
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);
        startRange = startOfWeek(monthStart, { weekStartsOn: 0 }).toISOString();
        endRange = endOfWeek(monthEnd, { weekStartsOn: 0 }).toISOString();
      }

      const { data: apptData, error } = await supabase
        .from('appointments')
        .select(`
          *,
          customers (name, phone),
          services (name, duration, price),
          staff (display_name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .gte('start_time', startRange)
        .lte('start_time', endRange);

      if (error) throw error;
      
      console.log('📅 Calendar Fetch Debug:');
      console.log('   - Tenant ID:', profile.tenant_id);
      console.log('   - Range:', startRange, 'to', endRange);
      console.log('   - Found Appointments:', apptData?.length || 0);
      if (apptData?.length > 0) {
        console.log('   - First Appt:', apptData[0]);
      }

      setAppointments(apptData || []);

    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = () => {
    if (view === 'day') setSelectedDate(prev => addDays(prev, -1));
    else if (view === 'week') setSelectedDate(prev => addDays(prev, -7));
    else setSelectedDate(prev => addMonths(prev, -1));
  };

  const handleNext = () => {
    if (view === 'day') setSelectedDate(prev => addDays(prev, 1));
    else if (view === 'week') setSelectedDate(prev => addDays(prev, 7));
    else setSelectedDate(prev => addMonths(prev, 1));
  };

  const getAppointmentStyle = (appt) => {
    const start = parseISO(appt.start_time);
    const startHour = start.getHours();
    const startMinute = start.getMinutes();
    
    // Calculate position relative to OPEN_HOUR
    // Add 40px (h-10) for the column header ONLY in week view
    // In Day view, we have a relative container below the header, so no offset needed
    const offset = view === 'week' ? 40 : 0;
    const top = ((startHour - OPEN_HOUR) * 60 + startMinute) * MINUTE_HEIGHT + offset;
    // Calculate height based on service duration (default to 60 if missing)
    const duration = appt.services?.duration || differenceInMinutes(parseISO(appt.end_time), parseISO(appt.start_time));
    const height = duration * MINUTE_HEIGHT;

    // Status Colors
    let statusColor = 'border-l-4 border-indigo-500 bg-indigo-50 text-indigo-700';
    if (appt.status === 'completed') statusColor = 'border-l-4 border-green-500 bg-green-50 text-green-800';
    if (appt.status === 'cancelled') statusColor = 'border-l-4 border-red-500 bg-red-50 text-red-800 opacity-60';
    if (appt.status === 'confirmed') statusColor = 'border-l-4 border-indigo-600 bg-indigo-100 text-indigo-900';
    if (appt.status === 'blocked') statusColor = 'border-l-4 border-slate-500 bg-slate-200/80 text-slate-700 pattern-diagonal-lines-sm';

    return {
      top: `${top}px`,
      height: `${height}px`,
      className: `absolute left-1 right-1 rounded px-2 py-1 text-xs overflow-hidden transition-all hover:brightness-95 cursor-pointer z-10 ${statusColor}`
    };
  };

  // Generate Time Slots
  const timeSlots = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  // Month View Grid Generation
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const monthStartDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const monthEndDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const monthDays = eachDayOfInterval({ start: monthStartDate, end: monthEndDate });

  const getDateHeaderText = () => {
    if (view === 'day') return format(selectedDate, 'yyyy年 M月 d日 (EEEE)', { locale: zhTW });
    if (view === 'week') {
      const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 0 });
      return `${format(start, 'M月d日')} - ${format(end, 'M月d日')}`;
    }
    return format(selectedDate, 'yyyy年 M月', { locale: zhTW });
  };

  return (
    <div className="relative flex flex-col">
      
      {/* Header (White) */}
      <div className="sticky top-0 z-40 bg-white border-b border-rose-100 px-4 py-3 shadow-sm flex justify-between items-center">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          預約行事曆
        </h1>
        
        {/* Designer Selector */}
        <div className="relative group z-[60]">
          <button 
            onClick={() => setIsStaffSelectorOpen(!isStaffSelectorOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-sm border border-rose-100 text-sm font-bold text-slate-700 hover:border-rose-300 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          >
            <User weight="duotone" className="text-rose-500" size={18} />
            <span>{staff.find(s => s.id === selectedStaffId)?.display_name || '選擇設計師'}</span>
            <CaretDown className={`text-slate-400 transition-transform ${isStaffSelectorOpen ? 'rotate-180' : ''}`} weight="bold" size={14} />
          </button>
          
          {isStaffSelectorOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsStaffSelectorOpen(false)}
              />
              <div className="absolute top-full right-0 mt-2 w-full bg-white rounded-xl shadow-xl border border-rose-100 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                <button
                  onClick={() => {
                    setSelectedStaffId(null);
                    setIsStaffSelectorOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-rose-50 transition-colors flex items-center justify-between group
                    ${selectedStaffId === null ? 'bg-rose-50/50 text-rose-600 font-bold' : 'text-slate-600'}
                  `}
                >
                  <span className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${selectedStaffId === null ? 'bg-rose-500' : 'bg-transparent group-hover:bg-rose-200 transition-colors'}`} />
                    選擇設計師
                  </span>
                  {selectedStaffId === null && <CheckCircle weight="bold" className="text-rose-500" size={14} />}
                </button>
                {staff.map(member => (
                  <button
                    key={member.id}
                    onClick={() => {
                      setSelectedStaffId(member.id);
                      setIsStaffSelectorOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-rose-50 transition-colors flex items-center justify-between group
                      ${selectedStaffId === member.id ? 'bg-rose-50/50 text-rose-600 font-bold' : 'text-slate-600'}
                    `}
                  >
                    <span className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${selectedStaffId === member.id ? 'bg-rose-500' : 'bg-transparent group-hover:bg-rose-200 transition-colors'}`} />
                      {member.display_name}
                    </span>
                    {selectedStaffId === member.id && <CheckCircle weight="bold" className="text-rose-500" size={14} />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Controls (Pink) */}
      <div className="px-4 py-3 bg-rose-50/95 border-b border-rose-100 flex gap-3 items-center sticky top-[60px] z-30 backdrop-blur-sm shadow-sm">
        <div className="flex-1 flex bg-white rounded-xl border border-rose-100 p-1 shadow-sm">
           <button 
            onClick={() => setView('day')}
            className={`flex-1 justify-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'day' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500 hover:text-rose-500 hover:bg-rose-50'}`}
          >
            日檢視
          </button>
          <button 
            onClick={() => setView('week')}
            className={`flex-1 justify-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'week' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500 hover:text-rose-500 hover:bg-rose-50'}`}
          >
            週檢視
          </button>
          <button 
            onClick={() => setView('month')}
            className={`flex-1 justify-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'month' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500 hover:text-rose-500 hover:bg-rose-50'}`}
          >
            月檢視
          </button>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-rose-200 transition-all active:scale-95 whitespace-nowrap border border-rose-600"
        >
          <Plus weight="bold" size={16} />
          新增
        </button>
      </div>

      {/* Calendar Grid Container (No Card Effect) */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-rose-100/50 bg-rose-50">
          <button onClick={handlePrev} className="p-2 bg-white rounded-full text-slate-600 shadow-sm border border-rose-100 hover:text-rose-500 hover:border-rose-300 transition-all">
            <CaretLeft size={16} weight="bold" />
          </button>
          <h2 className="text-lg font-bold text-slate-800 tracking-wide">
            {getDateHeaderText()}
          </h2>
          <button onClick={handleNext} className="p-2 bg-white rounded-full text-slate-600 shadow-sm border border-rose-100 hover:text-rose-500 hover:border-rose-300 transition-all">
            <CaretRight size={16} weight="bold" />
          </button>
        </div>

        {/* Scrollable Calendar Area */}
        <div className="flex-1 overflow-y-auto relative bg-white/40 scrollbar-thin scrollbar-thumb-rose-200 scrollbar-track-transparent">
          <div className={`flex ${view === 'day' ? 'w-full' : 'w-full'}`}>
            {/* Time Axis (Hide in Month View) */}
            {view !== 'month' && (
              <div className="w-16 flex-shrink-0 bg-white/40 border-r border-rose-100 sticky left-0 z-20 backdrop-blur-sm">
                <div className={`${view === 'week' ? 'h-10' : 'h-16'} border-b border-rose-100 bg-white/40`}></div> {/* Header Spacer */}
                {timeSlots.map(hour => (
                  <div key={hour} className="h-[60px] border-b border-rose-50 text-xs text-slate-400 flex justify-center pt-2 font-mono">
                    {hour}:00
                  </div>
                ))}
              </div>
            )}

            {/* Day View (Single Column Full Width) */}
            {view === 'day' && (
              <div className="flex-1 min-w-0 border-r border-rose-50 relative group bg-white/20">
                {/* Column Header */}
                  <div className="h-16 bg-white/80 border-b border-rose-100 flex items-center justify-center gap-3 sticky top-0 z-10 backdrop-blur-md shadow-sm">
                    {staff.find(s => s.id === selectedStaffId) ? (
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-rose-500 border-2 border-rose-100 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                             {staff.find(s => s.id === selectedStaffId)?.display_name?.[0] || 'S'}
                          </div>
                          <span className="text-lg font-bold text-slate-800 tracking-wide">
                             {staff.find(s => s.id === selectedStaffId)?.display_name}
                          </span>
                       </div>
                    ) : (
                       <span className="text-lg font-bold text-slate-700">本日行程 (全體)</span>
                    )}
                  </div>

                {/* Time Slots & Appointments Container */}
                <div className="relative">
                  {/* Time Slots Background */}
                  {timeSlots.map(hour => (
                    <div key={hour} className="h-[60px] border-b border-rose-50/50"></div>
                  ))}

                  {/* Appointments */}
                  {appointments
                    .filter(appt => (!selectedStaffId || appt.staff_id === selectedStaffId) && isSameDay(parseISO(appt.start_time), selectedDate))
                    .map(appt => {
                      const style = getAppointmentStyle(appt);
                      const isBlocked = appt.status === 'blocked';
                      return (
                        <div 
                          key={appt.id}
                          style={{ top: style.top, height: style.height }}
                          className={`${style.className.replace('rounded', '').replace('border-rose-500', 'border-indigo-500')} !left-0 !right-0 shadow-sm z-10 border-l-4`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAppointmentId(appt.id);
                          }}
                        >
                          {isBlocked ? (
                            <div className="flex flex-col h-full justify-center px-3">
                               <div className="font-bold flex items-center gap-2 text-sm">
                                 <Lock size={14} weight="fill" />
                                 {appt.notes?.split(' - ')[0] || '鎖定'}
                               </div>
                               {appt.notes?.split(' - ')[1] && (
                                 <div className="text-xs opacity-80">{appt.notes.split(' - ')[1]}</div>
                               )}
                            </div>
                          ) : (
                            <div className="flex flex-col h-full justify-center px-3 overflow-hidden">
                               <div className="flex flex-row items-baseline w-full">
                                  {/* Left Column: Name & Phone */}
                                  <div className="flex flex-col min-w-fit pr-4">
                                     <span className="font-bold text-base text-slate-900 leading-tight">
                                        {appt.customers?.name || '未知客'}
                                     </span>
                                     {appt.customers?.phone && (
                                        <div className="text-sm text-slate-500 font-mono mt-0.5 leading-tight">
                                           {appt.customers.phone}
                                        </div>
                                     )}
                                  </div>
   
                                  {/* Right Column: Tags */}
                                  <div className="flex flex-wrap items-center content-center gap-1.5 flex-1">
                                     <span className="bg-white/60 px-1.5 py-0.5 rounded text-xs font-medium text-slate-700 shadow-sm border border-black/5 whitespace-nowrap">
                                        {appt.services?.name}
                                     </span>
                                     {/* Future multi-service tags support */}
                                  </div>
                               </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

             {/* Week View Columns */}
             {view === 'week' && weekDays.map(day => {
               const isToday = isSameDay(day, new Date());
               return (
                 <div key={day.toISOString()} className={`flex-1 min-w-0 border-r border-rose-50 relative group ${isToday ? 'bg-rose-50/30' : 'bg-white/20'}`}>
                   {/* Column Header */}
                   <div className={`h-10 border-b border-rose-100 flex flex-col items-center justify-center sticky top-0 z-10 backdrop-blur-md ${isToday ? 'bg-rose-100/80' : 'bg-white/60'}`}>
                      <span className={`text-[10px] md:text-xs font-medium ${isToday ? 'text-rose-600' : 'text-slate-500'}`}>{format(day, 'EEE', { locale: zhTW })}</span>
                      <span className={`text-xs md:text-sm font-bold ${isToday ? 'text-rose-700' : 'text-slate-700'}`}>{format(day, 'd')}</span>
                   </div>

                   {/* Time Slots Background */}
                   {timeSlots.map(hour => (
                     <div key={hour} className="h-[60px] border-b border-rose-50/50"></div>
                   ))}

                   {/* Appointments */}
                   {appointments
                     .filter(appt => (!selectedStaffId || appt.staff_id === selectedStaffId) && isSameDay(parseISO(appt.start_time), day))
                     .map(appt => {
                       const style = getAppointmentStyle(appt);
                       const isBlocked = appt.status === 'blocked';
                       return (
                         <div 
                          key={appt.id}
                          style={{ top: style.top, height: style.height, left: '1px', right: '1px' }}
                          className={`${style.className} !w-auto shadow-sm !px-1`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAppointmentId(appt.id);
                          }}
                        >
                            {isBlocked ? (
                               <div className="font-semibold truncate flex items-center gap-1 text-[10px] text-slate-600">
                                 <Lock size={10} weight="fill" />
                                 <span className="truncate">{appt.notes?.split(' - ')[0]}</span>
                               </div>
                            ) : (
                              <>
                                <div className="font-semibold truncate flex items-center gap-1 text-[10px]">
                                 <div className="w-1.5 h-1.5 rounded-full bg-white/80 shrink-0"></div>
                                 <span className="truncate">{appt.customers?.name}</span>
                               </div>
                               <div className="text-[10px] opacity-80 truncate leading-tight hidden md:block">
                                  {appt.services?.name}
                               </div>
                              </>
                            )}
                         </div>
                       );
                     })}
                 </div>
               );
             })}

            {/* Month View Grid */}
            {view === 'month' && (
              <div className="flex-1 flex flex-col min-h-[600px] bg-white/20">
                {/* Month Header (Days of week) */}
                <div className="grid grid-cols-7 border-b border-rose-100 bg-white/60 backdrop-blur-md sticky top-0 z-10">
                  {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                    <div key={d} className="py-2 text-center text-xs font-medium text-slate-500">
                      {d}
                    </div>
                  ))}
                </div>
                
                {/* Days Grid */}
                <div className="flex-1 grid grid-cols-7 auto-rows-fr">
                  {monthDays.map(day => {
                    const isCurrentMonth = isSameMonth(day, selectedDate);
                    const isToday = isSameDay(day, new Date());
                    const dayAppts = appointments.filter(appt => (!selectedStaffId || appt.staff_id === selectedStaffId) && isSameDay(parseISO(appt.start_time), day));
                    
                    return (
                      <div 
                        key={day.toISOString()} 
                        className={`min-h-[100px] border-b border-r border-rose-50 p-1 flex flex-col gap-1 transition-colors hover:bg-rose-50/30
                          ${!isCurrentMonth ? 'bg-slate-50/50 text-slate-300' : 'bg-white/40'}
                          ${isToday ? 'bg-rose-50/50' : ''}
                        `}
                        onClick={() => {
                          setSelectedDate(day);
                          setView('day');
                        }}
                      >
                        <div className="flex justify-center">
                          <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                            ${isToday ? 'bg-rose-500 text-white shadow-sm' : isCurrentMonth ? 'text-slate-700' : 'text-slate-300'}
                          `}>
                            {format(day, 'd')}
                          </span>
                        </div>
                        
                        {/* Appointment Dots/Bars */}
                        <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                          {dayAppts.slice(0, 3).map(appt => (
                            <div 
                              key={appt.id} 
                              className={`text-[10px] border rounded px-1 py-0.5 truncate shadow-sm flex items-center gap-1 cursor-pointer hover:brightness-95
                                ${appt.status === 'blocked' 
                                  ? 'bg-slate-100 border-slate-300 text-slate-600' 
                                  : 'bg-indigo-50 border-indigo-200 text-indigo-700'}
                              `}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAppointmentId(appt.id);
                              }}
                            >
                               <div className={`w-1.5 h-1.5 rounded-full shrink-0 
                                 ${appt.status === 'blocked' ? 'bg-slate-500' : 'bg-indigo-500'
                                 }`}></div>
                               <span className="font-mono font-bold text-[10px] leading-none opacity-90">
                                 {format(parseISO(appt.start_time), 'HH:mm')}
                               </span>
                               <span className="truncate">
                                 {appt.status === 'blocked' ? (appt.notes?.split(' - ')[0] || '鎖定') : appt.customers?.name}
                               </span>
                            </div>
                          ))}
                          {dayAppts.length > 3 && (
                            <div className="text-[10px] text-slate-400 text-center">
                              +{dayAppts.length - 3} 更多
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Empty State if no staff (Only for Day view) */}
            {view === 'day' && staff.length === 0 && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-20">
                <User size={48} weight="duotone" className="mb-4 opacity-50" />
                <p>尚無員工資料，請先至員工管理新增。</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <NewAppointmentModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditData(null);
        }}
        onSuccess={fetchData}
        initialDate={selectedDate}
        initialStaffId={selectedStaffId}
        editData={editData}
      />
      
      <AppointmentDetailsModal
        isOpen={!!selectedAppointmentId}
        onClose={() => setSelectedAppointmentId(null)}
        appointmentId={selectedAppointmentId}
        onUpdate={() => {
          fetchData();
          setSelectedAppointmentId(null);
        }}
        onEdit={(details, items) => {
           setEditData({ appointment: details, items });
           setSelectedAppointmentId(null);
           setIsModalOpen(true);
        }}
      />
    </div>
  );
};

export default CalendarPage;

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
import DepositReviewModal from '../components/DepositReviewModal';

// Constants
const OPEN_HOUR = 10;
const CLOSE_HOUR = 21;
const SLOT_HEIGHT = 60; // 1 hour = 60px height
const MINUTE_HEIGHT = SLOT_HEIGHT / 60;

// Helper to calculate layout for overlapping events
const calculateLayout = (events) => {
  if (!events || events.length === 0) return [];
  
  // 1. Sort by start time
  const sorted = [...events].sort((a, b) => {
    const startA = new Date(a.start_time).getTime();
    const startB = new Date(b.start_time).getTime();
    if (startA !== startB) return startA - startB;
    return new Date(b.end_time).getTime() - new Date(a.end_time).getTime();
  });

  // 2. Group overlapping events
  const groups = [];
  let currentGroup = [];
  let groupEndTime = 0;

  sorted.forEach(event => {
    const start = new Date(event.start_time).getTime();
    const end = new Date(event.end_time).getTime();

    if (currentGroup.length === 0) {
      currentGroup.push(event);
      groupEndTime = end;
    } else {
      if (start < groupEndTime) {
        // Overlaps with the group
        currentGroup.push(event);
        groupEndTime = Math.max(groupEndTime, end);
      } else {
        // New group
        groups.push(currentGroup);
        currentGroup = [event];
        groupEndTime = end;
      }
    }
  });
  if (currentGroup.length > 0) groups.push(currentGroup);

  // 3. Process each group
  const result = [];
  groups.forEach(group => {
    const columns = []; // [endTime1, endTime2, ...]
    
    const groupWithLayout = group.map(event => {
       const start = new Date(event.start_time).getTime();
       const end = new Date(event.end_time).getTime();
       
       let colIndex = 0;
       while (colIndex < columns.length) {
         if (start >= columns[colIndex]) break;
         colIndex++;
       }
       columns[colIndex] = end;
       return { ...event, colIndex };
    });

    const totalColumns = columns.length;
    
    groupWithLayout.forEach(event => {
       result.push({
         ...event,
         layoutStyle: {
           width: `${100 / totalColumns}%`,
           left: `${(event.colIndex / totalColumns) * 100}%`
         }
       });
    });
  });

  return result;
};

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
  const [pendingDeposits, setPendingDeposits] = useState([]);
  const [isDepositReviewOpen, setIsDepositReviewOpen] = useState(false);
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
        
        // Default to first staff member
        if (currentStaff.length > 0 && !selectedStaffId) {
            setSelectedStaffId(currentStaff[0].id);
        }
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
          services (name, duration, price, service_categories (color)),
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

      // 4. Fetch Pending Deposits
      if (profile.tenant_id) {
        fetchPendingDeposits(profile.tenant_id);
      }

    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingDeposits = async (tenantId) => {
    try {
      const { data, error } = await supabase
        .from('deposit_reports')
        .select(`
          *,
          appointments (
            start_time,
            customers (name, phone),
            services (name, price)
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'pending_confirmation')
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist yet, ignore error (dev mode)
        if (error.code !== '42P01') console.error('Error fetching pending deposits:', error);
        return;
      }

      setPendingDeposits(data || []);
    } catch (err) {
      console.error('Error in fetchPendingDeposits:', err);
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
    
    // 1. Check Service Category Color (Priority for Confirmed/Scheduled)
    const categoryColor = appt.services?.service_categories?.color;
    const colorMap = {
      rose: 'border-rose-500 bg-rose-50 text-rose-900',
      pink: 'border-pink-500 bg-pink-50 text-pink-900',
      purple: 'border-purple-500 bg-purple-50 text-purple-900',
      indigo: 'border-indigo-500 bg-indigo-50 text-indigo-900',
      blue: 'border-blue-500 bg-blue-50 text-blue-900',
      cyan: 'border-cyan-500 bg-cyan-50 text-cyan-900',
      teal: 'border-teal-500 bg-teal-50 text-teal-900',
      emerald: 'border-emerald-500 bg-emerald-50 text-emerald-900',
      green: 'border-green-500 bg-green-50 text-green-900',
      lime: 'border-lime-500 bg-lime-50 text-lime-900',
      yellow: 'border-yellow-500 bg-yellow-50 text-yellow-900',
      amber: 'border-amber-500 bg-amber-50 text-amber-900',
      orange: 'border-orange-500 bg-orange-50 text-orange-900',
      red: 'border-red-500 bg-red-50 text-red-900',
      slate: 'border-slate-500 bg-slate-50 text-slate-900',
      gray: 'border-gray-500 bg-gray-50 text-gray-900',
    };

    if (categoryColor && colorMap[categoryColor]) {
      statusColor = `border-l-4 ${colorMap[categoryColor]}`;
    }

    // 2. Status Overrides (Critical statuses override category color)
    if (appt.status === 'completed') statusColor = 'border-l-4 border-green-500 bg-green-50 text-green-800';
    if (appt.status === 'cancelled') statusColor = 'border-l-4 border-red-500 bg-red-50 text-red-800 opacity-60';
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
           <div className="w-8 h-8 rounded-full overflow-hidden border border-rose-100 shadow-sm">
                <img 
                    src="/logo.png" 
                    alt="Logo" 
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }} 
                />
           </div>
          預約行事曆
        </h1>
        
        {/* Deposit Review Button */}
        <button 
          onClick={() => setIsDepositReviewOpen(true)}
          className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors mr-2"
          title="待確認訂金"
        >
          <CurrencyDollar size={24} weight="duotone" />
          {pendingDeposits.length > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          )}
        </button>

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

            {/* Day View (Multi-Column for Staff) */}
            {view === 'day' && (
              <div className="flex-1 flex overflow-x-auto min-w-0 divide-x divide-rose-50 bg-white/20">
                {(selectedStaffId ? staff.filter(s => s.id === selectedStaffId) : staff).map(member => {
                   const memberAppts = appointments.filter(appt => 
                       appt.staff_id === member.id && isSameDay(parseISO(appt.start_time), selectedDate)
                   );
                   
                   return (
                     <div key={member.id} className="flex-1 min-w-[200px] relative group border-r border-rose-50 last:border-r-0">
                        {/* Column Header */}
                        <div className="h-16 bg-white/80 border-b border-rose-100 flex items-center justify-center gap-2 sticky top-0 z-20 backdrop-blur-md shadow-sm">
                           <div className="w-8 h-8 rounded-full bg-rose-500 border-2 border-rose-100 flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0">
                              {member.display_name?.[0] || 'S'}
                           </div>
                           <span className="text-base font-bold text-slate-800 truncate max-w-[120px]">
                              {member.display_name}
                           </span>
                        </div>

                        {/* Time Slots Background */}
                        <div className="absolute inset-0 top-16 z-0 pointer-events-none">
                           {timeSlots.map(hour => (
                             <div key={hour} className="h-[60px] border-b border-rose-50/50 w-full"></div>
                           ))}
                        </div>

                        {/* Appointments Container */}
                        <div className="relative z-10">
                           {calculateLayout(memberAppts).map(appt => {
                             const style = getAppointmentStyle(appt);
                             const isBlocked = appt.status === 'blocked';
                             const { width, left } = appt.layoutStyle || { width: '100%', left: '0%' };
                             
                             return (
                               <div 
                                 key={appt.id}
                                 style={{ 
                                   top: style.top, 
                                   height: style.height,
                                   width: `calc(${width} - 4px)`,
                                   left: `calc(${left} + 2px)`
                                 }}
                                 className={`${style.className} shadow-sm z-10`}
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setSelectedAppointmentId(appt.id);
                                 }}
                               >
                                 {isBlocked ? (
                                   <div className="flex flex-col h-full justify-center px-2 overflow-hidden">
                                      <div className="font-bold flex items-center gap-1 text-xs truncate">
                                        <Lock size={12} weight="fill" />
                                        {appt.notes?.split(' - ')[0] || '鎖定'}
                                      </div>
                                   </div>
                                 ) : (
                                   <div className="flex flex-col h-full justify-center px-2 overflow-hidden">
                                      <div className="font-bold text-sm text-slate-900 leading-tight truncate">
                                         {appt.customers?.name || '未知客'}
                                      </div>
                                      <div className="text-xs opacity-90 truncate mt-0.5">
                                         {appt.services?.name}
                                      </div>
                                   </div>
                                 )}
                               </div>
                             );
                           })}
                        </div>
                     </div>
                   );
                })}

                {/* Empty State */}
                {staff.length === 0 && !loading && (
                   <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-20 min-w-[300px]">
                     <User size={48} weight="duotone" className="mb-4 opacity-50" />
                     <p>尚無員工資料，請先至員工管理新增。</p>
                   </div>
                )}
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
                   {calculateLayout(appointments
                     .filter(appt => (!selectedStaffId || appt.staff_id === selectedStaffId) && isSameDay(parseISO(appt.start_time), day)))
                     .map(appt => {
                       const style = getAppointmentStyle(appt);
                       const isBlocked = appt.status === 'blocked';
                       const { width, left } = appt.layoutStyle || { width: '100%', left: '0%' };
                       
                       return (
                         <div 
                          key={appt.id}
                          style={{ 
                            top: style.top, 
                            height: style.height, 
                            width: `calc(${width} - 2px)`,
                            left: `calc(${left} + 1px)`
                          }}
                          className={`${style.className} shadow-sm !px-1`}
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
      
      <DepositReviewModal 
        isOpen={isDepositReviewOpen} 
        onClose={() => setIsDepositReviewOpen(false)}
        pendingDeposits={pendingDeposits}
        onRefresh={() => {
          if (staff.length > 0) fetchPendingDeposits(staff[0].tenant_id);
          else fetchData();
        }}
      />
    </div>
  );
};

export default CalendarPage;

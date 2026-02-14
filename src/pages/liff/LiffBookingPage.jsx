import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useLiffAuth } from '../../context/LiffAuthContext';
import { supabase } from '../../lib/supabaseClient';
import { 
  format, startOfToday, isSameDay, startOfMonth, endOfMonth, 
  eachDayOfInterval, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth,
  addMinutes, isBefore, parse
} from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { CaretLeft, CaretRight, CalendarBlank, User, Sparkle, CaretDown, Check, Star, WarningCircle } from '@phosphor-icons/react';

const LiffBookingPage = () => {
  const { themeColor } = useTheme();
  const { tenantId } = useParams();
  const [realTenantId, setRealTenantId] = useState(null);
  const navigate = useNavigate();
  const { liffUser } = useLiffAuth();

  // State
  const [staffList, setStaffList] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]); 
  const [isMockMode, setIsMockMode] = useState(false);

  // Resolve Tenant ID (Slug -> UUID)
  useEffect(() => {
    const resolveTenant = async () => {
        if (!tenantId) return;
        
        // Hardcoded Mapping for Demo/Dev
        const TENANT_MAPPING = {
            'demo': '074fe7e8-7881-447d-81eb-9faa638d2270',
            'nexa-demo-dev': '074fe7e8-7881-447d-81eb-9faa638d2270'
        };

        if (TENANT_MAPPING[tenantId]) {
            setRealTenantId(TENANT_MAPPING[tenantId]);
            return;
        }

        // Check if it's already a UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId);
        
        if (isUuid) {
            setRealTenantId(tenantId);
        } else {
            try {
                const { data, error } = await supabase
                    .from('tenants')
                    .select('id')
                    .eq('slug', tenantId)
                    .maybeSingle();
                
                if (data) {
                    setRealTenantId(data.id);
                } else {
                    console.error('Tenant not found for slug:', tenantId);
                    // Optionally navigate to error page or handle gracefully
                }
            } catch (err) {
                console.error('Error resolving tenant:', err);
            }
        }
    };
    resolveTenant();
  }, [tenantId]); 
  
  // Selection State
  const [selectedCategory, setSelectedCategory] = useState(''); // Category ID
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  
  // UI State for Dropdowns
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isServiceOpen, setIsServiceOpen] = useState(false);
  
  // Date & Time State
  const [currentMonth, setCurrentMonth] = useState(startOfToday());
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [selectedTime, setSelectedTime] = useState(null); // Stores the START time string (e.g. "10:00")
  
  // Mock Availability
  // Flattened slots for easier calculation
  const allTimeSlots = [
    '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30'
  ];

  // Grouped for display
  const timeSlotsGrouped = {
    morning: allTimeSlots.slice(0, 4),
    afternoon: allTimeSlots.slice(4, 16),
    evening: allTimeSlots.slice(16)
  };

  // Mock Unavailable Slots (e.g. booked or break)
  const unavailableSlots = ['12:30', '15:00', '15:30', '14:30']; 

  // Mock Data for fallback
  const mockStaff = [
    { id: 'm4', display_name: 'Anna', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anna', role: '上次服務' },
    { id: 'm2', display_name: 'Jessica', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica', role: '店長' },
    { id: 'm1', display_name: 'Nana', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nana' },
    { id: 'm3', display_name: 'Mike', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike' },
    { id: 'any', display_name: '不指定', avatar_url: '', isAny: true },
  ];

  const mockCategories = [
    { id: 'c1', name: '手部凝膠' },
    { id: 'c2', name: '足部護理' },
    { id: 'c3', name: '睫毛嫁接' },
    { id: 'c4', name: '紋繡服務' }
  ];

  const mockServices = [
    { id: 's1', category_id: 'c1', name: '單色凝膠 (手部)', duration: 60, price: 1200 },
    { id: 's2', category_id: 'c2', name: '深層保濕護理', duration: 90, price: 1800 },
    { id: 's3', category_id: 'c2', name: '足部去角質', duration: 45, price: 800 },
    { id: 's4', category_id: 'c3', name: '日式睫毛嫁接', duration: 120, price: 2200 },
    { id: 's5', category_id: 'c3', name: '3D 輕柔款', duration: 90, price: 1800 },
    { id: 's6', category_id: 'c1', name: '造型凝膠 (不限款)', duration: 90, price: 1500 },
  ];

  useEffect(() => {
    if (liffUser?.displayName) {
        setCustomerName(liffUser.displayName);
    }
    if (liffUser?.phone) {
        setCustomerPhone(liffUser.phone);
    }
  }, [liffUser]);

  useEffect(() => {
    if (realTenantId) {
        fetchStaff();
        fetchServicesAndCategories();
    }
  }, [realTenantId]);

  const fetchStaff = async () => {
    if (!realTenantId) {
        setStaffList(mockStaff);
        setIsMockMode(true);
        return;
    }
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('tenant_id', realTenantId)
      .eq('is_active', true);
    
    if (error || !data || data.length === 0) {
        console.warn('Using mock staff due to error or empty data:', error);
        setStaffList(mockStaff);
        setIsMockMode(true);
    } else {
        const staffWithAny = [
             ...data,
            { id: 'any', display_name: '不指定', avatar_url: '', isAny: true }
        ];
        setStaffList(staffWithAny);
    }
  };

  const fetchServicesAndCategories = async () => {
    if (!realTenantId) {
        setServices(mockServices);
        setCategories(mockCategories);
        setIsMockMode(true);
        return;
    }
    
    const { data: cats, error: catError } = await supabase
      .from('service_categories')
      .select('*')
      .eq('tenant_id', realTenantId);

    if (catError || !cats || cats.length === 0) {
        console.warn('Using mock categories due to error or empty data:', catError);
        setCategories(mockCategories);
        setIsMockMode(true);
    } else {
        setCategories(cats);
    }

    const { data: svcs, error: svcError } = await supabase
      .from('services')
      .select('*')
      .eq('tenant_id', realTenantId)
      .eq('is_active', true);
    
    if (svcError || !svcs || svcs.length === 0) {
        console.warn('Using mock services due to error or empty data:', svcError);
        setServices(mockServices);
        setIsMockMode(true);
    } else {
        setServices(svcs);
    }
  };

  // Calendar Logic
  const calendarStart = startOfWeek(startOfMonth(currentMonth));
  const calendarEnd = endOfWeek(endOfMonth(currentMonth));
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Filtered Services
  const filteredServices = selectedCategory 
    ? services.filter(s => s.category_id === selectedCategory || (!s.category_id && selectedCategory === 'other'))
    : [];

  const getCategoryName = (id) => categories.find(c => c.id === id)?.name || '請選擇分類';

  // --- Time Slot Logic (Updated) ---

  // Helper: Check if time is in the past or within 30 min buffer
  const isTimeBlockedByBuffer = (timeStr) => {
    if (!isSameDay(selectedDate, new Date())) return false; // Not today, no buffer needed

    const now = new Date();
    const bufferTime = addMinutes(now, 30);
    
    const [hours, minutes] = timeStr.split(':').map(Number);
    const slotTime = new Date(selectedDate);
    slotTime.setHours(hours, minutes, 0, 0);

    return isBefore(slotTime, bufferTime);
  };

  // 1. Calculate Slots Needed based on Duration
  const getSlotsNeeded = () => {
      if (!selectedService) return 1;
      return Math.ceil(selectedService.duration / 30);
  };

  // 2. Check if a start time is valid (has enough consecutive slots available)
  const isTimeStartable = (startTime) => {
      const startIndex = allTimeSlots.indexOf(startTime);
      if (startIndex === -1) return false;

      const slotsNeeded = getSlotsNeeded();
      
      // Check boundaries
      if (startIndex + slotsNeeded > allTimeSlots.length) return false;

      // Check availability of all required slots
      for (let i = 0; i < slotsNeeded; i++) {
          const slot = allTimeSlots[startIndex + i];
          
          // Condition A: Slot is statically unavailable (booked/break)
          if (unavailableSlots.includes(slot)) return false;
          
          // Condition B: Slot is dynamically blocked (past time / 30min buffer)
          if (isTimeBlockedByBuffer(slot)) return false;
      }
      return true;
  };

  // 3. Check if a slot is part of the current selection range
  const isTimeSelected = (time) => {
      if (!selectedTime) return false;
      
      const startIndex = allTimeSlots.indexOf(selectedTime);
      const currentTimeIndex = allTimeSlots.indexOf(time);
      const slotsNeeded = getSlotsNeeded();

      return currentTimeIndex >= startIndex && currentTimeIndex < startIndex + slotsNeeded;
  };

  const handleTimeSelect = (time) => {
      if (isTimeStartable(time)) {
          setSelectedTime(time);
      } else {
          // Determine specific error message
          if (isTimeBlockedByBuffer(time)) {
             alert('無法選擇過去時間，或需保留30分鐘緩衝時間');
          } else if (unavailableSlots.includes(time)) {
             alert('該時段已被預約');
          } else {
             alert(`該時段長度不足您的預約項目 (${selectedService?.duration}分鐘)，後續時段不足或已被預約`);
          }
      }
  };


  const handleConfirmBooking = async () => {
      if (!customerName || !customerPhone) {
          alert('請填寫聯絡資訊');
          return;
      }
      
      setLoading(true);
      
      // Mock Mode Bypass
      if (isMockMode) {
          setTimeout(() => {
              setLoading(false);
              alert('預約模擬成功！(Demo Mode: 資料未寫入資料庫)');
              navigate(`/liff/${tenantId}`); // Or wherever appropriate
          }, 1500);
          return;
      }

      try {
          // 1. Find or Create Customer
          let customerId = liffUser?.dbId;
          let customer = null;

          if (customerId) {
              // Fetch full customer object if we only have ID (though context might have it)
              const { data: existingCustomer } = await supabase
                  .from('customers')
                  .select('*')
                  .eq('id', customerId)
                  .single();
              customer = existingCustomer;
          }

          if (!customer) {
               // Fallback: Find by phone
               let { data: foundByPhone } = await supabase
                  .from('customers')
                  .select('*')
                  .eq('phone', customerPhone)
                  .eq('tenant_id', realTenantId)
                  .maybeSingle();
               customer = foundByPhone;
          }
              
          if (!customer) {
              // Create new customer
              const { data: newCustomer, error: createError } = await supabase
                  .from('customers')
                  .insert({
                      tenant_id: realTenantId,
                      name: customerName,
                      phone: customerPhone,
                      line_user_id: liffUser?.lineUserId,
                      line_display_name: liffUser?.displayName,
                      line_picture_url: liffUser?.pictureUrl,
                      notes: 'Created via LIFF Booking'
                  })
                  .select()
                  .single();
                  
              if (createError) throw createError;
              customer = newCustomer;
          }
          
          // 2. Create Appointment
          const startTime = new Date(selectedDate);
          const [hours, minutes] = selectedTime.split(':').map(Number);
          startTime.setHours(hours, minutes, 0, 0);
          
          const endTime = addMinutes(startTime, selectedService.duration);
          
          const { data: appointment, error: apptError } = await supabase
              .from('appointments')
              .insert({
                  tenant_id: realTenantId,
                  customer_id: customer.id,
                  staff_id: selectedStaff.id === 'any' ? (staffList.find(s => !s.isAny)?.id) : selectedStaff.id,
                  service_id: selectedService.id,
                  start_time: startTime.toISOString(),
                  end_time: endTime.toISOString(),
                  status: 'confirmed'
              })
              .select()
              .single();
              
          if (apptError) throw apptError;
          
          // 3. Create Appointment Item
           const { error: itemError } = await supabase
              .from('appointment_items')
              .insert({
                  appointment_id: appointment.id,
                  service_id: selectedService.id,
                  price: selectedService.price,
                  duration: selectedService.duration
              });
              
           if (itemError) throw itemError;
           
           alert('預約成功！');
           // In real LIFF, might close window or redirect
           navigate(`/liff/${tenantId}`);
           
      } catch (error) {
          console.error(error);
          alert('預約失敗，請稍後再試: ' + error.message);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      {/* Header */}
      <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center">
        <button onClick={() => navigate(-1)} className="mr-2 text-gray-600">
          <CaretLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">預約服務</h1>
      </div>

      <div className="p-4 space-y-6">
        
        {/* 1. Select Service */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center mb-4 space-x-2">
            <Sparkle size={20} weight="fill" style={{ color: themeColor }} />
            <h2 className="text-md font-bold text-gray-900">選擇服務項目</h2>
          </div>
          
          <div className="space-y-4">
            {/* Category Dropdown */}
            <div className="relative">
                <label className="text-xs font-bold text-gray-400 mb-1.5 block uppercase tracking-wide">服務分類</label>
                <button 
                    onClick={() => { setIsCategoryOpen(!isCategoryOpen); setIsServiceOpen(false); }}
                    className="w-full flex justify-between items-center p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-left active:scale-[0.99] transition-all"
                    style={{ borderColor: isCategoryOpen ? themeColor : '#e5e7eb' }}
                >
                    <span className={`font-medium ${selectedCategory ? 'text-gray-900' : 'text-gray-400'}`}>
                        {selectedCategory ? getCategoryName(selectedCategory) : '請選擇主分類'}
                    </span>
                    <CaretDown size={16} className={`text-gray-400 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Category Options Dropdown */}
                {isCategoryOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-30 overflow-hidden animate-fade-in-down">
                        {categories.map(cat => (
                            <div 
                                key={cat.id}
                                onClick={() => { 
                                    setSelectedCategory(cat.id); 
                                    setSelectedService(null); 
                                    setIsCategoryOpen(false);
                                    setIsServiceOpen(true); 
                                }}
                                className="p-3.5 hover:bg-gray-50 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0"
                            >
                                <span className="text-gray-700 font-medium">{cat.name}</span>
                                {selectedCategory === cat.id && <Check size={16} weight="bold" style={{ color: themeColor }} />}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Service Dropdown */}
            <div className="relative">
                <label className="text-xs font-bold text-gray-400 mb-1.5 block uppercase tracking-wide">服務項目</label>
                <button 
                    disabled={!selectedCategory}
                    onClick={() => setIsServiceOpen(!isServiceOpen)}
                    className={`w-full flex justify-between items-center p-3.5 rounded-xl border text-left transition-all
                        ${!selectedCategory ? 'bg-gray-100 text-gray-400 border-transparent cursor-not-allowed' : 'bg-gray-50 border-gray-200 active:scale-[0.99]'}
                    `}
                    style={{ borderColor: isServiceOpen ? themeColor : (selectedCategory ? '#e5e7eb' : 'transparent') }}
                >
                    <span className={`font-medium ${selectedService ? 'text-gray-900' : 'text-gray-400'}`}>
                        {selectedService ? selectedService.name : (selectedCategory ? '請選擇服務項目' : '請先選擇分類')}
                    </span>
                    <CaretDown size={16} className={`text-gray-400 transition-transform ${isServiceOpen ? 'rotate-180' : ''}`} />
                </button>

                 {/* Service Options Dropdown */}
                 {isServiceOpen && selectedCategory && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-30 overflow-hidden max-h-64 overflow-y-auto">
                        {filteredServices.length > 0 ? (
                            filteredServices.map(svc => (
                                <div 
                                    key={svc.id}
                                    onClick={() => { 
                                        setSelectedService(svc); 
                                        setSelectedTime(null); // Reset time if duration changes
                                        setIsServiceOpen(false); 
                                    }}
                                    className="p-3.5 hover:bg-gray-50 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0"
                                >
                                    <div>
                                        <div className="text-gray-900 font-medium">{svc.name}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">{svc.duration} 分鐘 • ${svc.price}</div>
                                    </div>
                                    {selectedService?.id === svc.id && <Check size={16} weight="bold" style={{ color: themeColor }} />}
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-gray-400 text-sm">此分類暫無服務</div>
                        )}
                    </div>
                )}
            </div>
            
            {/* Selected Service Summary */}
            {selectedService && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-center animate-fade-in">
                    <span className="text-sm text-gray-600">已選擇：<span className="font-bold text-gray-900">{selectedService.name}</span></span>
                    <div className="text-right">
                        <span className="text-xs text-gray-400 block">{selectedService.duration} 分鐘</span>
                        <span className="text-sm font-bold" style={{ color: themeColor }}>${selectedService.price}</span>
                    </div>
                </div>
            )}
          </div>
        </section>

        {/* 2. Select Staff */}
        <section className={`bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition-opacity duration-300 ${!selectedService ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          <div className="flex items-center mb-4 space-x-2">
            <User size={20} className="text-gray-400" />
            <h2 className="text-md font-bold text-gray-900">選擇設計師</h2>
            {!selectedService && <span className="text-xs text-red-400 ml-2">(請先選擇服務)</span>}
          </div>
          <div className="flex overflow-x-auto gap-5 py-4 hide-scrollbar px-2">
            {staffList.map((staff) => (
              <div 
                key={staff.id}
                onClick={() => {
                    setSelectedStaff(staff);
                    setSelectedTime(null); 
                }}
                className={`flex flex-col items-center min-w-[72px] cursor-pointer transition-all transform 
                    ${selectedStaff?.id === staff.id ? 'scale-110' : 'opacity-70 hover:opacity-100'}
                `}
              >
                <div 
                  className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300
                     ${selectedStaff?.id === staff.id ? 'ring-2 ring-offset-2' : 'border border-gray-100'}
                  `}
                  style={{ 
                      borderColor: selectedStaff?.id === staff.id ? 'transparent' : '#e5e7eb',
                      boxShadow: selectedStaff?.id === staff.id ? `0 0 0 2px ${themeColor}20` : 'none',
                      ['--tw-ring-color']: selectedStaff?.id === staff.id ? themeColor : 'transparent',
                      background: staff.isAny ? '#f3f4f6' : 'transparent'
                  }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden p-[2px]"> 
                     {staff.isAny ? (
                         <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-full text-gray-400">
                             <User size={24} weight="duotone" />
                         </div>
                     ) : (
                         <img src={staff.avatar_url || 'https://via.placeholder.com/150'} alt={staff.display_name} className="w-full h-full object-cover rounded-full" />
                     )}
                  </div>
                  
                  {selectedStaff?.id === staff.id && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm z-10">
                        <Check size={12} weight="bold" style={{ color: themeColor }} />
                    </div>
                  )}

                  {staff.role && !staff.isAny && (
                      <div className={`absolute -top-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-[9px] px-1.5 py-0.5 rounded-full text-white font-bold shadow-sm z-20
                          ${staff.role === '上次服務' ? 'bg-amber-400' : 'bg-gray-400'}
                      `}>
                          {staff.role}
                      </div>
                  )}
                </div>
                
                <span 
                    className={`text-sm mt-3 font-medium text-center truncate w-24 ${selectedStaff?.id === staff.id ? 'font-bold' : ''}`}
                    style={{ color: selectedStaff?.id === staff.id ? themeColor : '#374151' }}
                >
                  {staff.display_name || staff.full_name}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Select Date */}
        <section className={`bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition-opacity duration-300 ${!selectedStaff ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
           <div className="flex justify-between items-center mb-4">
             <div className="flex items-center space-x-2">
                <CalendarBlank size={20} className="text-gray-400" />
                <h2 className="text-md font-bold text-gray-900">選擇日期</h2>
             </div>
             <div className="flex items-center space-x-4">
                <button onClick={handlePrevMonth} className="p-1 text-gray-400 hover:text-gray-900 transition-colors">
                    <CaretLeft size={20} />
                </button>
                <span className="text-lg font-bold text-gray-900">
                    {format(currentMonth, 'yyyy年 M月')}
                </span>
                <button onClick={handleNextMonth} className="p-1 text-gray-400 hover:text-gray-900 transition-colors">
                    <CaretRight size={20} />
                </button>
             </div>
          </div>
          
          <div className="w-full">
            <div className="grid grid-cols-7 mb-2">
                {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                    <div key={day} className="text-center text-xs text-gray-400 font-medium py-1">
                        {day}
                    </div>
                ))}
            </div>
            
            <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                {calendarDays.map((date, i) => {
                    const isSelected = isSameDay(date, selectedDate);
                    const isToday = isSameDay(date, new Date());
                    const isPast = date < startOfToday();
                    const isCurrentMonth = isSameMonth(date, currentMonth);
                    
                    if (!isCurrentMonth) {
                        return <div key={i} className="h-10"></div>; 
                    }

                    return (
                        <div key={i} className="flex justify-center">
                            <button
                                disabled={isPast}
                                onClick={() => !isPast && setSelectedDate(date)}
                                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all relative
                                    ${isSelected ? 'text-white shadow-md transform scale-105' : ''}
                                    ${isPast ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}
                                    ${isToday && !isSelected ? 'text-gray-900 bg-gray-100' : ''}
                                `}
                                style={{ 
                                    backgroundColor: isSelected ? themeColor : (isToday && !isSelected ? '#f3f4f6' : 'transparent')
                                }}
                            >
                                {format(date, 'd')}
                                {isToday && !isSelected && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-gray-400"></div>}
                            </button>
                        </div>
                    );
                })}
            </div>
          </div>
        </section>

        {/* 4. Select Time Slots (Updated Logic) */}
        <section className={`bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition-opacity duration-300 ${!selectedStaff ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          <div className="flex justify-between items-center mb-4">
              <h2 className="text-md font-bold text-gray-900">選擇時段</h2>
              {selectedService && (
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      需預約 {getSlotsNeeded()} 個時段 ({selectedService.duration}分鐘)
                  </span>
              )}
          </div>
          
          <div className="space-y-5">
            {['morning', 'afternoon', 'evening'].map((period) => {
                 const slots = timeSlotsGrouped[period];
                 if (!slots || slots.length === 0) return null;
                 const label = period === 'morning' ? '上午' : period === 'afternoon' ? '下午' : '晚上';

                 return (
                   <div key={period}>
                     <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider pl-1">{label}</h3>
                     <div className="grid grid-cols-4 gap-3">
                       {slots.map(time => {
                         const isSelected = isTimeSelected(time);
                         const isBooked = unavailableSlots.includes(time);
                         const isBlockedByBuffer = isTimeBlockedByBuffer(time);
                         const isAvailable = !isBooked && !isBlockedByBuffer;
                         
                         const isStartable = isTimeStartable(time);
                         
                         // Determine button state
                         let buttonClass = 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'; // Default
                         let buttonStyle = { backgroundColor: 'white', color: '#374151' };

                         if (isSelected) {
                             buttonClass = 'text-white shadow-md transform scale-105 border-transparent';
                             buttonStyle = { backgroundColor: themeColor, color: 'white' };
                         } else if (!isAvailable) {
                             // Strictly Unavailable (Booked/Past) -> Grey Out
                             buttonClass = 'bg-gray-100 text-gray-300 border-transparent cursor-not-allowed decoration-slice';
                             buttonStyle = { backgroundColor: '#f3f4f6', color: '#d1d5db' };
                         } else if (!isStartable) {
                             // Available BUT Not Startable (Duration constraint) -> Show as Normal but Action blocked
                             // Visual cue: Maybe slightly lighter text or default cursor? 
                             // To avoid confusion, we keep it looking "Available" (White) so user knows it's not "Booked".
                             // But we can add a subtle cue like no hover effect?
                             buttonClass = 'bg-white text-gray-700 border-gray-200 opacity-100'; 
                             buttonStyle = { backgroundColor: 'white', color: '#374151', cursor: 'not-allowed' };
                         }

                         return (
                            <button
                              key={time}
                              disabled={!isAvailable}
                              onClick={() => handleTimeSelect(time)}
                              className={`py-2 rounded-lg text-sm font-bold border transition-all relative overflow-hidden ${buttonClass}`}
                              style={buttonStyle}
                            >
                              {time}
                              {!isAvailable && <div className="absolute inset-0 flex items-center justify-center"><div className="w-full h-[1px] bg-gray-300 rotate-[-20deg]"></div></div>}
                            </button>
                          );
                       })}
                     </div>
                   </div>
                 );
              })}
          </div>
        </section>

        {/* 5. Customer Info */}
        <section className={`bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition-opacity duration-300 ${!selectedTime ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
           <div className="flex items-center mb-4 space-x-2">
             <User size={20} className="text-gray-400" />
             <h2 className="text-md font-bold text-gray-900">預約人資訊</h2>
           </div>
           
           <div className="space-y-4">
             <div>
               <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">姓名</label>
               <input 
                 type="text"
                 value={customerName}
                 onChange={(e) => setCustomerName(e.target.value)}
                 placeholder="請輸入姓名"
                 className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all"
               />
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">電話</label>
               <input 
                 type="tel"
                 value={customerPhone}
                 onChange={(e) => setCustomerPhone(e.target.value)}
                 placeholder="請輸入手機號碼"
                 className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all"
               />
             </div>
           </div>
        </section>

      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button
          disabled={!selectedStaff || !selectedService || !selectedTime || !customerName || !customerPhone || loading}
          onClick={handleConfirmBooking}
          className="w-full py-3.5 rounded-xl text-white font-bold text-lg shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          style={{ backgroundColor: themeColor }}
        >
          {loading ? (
             <span>處理中...</span>
          ) : (
             <>
               <span>確認預約</span>
               <CalendarBlank weight="fill" size={20} />
             </>
          )}
        </button>
      </div>
    </div>
  );
};

export default LiffBookingPage;

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabaseClient';
import { X, Check, User, Calendar, Clock, CurrencyDollar, Sparkle, Tag, Lock, Coffee, Suitcase, GraduationCap, DotsThree, Infinity as InfinityIcon } from '@phosphor-icons/react';
import { format, addMinutes, parseISO, isBefore, differenceInMinutes, eachDayOfInterval, addMonths, startOfDay, endOfDay } from 'date-fns';

const NewAppointmentModal = ({ isOpen, onClose, onSuccess, initialDate, initialStaffId, editData }) => {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);
  const [staffList, setStaffList] = useState([]);
  
  // 'booking' | 'block'
  const [appointmentType, setAppointmentType] = useState('booking'); 
  
  // Block Mode Specific
  const [blockReason, setBlockReason] = useState('休息');
  const [blockEndTime, setBlockEndTime] = useState('11:00');
  
  // Batch Lock State
  const [lockMode, setLockMode] = useState('single'); // 'single' | 'batch'
  const [batchDays, setBatchDays] = useState([]); // 0-6
  const [batchStartDate, setBatchStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [batchEndDate, setBatchEndDate] = useState(format(addMonths(new Date(), 3), 'yyyy-MM-dd'));
  const [isAllDay, setIsAllDay] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    customer_id: '',
    service_id: '', // Deprecated but kept for compatibility (Primary Service)
    staff_id: '',
    date: format(initialDate || new Date(), 'yyyy-MM-dd'),
    time: '10:00',
    endTime: '11:00',
    notes: ''
  });

  // Derived State
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [calculatedEndTime, setCalculatedEndTime] = useState(null);

  // Search State
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const blockReasons = [
    { label: '休息', value: '休息', icon: <Coffee /> },
    { label: '請假', value: '請假', icon: <Suitcase /> },
    { label: '進修', value: '進修', icon: <GraduationCap /> },
    { label: '其他', value: '其他', icon: <DotsThree /> },
  ];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      fetchDropdownData();
      
      if (editData) {
        // Edit Mode Initialization
        const { appointment, items } = editData;
        const start = parseISO(appointment.start_time);
        const end = parseISO(appointment.end_time);
        
        const isBlock = appointment.status === 'blocked';
        setAppointmentType(isBlock ? 'block' : 'booking');
        setLockMode('single'); // Always single for edit

        if (isBlock) {
          const [reason] = (appointment.notes || '').split(' - ');
          setBlockReason(reason || '休息');
          setBlockEndTime(format(end, 'HH:mm'));
          setFormData({
            customer_id: '',
            service_id: '',
            staff_id: appointment.staff_id,
            date: format(start, 'yyyy-MM-dd'),
            time: format(start, 'HH:mm'),
            endTime: format(end, 'HH:mm'),
            notes: appointment.notes || ''
          });
        } else {
          setFormData({
            customer_id: appointment.customer_id,
            service_id: items?.[0]?.service_id || '',
            staff_id: appointment.staff_id,
            date: format(start, 'yyyy-MM-dd'),
            time: format(start, 'HH:mm'),
            endTime: format(end, 'HH:mm'),
            notes: appointment.notes || ''
          });
          
          setSelectedServiceIds(items?.map(i => i.service_id) || []);
          
          if (appointment.customers) {
            setCustomerSearch(appointment.customers.name);
            setCustomerPhone(appointment.customers.phone || '');
          }
        }
      } else {
        // Create Mode Initialization
        setFormData(prev => ({
          ...prev,
          date: format(initialDate || new Date(), 'yyyy-MM-dd'),
          customer_id: '',
          service_id: '',
          staff_id: initialStaffId || '',
          time: '10:00',
          endTime: '11:00',
          notes: ''
        }));
        setAppointmentType('booking');
        setLockMode('single');
        setBatchDays([]);
        setBatchStartDate(format(initialDate || new Date(), 'yyyy-MM-dd'));
        setBatchEndDate(format(addMonths(initialDate || new Date(), 3), 'yyyy-MM-dd'));
        setIsAllDay(true);
        setSelectedServiceIds([]);
        setCustomerSearch('');
        setCustomerPhone('');
        setBlockReason('休息');
        setBlockEndTime('11:00');
      }
      setShowCustomerDropdown(false);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialDate, editData]);

  // Filter customers based on search
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
    c.phone?.includes(customerSearch)
  );

  const handleCustomerSelect = (customer) => {
    setFormData(prev => ({ ...prev, customer_id: customer.id }));
    setCustomerSearch(customer.name);
    setCustomerPhone(customer.phone || '');
    setShowCustomerDropdown(false);
  };

  const handleCustomerSearchChange = (e) => {
    const value = e.target.value;
    setCustomerSearch(value);
    setFormData(prev => ({ ...prev, customer_id: '' })); // Clear ID implies potential new customer
    setShowCustomerDropdown(true);
  };

  // Update calculated end time when services or time changes (Booking Mode)
  useEffect(() => {
    if (appointmentType === 'booking') {
      if (formData.time && selectedServiceIds.length > 0) {
        const startDateTime = parseISO(`${formData.date}T${formData.time}`);
        
        // Calculate total duration from selected services
        const totalDuration = services
          .filter(s => selectedServiceIds.includes(s.id))
          .reduce((sum, s) => sum + s.duration, 0);

        const endDateTime = addMinutes(startDateTime, totalDuration);
        setCalculatedEndTime(format(endDateTime, 'HH:mm'));
        setFormData(prev => ({ ...prev, endTime: format(endDateTime, 'HH:mm') }));
      } else if (formData.time && !editData) {
        // Default 1 hour if no services selected yet
        const startDateTime = parseISO(`${formData.date}T${formData.time}`);
        const endDateTime = addMinutes(startDateTime, 60);
        setCalculatedEndTime(format(endDateTime, 'HH:mm'));
        setFormData(prev => ({ ...prev, endTime: format(endDateTime, 'HH:mm') }));
      }
    }
  }, [formData.time, formData.date, selectedServiceIds, appointmentType, services]);

  // Update block end time default when start time changes (Block Mode)
  useEffect(() => {
    if (appointmentType === 'block' && formData.time && lockMode === 'single') {
      // If blockEndTime is not set or earlier than new start time, set to +1 hour
      const currentStart = parseISO(`${formData.date}T${formData.time}`);
      const currentEnd = parseISO(`${formData.date}T${blockEndTime}`);
      
      if (isBefore(currentEnd, currentStart) || differenceInMinutes(currentEnd, currentStart) <= 0) {
         const newEnd = addMinutes(currentStart, 60);
         setBlockEndTime(format(newEnd, 'HH:mm'));
      }
    }
  }, [formData.time, appointmentType, lockMode]);

  const fetchDropdownData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
      
      // Parallel fetch
      const [custRes, servRes, staffRes, catRes] = await Promise.all([
        supabase.from('customers').select('id, name, phone').eq('tenant_id', profile.tenant_id).order('name'),
        supabase.from('services').select('*').eq('tenant_id', profile.tenant_id).order('category, name'),
        supabase.from('staff').select('*, staff_services(service_id)').eq('tenant_id', profile.tenant_id).eq('is_active', true),
        supabase.from('service_categories').select('*').eq('tenant_id', profile.tenant_id).order('name')
      ]);

      setCustomers(custRes.data || []);
      setServices(servRes.data || []);
      setStaffList(staffRes.data || []);
      setServiceCategories(catRes.data || []);

    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategoryId(categoryId);
    setSelectedServiceIds([]); // Clear services when category changes to ensure consistency
    setFormData(prev => ({ ...prev, service_id: '' }));
  };

  const handleServiceToggle = (serviceId) => {
    setSelectedServiceIds(prev => {
      const newSelection = prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId];
      
      // Update primary service_id for compatibility (use the first selected one)
      setFormData(f => ({ ...f, service_id: newSelection[0] || '' }));
      
      return newSelection;
    });
  };

  const toggleBatchDay = (dayIndex) => {
    setBatchDays(prev => prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]);
  };

  const calculateBatchCount = () => {
    if (batchDays.length === 0) return 0;
    const start = parseISO(batchStartDate);
    const end = parseISO(batchEndDate);
    if (isBefore(end, start)) return 0;
    try {
        const days = eachDayOfInterval({ start, end });
        return days.filter(d => batchDays.includes(d.getDay())).length;
    } catch (e) {
        return 0;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();

      // BATCH MODE HANDLER
      if (appointmentType === 'block' && lockMode === 'batch') {
          if (batchDays.length === 0) throw new Error('請選擇至少一天重複頻率');
          if (!formData.staff_id) throw new Error('請選擇員工');
          
          const start = parseISO(batchStartDate);
          const end = parseISO(batchEndDate);
          if (isBefore(end, start)) throw new Error('結束日期必須晚於開始日期');

          const days = eachDayOfInterval({ start, end });
          const payloads = [];

          days.forEach(day => {
              if (batchDays.includes(day.getDay())) {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  let startT, endT;

                  if (isAllDay) {
                      startT = new Date(`${dateStr}T00:00:00`);
                      endT = new Date(`${dateStr}T23:59:59`);
                  } else {
                      startT = new Date(`${dateStr}T${formData.time}`);
                      endT = new Date(`${dateStr}T${blockEndTime}`);
                  }

                  payloads.push({
                      tenant_id: profile.tenant_id,
                      staff_id: formData.staff_id,
                      start_time: startT.toISOString(),
                      end_time: endT.toISOString(),
                      status: 'blocked',
                      notes: `${blockReason}${formData.notes ? ` - ${formData.notes}` : ''}`
                  });
              }
          });

          if (payloads.length === 0) throw new Error('選定的日期範圍內沒有符合的日期');

          const { error } = await supabase.from('appointments').insert(payloads);
          if (error) throw error;

          onSuccess();
          onClose();
          return;
      }

      // SINGLE MODE HANDLER (Booking & Single Block)
      const startDateTime = new Date(`${formData.date}T${formData.time}`);
      let endDateTime;
      let payload = {};

      if (appointmentType === 'booking') {
        if (!formData.staff_id) throw new Error('請選擇服務人員');
        
        let finalCustomerId = formData.customer_id;

        // Auto-create customer if new
        if (!finalCustomerId) {
            if (customerSearch) {
                if (!customerPhone) throw new Error('新客戶請填寫電話號碼');
                
                const { data: newCustomer, error: createError } = await supabase
                    .from('customers')
                    .insert({
                    tenant_id: profile.tenant_id,
                    name: customerSearch,
                    phone: customerPhone,
                    notes: '由預約自動建立'
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                finalCustomerId = newCustomer.id;
            } else {
                throw new Error('請選擇現有客戶或輸入新客戶姓名');
            }
        }

        const selectedServices = services.filter(s => selectedServiceIds.includes(s.id));
        if (selectedServices.length === 0) throw new Error('請至少選擇一項服務');

        const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
        // Use user-provided end time or calculated one
        endDateTime = new Date(`${formData.date}T${formData.endTime}`);
        
        // Validate end time
        if (isBefore(endDateTime, startDateTime) || endDateTime.getTime() === startDateTime.getTime()) {
           throw new Error('結束時間必須晚於開始時間');
        }

        payload = {
          tenant_id: profile.tenant_id,
          customer_id: finalCustomerId,
          service_id: selectedServices[0].id, // Primary service
          staff_id: formData.staff_id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status: editData ? editData.appointment.status : 'booked',
          notes: formData.notes
        };

        let appointmentId;

        if (editData) {
           // Update Existing
           const { error: updateError } = await supabase
             .from('appointments')
             .update(payload)
             .eq('id', editData.appointment.id);
           
           if (updateError) throw updateError;
           appointmentId = editData.appointment.id;

           // Delete existing items to replace them
           await supabase.from('appointment_items').delete().eq('appointment_id', appointmentId);

        } else {
           // Create New
           const { data: apptData, error: apptError } = await supabase
             .from('appointments')
             .insert([payload])
             .select()
             .single();

           if (apptError) throw apptError;
           appointmentId = apptData.id;
        }

        // Create Appointment Items
        const itemsPayload = selectedServices.map((s, index) => ({
            tenant_id: profile.tenant_id, // Ensure tenant_id is set
            appointment_id: appointmentId,
            service_id: s.id,
            price: s.price,
            duration: s.duration,
            sequence: index
        }));

        const { error: itemsError } = await supabase
            .from('appointment_items')
            .insert(itemsPayload);

        if (itemsError) {
            console.error('Failed to create/update items', itemsError);
            // Rollback: Delete the created appointment if it was a new one
            if (!editData && appointmentId) {
                await supabase.from('appointments').delete().eq('id', appointmentId);
            }
            throw new Error('預約儲存失敗：服務項目更新錯誤');
        }

      } else {
        // Single Block Mode
        endDateTime = new Date(`${formData.date}T${blockEndTime}`);
        
        // Validation: End time must be after start time
        if (isBefore(endDateTime, startDateTime) || endDateTime.getTime() === startDateTime.getTime()) {
           throw new Error('結束時間必須晚於開始時間');
        }

        payload = {
          tenant_id: profile.tenant_id,
          customer_id: null, // Null for block
          service_id: null,  // Null for block
          staff_id: formData.staff_id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status: 'blocked', // Special status
          notes: `${blockReason}${formData.notes ? ` - ${formData.notes}` : ''}`
        };

        if (editData) {
            const { error } = await supabase
              .from('appointments')
              .update(payload)
              .eq('id', editData.appointment.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('appointments').insert([payload]);
            if (error) throw error;
        }
      }

      onSuccess();
      onClose();
      // Reset form handled by useEffect

    } catch (error) {
      alert('操作失敗: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filter staff based on selected services (Booking only)
  const availableStaff = (appointmentType === 'booking' && selectedServiceIds.length > 0)
    ? staffList.filter(s => selectedServiceIds.every(sid => s.staff_services.some(ss => ss.service_id === sid)))
    : staffList;

  const handleTimeBlur = (field, value) => {
    if (!value) return;
    const [h, m] = value.split(':').map(Number);
    let newM = Math.round(m / 30) * 30;
    let newH = h;
    
    if (newM === 60) {
      newM = 0;
      newH = (newH + 1) % 24;
    }
    
    const formatted = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    
    if (field === 'time') {
        setFormData(prev => ({ ...prev, time: formatted }));
    } else if (field === 'endTime') {
        if (appointmentType === 'booking') {
            setFormData(prev => ({ ...prev, endTime: formatted }));
        } else {
            setBlockEndTime(formatted);
        }
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/20 backdrop-blur-sm transition-all duration-300">
      <div className={`
          bg-white w-full sm:w-auto rounded-t-3xl sm:rounded-3xl shadow-2xl sm:max-w-md overflow-hidden flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh] ring-1 ring-black/5 animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200 transition-all
      `}>
        
        {/* Header */}
        <div className={`px-6 py-4 flex justify-between items-center border-b shrink-0 ${lockMode === 'batch' ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-50'}`}>
           <div className="flex items-center gap-3">
             <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${appointmentType === 'booking' ? 'bg-rose-50 text-rose-500' : (lockMode === 'batch' ? 'bg-rose-200 text-rose-700' : 'bg-slate-100 text-slate-500')}`}>
                {appointmentType === 'booking' ? <Sparkle weight="duotone" size={24} /> : <Lock weight="duotone" size={24} />}
             </div>
             <div>
               <h2 className="text-lg font-bold text-slate-800 leading-tight">
                 {editData ? (appointmentType === 'booking' ? '編輯預約' : '編輯鎖定') : (appointmentType === 'booking' ? '新增預約' : (lockMode === 'batch' ? '批量鎖定設定' : '時段鎖定'))}
               </h2>
               <p className="text-[10px] font-mono text-slate-400 mt-0.5 tracking-wider uppercase">
                 {editData ? `#${editData.appointment.id.slice(0, 8)}` : (lockMode === 'batch' ? 'BATCH MODE' : 'NEW ENTRY')}
               </p>
             </div>
           </div>
           <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors">
             <X size={20} weight="bold" />
           </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          <form id="appointment-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Type Toggles (Only show if not editing) */}
            {!editData && (
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setAppointmentType('booking'); setLockMode('single'); }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    appointmentType === 'booking' 
                      ? 'bg-white text-rose-600 shadow-sm ring-1 ring-black/5' 
                      : 'text-slate-500 hover:text-slate-600'
                  }`}
                >
                  <Sparkle weight="duotone" />
                  新增預約
                </button>
                <button
                  type="button"
                  onClick={() => setAppointmentType('block')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                    appointmentType === 'block' 
                      ? 'bg-white text-slate-700 shadow-sm ring-1 ring-black/5' 
                      : 'text-slate-500 hover:text-slate-600'
                  }`}
                >
                  <Lock weight="duotone" />
                  鎖定時段
                </button>
              </div>
            )}

            {/* Mode Switcher (Only in Block Mode & Create) */}
            {appointmentType === 'block' && !editData && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setLockMode('single')}
                  className={`relative p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 group ${
                    lockMode === 'single' 
                      ? 'border-slate-800 bg-slate-50 text-slate-800 ring-1 ring-slate-800/20' 
                      : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${lockMode === 'single' ? 'bg-white border-slate-300' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="font-bold text-sm">1</span>
                  </div>
                  <span className="text-sm font-bold">單次鎖定</span>
                  {lockMode === 'single' && <div className="absolute top-2 right-2 w-2 h-2 bg-slate-800 rounded-full animate-pulse" />}
                </button>

                <button
                  type="button"
                  onClick={() => setLockMode('batch')}
                  className={`relative p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 group ${
                    lockMode === 'batch' 
                      ? 'border-rose-500 bg-rose-50 text-rose-600 ring-1 ring-rose-500/20' 
                      : 'border-slate-100 bg-white text-slate-400 hover:border-rose-200 hover:bg-rose-50/30'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${lockMode === 'batch' ? 'bg-white border-rose-300' : 'bg-slate-50 border-slate-200'}`}>
                    <InfinityIcon size={16} weight="bold" />
                  </div>
                  <span className="text-sm font-bold">批量鎖定</span>
                  {lockMode === 'batch' && <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />}
                </button>
              </div>
            )}

            {/* --- BOOKING MODE FIELDS --- */}
            {appointmentType === 'booking' && (
              <>
                {/* Customer Selection (Searchable) */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <User className="text-rose-500" />
                    客戶
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="輸入姓名搜尋或直接建立新客戶..."
                      value={customerSearch}
                      onChange={handleCustomerSearchChange}
                      onFocus={() => setShowCustomerDropdown(true)}
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-slate-700"
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                      <User weight="duotone" />
                    </div>

                    {/* Dropdown Results */}
                    {showCustomerDropdown && customerSearch && (
                      <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto">
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleCustomerSelect(c)}
                              className="w-full text-left px-4 py-3 hover:bg-rose-50 transition-colors flex items-center justify-between group"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-700 group-hover:text-rose-700">{c.name}</span>
                                <span className="text-xs text-slate-400">{c.phone}</span>
                              </div>
                              {c.id === formData.customer_id && (
                                <Check className="text-rose-500" weight="bold" />
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-slate-500 bg-slate-50">
                            將自動建立新客戶: <span className="font-bold text-rose-600">{customerSearch}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="text-slate-400">#</span>
                    電話
                  </label>
                  <input
                    type="tel"
                    placeholder="輸入電話號碼"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    readOnly={!!formData.customer_id} // Read-only if existing customer selected
                    className={`w-full px-3 py-2.5 border rounded-xl transition-all text-slate-700
                      ${formData.customer_id 
                        ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' 
                        : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'}
                    `}
                  />
                  {!formData.customer_id && customerSearch && (
                    <p className="text-xs text-rose-500 pl-1">新客戶請務必填寫電話</p>
                  )}
                </div>

                {/* Service Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Tag className="text-rose-500" />
                    主項目 (類別)
                  </label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-slate-700"
                  >
                    <option value="">選擇主項目...</option>
                    {serviceCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    {Array.from(new Set(services.filter(s => !s.category_id && s.category).map(s => s.category))).map(cat => (
                         <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Sub Items List */}
                {selectedCategoryId && (
                    <div className="space-y-2 animate-fadeIn">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                        <Sparkle className="text-rose-500" />
                        次項目 (服務) <span className="text-xs font-normal text-slate-400 ml-auto">可多選</span>
                      </label>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto grid grid-cols-1 gap-2">
                          {services.filter(s => s.category_id === selectedCategoryId || s.category === selectedCategoryId).map(s => (
                              <label key={s.id} className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer border ${selectedServiceIds.includes(s.id) ? 'bg-white border-rose-200 shadow-sm' : 'border-transparent hover:bg-white/50'}`}>
                                  <input 
                                      type="checkbox"
                                      checked={selectedServiceIds.includes(s.id)}
                                      onChange={() => handleServiceToggle(s.id)}
                                      className="w-5 h-5 text-rose-500 border-slate-300 rounded focus:ring-rose-500"
                                  />
                                  <div className="flex-1 flex justify-between items-center">
                                      <span className={`font-medium ${selectedServiceIds.includes(s.id) ? 'text-rose-700' : 'text-slate-700'}`}>{s.name}</span>
                                      <span className="text-xs text-slate-500 bg-slate-200/50 px-2 py-1 rounded-full">{s.duration}分 / ${s.price}</span>
                                  </div>
                              </label>
                          ))}
                      </div>
                    </div>
                )}
              </>
            )}

            {/* --- BLOCK MODE FIELDS --- */}
            {appointmentType === 'block' && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Lock className="text-slate-500" />
                  鎖定原因
                </label>
                <div className="grid grid-cols-2 gap-3">
                   {blockReasons.map((reason) => (
                     <label 
                       key={reason.value}
                       className={`
                         flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all
                         ${blockReason === reason.value 
                           ? (lockMode === 'batch' 
                              ? 'border-rose-500 bg-rose-50 text-rose-800 ring-1 ring-rose-500' 
                              : 'border-slate-500 bg-slate-100 text-slate-800 ring-1 ring-slate-500')
                           : (lockMode === 'batch' 
                              ? 'border-rose-200 hover:bg-rose-50 text-slate-600' 
                              : 'border-slate-200 hover:bg-slate-50 text-slate-600')}
                       `}
                     >
                        <input 
                          type="radio" 
                          name="blockReason" 
                          value={reason.value}
                          checked={blockReason === reason.value}
                          onChange={(e) => setBlockReason(e.target.value)}
                          className="sr-only"
                        />
                        <div className={`text-lg ${blockReason === reason.value ? (lockMode === 'batch' ? 'text-rose-600' : 'text-slate-800') : 'text-slate-400'}`}>
                          {reason.icon}
                        </div>
                        <span className="text-sm font-medium">{reason.label}</span>
                     </label>
                   ))}
                </div>
              </div>
            )}

            {/* --- COMMON FIELDS --- */}
            
            {/* Staff Selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <User className={appointmentType === 'booking' ? "text-rose-500" : "text-slate-500"} />
                {appointmentType === 'booking' ? '指名員工' : '鎖定員工'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {availableStaff.map(s => (
                  <label 
                    key={s.id} 
                    className={`
                      relative flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                      ${formData.staff_id === s.id 
                        ? (appointmentType === 'booking' || lockMode === 'batch'
                            ? 'border-rose-500 bg-rose-50 ring-1 ring-rose-500' 
                            : 'border-slate-500 bg-slate-100 ring-1 ring-slate-500')
                        : (lockMode === 'batch' ? 'border-rose-200 hover:border-rose-300 hover:bg-rose-50' : 'border-slate-200 hover:border-rose-200 hover:bg-slate-50')}
                    `}
                  >
                    <input
                      type="radio"
                      name="staff"
                      value={s.id}
                      checked={formData.staff_id === s.id}
                      onChange={(e) => setFormData({...formData, staff_id: e.target.value})}
                      className="sr-only"
                      required
                    />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs
                      ${formData.staff_id === s.id 
                        ? (appointmentType === 'booking' || lockMode === 'batch' ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-700')
                        : 'bg-slate-100 text-slate-400'}
                    `}>
                      {s.display_name?.[0]}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{s.display_name}</span>
                    {formData.staff_id === s.id && (
                      <Check className={`absolute top-2 right-2 ${appointmentType === 'booking' || lockMode === 'batch' ? 'text-rose-500' : 'text-slate-600'}`} weight="bold" size={14} />
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* --- DYNAMIC DATE/TIME FIELDS --- */}
            
            {lockMode === 'batch' ? (
                // BATCH MODE FIELDS
                <div className="space-y-6 animate-fadeIn p-4 bg-rose-50/50 rounded-xl border border-rose-200">
                  
                  {/* Frequency */}
                <div className="space-y-3">
                   <label className="text-sm font-semibold text-rose-900 flex items-center justify-between">
                      重複於 (週循環)
                      <span className="text-xs font-normal text-rose-500">可多選</span>
                   </label>
                   <div className="flex justify-between gap-1">
                      {['日', '一', '二', '三', '四', '五', '六'].map((d, idx) => (
                         <button
                           key={idx}
                           type="button"
                           onClick={() => toggleBatchDay(idx)}
                           className={`w-10 h-10 rounded-full text-sm font-bold transition-all shadow-sm ${batchDays.includes(idx) ? 'bg-rose-500 text-white transform scale-110 ring-2 ring-rose-200' : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-200'}`}
                         >
                           {d}
                         </button>
                      ))}
                   </div>
                </div>
                
                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">開始日期</label>
                      <input 
                        type="date" 
                        value={batchStartDate} 
                        onChange={e => setBatchStartDate(e.target.value)} 
                        className="w-full px-3 py-2 bg-white border border-rose-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500/20" 
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">結束日期</label>
                      <input 
                        type="date" 
                        value={batchEndDate} 
                        onChange={e => setBatchEndDate(e.target.value)} 
                        className="w-full px-3 py-2 bg-white border border-rose-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500/20" 
                      />
                   </div>
                </div>
                
                {/* Time */}
                <div className="space-y-3">
                   <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-700">鎖定時間</label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                         <input type="checkbox" checked={isAllDay} onChange={e => setIsAllDay(e.target.checked)} className="w-4 h-4 text-rose-500 rounded focus:ring-rose-500 border-slate-300" />
                         <span className="text-sm text-slate-600">全天鎖定</span>
                      </label>
                   </div>
                   {!isAllDay && (
                      <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                         <input type="time" step="1800" onBlur={(e) => handleTimeBlur('time', e.target.value)} value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
                         <input type="time" step="1800" onBlur={(e) => handleTimeBlur('endTime', e.target.value)} value={blockEndTime} onChange={e => setBlockEndTime(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
                      </div>
                   )}
                </div>
              </div>
            ) : (
              // SINGLE MODE DATE/TIME (Existing)
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Calendar className={appointmentType === 'booking' ? "text-rose-500" : "text-slate-500"} />
                    日期
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Clock className={appointmentType === 'booking' ? "text-rose-500" : "text-slate-500"} />
                    {appointmentType === 'booking' ? '開始時間' : '開始時間'}
                  </label>
                  <input
                    type="time"
                    step="1800"
                    onBlur={(e) => handleTimeBlur('time', e.target.value)}
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-700"
                  />
                </div>

                {/* End Time */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <Clock className={appointmentType === 'booking' ? "text-rose-500" : "text-slate-500"} />
                      結束時間
                    </label>
                    <input
                      type="time"
                      step="1800"
                      onBlur={(e) => handleTimeBlur('endTime', e.target.value)}
                      required
                      value={appointmentType === 'booking' ? formData.endTime : blockEndTime}
                      onChange={(e) => appointmentType === 'booking' ? setFormData({...formData, endTime: e.target.value}) : setBlockEndTime(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 text-slate-700"
                    />
                    {appointmentType === 'block' && (
                      <p className="text-xs text-slate-400 pl-1">設定該時段為不可預約</p>
                    )}
                </div>
              </div>
            )}

            {/* Summary Box (Booking Only) */}
            {appointmentType === 'booking' && selectedServiceIds.length > 0 && calculatedEndTime && (
              <div className="bg-rose-50/50 rounded-xl p-4 border border-rose-100 flex items-center justify-between text-sm">
                <div className="flex flex-col">
                  <span className="text-slate-500 text-xs">預計結束時間</span>
                  <span className="font-semibold text-rose-900">{calculatedEndTime}</span>
                </div>
                <div className="flex flex-col text-right">
                   <span className="text-slate-500 text-xs">預估金額</span>
                   <span className="font-semibold text-rose-900 flex items-center justify-end gap-1">
                     <CurrencyDollar />
                     {services.filter(s => selectedServiceIds.includes(s.id)).reduce((sum, s) => sum + s.price, 0)}
                   </span>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">備註</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className={`w-full px-3 py-2.5 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-700 text-sm ${lockMode === 'batch' ? 'border-rose-200' : 'border-slate-200'}`}
                placeholder={appointmentType === 'booking' ? "客戶特殊需求..." : "補充說明..."}
              />
            </div>

          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-50 flex flex-col gap-3 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] z-10">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-slate-600 font-bold text-sm bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              form="appointment-form"
              disabled={loading}
              className={`
                flex-[2] py-3 rounded-xl text-white font-bold text-sm shadow-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2
                ${appointmentType === 'booking' 
                  ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200' 
                  : (lockMode === 'batch' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' : 'bg-slate-700 hover:bg-slate-800 shadow-slate-200')}
              `}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  處理中...
                </>
              ) : (
                <>
                  {appointmentType === 'booking' ? <Check weight="bold" size={18} /> : (lockMode === 'batch' ? <InfinityIcon weight="bold" size={18} /> : <Lock weight="bold" size={18} />)}
                  {appointmentType === 'booking' 
                    ? (editData ? '更新預約' : '確認預約') 
                    : (editData ? '更新鎖定' : (lockMode === 'batch' ? `批量建立 (${calculateBatchCount()}筆)` : '確認鎖定'))}
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default NewAppointmentModal;

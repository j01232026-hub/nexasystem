import React, { useState } from 'react';
import { 
  MagnifyingGlass, 
  Funnel, 
  Cake, 
  WarningCircle, 
  UserCircle, 
  Phone, 
  CalendarCheck, 
  CurrencyDollar,
  Tag,
  X,
  CaretRight,
  Clock,
  Notebook,
  Image as ImageIcon,
  MagicWand,
  Heart,
  CaretDown,
  Plus,
  User,
  Check
} from '@phosphor-icons/react';
import BackgroundDecoration from '../components/ui/BackgroundDecoration';
import GlassPanel from '../components/ui/GlassPanel';

// Mock Data
const MOCK_DESIGNERS = ['全體設計師', '設計師 A', '設計師 B', '設計師 C'];

const MOCK_CUSTOMERS = [
  {
    id: 1,
    name: 'Amy 陳',
    phone: '0912-345-678',
    avatar: null,
    level: 'VIP',
    mainDesigner: '設計師 A',
    tags: ['染髮控', '週五常客', '怕熱'],
    stats: {
      totalVisits: 24,
      totalSpend: 58000,
      lastVisit: '2024-01-15',
      avgSpend: 2416
    },
    nextBirthday: '2024-03-15', // Next month
    notes: '喜歡日系風格，對藥水味道敏感，通常週五晚上來。喝拿鐵不加糖。',
    history: [
      { date: '2024-01-15', service: '剪髮 + 染髮', staff: '設計師 A', price: 3500, note: '使用 5.0 號染膏' },
      { date: '2023-12-10', service: '護髮', staff: '助理 B', price: 1200, note: '結構式護髮' },
      { date: '2023-11-05', service: '剪髮', staff: '設計師 A', price: 800, note: '修剪瀏海' },
    ]
  },
  {
    id: 2,
    name: 'Jason 林',
    phone: '0922-888-999',
    avatar: null,
    level: 'Regular',
    mainDesigner: '設計師 B',
    tags: ['短髮', '頭皮護理'],
    stats: {
      totalVisits: 8,
      totalSpend: 12000,
      lastVisit: '2023-11-20', // > 90 days (Risk)
      avgSpend: 1500
    },
    nextBirthday: '2024-02-28', // This month
    notes: '重視效率，趕時間，不喜歡推銷。',
    history: [
      { date: '2023-11-20', service: '剪髮 + 頭皮護理', staff: '設計師 A', price: 2000, note: '' },
      { date: '2023-10-15', service: '剪髮', staff: '設計師 A', price: 800, note: '' },
    ]
  },
  {
    id: 3,
    name: 'Lisa 王',
    phone: '0933-777-666',
    avatar: null,
    level: 'New',
    mainDesigner: '設計師 C',
    tags: ['首次體驗'],
    stats: {
      totalVisits: 1,
      totalSpend: 1500,
      lastVisit: '2024-02-10',
      avgSpend: 1500
    },
    nextBirthday: '2024-08-10',
    notes: '朋友介紹來的，對自然捲困擾。',
    history: [
      { date: '2024-02-10', service: '洗剪', staff: '設計師 C', price: 1500, note: '建議下次做縮毛矯正' },
    ]
  }
];

const CustomerPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedDesigner, setSelectedDesigner] = useState('全體設計師');
  const [isDesignerSelectorOpen, setIsDesignerSelectorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // profile, history, notes

  // Filter Logic
  const filteredCustomers = MOCK_CUSTOMERS.filter(c => {
    const matchesSearch = c.name.includes(searchTerm) || 
                         c.phone.includes(searchTerm) ||
                         c.tags.some(t => t.includes(searchTerm));
    const matchesDesigner = selectedDesigner === '全體設計師' || c.mainDesigner === selectedDesigner;
    return matchesSearch && matchesDesigner;
  });

  // Opportunity Radar Data (Filtered by Designer)
  const filterByDesigner = (customer) => selectedDesigner === '全體設計師' || customer.mainDesigner === selectedDesigner;

  const birthdayStars = MOCK_CUSTOMERS.filter(c => ['2024-02-28', '2024-03-15'].includes(c.nextBirthday) && filterByDesigner(c));
  const riskClients = MOCK_CUSTOMERS.filter(c => c.stats.lastVisit < '2023-12-01' && filterByDesigner(c));
  
  // Today's Appointments Mock
  const todayAppointmentsRaw = [
    { id: 1, customer: 'Amy 陳', time: '14:00', service: '剪髮', avatar: null, designer: '設計師 A' },
    { id: 2, customer: 'Jason 林', time: '16:00', service: '頭皮護理', avatar: null, designer: '設計師 B' }
  ];
  
  const todayAppointments = todayAppointmentsRaw.filter(appt => selectedDesigner === '全體設計師' || appt.designer === selectedDesigner);

  return (
    <div className="relative">
      
      {/* Header (White Background) */}
      <div className="sticky top-0 z-30 bg-white border-b border-rose-100 px-4 py-3 shadow-sm">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-800">客戶情報中心</h1>
          
          {/* Designer Selector */}
          <div className="relative z-[60]">
            <button 
              onClick={() => setIsDesignerSelectorOpen(!isDesignerSelectorOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-sm border border-rose-100 text-sm font-bold text-slate-700 hover:border-rose-300 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <User weight="duotone" className="text-rose-500" size={18} />
              <span>{selectedDesigner}</span>
              <CaretDown className={`text-slate-400 transition-transform ${isDesignerSelectorOpen ? 'rotate-180' : ''}`} weight="bold" size={14} />
            </button>
            
            {isDesignerSelectorOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsDesignerSelectorOpen(false)}
                />
                <div className="absolute top-full right-0 mt-2 w-full bg-white rounded-xl shadow-xl border border-rose-100 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                  {MOCK_DESIGNERS.map(d => (
                    <button
                      key={d}
                      onClick={() => {
                        setSelectedDesigner(d);
                        setIsDesignerSelectorOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-rose-50 transition-colors flex items-center justify-between group
                        ${selectedDesigner === d ? 'bg-rose-50/50 text-rose-600 font-bold' : 'text-slate-600'}
                      `}
                    >
                      <span className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${selectedDesigner === d ? 'bg-rose-500' : 'bg-transparent group-hover:bg-rose-200 transition-colors'}`} />
                        {d}
                      </span>
                      {selectedDesigner === d && <Check weight="bold" className="text-rose-500" size={14} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar (Pink Background) */}
      <div className="px-4 py-3 sticky top-[60px] z-20 bg-rose-50/95 backdrop-blur-sm transition-all">
        {/* Search Bar */}
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-300" size={20} />
          <input 
            type="text"
            placeholder="搜尋姓名、電話、標籤 (例如 #染髮)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300 transition-all shadow-sm text-slate-700 placeholder:text-slate-400"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X weight="bold" size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Full Opportunity Radar (Visible only when NOT searching) */}
        <div className={`transition-all duration-500 ease-in-out ${searchTerm ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
          <div className="space-y-3">

            {/* 1. Today's Appointments (Stacked) */}
            <div className="w-full bg-gradient-to-br from-emerald-100 to-teal-50 p-5 rounded-3xl border border-emerald-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all cursor-pointer">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/60 rounded-2xl text-emerald-500 shadow-sm">
                    <CalendarCheck size={28} weight="fill" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-xl leading-tight mb-0.5">{todayAppointments.length} 位今日預約</h3>
                    <span className="text-xs font-bold text-emerald-600 bg-white/40 px-2 py-0.5 rounded-lg border border-white/40">熟客接待</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-600 mb-4">準備好迎接今天的熟客了嗎？</p>
              
              <div className="space-y-2">
                {todayAppointments.slice(0, 2).map(appt => {
                  const customerInfo = MOCK_CUSTOMERS.find(c => c.name === appt.customer);
                  return (
                    <div 
                      key={appt.id} 
                      onClick={(e) => {
                        e.stopPropagation();
                        if(customerInfo) setSelectedCustomer(customerInfo);
                      }}
                      className="flex items-center gap-3 bg-white/40 p-2 rounded-xl border border-white/30 cursor-pointer hover:bg-white/60 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs border border-white/50">
                        {appt.customer[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-700 text-sm truncate">{appt.customer}</div>
                        <div className="text-xs text-slate-500 truncate">{appt.service}</div>
                      </div>
                      <div className="font-bold text-emerald-700 text-sm bg-white/50 px-2 py-1 rounded-lg">{appt.time}</div>
                    </div>
                  );
                })}
                {todayAppointments.length > 2 && (
                   <div className="text-center text-xs text-emerald-600 font-bold pt-1">還有 {todayAppointments.length - 2} 位...</div>
                )}
              </div>
            </div>
            
            {/* 2. Birthday Card (Stacked) */}
            <div className="w-full bg-gradient-to-br from-amber-100 to-orange-50 p-5 rounded-3xl border border-amber-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-white/30 transition-all"></div>
              
              <div className="flex justify-between items-start mb-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/60 rounded-2xl text-amber-500 shadow-sm">
                    <Cake size={28} weight="fill" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-xl leading-tight mb-0.5">{birthdayStars.length} 位壽星</h3>
                    <span className="text-xs font-bold text-amber-600 bg-white/40 px-2 py-0.5 rounded-lg border border-white/40">本月機會</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-600 mb-4 relative z-10">把握機會送上祝福，提升客戶黏著度。</p>
              
              <div className="space-y-2">
                {birthdayStars.map(c => (
                  <div 
                    key={c.id} 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCustomer(c);
                    }}
                    className="flex items-center gap-3 bg-white/40 p-2 rounded-xl border border-white/30 cursor-pointer hover:bg-white/60 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-xs border border-white/50">
                      {c.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-700 text-sm truncate">{c.name}</div>
                      <div className="text-xs text-slate-500 truncate">{c.nextBirthday}</div>
                    </div>
                    <div className="font-bold text-amber-700 text-sm bg-white/50 px-2 py-1 rounded-lg">即將生日</div>
                  </div>
                ))}
                {birthdayStars.length === 0 && (
                   <div className="text-center text-xs text-amber-600 font-bold pt-1 opacity-60">暫無本月壽星</div>
                )}
              </div>
            </div>

            {/* 3. Risk Alert Card (Stacked) */}
            <div className="w-full bg-gradient-to-br from-slate-100 to-slate-50 p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/60 rounded-2xl text-slate-500 shadow-sm">
                    <WarningCircle size={28} weight="fill" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-xl leading-tight mb-0.5">{riskClients.length} 位流失風險</h3>
                    <span className="text-xs font-bold text-slate-600 bg-white/40 px-2 py-0.5 rounded-lg border border-white/40">喚醒名單</span>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-slate-500 mb-3">超過 90 天未預約，建議主動關懷。</p>

              <div className="space-y-2">
                {riskClients.map(c => (
                  <div 
                    key={c.id} 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCustomer(c);
                    }}
                    className="flex items-center gap-3 bg-white/40 p-2 rounded-xl border border-white/30 cursor-pointer hover:bg-white/60 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs border border-white/50">
                      {c.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-700 text-sm truncate">{c.name}</div>
                      <div className="text-xs text-slate-500 truncate">上次: {c.stats.lastVisit}</div>
                    </div>
                    <div className="font-bold text-slate-600 text-sm bg-white/50 px-2 py-1 rounded-lg text-[10px]">喚醒</div>
                  </div>
                ))}
                {riskClients.length === 0 && (
                   <div className="text-center text-xs text-slate-500 font-bold pt-1 opacity-60">暫無流失風險客戶</div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Customer List Grid (Only visible when searching) */}
        {searchTerm && (
          <div className="space-y-3 animate-fadeIn">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1">
              搜尋結果 ({filteredCustomers.length})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCustomers.map(customer => {
                const appointment = todayAppointments.find(a => a.customer === customer.name);
                const isBirthday = ['2024-02-28', '2024-03-15'].includes(customer.nextBirthday);

                return (
                <div 
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`bg-white p-4 rounded-2xl shadow-sm border transition-all cursor-pointer relative overflow-hidden group
                    ${appointment ? 'border-emerald-200 shadow-md shadow-emerald-100 ring-2 ring-emerald-100 ring-offset-2 animate-pulse-slow' : 'border-slate-100 hover:border-rose-200 hover:shadow-md'}
                    ${isBirthday && !appointment ? 'border-amber-200 ring-2 ring-amber-50 ring-offset-1' : ''}
                  `}
                >
                  {/* VIP Badge Background */}
                  {customer.level === 'VIP' && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-rose-100 to-transparent opacity-50 rounded-bl-full -mr-4 -mt-4"></div>
                  )}

                  {/* Status Badges */}
                  <div className="absolute top-3 right-3 flex flex-col gap-1 items-end z-20">
                    {appointment && (
                       <div className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[10px] font-bold rounded-full border border-emerald-200 shadow-sm flex items-center gap-1 animate-pulse">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                         今日預約 {appointment.time}
                       </div>
                    )}
                    {isBirthday && (
                       <div className="px-2 py-0.5 bg-amber-100 text-amber-600 text-[10px] font-bold rounded-full border border-amber-200 shadow-sm flex items-center gap-1">
                         <Cake weight="fill" size={10} />
                         本月壽星
                       </div>
                    )}
                  </div>

                  <div className="flex items-start space-x-4 relative z-10">
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 border-2 border-white shadow-sm">
                      {customer.avatar ? (
                        <img src={customer.avatar} alt={customer.name} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <UserCircle size={40} weight="light" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            {customer.name}
                            {customer.level === 'VIP' && (
                              <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[10px] rounded-md font-bold tracking-wider">VIP</span>
                            )}
                          </h3>
                          <p className="text-slate-500 text-sm mt-0.5">{customer.phone}</p>
                        </div>
                        <CaretRight className="text-slate-300" />
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {customer.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-slate-50 text-slate-600 text-[10px] rounded-full border border-slate-100">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <CalendarCheck size={14} />
                      <span>上次: {customer.stats.lastVisit}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CurrencyDollar size={14} />
                      <span>累積: ${customer.stats.totalSpend.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
              
              {filteredCustomers.length === 0 && (
                 <div className="col-span-full text-center py-12 text-slate-400">
                    <MagnifyingGlass size={48} className="mx-auto mb-4 opacity-50" />
                    <p>找不到符合的客戶</p>
                 </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal (The "Back" of the card) */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedCustomer(null)}
          ></div>
          
          <div className="bg-white w-full max-w-lg h-[85vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl relative z-10 flex flex-col overflow-hidden animate-slideUp sm:animate-fadeIn">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 overflow-hidden">
                   <UserCircle size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{selectedCustomer.name}</h3>
                  <p className="text-xs text-slate-500">
                    {selectedCustomer.level === 'VIP' ? 'VIP 會員' : 
                     selectedCustomer.level === 'Regular' ? '常客' : '新客'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="p-2 bg-white hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              
              {/* Profile Summary Section */}
              <div className="p-6 bg-gradient-to-b from-slate-50 to-white">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm text-center">
                    <div className="text-xs text-slate-400 mb-1">總消費</div>
                    <div className="font-bold text-slate-800 text-lg">${selectedCustomer.stats.totalSpend.toLocaleString()}</div>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm text-center">
                    <div className="text-xs text-slate-400 mb-1">平均客單</div>
                    <div className="font-bold text-slate-800 text-lg">${selectedCustomer.stats.avgSpend.toLocaleString()}</div>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm text-center">
                    <div className="text-xs text-slate-400 mb-1">到店次數</div>
                    <div className="font-bold text-slate-800 text-lg">{selectedCustomer.stats.totalVisits}</div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-slate-100/80 rounded-xl mb-2">
                  {['profile', 'history', 'notes'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === tab 
                          ? 'bg-white text-rose-600 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {tab === 'profile' && '基本資料'}
                      {tab === 'history' && '服務歷程'}
                      {tab === 'notes' && '私密筆記'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6 pt-2">
                
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-3">
                      <div className="flex items-center gap-3 text-slate-600">
                        <Phone size={18} className="text-rose-400" />
                        <span className="font-medium">{selectedCustomer.phone}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600">
                        <Cake size={18} className="text-rose-400" />
                        <span>{selectedCustomer.nextBirthday} (即將生日)</span>
                      </div>
                      <div className="flex items-start gap-3 text-slate-600">
                        <Tag size={18} className="text-rose-400 mt-0.5" />
                        <div className="flex flex-wrap gap-2">
                          {selectedCustomer.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-rose-50 text-rose-600 text-xs rounded-lg font-medium">
                              #{tag}
                            </span>
                          ))}
                          <button className="px-2 py-1 bg-slate-50 text-slate-400 text-xs rounded-lg border border-dashed border-slate-300 flex items-center gap-1 hover:bg-slate-100">
                            <Plus size={12} /> 標籤
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                  <div className="space-y-6 animate-fadeIn pl-2">
                    {selectedCustomer.history.map((record, idx) => (
                      <div key={idx} className="relative pl-6 border-l-2 border-slate-200 last:border-0">
                        {/* Timeline Dot */}
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-rose-400"></div>
                        
                        <div className="mb-6">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-bold text-slate-800">{record.service}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                <Clock size={12} /> {record.date} • {record.staff}
                              </div>
                            </div>
                            <div className="text-rose-600 font-bold text-sm">
                              ${record.price}
                            </div>
                          </div>
                          
                          {/* Technical Note Box */}
                          {record.note && (
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm text-slate-600 mt-2">
                              <span className="text-xs font-bold text-slate-400 block mb-1 uppercase">技術筆記</span>
                              {record.note}
                            </div>
                          )}
                          
                          {/* Photos (Placeholder) */}
                          <div className="flex gap-2 mt-3">
                             <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-300">
                                <ImageIcon size={20} />
                             </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-amber-900 text-sm leading-relaxed">
                      <div className="flex items-center gap-2 mb-2 font-bold text-amber-700">
                        <MagicWand size={16} />
                        AI 摘要
                      </div>
                      {selectedCustomer.notes}
                    </div>

                    <textarea 
                      className="w-full h-32 p-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-700 resize-none text-sm"
                      placeholder="新增筆記..."
                    ></textarea>
                    <button className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors">
                      儲存筆記
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Modal Footer Actions */}
            <div className="p-4 pb-20 sm:pb-4 border-t border-slate-100 bg-white grid grid-cols-2 gap-3 shrink-0">
              <button className="py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors">
                預約下次
              </button>
              <button className="py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200">
                LINE 聯繫
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPage;

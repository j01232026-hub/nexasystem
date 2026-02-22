import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Trash, PencilSimple, ArrowLeft, X, User, Check, 
  Envelope, Crown, UserGear, UserCircle, Copy, CheckCircle,
  Shield, Eye, PaperPlaneRight, QrCode
} from '@phosphor-icons/react';
import { QRCodeSVG } from 'qrcode.react';
import GlassPanel from '../components/ui/GlassPanel';
import BackgroundDecoration from '../components/ui/BackgroundDecoration';
import { supabase } from '../lib/supabaseClient';
import { usePermission } from '../hooks/usePermission';
import PermissionGuard from '../components/PermissionGuard';

const StaffManagementPage = () => {
  const navigate = useNavigate();
  const { can, isAdmin, staff: currentStaff } = usePermission();
  
  const [staffList, setStaffList] = useState([]);
  const [roles, setRoles] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    display_name: '',
    role_id: '',
    email: '',
    phone: '',
    bio: '',
    selectedServices: []
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  
  // Invite State
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role_id: ''
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [storeName, setStoreName] = useState('');

  useEffect(() => {
    fetchData();
    fetchRoles();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Staff with their linked services and roles
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select(`
          *,
          roles (*),
          staff_services (
            service_id,
            services ( name )
          )
        `)
        .order('created_at', { ascending: false });

      if (staffError) throw staffError;

      // 2. Fetch All Services for the picker
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (servicesError) throw servicesError;

      setStaffList(staffData || []);
      setServices(servicesData || []);

    } catch (err) {
      console.error('Error fetching data:', err);
      if (err.message !== 'JSON object requested, multiple (or no) rows returned') {
         setError('無法載入員工資料。');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setRoles(data || []);
      
      // 設置默認角色
      if (data && data.length > 0) {
        setFormData(prev => ({ ...prev, role_id: data.find(r => r.name === 'staff')?.id || data[0].id }));
        setInviteForm(prev => ({ ...prev, role_id: data.find(r => r.name === 'staff')?.id || data[0].id }));
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInviteInputChange = (e) => {
    const { name, value } = e.target;
    setInviteForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleServiceSelection = (serviceId) => {
    setFormData(prev => {
      const current = prev.selectedServices;
      if (current.includes(serviceId)) {
        return { ...prev, selectedServices: current.filter(id => id !== serviceId) };
      } else {
        return { ...prev, selectedServices: [...current, serviceId] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      // 1. Get current user & tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
      
      if (!profile) throw new Error('Profile not found');

      // 2. Insert Staff
      const { data: newStaff, error: insertError } = await supabase
        .from('staff')
        .insert([{
          tenant_id: profile.tenant_id,
          full_name: formData.full_name,
          display_name: formData.display_name || formData.full_name,
          role_id: formData.role_id,
          email: formData.email,
          phone: formData.phone,
          bio: formData.bio,
          is_active: true
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // 3. Insert Staff Services (Skills Binding)
      if (formData.selectedServices.length > 0) {
        const serviceLinks = formData.selectedServices.map(serviceId => ({
          staff_id: newStaff.id,
          service_id: serviceId
        }));

        const { error: linkError } = await supabase
          .from('staff_services')
          .insert(serviceLinks);

        if (linkError) throw linkError;
      }

      // 4. Reset and Refresh
      setIsModalOpen(false);
      setFormData({ full_name: '', display_name: '', role_id: roles[0]?.id, email: '', phone: '', bio: '', selectedServices: [] });
      fetchData();
      
    } catch (err) {
      console.error('Error creating staff:', err);
      alert('新增失敗: ' + err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // 發送邀請
  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteLoading(true);
    
    try {
      // 1. Get current user & tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
      
      if (!profile) throw new Error('Profile not found');

      // 2. Generate invite token
      const inviteToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // 3. Create staff record with invite
      const { data: newStaff, error: insertError } = await supabase
        .from('staff')
        .insert([{
          tenant_id: profile.tenant_id,
          full_name: inviteForm.name,
          display_name: inviteForm.name,
          email: inviteForm.email,
          role_id: inviteForm.role_id,
          invite_token: inviteToken,
          invite_expires_at: expiresAt.toISOString(),
          invited_by: currentStaff?.id,
          invited_at: new Date().toISOString(),
          is_active: true
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // 4. Generate invite link
      const link = `${window.location.origin}/invite?token=${inviteToken}`;
      setInviteLink(link);
      
      // 5. Try to send email
      try {
        const { data: storeData } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', profile.tenant_id)
          .single();
        
        const storeNameValue = storeData?.name || '店家';
        setStoreName(storeNameValue);
        
        // Call edge function to send email
        const { error: emailError } = await supabase.functions.invoke('send-invite-email', {
          body: {
            email: inviteForm.email,
            name: inviteForm.name,
            inviteLink: link,
            storeName: storeNameValue
          }
        });
        
        if (!emailError) {
          setEmailSent(true);
        }
      } catch (emailErr) {
        console.log('Email sending failed, user can copy link:', emailErr);
        setEmailSent(false);
      }
      
      // 6. Reset form
      setInviteForm({ name: '', email: '', role_id: roles[0]?.id });
      fetchData();
      
    } catch (err) {
      console.error('Error inviting staff:', err);
      alert('邀請失敗: ' + err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const shareViaLine = () => {
    const text = encodeURIComponent(`加入 ${storeName || '我們'} 的團隊！\n\n點擊連結完成註冊：\n${inviteLink}`);
    window.open(`https://line.me/R/msg/text/?${text}`, '_blank');
  };

  const getRoleBadge = (role) => {
    if (!role) return <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">未知</span>;
    
    switch (role.name) {
      case 'admin': 
        return (
          <span className="px-2 py-1 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 text-xs rounded-full flex items-center gap-1">
            <Crown weight="fill" className="w-3 h-3" />
            {role.display_name}
          </span>
        );
      case 'manager': 
        return (
          <span className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded-full flex items-center gap-1">
            <UserGear weight="fill" className="w-3 h-3" />
            {role.display_name}
          </span>
        );
      case 'staff': 
        return (
          <span className="px-2 py-1 bg-rose-100 text-rose-600 text-xs rounded-full flex items-center gap-1">
            <UserCircle weight="fill" className="w-3 h-3" />
            {role.display_name}
          </span>
        );
      default: 
        return <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full">{role.display_name}</span>;
    }
  };

  const getStatusBadge = (staff) => {
    if (staff.user_id) {
      return (
        <span className="px-2 py-0.5 bg-green-100 text-green-600 text-[10px] rounded-full flex items-center gap-1">
          <CheckCircle weight="fill" className="w-3 h-3" />
          已啟用
        </span>
      );
    } else if (staff.invite_token) {
      return (
        <span className="px-2 py-0.5 bg-amber-100 text-amber-600 text-[10px] rounded-full">
          待邀請
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full">
        未啟用
      </span>
    );
  };

  // 檢查權限
  if (!can('manage_staff')) {
    return (
      <div className="bg-rose-50 min-h-screen p-6 relative overflow-hidden font-sans flex items-center justify-center">
        <BackgroundDecoration />
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-rose-100/50 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-rose-500" weight="bold" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">無法訪問此頁面</h2>
          <p className="text-gray-500 mb-6">
            您沒有權限管理員工，請聯繫老闆或店長。
          </p>
          <button 
            onClick={() => navigate('/admin')}
            className="px-6 py-2 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-colors"
          >
            返回管理頁面
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-rose-50 min-h-screen p-6 relative overflow-hidden font-sans pb-24">
      <BackgroundDecoration />
      
      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/admin')} 
              className="p-2 bg-white/50 hover:bg-white rounded-full text-slate-600 transition-colors shadow-sm flex-shrink-0"
            >
              <ArrowLeft weight="bold" className="w-6 h-6" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">員工與權限管理</h1>
              <p className="text-xs sm:text-sm text-slate-500">管理員工資料、角色權限與系統訪問</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button 
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center justify-center space-x-1 sm:space-x-2 bg-white hover:bg-slate-50 text-slate-700 px-3 sm:px-4 py-2 rounded-lg transition-colors shadow-md border border-slate-200 text-sm sm:text-base"
            >
              <Envelope className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />
              <span className="hidden sm:inline">邀請員工</span>
              <span className="sm:hidden">邀請</span>
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center space-x-1 sm:space-x-2 bg-rose-500 hover:bg-rose-600 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors shadow-lg shadow-rose-200 text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">新增員工</span>
              <span className="sm:hidden">新增</span>
            </button>
          </div>
        </div>

        {/* Role Legend */}
        <div className="mb-6 flex flex-wrap gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600 bg-white/60 px-2 sm:px-3 py-1.5 rounded-full">
            <Crown weight="fill" className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500" />
            <span>老闆：全部權限</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600 bg-white/60 px-2 sm:px-3 py-1.5 rounded-full">
            <UserGear weight="fill" className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500" />
            <span>店長：管理日常營運</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600 bg-white/60 px-2 sm:px-3 py-1.5 rounded-full">
            <UserCircle weight="fill" className="w-3 h-3 sm:w-4 sm:h-4 text-rose-500" />
            <span>員工：查看自己預約</span>
          </div>
        </div>

        {/* Content */}
        <GlassPanel className="w-full min-h-[400px]">
          {loading ? (
            <div className="flex justify-center items-center h-64 text-slate-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 mr-3"></div>
              載入中...
            </div>
          ) : error ? (
            <div className="flex justify-center items-center h-64 text-red-400">
              {error}
            </div>
          ) : staffList.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-64 text-slate-400 space-y-4">
              <User className="w-16 h-16 text-slate-200" />
              <p>目前沒有員工資料</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsInviteModalOpen(true)} 
                  className="text-rose-500 hover:underline flex items-center gap-1"
                >
                  <Envelope className="w-4 h-4" />
                  邀請員工加入
                </button>
                <span className="text-slate-300">|</span>
                <button 
                  onClick={() => setIsModalOpen(true)} 
                  className="text-rose-500 hover:underline"
                >
                  手動新增員工
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-2 sm:p-4">
              {staffList.map((staff) => (
                <div key={staff.id} className="bg-white/60 backdrop-blur-sm rounded-xl border border-slate-100 p-3 sm:p-4 hover:shadow-md transition-all group">
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center text-rose-400 overflow-hidden flex-shrink-0">
                        {staff.avatar_url ? (
                          <img src={staff.avatar_url} alt={staff.name} className="w-full h-full object-cover" />
                        ) : (
                          <User weight="fill" className="w-5 h-5 sm:w-6 sm:h-6" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-800 text-sm sm:text-base truncate">{staff.display_name || staff.full_name}</h3>
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                          {getRoleBadge(staff.roles)}
                          {getStatusBadge(staff)}
                        </div>
                      </div>
                    </div>
                    <PermissionGuard adminOnly>
                      <button className="p-1.5 sm:p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex-shrink-0">
                        <PencilSimple className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </PermissionGuard>
                  </div>
                  
                  {/* Contact Info */}
                  <div className="space-y-1 mb-2">
                    {staff.email && (
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Envelope className="w-3 h-3" />
                        {staff.email}
                      </div>
                    )}
                    {staff.phone && (
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <span className="w-3 h-3 flex items-center justify-center text-[10px]">📞</span>
                        {staff.phone}
                      </div>
                    )}
                  </div>
                  
                  {/* Skills / Services */}
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-400 mb-2">可執行服務項目 ({staff.staff_services?.length || 0})</p>
                    <div className="flex flex-wrap gap-1">
                      {staff.staff_services?.slice(0, 3).map((item, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] rounded-full">
                          {item.services?.name}
                        </span>
                      ))}
                      {staff.staff_services?.length > 3 && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[10px] rounded-full">
                          +{staff.staff_services.length - 3}
                        </span>
                      )}
                      {(!staff.staff_services || staff.staff_services.length === 0) && (
                        <span className="text-xs text-slate-400 italic">尚未綁定服務</span>
                      )}
                    </div>
                  </div>

                  {/* Invite Status */}
                  {staff.invite_token && !staff.user_id && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-amber-600">等待接受邀請</span>
                        <button 
                          onClick={() => {
                            const link = `${window.location.origin}/invite?token=${staff.invite_token}`;
                            navigator.clipboard.writeText(link);
                            alert('邀請連結已複製');
                          }}
                          className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          複製連結
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      </div>

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-800">新增員工</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">真實姓名 *</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    required
                    placeholder="如：王小明"
                    className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">C 端暱稱 (選填)</label>
                  <input
                    type="text"
                    name="display_name"
                    value={formData.display_name}
                    onChange={handleInputChange}
                    placeholder="如：Ken 老師"
                    className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email (選填)</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="用於接收通知"
                    className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">電話 (選填)</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="0912-345-678"
                    className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">系統角色 *</label>
                <select
                  name="role_id"
                  value={formData.role_id}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                >
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.display_name} - {role.description}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  角色決定員工在系統中的權限範圍
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">可執行服務項目</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
                  {services.map(service => (
                    <label key={service.id} className="flex items-center space-x-2 cursor-pointer hover:bg-white p-2 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.selectedServices.includes(service.id)}
                        onChange={() => toggleServiceSelection(service.id)}
                        className="rounded border-slate-300 text-rose-500 focus:ring-rose-500"
                      />
                      <span className="text-sm text-slate-700">{service.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">個人簡介 (選填)</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="介紹這位員工的專長..."
                  className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                />
              </div>
            </form>

            <div className="p-4 border-t border-slate-100 flex justify-end space-x-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitLoading || !formData.full_name}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {submitLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>儲存中...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>確認新增</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Staff Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">邀請員工</h3>
              <button 
                onClick={() => {
                  setIsInviteModalOpen(false);
                  setInviteLink(null);
                }} 
                className="p-1 hover:bg-slate-100 rounded-full text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {!inviteLink ? (
              <form onSubmit={handleInvite} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">員工姓名 *</label>
                  <input
                    type="text"
                    name="name"
                    value={inviteForm.name}
                    onChange={handleInviteInputChange}
                    required
                    placeholder="如：王小美"
                    className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={inviteForm.email}
                    onChange={handleInviteInputChange}
                    required
                    placeholder="staff@example.com"
                    className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    員工將收到邀請郵件，點擊連結設定密碼
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">系統角色 *</label>
                  <select
                    name="role_id"
                    value={inviteForm.role_id}
                    onChange={handleInviteInputChange}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.display_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={inviteLoading || !inviteForm.name || !inviteForm.email}
                    className="w-full px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium"
                  >
                    {inviteLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>發送中...</span>
                      </>
                    ) : (
                      <>
                        <Envelope className="w-5 h-5" />
                        <span>發送邀請</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 space-y-5">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-500" weight="bold" />
                  </div>
                  <h4 className="font-bold text-slate-800 mb-1">邀請已建立！</h4>
                  {emailSent ? (
                    <p className="text-sm text-green-600 flex items-center justify-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      邀請郵件已發送至 {inviteForm.email}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500">
                      請選擇以下方式分享給員工
                    </p>
                  )}
                </div>

                {/* QR Code */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col items-center">
                  <label className="block text-xs font-medium text-slate-500 mb-3">掃描 QR Code 加入</label>
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <QRCodeSVG 
                      value={inviteLink} 
                      size={160}
                      level="M"
                      includeMargin={true}
                      imageSettings={{
                        src: '/logo.png',
                        height: 24,
                        width: 24,
                        excavate: true,
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">7 天內有效</p>
                </div>

                {/* Share Options */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={copyInviteLink}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors ${
                      copied 
                        ? 'bg-green-500 text-white' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        已複製
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        複製連結
                      </>
                    )}
                  </button>
                  <button
                    onClick={shareViaLine}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-[#06C755] hover:bg-[#05b34d] text-white rounded-xl font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596l1.524 1.924c.193.242.15.596-.09.787-.192.146-.463.146-.655 0l-1.668-2.11v1.467c0 .344-.279.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.025l1.669-2.11c.192-.146.463-.146.655 0 .24.191.283.545.09.787l-1.525 1.924c.26.086.433.326.433.596zm-2.025-2.646c0 .345-.282.63-.631.63-.344 0-.626-.285-.626-.63V8.108c0-.345.282-.63.63-.63.345 0 .627.285.627.63v4.125zm-1.501 4.27c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v5.395zm-2.025-5.395c0-.345.282-.63.631-.63.344 0 .626.285.626.63v5.395c0 .344-.282.629-.631.629-.344 0-.626-.285-.626-.629V8.108zm-1.5 5.395c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v5.395zm-2.025-5.395c0-.345.282-.63.631-.63.344 0 .626.285.626.63v5.395c0 .344-.282.629-.631.629-.344 0-.626-.285-.626-.629V8.108z"/>
                    </svg>
                    LINE 分享
                  </button>
                </div>

                {/* Manual Link */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="block text-xs font-medium text-slate-500 mb-2">邀請連結</label>
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-600"
                  />
                </div>

                <button
                  onClick={() => {
                    setIsInviteModalOpen(false);
                    setInviteLink(null);
                    setEmailSent(false);
                  }}
                  className="w-full px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-colors font-medium"
                >
                  完成
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagementPage;

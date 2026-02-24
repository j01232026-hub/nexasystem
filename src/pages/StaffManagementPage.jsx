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
  const { can, isAdmin, staff: currentStaff, loading: permissionLoading } = usePermission();
  
  const [staffList, setStaffList] = useState([]);
  const [roles, setRoles] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  
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

  const handleInviteInputChange = (e) => {
    const { name, value } = e.target;
    setInviteForm(prev => ({
      ...prev,
      [name]: value
    }));
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

  // 檢查權限 - 等待權限載入完成
  if (permissionLoading) {
    return (
      <div className="bg-rose-50 min-h-screen p-6 relative overflow-hidden font-sans flex items-center justify-center">
        <BackgroundDecoration />
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mb-4"></div>
          <p className="text-slate-500">載入中...</p>
        </div>
      </div>
    );
  }

  // 權限載入完成後檢查
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
          <button 
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center justify-center space-x-1 sm:space-x-2 bg-rose-500 hover:bg-rose-600 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors shadow-lg shadow-rose-200 text-sm sm:text-base"
          >
            <Envelope className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">邀請員工</span>
            <span className="sm:hidden">邀請</span>
          </button>
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
              <button 
                onClick={() => setIsInviteModalOpen(true)} 
                className="text-rose-500 hover:underline flex items-center gap-1"
              >
                <Envelope className="w-4 h-4" />
                邀請員工加入
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 p-2 sm:p-4">
              {staffList.map((staff) => (
                <div key={staff.id} className="relative bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-rose-200 transition-all group" style={{ aspectRatio: '4/3' }}>
                  {/* 識別證風格卡片 */}
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-br from-rose-400 to-pink-500"></div>
                  
                  {/* 編輯按鈕 */}
                  <PermissionGuard adminOnly>
                    <button className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 text-slate-400 hover:text-rose-500 rounded-lg shadow-sm transition-colors opacity-0 group-hover:opacity-100">
                      <PencilSimple className="w-3 h-3" />
                    </button>
                  </PermissionGuard>
                  
                  {/* 照片區域 - 放大並置中 */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden">
                      {staff.avatar_url ? (
                        <img src={staff.avatar_url} alt={staff.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center">
                          <User weight="fill" className="w-10 h-10 sm:w-12 sm:h-12 text-rose-400" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 資訊區域 */}
                  <div className="absolute bottom-0 left-0 right-0 h-1/2 pt-8 px-2 pb-2 flex flex-col items-center justify-end">
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base truncate w-full text-center">{staff.display_name || staff.full_name}</h3>
                    <div className="flex items-center gap-1 mt-1 flex-wrap justify-center">
                      {getRoleBadge(staff.roles)}
                      {getStatusBadge(staff)}
                    </div>
                    
                    {/* 聯絡資訊 - 簡化顯示 */}
                    <div className="mt-1 text-[10px] text-slate-400 truncate w-full text-center">
                      {staff.phone || staff.email || '尚無聯絡資訊'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      </div>

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

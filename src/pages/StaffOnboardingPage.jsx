import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Phone, Briefcase, CheckCircle, 
  ArrowRight, Sparkle, Buildings
} from '@phosphor-icons/react';
import { supabase } from '../lib/supabaseClient';
import BackgroundDecoration from '../components/ui/BackgroundDecoration';
import GlassPanel from '../components/ui/GlassPanel';

const StaffOnboardingPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [staffData, setStaffData] = useState(null);
  const [isOwner, setIsOwner] = useState(false); // 是否為老闆/負責人
  
  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    job_title: '負責人',
    roles: ['負責人'] // 複選：負責人、設計師
  });
  
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // 職稱選項（老闆用）
  const ownerRoleOptions = ['負責人', '設計師'];

  useEffect(() => {
    checkAuthAndLoadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      // 1. 檢查登入狀態
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        navigate('/login');
        return;
      }
      
      setUser(authUser);
      
      // 2. 檢查是否為老闆（透過檢查是否已有 tenant 或 roles）
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', authUser.id)
        .single();
      
      if (staffError || !staff) {
        // 沒有 staff 記錄，可能是新註冊的老闆
        setIsOwner(true);
        setFormData({
          full_name: authUser.user_metadata?.name || '',
          phone: '',
          job_title: '負責人',
          roles: ['負責人']
        });
        setLoading(false);
        return;
      }
      
      setStaffData(staff);
      
      // 檢查是否為老闆（role_id 對應 admin）
      const { data: role } = await supabase
        .from('roles')
        .select('name')
        .eq('id', staff.role_id)
        .single();
      
      if (role?.name === 'admin') {
        setIsOwner(true);
      }
      
      // 3. 檢查 profile 是否存在
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authUser.id)
        .single();
      
      // 4. 如果資料完整，導向首頁
      if (staff.phone && staff.job_title && profile) {
        navigate('/home');
        return;
      }
      
      // 5. 預填表單
      const isUserOwner = role?.name === 'admin';
      setFormData({
        full_name: staff.full_name || authUser.user_metadata?.name || '',
        phone: staff.phone || '',
        job_title: isUserOwner ? '負責人' : (staff.job_title || '設計師'),
        roles: isUserOwner ? ['負責人'] : []
      });
      
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleRoleToggle = (role) => {
    setFormData(prev => {
      const current = prev.roles || [];
      if (current.includes(role)) {
        // 至少保留一個角色
        if (current.length > 1) {
          return { ...prev, roles: current.filter(r => r !== role) };
        }
        return prev;
      } else {
        return { ...prev, roles: [...current, role] };
      }
    });
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.full_name.trim()) {
      newErrors.full_name = '請輸入姓名';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = '請輸入手機號碼';
    } else if (!/^[0-9]{10}$/.test(formData.phone.replace(/-/g, ''))) {
      newErrors.phone = '請輸入正確的手機號碼格式';
    }
    
    if (isOwner && formData.roles.length === 0) {
      newErrors.roles = '請至少選擇一個職稱';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSaving(true);
    
    try {
      // 組合職稱（老闆：負責人/設計師，員工：原職稱）
      const jobTitle = isOwner 
        ? formData.roles.join('、')
        : formData.job_title;

      if (staffData) {
        // 更新現有 staff 記錄
        const { error: staffError } = await supabase
          .from('staff')
          .update({
            full_name: formData.full_name,
            phone: formData.phone,
            job_title: jobTitle,
            updated_at: new Date().toISOString()
          })
          .eq('id', staffData.id);
        
        if (staffError) throw staffError;
      } else {
        // 創建新的 staff 記錄（老闆情況）
        // 需要先創建 tenant
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .insert({
            name: `${formData.full_name}的店家`,
            slug: `salon-${Date.now()}`,
            plan_type: 'lite'
          })
          .select()
          .single();
        
        if (tenantError) throw tenantError;

        // 獲取 admin role
        const { data: role } = await supabase
          .from('roles')
          .select('id')
          .eq('name', 'admin')
          .single();
        
        // 創建 staff 記錄
        const { error: staffError } = await supabase
          .from('staff')
          .insert({
            user_id: user.id,
            tenant_id: tenant.id,
            role_id: role?.id,
            full_name: formData.full_name,
            email: user.email,
            phone: formData.phone,
            job_title: jobTitle,
            joined_at: new Date().toISOString()
          });
        
        if (staffError) throw staffError;

        // 創建 profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            tenant_id: tenant.id,
            full_name: formData.full_name,
            phone: formData.phone,
            role: 'owner',
            email: user.email
          });
        
        if (profileError) throw profileError;

        setSuccess(true);
        setTimeout(() => {
          navigate('/home');
        }, 2000);
        return;
      }
      
      // 更新或創建 profiles 表（員工情況）
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
      
      if (existingProfile) {
        await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            phone: formData.phone,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
      } else {
        const tenantId = staffData?.tenant_id;
        if (!tenantId) {
          throw new Error('無法獲取 tenant_id');
        }
        
        await supabase
          .from('profiles')
          .insert({
            id: user.id,
            tenant_id: tenantId,
            full_name: formData.full_name,
            phone: formData.phone,
            role: 'staff',
            email: user.email
          });
      }
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/home');
      }, 2000);
      
    } catch (err) {
      console.error('Error saving profile:', err);
      const errorMessage = err.message || err.error_description || '儲存失敗，請稍後再試';
      setErrors({ submit: `儲存失敗：${errorMessage}` });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center p-4">
        <BackgroundDecoration />
        <div className="flex items-center space-x-3 text-rose-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
          <span>載入中...</span>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center p-4">
        <BackgroundDecoration />
        <GlassPanel className="w-full max-w-md text-center py-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" weight="bold" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {isOwner ? '歡迎加入 NEXA！' : '資料已完成！'}
          </h2>
          <p className="text-slate-500 mb-6">
            {isOwner ? '正在為您導向管理中心...' : '正在為您導向首頁...'}
          </p>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="bg-rose-500 h-full rounded-full animate-[shrink_2s_linear_forwards]"></div>
          </div>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 py-8 px-4">
      <BackgroundDecoration />
      
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-100 text-rose-500 mb-4">
            {isOwner ? <Buildings weight="fill" className="w-8 h-8" /> : <Sparkle weight="fill" className="w-8 h-8" />}
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            {isOwner ? '完善您的資料' : '完善您的資料'}
          </h1>
          <p className="text-slate-500">
            {isOwner ? '請填寫基本資料，開始建立您的店家' : '請填寫基本資料，讓客戶更認識您'}
          </p>
        </div>

        <GlassPanel className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 姓名 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                姓名 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="請輸入您的姓名"
                className={`w-full px-4 py-3 rounded-xl border ${errors.full_name ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white/50'} focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all`}
              />
              {errors.full_name && (
                <p className="text-rose-500 text-sm mt-1">{errors.full_name}</p>
              )}
            </div>

            {/* 手機 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                手機號碼 <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="例如：0912345678"
                className={`w-full px-4 py-3 rounded-xl border ${errors.phone ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white/50'} focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all`}
              />
              {errors.phone && (
                <p className="text-rose-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>

            {/* 職稱 - 老闆：複選框，員工：輸入框 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                <Briefcase className="w-4 h-4 inline mr-1" />
                職稱 {isOwner && <span className="text-slate-400 text-xs">（可複選）</span>}
              </label>
              
              {isOwner ? (
                // 老闆：複選框
                <div className="flex flex-wrap gap-3">
                  {ownerRoleOptions.map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleRoleToggle(role)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                        formData.roles.includes(role)
                          ? 'bg-rose-500 text-white border-rose-500 shadow-md'
                          : 'bg-white/50 text-slate-600 border-slate-200 hover:border-rose-300'
                      }`}
                    >
                      <span className="mr-1">
                        {formData.roles.includes(role) ? '☑' : '☐'}
                      </span>
                      {role}
                    </button>
                  ))}
                </div>
              ) : (
                // 員工：輸入框
                <input
                  type="text"
                  name="job_title"
                  value={formData.job_title}
                  onChange={handleChange}
                  placeholder="例如：美容師、設計師"
                  className={`w-full px-4 py-3 rounded-xl border ${errors.job_title ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white/50'} focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all`}
                />
              )}
              {errors.roles && (
                <p className="text-rose-500 text-sm mt-1">{errors.roles}</p>
              )}
            </div>

            {/* 錯誤訊息 */}
            {errors.submit && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">
                {errors.submit}
              </div>
            )}

            {/* 提交按鈕 */}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold shadow-lg shadow-rose-200 hover:shadow-xl hover:from-rose-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  儲存中...
                </>
              ) : (
                <>
                  {isOwner ? '建立店家' : '完成設定'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </form>
        </GlassPanel>

        {/* Footer */}
        <p className="text-center text-slate-400 text-sm mt-6">
          {isOwner ? '建立店家後，您可以邀請員工加入' : '這些資料將顯示給客戶查看'}
        </p>
      </div>
    </div>
  );
};

export default StaffOnboardingPage;

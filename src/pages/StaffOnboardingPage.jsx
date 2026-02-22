import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Phone, Briefcase, Star, CheckCircle, 
  ArrowRight, Sparkle, Camera
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
  
  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    job_title: '美容師',
    specialties: []
  });
  
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // 專長選項
  const specialtyOptions = [
    '臉部護理', '身體按摩', '美甲', '美睫', 
    '紋繡', '除毛', '精油芳療', '其他'
  ];

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
      
      // 2. 載入員工資料
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', authUser.id)
        .single();
      
      if (staffError) {
        console.error('Staff data error:', staffError);
        // 如果沒有員工資料，可能是透過其他方式註冊的用戶
        // 不導向首頁，而是讓用戶在這個頁面建立資料
        // 預填表單使用 user_metadata
        setFormData({
          full_name: authUser.user_metadata?.name || '',
          phone: '',
          job_title: '美容師',
          specialties: []
        });
        setLoading(false);
        return;
      }
      
      setStaffData(staff);
      
      // 3. 如果資料已完整，直接導向首頁
      if (staff.phone && staff.job_title) {
        navigate('/home');
        return;
      }
      
      // 4. 預填表單
      setFormData({
        full_name: staff.full_name || authUser.user_metadata?.name || '',
        phone: staff.phone || '',
        job_title: staff.job_title || '美容師',
        specialties: staff.specialties || []
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
    // 清除錯誤
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSpecialtyToggle = (specialty) => {
    setFormData(prev => {
      const current = prev.specialties || [];
      if (current.includes(specialty)) {
        return { ...prev, specialties: current.filter(s => s !== specialty) };
      } else {
        return { ...prev, specialties: [...current, specialty] };
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
    
    if (!formData.job_title.trim()) {
      newErrors.job_title = '請輸入職稱';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSaving(true);
    
    try {
      if (staffData) {
        // 1. 更新現有 staff 記錄
        const { error: staffError } = await supabase
          .from('staff')
          .update({
            full_name: formData.full_name,
            phone: formData.phone,
            job_title: formData.job_title,
            specialties: formData.specialties,
            updated_at: new Date().toISOString()
          })
          .eq('id', staffData.id);
        
        if (staffError) throw staffError;
      } else {
        // 1. 創建新的 staff 記錄
        // 需要先獲取 tenant_id 和 role_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single();
        
        const { data: role } = await supabase
          .from('roles')
          .select('id')
          .eq('name', 'staff')
          .single();
        
        const { error: staffError } = await supabase
          .from('staff')
          .insert({
            user_id: user.id,
            tenant_id: profile?.tenant_id,
            role_id: role?.id,
            full_name: formData.full_name,
            email: user.email,
            phone: formData.phone,
            job_title: formData.job_title,
            specialties: formData.specialties,
            joined_at: new Date().toISOString()
          });
        
        if (staffError) throw staffError;
      }
      
      // 2. 更新或創建 profiles 表
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
      
      if (existingProfile) {
        // 更新現有 profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            phone: formData.phone,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
        
        if (profileError) throw profileError;
      } else {
        // 創建新的 profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: formData.full_name,
            phone: formData.phone,
            role: 'staff',
            email: user.email
          });
        
        if (profileError) throw profileError;
      }
      
      setSuccess(true);
      
      // 3秒後導向首頁
      setTimeout(() => {
        navigate('/home');
      }, 2000);
      
    } catch (err) {
      console.error('Error saving profile:', err);
      setErrors({ submit: '儲存失敗，請稍後再試' });
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
          <h2 className="text-2xl font-bold text-slate-800 mb-2">資料已完成！</h2>
          <p className="text-slate-500 mb-6">歡迎加入團隊，正在為您導向首頁...</p>
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
            <Sparkle weight="fill" className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">完善您的資料</h1>
          <p className="text-slate-500">請填寫基本資料，讓客戶更認識您</p>
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

            {/* 職稱 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Briefcase className="w-4 h-4 inline mr-1" />
                職稱 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="job_title"
                value={formData.job_title}
                onChange={handleChange}
                placeholder="例如：美容師、設計師"
                className={`w-full px-4 py-3 rounded-xl border ${errors.job_title ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white/50'} focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all`}
              />
              {errors.job_title && (
                <p className="text-rose-500 text-sm mt-1">{errors.job_title}</p>
              )}
            </div>

            {/* 專長 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                <Star className="w-4 h-4 inline mr-1" />
                專長項目（可複選）
              </label>
              <div className="flex flex-wrap gap-2">
                {specialtyOptions.map(specialty => (
                  <button
                    key={specialty}
                    type="button"
                    onClick={() => handleSpecialtyToggle(specialty)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      formData.specialties.includes(specialty)
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-200'
                        : 'bg-white/50 text-slate-600 border border-slate-200 hover:border-rose-300'
                    }`}
                  >
                    {formData.specialties.includes(specialty) && (
                      <CheckCircle className="w-3 h-3 inline mr-1" weight="fill" />
                    )}
                    {specialty}
                  </button>
                ))}
              </div>
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
                  完成設定
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </form>
        </GlassPanel>

        {/* Footer */}
        <p className="text-center text-slate-400 text-sm mt-6">
          這些資料將顯示給客戶查看
        </p>
      </div>
    </div>
  );
};

export default StaffOnboardingPage;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Storefront, Phone, MapPin, Clock, CheckCircle, 
  ArrowRight, Buildings, Camera
} from '@phosphor-icons/react';
import { supabase } from '../lib/supabaseClient';
import BackgroundDecoration from '../components/ui/BackgroundDecoration';
import GlassPanel from '../components/ui/GlassPanel';

const StoreSetupPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    store_name: '',
    store_phone: '',
    address: '',
    business_hours: '10:00-20:00',
    description: ''
  });
  
  const [errors, setErrors] = useState({});

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        navigate('/login');
        return;
      }
      
      setUser(authUser);
      
      // 檢查 profile 和 tenant
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, tenants(*)')
        .eq('id', authUser.id)
        .single();
      
      if (profileError || !profileData) {
        navigate('/staff-onboarding');
        return;
      }
      
      setProfile(profileData);
      
      // 如果店家資訊已完整，導向首頁
      const tenant = profileData.tenants;
      if (tenant && tenant.name && tenant.name !== `${profileData.full_name}的店家`) {
        navigate('/home');
        return;
      }
      
      // 預填店家名稱
      setFormData(prev => ({
        ...prev,
        store_name: tenant?.name?.replace('的店家', '') || profileData.full_name
      }));
      
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

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.store_name.trim()) {
      newErrors.store_name = '請輸入店家名稱';
    }
    
    if (!formData.store_phone.trim()) {
      newErrors.store_phone = '請輸入店家電話';
    }
    
    if (!formData.address.trim()) {
      newErrors.address = '請輸入店家地址';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSaving(true);
    
    try {
      // 更新 tenant 資料
      const { error: tenantError } = await supabase
        .from('tenants')
        .update({
          name: formData.store_name,
          phone: formData.store_phone,
          address: formData.address,
          business_hours: formData.business_hours,
          description: formData.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.tenant_id);
      
      if (tenantError) throw tenantError;
      
      setSuccess(true);
      
      setTimeout(() => {
        navigate('/home');
      }, 2000);
      
    } catch (err) {
      console.error('Error saving store:', err);
      const errorMessage = err.message || '儲存失敗，請稍後再試';
      setErrors({ submit: errorMessage });
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
          <h2 className="text-2xl font-bold text-slate-800 mb-2">店家設定完成！</h2>
          <p className="text-slate-500 mb-6">正在為您導向管理中心...</p>
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
            <Storefront weight="fill" className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">設定您的店家</h1>
          <p className="text-slate-500">填寫店家資訊，讓客戶更了解您</p>
        </div>

        {/* 進度指示器 */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">1</div>
            <div className="w-16 h-1 bg-green-500"></div>
            <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center text-sm font-bold">2</div>
          </div>
        </div>
        <p className="text-center text-sm text-slate-400 mb-6">步驟 2/2：店家資訊</p>

        <GlassPanel className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 店家名稱 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Storefront className="w-4 h-4 inline mr-1" />
                店家名稱 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="store_name"
                value={formData.store_name}
                onChange={handleChange}
                placeholder="例如：NEXA 美學沙龍"
                className={`w-full px-4 py-3 rounded-xl border ${errors.store_name ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white/50'} focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all`}
              />
              {errors.store_name && (
                <p className="text-rose-500 text-sm mt-1">{errors.store_name}</p>
              )}
            </div>

            {/* 店家電話 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                店家電話 <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                name="store_phone"
                value={formData.store_phone}
                onChange={handleChange}
                placeholder="例如：02-2345-6789"
                className={`w-full px-4 py-3 rounded-xl border ${errors.store_phone ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white/50'} focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all`}
              />
              {errors.store_phone && (
                <p className="text-rose-500 text-sm mt-1">{errors.store_phone}</p>
              )}
            </div>

            {/* 店家地址 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                店家地址 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="例如：台北市大安區復興南路一段100號"
                className={`w-full px-4 py-3 rounded-xl border ${errors.address ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white/50'} focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all`}
              />
              {errors.address && (
                <p className="text-rose-500 text-sm mt-1">{errors.address}</p>
              )}
            </div>

            {/* 營業時間 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                營業時間
              </label>
              <input
                type="text"
                name="business_hours"
                value={formData.business_hours}
                onChange={handleChange}
                placeholder="例如：10:00-20:00"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all"
              />
              <p className="text-xs text-slate-400 mt-1">格式：開始時間-結束時間，例如 10:00-20:00</p>
            </div>

            {/* 店家簡介 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                店家簡介
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="簡單介紹您的店家特色..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all resize-none"
              />
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
          完成後即可開始使用 NEXA 管理您的店家
        </p>
      </div>
    </div>
  );
};

export default StoreSetupPage;

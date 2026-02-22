import React, { useState, useEffect } from 'react';
import BackgroundDecoration from '../components/ui/BackgroundDecoration';
import GlassPanel from '../components/ui/GlassPanel';
import { 
  Camera, Envelope, PencilSimple, ArrowLeft, Lock, Eye, EyeSlash,
  CheckCircle, Warning, User, Shield
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { usePermission } from '../hooks/usePermission';

const ManagerProfilePage = () => {
  const navigate = useNavigate();
  const { role, staff } = usePermission();
  
  // Profile state
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    email: '',
    birthday: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Messages
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Get profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile({
          name: profileData.name || '',
          phone: profileData.phone || '',
          email: user.email || '',
          birthday: profileData.birthday || ''
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('profiles')
        .update({
          name: profile.name,
          phone: profile.phone,
          birthday: profile.birthday,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setSuccess('個人資料已更新');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('儲存失敗：' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Validation
    if (newPassword.length < 6) {
      setError('新密碼至少需要 6 個字元');
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      setError('兩次輸入的新密碼不一致');
      return;
    }

    setChangingPassword(true);
    
    try {
      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowPasswordSection(false);
      
      setSuccess('密碼已更新，請使用新密碼登入');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('密碼更新失敗：' + err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const getRoleDisplay = () => {
    switch (role?.name) {
      case 'admin': return { name: '老闆', color: 'text-amber-600', bg: 'bg-amber-50' };
      case 'manager': return { name: '店長', color: 'text-purple-600', bg: 'bg-purple-50' };
      case 'staff': return { name: '員工', color: 'text-rose-600', bg: 'bg-rose-50' };
      default: return { name: '用戶', color: 'text-slate-600', bg: 'bg-slate-50' };
    }
  };

  const roleDisplay = getRoleDisplay();

  if (loading) {
    return (
      <div className="bg-rose-50 min-h-screen flex items-center justify-center">
        <BackgroundDecoration />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-rose-50 min-h-screen p-6 relative overflow-hidden font-sans pb-24">
      <BackgroundDecoration />
      
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <button 
            onClick={() => navigate('/admin')} 
            className="p-2 bg-white/50 hover:bg-white rounded-full text-slate-600 transition-colors shadow-sm"
          >
            <ArrowLeft weight="bold" className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">我的帳號</h1>
            <p className="text-sm text-slate-500">管理個人資料與安全設定</p>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" weight="bold" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-600">
            <Warning className="w-5 h-5" weight="bold" />
            <span>{error}</span>
          </div>
        )}

        {/* Role Badge */}
        <div className="mb-6 flex items-center gap-3">
          <div className={`px-4 py-2 ${roleDisplay.bg} rounded-full flex items-center gap-2`}>
            <Shield className={`w-4 h-4 ${roleDisplay.color}`} weight="fill" />
            <span className={`text-sm font-medium ${roleDisplay.color}`}>
              目前角色：{roleDisplay.name}
            </span>
          </div>
        </div>

        <GlassPanel className="w-full mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-rose-500" />
            個人資料
          </h2>
          
          {/* Profile Form */}
          <form className="space-y-5">
            {/* 頭像上傳 */}
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="relative group cursor-pointer">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 border-2 border-dashed border-rose-300 flex items-center justify-center overflow-hidden transition-all group-hover:border-rose-500 group-hover:from-rose-200 group-hover:to-pink-200">
                  <Camera className="h-8 w-8 text-rose-400 group-hover:scale-110 transition-transform" />
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                </div>
                <div className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow-md border border-slate-100 group-hover:scale-110 transition-transform">
                  <PencilSimple className="h-3 w-3 text-slate-600" />
                </div>
              </div>
              <span className="mt-2 text-xs text-slate-400 font-medium">上傳個人頭像</span>
            </div>

            {/* 姓名與電話 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">真實姓名</label>
                <input 
                  type="text" 
                  name="name"
                  value={profile.name}
                  onChange={handleProfileChange}
                  placeholder="王小美" 
                  className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all placeholder:text-slate-300 text-slate-700 font-medium" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">聯絡電話</label>
                <input 
                  type="tel" 
                  name="phone"
                  value={profile.phone}
                  onChange={handleProfileChange}
                  placeholder="0912-345-678" 
                  className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all placeholder:text-slate-300 text-slate-700 font-medium" 
                />
              </div>
            </div>

            {/* 生日與 Email */}
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">出生日期</label>
                <div className="relative">
                  <input 
                    type="date" 
                    name="birthday"
                    value={profile.birthday}
                    onChange={handleProfileChange}
                    className="w-full px-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all text-slate-700 font-medium appearance-none" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">電子信箱 Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Envelope className="h-5 w-5 text-slate-400" />
                  </div>
                  <input 
                    type="email" 
                    value={profile.email}
                    disabled
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 font-medium cursor-not-allowed" 
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1 pl-1">Email 無法修改，如需變更請聯繫管理員</p>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <button 
                type="button" 
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full py-3.5 px-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium shadow-lg shadow-rose-200 transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>儲存中...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>儲存變更</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </GlassPanel>

        {/* Password Change Section */}
        <GlassPanel className="w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Lock className="w-5 h-5 text-rose-500" />
              密碼設定
            </h2>
            <button
              onClick={() => setShowPasswordSection(!showPasswordSection)}
              className="text-sm text-rose-500 hover:text-rose-600 font-medium"
            >
              {showPasswordSection ? '取消' : '修改密碼'}
            </button>
          </div>

          {!showPasswordSection ? (
            <p className="text-sm text-slate-500">
              上次更新：未知<br />
              建議定期更換密碼以確保帳號安全
            </p>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">新密碼</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="至少 6 個字元"
                    className="w-full pl-12 pr-12 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">確認新密碼</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    placeholder="再次輸入新密碼"
                    className="w-full pl-12 pr-12 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={changingPassword || !newPassword || !confirmNewPassword}
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium shadow-lg shadow-slate-300 transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {changingPassword ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>更新中...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    <span>更新密碼</span>
                  </>
                )}
              </button>
            </form>
          )}
        </GlassPanel>
      </div>
    </div>
  );
};

export default ManagerProfilePage;

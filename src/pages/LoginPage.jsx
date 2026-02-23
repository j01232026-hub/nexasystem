import React, { useState, useEffect } from 'react';
import BackgroundDecoration from '../components/ui/BackgroundDecoration';
import GlassPanel from '../components/ui/GlassPanel';
import { User, Lock, ArrowRight, Sparkle } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useLiffAuth } from '../context/LiffAuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: liffLoading } = useLiffAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (window.liff && window.liff.isInClient() && isAuthenticated) {
      navigate('/liff/demo/home');
    }
  }, [navigate, isAuthenticated]);

  if (liffLoading || (isAuthenticated && window.liff?.isInClient())) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">NEXA Loading...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegistering) {
        // 註冊流程
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        const user = signUpData.user;
        if (!user) {
          throw new Error('註冊失敗，請重試');
        }

        alert('註冊成功！請使用新帳號登入。');
        setIsRegistering(false);
        setLoading(false);
        return;
      }

      // 登入流程
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const user = data.user;
      if (!user) {
        throw new Error('登入失敗，請重試');
      }

      // 檢查用戶角色和資料完整性
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name, phone')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile fetch error:', profileError);
      }

      // 如果沒有 profile，導向資料完善頁面
      if (!profile) {
        navigate('/staff-onboarding');
        return;
      }

      // 如果是老闆(role=owner)，檢查是否已完成店家設定
      if (profile.role === 'owner') {
        // 檢查店家資訊是否已填寫（tenant.name 不是預設值）
        const { data: tenant } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', profile.tenant_id)
          .single();
        
        if (tenant && tenant.name && tenant.name.includes('的店家')) {
          navigate('/store-setup');
          return;
        }
      }

      // 如果是員工，檢查資料完整性
      if (profile.role === 'staff') {
        const { data: staffData } = await supabase
          .from('staff')
          .select('phone, job_title')
          .eq('user_id', user.id)
          .single();

        if (!staffData?.phone || !staffData?.job_title) {
          navigate('/staff-onboarding');
          return;
        }
      }

      navigate('/home');
    } catch (error) {
      alert(isRegistering ? '註冊失敗: ' : '登入失敗: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-rose-50 min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <BackgroundDecoration />

      <GlassPanel className="w-full max-w-md">
        {/* 品牌 Logo 區域 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 text-rose-500 mb-4">
            <Sparkle weight="fill" className="w-6 h-6" />
          </div>
          <h1 className="text-3xl text-slate-800 font-bold tracking-tight mb-1">NEXA (奈沙)</h1>
          <p className="text-slate-500 text-sm font-light tracking-wide">
            {isRegistering ? '註冊新帳號，開啟您的美麗旅程' : '歡迎回來，開啟您的美麗旅程'}
          </p>
        </div>

        {/* 登入/註冊表單 */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">
              電子信箱
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400 group-focus-within:text-rose-400 transition-colors" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all placeholder:text-slate-400 text-slate-700 font-medium"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5 pl-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                密碼
              </label>
              {!isRegistering && (
                <button
                  type="button"
                  onClick={() => alert('請聯繫管理員重設密碼')}
                  className="text-xs text-rose-500 hover:text-rose-600 font-medium transition-colors"
                >
                  忘記密碼？
                </button>
              )}
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-rose-400 transition-colors" />
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all text-slate-700 font-medium"
              />
            </div>
            {isRegistering && (
              <p className="text-xs text-slate-400 mt-1 pl-1">密碼至少需要 6 個字元</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium shadow-lg shadow-rose-200 transform active:scale-[0.98] transition-all flex items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? isRegistering ? '註冊中...' : '登入中...'
              : isRegistering ? '立即註冊' : '立即登入'}
            {!loading && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        {/* 分隔線 */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white/80 text-slate-400 font-medium backdrop-blur-sm">或</span>
          </div>
        </div>

        {/* LINE 登入按 */}
        <button className="w-full py-3.5 px-4 bg-[#06C755] hover:bg-[#05b64d] text-white rounded-xl font-bold shadow-md shadow-green-100 transform active:scale-[0.98] transition-all flex items-center justify-center relative overflow-hidden group mb-4">
          <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.5,10.2C21.5,5.6,17.2,1.9,12,1.9S2.5,5.6,2.5,10.2c0,4.1,3.4,7.6,8.1,8.2c0.3,0.1,0.7,0.3,0.8,0.7 c0.1,0.4,0,1.5-0.1,1.9c0,0-0.3,1.3-0.4,1.6c-0.1,0.4-0.6,1.5,0.8,0.8c1.4-0.7,7.7-4.5,10.5-7.7C23.6,14.2,21.5,12.3,21.5,10.2z M12,15.7c-5.2,0-9.5-3.5-9.5-7.8c0-4.3,4.2-7.8,9.5-7.8c5.2,0,9.5,3.5,9.5,7.8C21.5,12.2,17.2,15.7,12,15.7z"/>
            <path d="M12.9,8.1h-2.1c-0.3,0-0.5,0.2-0.5,0.5v4.2c0,0.3,0.2,0.5,0.5,0.5h2.1c0.3,0,0.5-0.2,0.5-0.5v-0.6c0-0.3-0.2-0.5-0.5-0.5 h-1v-1h1c0.3,0,0.5-0.2,0.5-0.5V9.1C13.4,8.8,13.2,8.6,12.9,8.6z M7.7,13.3H7.1c-0.3,0-0.5-0.2-0.5-0.5V8.6c0-0.3,0.2-0.5,0.5-0.5 h0.6c0.3,0,0.5,0.2,0.5,0.5v3.6h1c0.3,0,0.5,0.2,0.5,0.5v0.6c0,0.3-0.2,0.5-0.5,0.5H7.7z M17.2,8.6v4.2c0,0.3,0.2,0.5,0.5,0.5 h0.6c0.3,0,0.5-0.2,0.5-0.5V8.6c0-0.3-0.2-0.5-0.5-0.5h-0.6C17.4,8.1,17.2,8.3,17.2,8.6z M15.5,13.3h-0.6c-0.3,0-0.5-0.2-0.5-0.5 V8.6c0-0.3,0.2-0.5,0.5-0.5h0.6c0.3,0,0.5,0.2,0.5,0.5v4.2C15.9,13.1,15.7,13.3,15.5,13.3z"/>
          </svg>
          使用 LINE 帳號登入
        </button>

        {/* 切換登入/註冊 */}
        <div className="text-center">
          <p className="text-sm text-slate-500">
            {isRegistering ? '已經有帳號了？' : '還沒有會員帳號？'}
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="font-semibold text-rose-500 hover:text-rose-600 transition-colors ml-1"
            >
              {isRegistering ? '立即登入' : '立即註冊'}
            </button>
          </p>
        </div>
      </GlassPanel>
    </div>
  );
};

export default LoginPage;

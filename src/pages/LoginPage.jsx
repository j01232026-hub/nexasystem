import React, { useState, useEffect } from 'react';
import BackgroundDecoration from '../components/ui/BackgroundDecoration';
import GlassPanel from '../components/ui/GlassPanel';
import { User, Lock, ArrowRight, Sparkle, Code } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useLiffAuth } from '../context/LiffAuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, liffUser } = useLiffAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Auto-redirect to C-side if in LIFF browser AND Authenticated
    // Defaulting to 'demo' tenant for now
    if (window.liff && window.liff.isInClient() && isAuthenticated) {
      console.log('Redirecting to C-side home...');
      navigate('/liff/demo/home');
    }
  }, [navigate, isAuthenticated]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      navigate('/home');
    } catch (error) {
      alert('登入失敗: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setLoading(true);
    const demoEmail = 'demo@nexa.com';
    const demoPassword = 'password123';
    
    try {
      // 1. Try Login
      let { data, error } = await supabase.auth.signInWithPassword({ 
        email: demoEmail, 
        password: demoPassword 
      });
      
      // 2. If invalid login, try Sign Up (Auto-create dev user)
      if (error && (error.message.includes('Invalid login credentials') || error.message.includes('Email not confirmed'))) {
        // Note: If email not confirmed, we might be stuck depending on Supabase settings.
        // But for local/dev, usually auto-confirm is on or we ignore.
        
        if (error.message.includes('Invalid login credentials')) {
            const signUpRes = await supabase.auth.signUp({ 
              email: demoEmail, 
              password: demoPassword 
            });
            if (signUpRes.error) throw signUpRes.error;
            data = signUpRes.data;
            
            // If sign up successful but no session, it might need email confirmation.
            // But we'll proceed if we got a user.
        } else {
            throw error;
        }
      } else if (error) {
        throw error;
      }
      
      const user = data.user;
      if (!user) {
          // If signup required email confirmation, we might not have a session.
          // Try to sign in again? Or alert.
          alert('請檢查是否需要 Email 驗證 (Supabase Console)');
          return;
      }

      // 3. Check Profile existence
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (!profile) {
        // 4. Check/Create Tenant
        // Note: RLS must allow this. If not, this step will fail in strict mode.
        let { data: tenants } = await supabase.from('tenants').select('*').limit(1);
        let tenantId;
        
        if (!tenants || tenants.length === 0) {
            // Try to create a tenant (Requires 'create policy' on tenants)
            const { data: newTenant, error: tenantError } = await supabase
                .from('tenants')
                .insert({
                    name: 'NEXA Demo Salon',
                    slug: 'nexa-demo-' + Math.random().toString(36).substring(7),
                    plan_type: 'pro'
                })
                .select()
                .single();
            
            if (tenantError) {
                console.error('Tenant creation failed:', tenantError);
                throw new Error('無法建立 Tenant，請檢查資料庫權限 (需要 apply schema changes)。');
            }
            tenantId = newTenant.id;
        } else {
            tenantId = tenants[0].id;
        }
        
        // 5. Create Profile
        const { error: profileError } = await supabase.from('profiles').insert({
            id: user.id,
            tenant_id: tenantId,
            role: 'owner',
            full_name: 'Demo Admin'
        });
        
        if (profileError) throw profileError;
      }

      navigate('/home');
    } catch (err) {
      console.error(err);
      alert('開發者登入失敗: ' + err.message + '\n請確認您已套用最新的資料庫 Schema。');
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
          <p className="text-slate-500 text-sm font-light tracking-wide">歡迎回來，開啟您的美麗旅程</p>
        </div>

        {/* 登入表單 */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">電子信箱</label>
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
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">登入密碼</label>
              <a href="#" className="text-xs text-rose-500 hover:text-rose-600 font-medium transition-colors">忘記密碼？</a>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-rose-400 transition-colors" />
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all text-slate-700 font-medium" 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium shadow-lg shadow-slate-300 transform active:scale-[0.98] transition-all flex items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '登入中...' : '立即登入'}
            {!loading && <ArrowRight className="w-4 h-4 ml-2 text-slate-400 group-hover:translate-x-1 transition-transform" />}
          </button>

          <div className="mt-4 text-center">
            <button
              type="button" 
              onClick={() => navigate('/liff/demo/home')}
              className="text-sm text-gray-500 hover:text-violet-600 transition-colors underline"
            >
              (測試用) 前往 C 端預約首頁
            </button>
          </div>
        </form>

        {/* 分隔線 */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white/80 text-slate-400 font-medium backdrop-blur-sm">或使用以下方式登入</span>
          </div>
        </div>

        {/* 快速登入按鈕 (Dev) */}
        <button 
            type="button"
            onClick={handleDevLogin}
            disabled={loading}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-100 transform active:scale-[0.98] transition-all flex items-center justify-center relative overflow-hidden group mb-3"
        >
          <Code weight="bold" className="w-5 h-5 mr-2" />
          開發者快速登入 (Auto Setup)
        </button>

        {/* LINE 登入按鈕 */}
        <button className="w-full py-3.5 px-4 bg-[#06C755] hover:bg-[#05b64d] text-white rounded-xl font-bold shadow-md shadow-green-100 transform active:scale-[0.98] transition-all flex items-center justify-center relative overflow-hidden group">
          <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.5,10.2C21.5,5.6,17.2,1.9,12,1.9S2.5,5.6,2.5,10.2c0,4.1,3.4,7.6,8.1,8.2c0.3,0.1,0.7,0.3,0.8,0.7 c0.1,0.4,0,1.5-0.1,1.9c0,0-0.3,1.3-0.4,1.6c-0.1,0.4-0.6,1.5,0.8,0.8c1.4-0.7,7.7-4.5,10.5-7.7C23.6,14.2,21.5,12.3,21.5,10.2z M12,15.7c-5.2,0-9.5-3.5-9.5-7.8c0-4.3,4.2-7.8,9.5-7.8c5.2,0,9.5,3.5,9.5,7.8C21.5,12.2,17.2,15.7,12,15.7z"/>
            <path d="M12.9,8.1h-2.1c-0.3,0-0.5,0.2-0.5,0.5v4.2c0,0.3,0.2,0.5,0.5,0.5h2.1c0.3,0,0.5-0.2,0.5-0.5v-0.6c0-0.3-0.2-0.5-0.5-0.5 h-1v-1h1c0.3,0,0.5-0.2,0.5-0.5V9.1C13.4,8.8,13.2,8.6,12.9,8.6z M7.7,13.3H7.1c-0.3,0-0.5-0.2-0.5-0.5V8.6c0-0.3,0.2-0.5,0.5-0.5 h0.6c0.3,0,0.5,0.2,0.5,0.5v3.6h1c0.3,0,0.5,0.2,0.5,0.5v0.6c0,0.3-0.2,0.5-0.5,0.5H7.7z M17.2,8.6v4.2c0,0.3,0.2,0.5,0.5,0.5 h0.6c0.3,0,0.5-0.2,0.5-0.5V8.6c0-0.3-0.2-0.5-0.5-0.5h-0.6C17.4,8.1,17.2,8.3,17.2,8.6z M15.5,13.3h-0.6c-0.3,0-0.5-0.2-0.5-0.5 V8.6c0-0.3,0.2-0.5,0.5-0.5h0.6c0.3,0,0.5,0.2,0.5,0.5v4.2C15.9,13.1,15.7,13.3,15.5,13.3z"/>
          </svg>
          使用 LINE 帳號登入
        </button>

        {/* 頁腳 / 註冊 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            還沒有會員帳號？
            <a href="#" className="font-semibold text-rose-500 hover:text-rose-600 transition-colors ml-1 relative group inline-block">
              立即註冊
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
            </a>
          </p>
        </div>
      </GlassPanel>
    </div>
  );
};

export default LoginPage;

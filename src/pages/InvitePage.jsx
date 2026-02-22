import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  User, Lock, Eye, EyeSlash, CheckCircle, 
  Warning, ArrowRight, Sparkle, Crown 
} from '@phosphor-icons/react';
import { supabase } from '../lib/supabaseClient';
import BackgroundDecoration from '../components/ui/BackgroundDecoration';

const InvitePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      validateInvite();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const validateInvite = async () => {
    if (!token) {
      setError('邀請連結無效');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('staff')
        .select(`
          *,
          roles (name, display_name),
          tenants (name, logo_url)
        `)
        .eq('invite_token', token)
        .gt('invite_expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        setError('邀請連結已失效或已被使用');
      } else if (data.user_id) {
        setError('此邀請已被接受，請直接登入');
      } else {
        setInvite(data);
      }
    } catch (err) {
      console.error('Error validating invite:', err);
      setError('驗證邀請時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (password.length < 6) {
      setError('密碼至少需要 6 個字元');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('兩次輸入的密碼不一致');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Use Edge Function to create confirmed user
      const { data, error } = await supabase.functions.invoke('invite-signup', {
        body: {
          email: invite.email,
          password: password,
          name: invite.full_name || invite.name,
          inviteToken: token
        }
      });

      if (error) {
        throw new Error(error.message || '註冊失敗');
      }

      if (data.error) {
        if (data.error.includes('already registered')) {
          setError('此 Email 已註冊，請直接登入');
        } else {
          throw new Error(data.error);
        }
        return;
      }

      setSuccess(true);
      
      // Auto redirect after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (err) {
      console.error('Error completing invite:', err);
      setError('註冊失敗：' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center p-4">
        <BackgroundDecoration />
        <div className="flex items-center space-x-3 text-rose-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
          <span>驗證邀請中...</span>
        </div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center p-4">
        <BackgroundDecoration />
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-rose-100/50 p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Warning className="w-10 h-10 text-rose-500" weight="bold" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">邀請無效</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <Link 
            to="/login"
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-colors"
          >
            前往登入頁面
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center p-4">
        <BackgroundDecoration />
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-rose-100/50 p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" weight="bold" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">註冊成功！</h2>
          <p className="text-slate-500 mb-2">
            歡迎加入 <span className="font-semibold text-rose-600">{invite?.tenants?.name}</span>
          </p>
          <p className="text-sm text-slate-400 mb-6">
            3 秒後自動跳轉到登入頁面...
          </p>
          <Link 
            to="/login"
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-colors"
          >
            立即登入
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center p-4">
      <BackgroundDecoration />
      
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-rose-100/50 p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {invite?.tenants?.logo_url ? (
              <img 
                src={invite.tenants.logo_url} 
                alt={invite.tenants.name}
                className="w-16 h-16 object-contain rounded-full"
              />
            ) : (
              <Sparkle className="w-10 h-10 text-rose-500" weight="fill" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-1">
            加入 {invite?.tenants?.name}
          </h1>
          <p className="text-slate-500">
            Hi {invite?.name}，請設定您的登入密碼
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-rose-50 rounded-full">
            {invite?.roles?.name === 'admin' && <Crown className="w-4 h-4 text-amber-500" />}
            <span className="text-sm text-rose-600 font-medium">
              角色：{invite?.roles?.display_name}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Display */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <div className="flex items-center px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600">
              <User className="w-5 h-5 text-slate-400 mr-3" />
              <span>{invite?.email}</span>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              設定密碼 <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="至少 6 個字元"
                className="w-full pl-12 pr-12 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              密碼長度至少 6 個字元
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              確認密碼 <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="再次輸入密碼"
                className="w-full pl-12 pr-12 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
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

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">
              <Warning className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !password || !confirmPassword}
            className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold shadow-lg shadow-rose-200 hover:shadow-xl hover:shadow-rose-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>處理中...</span>
              </>
            ) : (
              <>
                <span>完成註冊</span>
                <ArrowRight className="w-5 h-5" weight="bold" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-400">
            已經有帳號？{' '}
            <Link to="/login" className="text-rose-500 hover:text-rose-600 font-medium">
              直接登入
            </Link>
          </p>
        </div>

        {/* Security Note */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-400 text-center">
            此邀請連結將於 7 天後失效
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvitePage;

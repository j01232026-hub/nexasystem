import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiffAuth } from '../../context/LiffAuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabaseClient';
import { User, Phone, Sparkle, Storefront } from '@phosphor-icons/react';

const LiffRegisterPage = () => {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { themeColor } = useTheme();
  const { liffUser, refreshUser } = useLiffAuth();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tenantName, setTenantName] = useState('Loading...');
  const [resolvedTenantId, setResolvedTenantId] = useState(null);
  const [error, setError] = useState('');

  // Fetch Tenant Name and Resolve ID
  useEffect(() => {
    const fetchTenant = async () => {
      try {
        // Try to fetch by ID first (if it's a UUID)
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId);
        
        let query = supabase.from('tenants').select('id, name');
        
        if (isUuid) {
            query = query.eq('id', tenantId);
        } else {
            query = query.eq('slug', tenantId);
        }

        const { data, error } = await query.maybeSingle();
        
        if (data) {
          setTenantName(data.name);
          setResolvedTenantId(data.id);
        } else {
            // Fallback: If we can't find it (maybe RLS blocks slug lookup?), we might have a problem.
            // But if tenantId is actually the slug 'demo' or 'nexa-demo-dev', we need to find the real ID.
            // Let's try to find 'nexa-demo-dev' hardcoded if 'demo' is passed? 
            // Or just fail gracefully.
            
            console.warn('Tenant not found by ID/Slug:', tenantId);
            setTenantName('NEXA Demo Salon');
            // We can't set resolvedTenantId if we didn't find it.
            // But for the demo purpose, if the user is using 'demo' slug, let's try to look up 'nexa-demo-dev' as a fallback?
            if (tenantId === 'demo') {
                const { data: demoData } = await supabase.from('tenants').select('id, name').eq('slug', 'nexa-demo-dev').maybeSingle();
                if (demoData) {
                    setTenantName(demoData.name);
                    setResolvedTenantId(demoData.id);
                }
            }
        }
      } catch (err) {
        console.error('Error fetching tenant:', err);
        setTenantName('NEXA Demo Salon');
      }
    };
    
    if (tenantId) fetchTenant();
  }, [tenantId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!resolvedTenantId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) {
        setError('系統錯誤：無法確認店家 ID (Invalid Tenant)');
        setIsSubmitting(false);
        return;
    }

    const targetTenantId = resolvedTenantId || tenantId;

    if (!phoneNumber || phoneNumber.length < 8) {
        setError('請輸入有效的手機號碼');
        setIsSubmitting(false);
        return;
    }

    try {
        // 1. Check if phone already exists (optional: merge logic)
        // For simplicity, we just create a new customer linked to this LINE ID
        
        const newCustomer = {
            tenant_id: targetTenantId,
            line_user_id: liffUser.lineUserId,
            name: liffUser.displayName, // Main name field
            line_display_name: liffUser.displayName, // Specific line name field
            phone: phoneNumber,
            line_picture_url: liffUser.pictureUrl, // Correct column name
            notes: 'Created via LIFF Registration'
        };

        const { data, error: insertError } = await supabase
            .from('customers')
            .insert(newCustomer)
            .select()
            .single();

        if (insertError) throw insertError;

        // 2. Refresh Auth Context to update isRegistered status
        if (refreshUser) {
            await refreshUser();
        }

        // 3. Redirect to Home
        navigate(`/liff/${tenantId}/home`, { replace: true });

    } catch (err) {
        console.error('Registration failed:', err);
        setError('註冊失敗，請稍後再試 (' + err.message + ')');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[60%] rounded-full opacity-10 pointer-events-none" style={{ backgroundColor: themeColor }}></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[40%] rounded-full opacity-5 pointer-events-none" style={{ backgroundColor: themeColor }}></div>

        <div className="flex-1 flex flex-col px-8 pt-20 pb-10 z-10">
            {/* Header / Branding */}
            <div className="mb-10 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg text-white" style={{ backgroundColor: themeColor }}>
                    <Storefront size={32} weight="fill" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">歡迎來到</h1>
                <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600">
                    {tenantName}
                </h2>
                <p className="text-gray-500 mt-4 text-sm">只需一步，即可啟用線上預約服務</p>
            </div>

            {/* User Profile Card */}
            <div className="bg-gray-50 rounded-2xl p-6 mb-8 flex items-center space-x-4 border border-gray-100">
                <div className="w-16 h-16 rounded-full p-1 bg-white shadow-sm">
                    <img 
                        src={liffUser?.pictureUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest'} 
                        alt="Profile" 
                        className="w-full h-full rounded-full object-cover" 
                    />
                </div>
                <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">LINE 帳號</p>
                    <p className="text-lg font-bold text-gray-900">{liffUser?.displayName}</p>
                </div>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center">
                        <Phone size={16} className="mr-1.5" />
                        手機號碼
                    </label>
                    <div className="relative">
                        <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="0912345678"
                            className="w-full px-4 py-4 rounded-xl bg-gray-50 border-2 border-transparent focus:border-violet-500 focus:bg-white outline-none transition-all text-lg font-medium tracking-wide placeholder-gray-300"
                            required
                        />
                    </div>
                </div>

                {error && (
                    <div className="p-3 rounded-lg bg-red-50 text-red-500 text-sm text-center">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-xl text-white font-bold text-lg shadow-xl flex items-center justify-center transform active:scale-[0.98] transition-all mt-8"
                    style={{ 
                        background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}dd 100%)`,
                        opacity: isSubmitting ? 0.7 : 1
                    }}
                >
                    {isSubmitting ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <>
                            <span>加入會員</span>
                            <Sparkle weight="fill" className="ml-2 animate-pulse" />
                        </>
                    )}
                </button>
            </form>
            
            <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
                點擊加入會員即表示您同意本服務的<br/>
                <span className="underline cursor-pointer">使用條款</span> 與 <span className="underline cursor-pointer">隱私權政策</span>
            </p>
        </div>
    </div>
  );
};

export default LiffRegisterPage;

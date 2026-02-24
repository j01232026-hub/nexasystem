import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Storefront, Phone, MapPin, Image, CheckCircle, PencilSimple, Plus, UserCircle, Trash, Buildings, ArrowLeft, X } from '@phosphor-icons/react';
import GlassPanel from '../components/ui/GlassPanel';
import BackgroundDecoration from '../components/ui/BackgroundDecoration';
import Toast from '../components/ui/Toast';
import { supabase } from '../lib/supabaseClient';

const StoreProfilePage = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [branches, setBranches] = useState([]);
  const [profile, setProfile] = useState(null);
  const [toast, setToast] = useState(null);

  // Branch Modal State
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [branchForm, setBranchForm] = useState({ id: null, name: '', phone: '', address: '' });
  const [branchSubmitLoading, setBranchSubmitLoading] = useState(false);

  // Form states (initialized with store data when editing starts)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    logo_url: '',
    cover_url: '',
    deposit_config: {
        enabled: false,
        mode: 'amount',
        amount: 0,
        ratio: 30,
        start_date: '',
        end_date: '',
        bank_info: ''
    }
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchStoreData();
  }, []);

  const fetchStoreData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // If no user, maybe redirect to login, but for now just stop
        setLoading(false);
        return;
      }

      // Get profile to find tenant_id
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        // If profile not found, maybe new user? 
        setLoading(false);
        return;
      }
      setProfile(profileData);

      // Get tenant info
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profileData.tenant_id)
        .single();

      if (tenantError) console.error('Error fetching tenant:', tenantError);
      
      // Get staff list
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('tenant_id', profileData.tenant_id);

      if (staffError) console.error('Error fetching staff:', staffError);

      // Get branches
      const { data: branchData, error: branchError } = await supabase
        .from('branches')
        .select('*')
        .eq('tenant_id', profileData.tenant_id)
        .order('created_at', { ascending: true });

      if (branchError && branchError.code !== '42P01') { // Ignore if table doesn't exist yet (dev mode)
         console.error('Error fetching branches:', branchError);
      }

      setStore(tenantData);
      setStaffList(staffData || []);
      setBranches(branchData || []);
      
      if (tenantData) {
        setFormData({
            name: tenantData.name || '',
            phone: tenantData.phone || '', 
            address: tenantData.address || '',
            logo_url: tenantData.logo_url || '',
            cover_url: tenantData.cover_url || '',
            deposit_config: {
                enabled: false,
                mode: 'amount',
                amount: 0,
                ratio: 30,
                start_date: '',
                end_date: '',
                bank_info: '',
                ...(tenantData.deposit_config || {})
            }
        });
      }

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    if (!isEditing && store) {
        // Reset form data to current store data when entering edit mode
        setFormData({
            name: store.name || '',
            phone: store.phone || '',
            address: store.address || '',
            logo_url: store.logo_url || '',
            cover_url: store.cover_url || '',
            deposit_config: {
                enabled: false,
                mode: 'amount',
                amount: 0,
                ratio: 30,
                start_date: '',
                end_date: '',
                bank_info: '',
                ...(store.deposit_config || {})
            }
        });
    }
    setIsEditing(!isEditing);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('deposit_')) {
        const field = name.replace('deposit_', '');
        
        let processedValue = type === 'checkbox' ? checked : value;
        
        // Convert number inputs to numbers
        if (type === 'number') {
            processedValue = value === '' ? 0 : Number(value);
        }

        setFormData(prev => ({
            ...prev,
            deposit_config: {
                ...prev.deposit_config,
                [field]: processedValue
            }
        }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileUpload = async (e, type) => {
    try {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `${profile.tenant_id}/${type}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('store-assets')
            .upload(fileName, file, {
                upsert: true
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('store-assets')
            .getPublicUrl(fileName);

        setFormData(prev => ({ ...prev, [type]: publicUrl }));
        setToast({ message: '圖片上傳成功！別忘了點擊儲存', type: 'success' });
    } catch (error) {
        console.error('Error uploading file:', error);
        setToast({ message: '上傳失敗: ' + error.message, type: 'error' });
    } finally {
        setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
        setLoading(true);
        console.log('Saving deposit_config:', formData.deposit_config);
        console.log('Target Tenant ID:', profile?.tenant_id);

        if (!profile?.tenant_id) {
            throw new Error('找不到店家 ID (Tenant ID is missing)');
        }

        // Clean up data before saving
        const depositConfigToSave = {
            ...formData.deposit_config,
            // Ensure numbers are numbers
            amount: Number(formData.deposit_config.amount) || 0,
            ratio: Number(formData.deposit_config.ratio) || 0,
            // Ensure strings are strings (not null)
            start_date: formData.deposit_config.start_date || '',
            end_date: formData.deposit_config.end_date || '',
            bank_info: formData.deposit_config.bank_info || ''
        };

        const { data, error } = await supabase
            .from('tenants')
            .update({
                name: formData.name,
                phone: formData.phone,
                address: formData.address,
                logo_url: formData.logo_url,
                cover_url: formData.cover_url,
                deposit_config: depositConfigToSave
            })
            .eq('id', profile.tenant_id)
            .select();

        if (error) throw error;
        
        if (!data || data.length === 0) {
                console.warn('No rows updated! Possible RLS issue or ID mismatch.');
                setToast({ message: `警告：資料未寫入資料庫 (ID: ${profile?.tenant_id})，請檢查權限`, type: 'error' });
                return;
            }

        console.log('Update success, updated data:', data);
        
        // Update local store state directly instead of fetching to avoid race conditions
        const updatedTenant = data[0];
        setStore(updatedTenant);
        
        // Force update formData to match what we just saved/received
        setFormData(prev => ({
            ...prev,
            deposit_config: updatedTenant.deposit_config || prev.deposit_config
        }));

        setToast({ message: '儲存成功！', type: 'success' });
    } catch (error) {
        console.error('Save error:', error);
        setToast({ message: '儲存失敗: ' + error.message, type: 'error' });
    } finally {
        setLoading(false);
    }
  };

  // --- Branch Operations ---
  const handleDeleteBranch = async (branchId) => {
    if (!confirm('確定要刪除此分店嗎？此動作無法復原。')) return;

    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', branchId);

      if (error) throw error;

      // Refresh data
      fetchStoreData();
    } catch (error) {
      console.error('Error deleting branch:', error);
      alert('刪除失敗: ' + error.message);
    }
  };

  const handleOpenBranchModal = (branch = null) => {
    if (branch) {
      setBranchForm({
        id: branch.id,
        name: branch.name,
        phone: branch.phone || '',
        address: branch.address || ''
      });
    } else {
      setBranchForm({ id: null, name: '', phone: '', address: '' });
    }
    setIsBranchModalOpen(true);
  };

  const handleSubmitBranch = async (e) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    
    setBranchSubmitLoading(true);
    try {
      const payload = {
        tenant_id: profile.tenant_id,
        name: branchForm.name,
        phone: branchForm.phone,
        address: branchForm.address
      };

      if (branchForm.id) {
        // Update
        const { error } = await supabase
          .from('branches')
          .update(payload)
          .eq('id', branchForm.id);
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from('branches')
          .insert(payload);
        if (error) throw error;
      }

      // Refresh data
      fetchStoreData();
      setIsBranchModalOpen(false);
    } catch (error) {
      alert('操作失敗: ' + error.message);
    } finally {
      setBranchSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-rose-50 min-h-screen p-6 relative overflow-hidden font-sans pb-24">
      <BackgroundDecoration />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <button 
            onClick={() => navigate('/admin')} 
            className="p-2 bg-white/50 hover:bg-white rounded-full text-slate-600 transition-colors shadow-sm"
          >
            <ArrowLeft weight="bold" className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800">店家資訊設定</h1>
        </div>

        {isEditing ? (
             <GlassPanel className="w-full">
                {/* Edit Form Content */}
                <div className="mb-6 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">編輯總店資料</h2>
                </div>
                
                <form className="space-y-6">
                    {/* Logo Upload - Centered and styled like Figure 2 */}
                    <div className="flex flex-col items-center">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">店鋪 LOGO</label>
                        <div className="relative group cursor-pointer w-24 h-24 rounded-2xl bg-white p-1 shadow-md border-2 border-transparent hover:border-rose-300 transition-all">
                            <div className="w-full h-full bg-rose-50 rounded-xl flex items-center justify-center text-rose-300 overflow-hidden relative">
                                {formData.logo_url ? (
                                    <img src={formData.logo_url} className="w-full h-full object-contain p-1" alt="Logo" />
                                ) : (
                                    <Storefront className="w-10 h-10" weight="light" />
                                )}
                                
                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 bg-white/80 backdrop-blur-sm p-1.5 rounded-full shadow-sm transition-opacity">
                                        <PencilSimple className="w-4 h-4 text-slate-700" />
                                    </div>
                                </div>

                                <input 
                                    type="file" 
                                    className="absolute inset-0 opacity-0 cursor-pointer z-20" 
                                    accept="image/*"
                                    onChange={(e) => handleFileUpload(e, 'logo_url')}
                                    disabled={uploading}
                                />
                                {uploading && <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-30"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-rose-500"></div></div>}
                            </div>
                        </div>
                    </div>

                    {/* Cover Upload - Full Width */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">店鋪封面 (Cover)</label>
                        <div className="relative group cursor-pointer w-full h-40 rounded-2xl bg-rose-50 border-2 border-dashed border-rose-300 flex flex-col items-center justify-center overflow-hidden transition-all hover:border-rose-500 hover:bg-rose-100">
                            {formData.cover_url ? (
                                <img src={formData.cover_url} className="w-full h-full object-cover" alt="Cover" />
                            ) : (
                                <>
                                    <Image className="w-8 h-8 text-rose-400 mb-2 group-hover:scale-110 transition-transform" weight="light" />
                                    <span className="text-xs text-slate-400 font-medium group-hover:text-rose-500 transition-colors">點擊上傳店鋪照片</span>
                                </>
                            )}
                            
                            {/* Hover Overlay for existing image */}
                            {formData.cover_url && (
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <span className="text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md">更換封面</span>
                                </div>
                            )}

                            <input 
                                type="file" 
                                className="absolute inset-0 opacity-0 cursor-pointer z-20" 
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, 'cover_url')}
                                disabled={uploading}
                            />
                            {uploading && <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-30"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-rose-500"></div></div>}
                        </div>
                    </div>

                    {/* Store Name */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">總店名稱</label>
                        <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Storefront className="w-5 h-5 text-slate-400" />
                        </div>
                        <input 
                            type="text" 
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="例如：NEXA 美學台北旗艦店" 
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all placeholder:text-slate-300 text-slate-700 font-medium"
                        />
                        </div>
                    </div>

                    {/* Store Phone */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">總店電話</label>
                        <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Phone className="w-5 h-5 text-slate-400" />
                        </div>
                        <input 
                            type="tel" 
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="02-1234-5678" 
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all placeholder:text-slate-300 text-slate-700 font-medium"
                        />
                        </div>
                    </div>

                    {/* Store Address */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">總店地址</label>
                        <div className="relative">
                        <div className="absolute top-3.5 left-3 flex items-start pointer-events-none">
                            <MapPin className="w-5 h-5 text-slate-400" />
                        </div>
                        <input 
                            type="text" 
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            placeholder="請輸入完整地址" 
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all placeholder:text-slate-300 text-slate-700 font-medium"
                        />
                        </div>
                    </div>

                    {/* Deposit Settings */}
                    <div className="pt-6 border-t border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                            <span className="w-1 h-5 bg-rose-500 rounded-full mr-2"></span>
                            訂金與大月模式設定
                        </h3>
                        
                        <div className="bg-white/50 rounded-xl p-4 border border-slate-200 space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <label className="text-sm font-bold text-slate-700">啟用訂金模式</label>
                                <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        name="deposit_enabled"
                                        checked={formData.deposit_config?.enabled || false}
                                        onChange={handleInputChange}
                                        className="absolute w-6 h-6 opacity-0 z-10 cursor-pointer"
                                    />
                                    <div className={`w-11 h-6 bg-gray-200 rounded-full shadow-inner transition-colors ${formData.deposit_config?.enabled ? 'bg-rose-500' : ''}`}></div>
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.deposit_config?.enabled ? 'translate-x-5' : ''}`}></div>
                                </div>
                            </div>

                            <div className={`space-y-4 pt-2 transition-opacity duration-300 ${formData.deposit_config?.enabled ? 'opacity-100' : 'opacity-60'}`}>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">開始日期</label>
                                        <input 
                                            type="date"
                                            name="deposit_start_date"
                                            value={formData.deposit_config?.start_date || ''}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">結束日期</label>
                                        <input 
                                            type="date"
                                            name="deposit_end_date"
                                            value={formData.deposit_config?.end_date || ''}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Deposit Mode Selection */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-2">訂金計算方式</label>
                                    <div className="flex space-x-4 mb-2">
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input 
                                                type="radio" 
                                                name="deposit_mode" 
                                                value="amount"
                                                checked={formData.deposit_config?.mode !== 'ratio'} 
                                                onChange={handleInputChange}
                                                className="text-rose-500 focus:ring-rose-500"
                                            />
                                            <span className="text-sm text-slate-700">固定金額</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input 
                                                type="radio" 
                                                name="deposit_mode" 
                                                value="ratio"
                                                checked={formData.deposit_config?.mode === 'ratio'}
                                                onChange={handleInputChange}
                                                className="text-rose-500 focus:ring-rose-500"
                                            />
                                            <span className="text-sm text-slate-700">服務金額比例 (%)</span>
                                        </label>
                                    </div>
                                </div>

                                {formData.deposit_config?.mode === 'ratio' ? (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">訂金比例 (%)</label>
                                        <div className="relative">
                                            <input 
                                                type="number"
                                                name="deposit_ratio"
                                                value={formData.deposit_config?.ratio || 30}
                                                onChange={handleInputChange}
                                                min="0"
                                                max="100"
                                                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-mono pl-3 pr-8"
                                            />
                                            <span className="absolute right-3 top-2 text-slate-400 text-sm">%</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">訂金金額 ($)</label>
                                        <input 
                                            type="number"
                                            name="deposit_amount"
                                            value={formData.deposit_config?.amount || 0}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-mono"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">匯款資訊 / Line ID</label>
                                    <textarea 
                                        name="deposit_bank_info"
                                        value={formData.deposit_config?.bank_info || ''}
                                        onChange={handleInputChange}
                                        rows="3"
                                        placeholder="例如：銀行代碼 822 帳號 123... 或 Line ID: @salon123"
                                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex space-x-3">
                        <button 
                            type="button" 
                            onClick={handleSave}
                            className="flex-1 py-3.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium shadow-lg shadow-slate-300 transform active:scale-[0.98] transition-all flex items-center justify-center group"
                        >
                            <CheckCircle className="w-5 h-5 mr-2 text-emerald-400" weight="fill" />
                            儲存變更
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setIsEditing(false)}
                            className="w-1/3 py-3.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-medium shadow-sm transition-colors flex items-center justify-center"
                        >
                            關閉視窗
                        </button>
                    </div>
                </form>
             </GlassPanel>
        ) : (
            <>
            {/* View Mode - Store Card */}
            <div className="bg-white rounded-3xl shadow-[0_4px_20px_0_rgba(0,0,0,0.03)] overflow-hidden border border-slate-100 mb-6">
                {/* Cover Image */}
                <div className="h-32 bg-gradient-to-r from-rose-100 to-orange-100 relative overflow-hidden">
                    {store?.cover_url && (
                        <img src={store.cover_url} alt="Cover" className="w-full h-full object-cover absolute inset-0" />
                    )}
                    {/* Edit Button */}
                    <button 
                        onClick={handleEditToggle}
                        className="absolute top-3 right-3 p-1.5 bg-white/30 hover:bg-white/50 backdrop-blur-sm rounded-full text-white transition-all z-10"
                    >
                        <PencilSimple className="w-4 h-4 text-slate-600" />
                    </button>
                </div>

                <div className="px-6 pb-6">
                    {/* Store Basic Info */}
                    <div className="relative -mt-10 mb-6 flex items-end justify-between">
                        <div>
                            <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-md relative z-10">
                                <div className="w-full h-full bg-rose-50 rounded-xl flex items-center justify-center text-rose-300 overflow-hidden relative">
                                    {store?.logo_url ? (
                                        <img 
                                            src={store.logo_url} 
                                            alt="Store Logo" 
                                            className="w-full h-full object-contain p-1 bg-white"
                                        />
                                    ) : (
                                        <Storefront className="w-8 h-8" weight="light" />
                                    )}
                                </div>
                            </div>
                            <div className="mt-3">
                                <h2 className="text-xl font-bold text-slate-800">{store?.name || '未設定店名'}</h2>
                                <p className="text-xs text-rose-500 font-medium tracking-wide uppercase mt-0.5">總店 HEAD OFFICE</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 mb-8">
                        <div className="flex items-center text-sm text-slate-600">
                            <Phone className="w-4 h-4 mr-3 text-slate-400" />
                            {store?.phone || <span className="text-slate-400 italic">尚未設定電話</span>}
                        </div>
                        <div className="flex items-center text-sm text-slate-600">
                            <MapPin className="w-4 h-4 mr-3 text-slate-400" />
                            {store?.address || <span className="text-slate-400 italic">尚未設定地址</span>}
                        </div>

                        {/* Deposit Info Display */}
                        {store?.deposit_config?.enabled && (
                            <div className="mt-6 p-4 bg-rose-50/50 rounded-xl border border-rose-100">
                                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
                                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mr-2"></span>
                                    目前訂金規則
                                </h3>
                                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                                    <div>
                                        <span className="text-slate-500 block text-xs mb-0.5">計算方式</span>
                                        <span className="font-medium text-slate-700">
                                            {store.deposit_config.mode === 'ratio' ? '服務金額比例' : '固定金額'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block text-xs mb-0.5">
                                            {store.deposit_config.mode === 'ratio' ? '收取比例' : '收取金額'}
                                        </span>
                                        <span className="font-bold text-rose-500 font-mono">
                                            {store.deposit_config.mode === 'ratio' 
                                                ? `${store.deposit_config.ratio}%` 
                                                : `$${store.deposit_config.amount}`}
                                        </span>
                                    </div>
                                    {(store.deposit_config.start_date || store.deposit_config.end_date) && (
                                        <div className="col-span-2">
                                            <span className="text-slate-500 block text-xs mb-0.5">適用期間</span>
                                            <span className="font-medium text-slate-700 font-mono text-xs">
                                                {store.deposit_config.start_date || '未設定'} ~ {store.deposit_config.end_date || '未設定'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-100 my-6"></div>

                    {/* Staff List */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-800">總店員工列表</h3>
                            <button 
                                onClick={() => navigate('/staff')}
                                className="text-sm font-semibold text-rose-500 hover:text-rose-600 flex items-center bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                <Plus className="w-4 h-4 mr-1.5" />
                                管理員工
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {staffList.length > 0 ? (
                                staffList.map(staff => (
                                    <div key={staff.id} className="relative bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 overflow-hidden group hover:shadow-xl hover:border-rose-200 transition-all mx-auto w-full max-w-[340px] sm:max-w-none" style={{ aspectRatio: '1.586/1' }}>
                                        {/* 識別證風格卡片 - 信用卡比例 1.586:1 */}
                                        <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-br from-rose-400 to-pink-500"></div>
                                        
                                        {/* 照片區域 - 放大並置中 */}
                                        <div className="absolute top-3 left-1/2 -translate-x-1/2">
                                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white bg-white shadow-xl overflow-hidden">
                                                {staff.avatar_url ? (
                                                    <img src={staff.avatar_url} alt={staff.full_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center">
                                                        <UserCircle className="w-12 h-12 sm:w-14 sm:h-14 text-rose-400" weight="fill" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* 資訊區域 */}
                                        <div className="absolute bottom-0 left-0 right-0 h-[55%] pt-12 sm:pt-14 px-4 pb-4 flex flex-col items-center justify-end">
                                            <p className="text-base sm:text-lg font-bold text-slate-800 text-center truncate w-full">{staff.display_name || staff.full_name}</p>
                                            <span className="mt-2 px-3 py-1 bg-rose-100 text-rose-600 text-xs font-bold rounded-full">
                                                {staff.role === 'stylist' ? '設計師' : 
                                                 staff.role === 'assistant' ? '助理' : 
                                                 staff.role === 'manager' ? '店長' : 
                                                 staff.role || '員工'}
                                            </span>
                                            <p className="mt-2 text-xs text-slate-400">{staff.id.slice(0, 8)}</p>
                                        </div>
                                        
                                        {/* 編輯按鈕 */}
                                        <div className="absolute top-3 right-3 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 bg-white/90 text-slate-400 hover:text-blue-500 rounded-lg shadow-sm transition-colors">
                                                <PencilSimple className="w-4 h-4" />
                                            </button>
                                            <button className="p-2 bg-white/90 text-slate-400 hover:text-red-500 rounded-lg shadow-sm transition-colors">
                                                <Trash className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    暫無員工資料
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Branch Management */}
            <div>
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-lg font-bold text-slate-800">分店管理</h3>
                </div>

                {/* Branch List */}
                <div className="space-y-4 mb-4">
                    {branches.length === 0 && (
                         <div className="text-center py-4 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                             尚未建立分店
                         </div>
                    )}
                    {branches.map(branch => (
                        <div key={branch.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-rose-200 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="text-lg font-bold text-slate-800">{branch.name}</h4>
                                    <div className="flex items-center text-sm text-slate-500 mt-1">
                                        <MapPin className="w-4 h-4 mr-1" />
                                        {branch.address || '尚未設定地址'}
                                    </div>
                                    <div className="flex items-center text-sm text-slate-500 mt-1">
                                        <Phone className="w-4 h-4 mr-1" />
                                        {branch.phone || '尚未設定電話'}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <button 
                                        onClick={() => handleOpenBranchModal(branch)}
                                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                                        title="編輯"
                                    >
                                        <PencilSimple className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteBranch(branch.id)}
                                        className="p-2 hover:bg-red-50 rounded-full transition-colors text-slate-400 hover:text-red-500"
                                        title="刪除"
                                    >
                                        <Trash className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">分店員工</span>
                                <button 
                                    onClick={() => navigate('/staff')}
                                    className="text-sm font-semibold text-rose-500 hover:text-rose-600 flex items-center bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    <Plus className="w-4 h-4 mr-1.5" />
                                    管理員工
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="w-full">
                    <button 
                        onClick={() => handleOpenBranchModal()}
                        className="w-full h-32 rounded-2xl border-2 border-dashed border-slate-300 hover:border-rose-400 hover:bg-rose-50/50 flex flex-col items-center justify-center text-slate-400 hover:text-rose-500 transition-all group"
                    >
                        <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-rose-100 flex items-center justify-center mb-2 transition-colors">
                            <Buildings className="w-6 h-6 text-slate-400 group-hover:text-rose-500" weight="light" />
                        </div>
                        <span className="text-sm font-semibold">新增分店</span>
                    </button>
                </div>
            </div>
            </>
        )}
      </div>

      {/* Branch Modal */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-fadeIn">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800">
                {branchForm.id ? '編輯分店' : '新增分店'}
              </h3>
              <button onClick={() => setIsBranchModalOpen(false)}><X className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmitBranch} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">分店名稱</label>
                <input
                  type="text"
                  required
                  placeholder="例如：台中逢甲店"
                  value={branchForm.name}
                  onChange={e => setBranchForm({...branchForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">分店電話</label>
                <input
                  type="tel"
                  placeholder="04-1234-5678"
                  value={branchForm.phone}
                  onChange={e => setBranchForm({...branchForm, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">分店地址</label>
                <input
                  type="text"
                  placeholder="請輸入地址"
                  value={branchForm.address}
                  onChange={e => setBranchForm({...branchForm, address: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={branchSubmitLoading}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-500/30 transition-all disabled:opacity-50"
                >
                  {branchSubmitLoading ? '儲存中...' : '儲存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default StoreProfilePage;
